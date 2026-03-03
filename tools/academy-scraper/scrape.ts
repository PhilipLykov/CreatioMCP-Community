#!/usr/bin/env tsx
/**
 * Creatio Academy Scraper -- Machine Teaching Knowledge DB builder.
 *
 * Hybrid two-pass architecture:
 *   Pass 1 (CheerioCrawler): Fast HTTP crawl for URL discovery + static content
 *   Pass 2 (PlaywrightCrawler): JS-rendered content extraction for all pages
 *
 * The Creatio Academy is a heavily JavaScript-rendered site. Static HTML only
 * contains navigation shells — article content, code examples (especially
 * tabbed C#/JS/TS panels), and expandable sections are rendered client-side.
 * Cheerio alone produces incomplete teaching data.
 *
 * Usage:
 *   npx tsx scrape.ts                    Full crawl (drops existing data)
 *   npx tsx scrape.ts --incremental      Only re-process changed/new pages
 *   npx tsx scrape.ts --search "query"   Quick CLI search (delegates to search-cli.ts)
 */

import { CheerioCrawler, PlaywrightCrawler, Configuration } from "crawlee";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { AcademyDB } from "./db.js";
import { categorizeUrl, initializeCategories, buildBreadcrumb } from "./categorize.js";
import { extractCodeExamples } from "./extract.js";
import { chunkBySections } from "./chunk.js";
import { createTurndownService } from "./turndown-config.js";

// ── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = "https://academy.creatio.com/docs/8.x/";
const ALLOWED_PREFIX = "https://academy.creatio.com/docs/8.x/";

const CHEERIO_MAX_RPM = 30;
const CHEERIO_MAX_CONCURRENCY = 3;

const PLAYWRIGHT_MAX_RPM = 30;
const PLAYWRIGHT_MAX_CONCURRENCY = 3;
const PLAYWRIGHT_TIMEOUT_SECS = 45;

const EXCLUDED_EXTENSIONS = /\.(png|gif|jpg|jpeg|svg|webp|pdf|zip|ico|woff2?|ttf|eot)(\?|$)/i;
const SKIP_VERSIONED_PATH = /\/development-on-creatio-platform\/(8\.0|8\.1|8\.2)\//;
const SKIP_LEGACY_PATH = /\/docs\/7[-.]|\/docs\/8\.x\/.*?\/(8\.0|8\.1|8\.2)\//;

const SEED_URLS = [
  BASE_URL,
  "https://academy.creatio.com/docs/8.x/dev",
  "https://academy.creatio.com/docs/8.x/no-code-customization",
  "https://academy.creatio.com/docs/8.x/setup-and-administration",
];

const ENQUEUE_GLOBS = [`${ALLOWED_PREFIX}**`];
const ENQUEUE_EXCLUDE = [
  "**/api-reference/**",
  "**#**",
  "**?**",
  "**/search**",
  "**/print/**",
  "**/development-on-creatio-platform/8.0/**",
  "**/development-on-creatio-platform/8.1/**",
  "**/development-on-creatio-platform/8.2/**",
  "**/creatio-apps/8.0/**",
  "**/creatio-apps/8.1/**",
  "**/creatio-apps/8.2/**",
  "**.png", "**.jpg", "**.jpeg", "**.gif", "**.svg", "**.webp", "**.ico",
  "**.pdf", "**.zip", "**.woff", "**.woff2", "**.ttf", "**.eot",
];

const CONTENT_SELECTORS = [
  "article .article-content",
  "article",
  ".docs-content",
  "main .content",
  "main",
];

// ── Utilities ────────────────────────────────────────────────────────────────

function nowChisinau(): string {
  return new Date().toLocaleString("sv-SE", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).replace(" ", "T");
}

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function normalizeUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  u.search = "";
  let pathname = u.pathname;
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  u.pathname = pathname;
  return u.toString();
}

function shouldSkipUrl(url: string): boolean {
  return EXCLUDED_EXTENSIONS.test(url) ||
    SKIP_VERSIONED_PATH.test(url) ||
    SKIP_LEGACY_PATH.test(url);
}

function clearCrawleeStorage(suffix?: string): string {
  const dirName = suffix ? `storage-${suffix}` : "storage";
  const storageDir = path.resolve(__dirname, dirName);
  if (fs.existsSync(storageDir)) {
    console.log(`[${nowChisinau()}] Clearing stale Crawlee storage at ${storageDir}...`);
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
  return storageDir;
}

// ── Stats ────────────────────────────────────────────────────────────────────

interface CrawlStats {
  pagesCrawled: number;
  pagesAdded: number;
  pagesUpdated: number;
  pagesUnchanged: number;
  codeExamplesExtracted: number;
  sectionsCreated: number;
  errors: number;
}

function newStats(): CrawlStats {
  return {
    pagesCrawled: 0, pagesAdded: 0, pagesUpdated: 0, pagesUnchanged: 0,
    codeExamplesExtracted: 0, sectionsCreated: 0, errors: 0,
  };
}

// ── Article processing (shared by both crawlers) ─────────────────────────────

function processAndStore(
  db: AcademyDB,
  turndown: ReturnType<typeof createTurndownService>,
  url: string,
  rawHtml: string,
  title: string,
  crawlerType: "cheerio" | "playwright",
  stats: CrawlStats,
  existingHashes: Map<string, string> | null,
): void {
  const contentHash = sha256(rawHtml);

  if (existingHashes?.has(url) && existingHashes.get(url) === contentHash) {
    stats.pagesUnchanged++;
    return;
  }

  const cleanTitle = title.replace(/\s*\|\s*Creatio Academy\s*$/i, "").trim() || url;
  const markdown = turndown.turndown(rawHtml);

  if (markdown.trim().length < 30) {
    stats.errors++;
    return;
  }

  const wordCount = countWords(markdown);
  const codeExamples = extractCodeExamples(markdown);
  const sections = chunkBySections(markdown, cleanTitle);

  const category = categorizeUrl(url);
  const categoryId = db.ensureCategory(category.slug, category.name, category.parentSlug);
  const breadcrumb = buildBreadcrumb(url);

  const articleData = {
    url,
    title: cleanTitle,
    category_id: categoryId,
    breadcrumb,
    content_markdown: markdown,
    content_hash: contentHash,
    word_count: wordCount,
    has_code_examples: codeExamples.length > 0,
    version: "8.x",
    crawler_type: crawlerType,
  };

  let articleId: number;
  const existing = db.getArticleByUrl(url);

  if (existing) {
    articleId = db.updateArticle(articleData);
    stats.pagesUpdated++;
  } else {
    articleId = db.insertArticle(articleData);
    stats.pagesAdded++;
  }

  if (codeExamples.length > 0) {
    db.insertCodeExamples(
      articleId,
      codeExamples.map(ce => ({
        language: ce.language,
        code: ce.code,
        context: ce.context || null,
        purpose: ce.purpose,
        components: ce.components.length > 0 ? ce.components.join(",") : null,
        section_heading: ce.sectionHeading || null,
        line_count: ce.lineCount,
        word_count: ce.wordCount,
      })),
    );
    stats.codeExamplesExtracted += codeExamples.length;
  }

  if (sections.length > 0) {
    db.insertSections(
      articleId,
      sections.map(s => ({
        heading: s.heading,
        heading_level: s.headingLevel,
        content_markdown: s.contentMarkdown,
        content_plain: s.contentPlain,
        sort_order: s.sortOrder,
        word_count: s.wordCount,
      })),
    );
    stats.sectionsCreated += sections.length;
  }
}

// ── Pass 1: CheerioCrawler — fast URL discovery + static content ─────────────

async function runCheerioPass(
  db: AcademyDB,
  turndown: ReturnType<typeof createTurndownService>,
  existingHashes: Map<string, string> | null,
): Promise<{ discoveredUrls: Set<string>; stats: CrawlStats }> {
  console.log(`\n[${nowChisinau()}] ═══ Pass 1: CheerioCrawler (URL discovery + static content) ═══`);

  const discoveredUrls = new Set<string>();
  const visitedUrls = new Set<string>();
  const stats = newStats();

  const storageDir = clearCrawleeStorage("cheerio");
  const crawleeConfig = new Configuration({ storageClientOptions: { localDataDirectory: storageDir } });

  const crawler = new CheerioCrawler({
    maxRequestsPerMinute: CHEERIO_MAX_RPM,
    maxConcurrency: CHEERIO_MAX_CONCURRENCY,
    requestHandlerTimeoutSecs: 30,
    respectRobotsTxtFile: true,

    async requestHandler({ $, request, enqueueLinks, log, body }) {
      const url = normalizeUrl(request.url);
      if (visitedUrls.has(url)) return;
      visitedUrls.add(url);

      if (shouldSkipUrl(url)) return;

      discoveredUrls.add(url);
      stats.pagesCrawled++;

      let rawHtml = "";
      for (const sel of CONTENT_SELECTORS) {
        const el = $(sel);
        if (el.length > 0) {
          const html = el.html();
          if (html && html.trim().length > 100) {
            rawHtml = html;
            break;
          }
        }
      }
      if (!rawHtml) rawHtml = $("body").html() || String(body);

      if (rawHtml && rawHtml.trim().length >= 50) {
        const title = $("title").text();
        processAndStore(db, turndown, url, rawHtml, title, "cheerio", stats, existingHashes);
      }

      await enqueueLinks({ globs: ENQUEUE_GLOBS, exclude: ENQUEUE_EXCLUDE });
    },

    failedRequestHandler({ request, log, error }) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error(`Failed: ${request.url} — ${msg}`);
      stats.errors++;
    },
  }, crawleeConfig);

  await crawler.run(SEED_URLS);

  console.log(`[${nowChisinau()}] Pass 1 complete: ${discoveredUrls.size} URLs discovered, ` +
    `${stats.pagesAdded} added, ${stats.pagesUpdated} updated, ${stats.pagesUnchanged} unchanged`);

  return { discoveredUrls, stats };
}

// ── Pass 2: PlaywrightCrawler — JS-rendered content extraction ───────────────

async function runPlaywrightPass(
  db: AcademyDB,
  turndown: ReturnType<typeof createTurndownService>,
  urlsToProcess: string[],
): Promise<CrawlStats> {
  console.log(`\n[${nowChisinau()}] ═══ Pass 2: PlaywrightCrawler (JS content extraction) ═══`);
  console.log(`[${nowChisinau()}] Processing ${urlsToProcess.length} URLs with browser rendering...`);

  if (urlsToProcess.length === 0) {
    console.log(`[${nowChisinau()}] No URLs to process in Pass 2.`);
    return newStats();
  }

  const stats = newStats();
  const visitedUrls = new Set<string>();

  const storageDir = clearCrawleeStorage("playwright");
  const config = new Configuration({ storageClientOptions: { localDataDirectory: storageDir } });

  const crawler = new PlaywrightCrawler({
    maxRequestsPerMinute: PLAYWRIGHT_MAX_RPM,
    maxConcurrency: PLAYWRIGHT_MAX_CONCURRENCY,
    requestHandlerTimeoutSecs: PLAYWRIGHT_TIMEOUT_SECS,
    headless: true,
    respectRobotsTxtFile: true,

    preNavigationHooks: [
      async ({ page }) => {
        await page.route(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|css)(\?|$)/i, route => route.abort());
      },
    ],

    async requestHandler({ page, request, log }) {
      const url = normalizeUrl(request.url);
      if (visitedUrls.has(url)) return;
      visitedUrls.add(url);

      if (shouldSkipUrl(url)) return;

      stats.pagesCrawled++;

      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
        /* some pages never fully idle; proceed with what we have */
      });

      let rawHtml = "";
      for (const sel of CONTENT_SELECTORS) {
        rawHtml = await page.evaluate((selector: string) => {
          const el = document.querySelector(selector);
          return el ? el.innerHTML : "";
        }, sel);
        if (rawHtml && rawHtml.trim().length > 100) break;
      }
      if (!rawHtml || rawHtml.trim().length < 100) {
        rawHtml = await page.evaluate(() => document.body?.innerHTML ?? "");
      }

      if (!rawHtml || rawHtml.trim().length < 50) {
        log.warning(`Empty or too-short content on ${url}, skipping`);
        stats.errors++;
        return;
      }

      const title = await page.title();

      if (title.includes("Page Not Found") || title.includes("404")) {
        log.warning(`Page not found: ${url}, skipping`);
        stats.errors++;
        return;
      }

      processAndStore(db, turndown, url, rawHtml, title, "playwright", stats, null);

      const action = stats.pagesAdded > 0 ? "Added" : (stats.pagesUpdated > 0 ? "Enhanced" : "Processed");
      log.info(`${action}: ${title.replace(/\s*\|\s*Creatio Academy\s*$/i, "").trim()} (Playwright)`);
    },

    failedRequestHandler({ request, log, error }) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error(`Playwright failed: ${request.url} — ${msg}`);
      stats.errors++;
    },
  }, config);

  await crawler.run(urlsToProcess);

  console.log(`[${nowChisinau()}] Pass 2 complete: ${stats.pagesCrawled} pages rendered, ` +
    `${stats.pagesAdded} added, ${stats.pagesUpdated} enhanced, ${stats.errors} errors`);

  return stats;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--search")) {
    const queryIdx = args.indexOf("--search");
    const query = args[queryIdx + 1];
    if (!query) {
      console.error("Usage: npx tsx scrape.ts --search \"your query\"");
      process.exit(1);
    }
    const { runSearch } = await import("./search-cli.js");
    runSearch(query);
    return;
  }

  const incremental = args.includes("--incremental");
  const mode = incremental ? "incremental" : "full";

  console.log(`[${nowChisinau()}] Starting ${mode} hybrid crawl of Creatio Academy...`);
  console.log(`[${nowChisinau()}] Architecture: CheerioCrawler (discovery) → PlaywrightCrawler (content)`);

  const db = new AcademyDB();
  initializeCategories(db);

  if (!incremental) {
    console.log(`[${nowChisinau()}] Full mode: dropping all existing data...`);
    db.dropAllData();
    initializeCategories(db);
  }

  let existingHashes: Map<string, string> | null = null;
  if (incremental) {
    existingHashes = new Map<string, string>();
    for (const row of db.getAllArticleUrls()) {
      existingHashes.set(row.url, row.content_hash);
    }
    console.log(`[${nowChisinau()}] Incremental mode: ${existingHashes.size} existing articles in DB`);
  }

  const crawlId = db.startCrawl(mode);
  const turndown = createTurndownService();

  // Pass 1: Cheerio — fast discovery
  const { discoveredUrls, stats: cheerioStats } = await runCheerioPass(db, turndown, existingHashes);

  // Determine URLs for Pass 2
  // In full mode: process ALL discovered URLs with Playwright
  // In incremental mode: process newly added (cheerio-only) + existing cheerio-only articles
  let playwrightUrls: string[];
  if (incremental) {
    const cheerioOnly = db.getCheerioOnlyArticles().map(a => a.url);
    playwrightUrls = [...new Set(cheerioOnly)];
    console.log(`[${nowChisinau()}] ${playwrightUrls.length} articles need Playwright enhancement`);
  } else {
    playwrightUrls = [...discoveredUrls];
  }

  // Pass 2: Playwright — JS content extraction
  const playwrightStats = await runPlaywrightPass(db, turndown, playwrightUrls);

  // Finalize
  db.rebuildFTS();

  const totalStats: CrawlStats = {
    pagesCrawled: cheerioStats.pagesCrawled + playwrightStats.pagesCrawled,
    pagesAdded: cheerioStats.pagesAdded + playwrightStats.pagesAdded,
    pagesUpdated: cheerioStats.pagesUpdated + playwrightStats.pagesUpdated,
    pagesUnchanged: cheerioStats.pagesUnchanged + playwrightStats.pagesUnchanged,
    codeExamplesExtracted: cheerioStats.codeExamplesExtracted + playwrightStats.codeExamplesExtracted,
    sectionsCreated: cheerioStats.sectionsCreated + playwrightStats.sectionsCreated,
    errors: cheerioStats.errors + playwrightStats.errors,
  };

  const dbStats = db.getStats();
  db.setMetadata("last_scrape_date", nowChisinau());
  db.setMetadata("last_scrape_mode", mode);
  db.setMetadata("total_articles", String(dbStats.total_articles ?? 0));
  db.setMetadata("total_code_examples", String(dbStats.total_code_examples ?? 0));
  db.setMetadata("total_sections", String(dbStats.total_sections ?? 0));
  db.setMetadata("version", "8.x");

  db.finishCrawl(crawlId, {
    pages_crawled: totalStats.pagesCrawled,
    pages_added: totalStats.pagesAdded,
    pages_updated: totalStats.pagesUpdated,
    pages_unchanged: totalStats.pagesUnchanged,
    code_examples_extracted: totalStats.codeExamplesExtracted,
    sections_created: totalStats.sectionsCreated,
    errors: totalStats.errors,
    status: "completed",
  });

  console.log(`\n[${nowChisinau()}] ═══ Hybrid crawl completed! ═══`);
  console.log(`  Mode:              ${mode}`);
  console.log(`  ── Pass 1 (Cheerio) ──`);
  console.log(`    URLs discovered:   ${discoveredUrls.size}`);
  console.log(`    Pages stored:      ${cheerioStats.pagesAdded} added, ${cheerioStats.pagesUpdated} updated`);
  console.log(`  ── Pass 2 (Playwright) ──`);
  console.log(`    Pages rendered:    ${playwrightStats.pagesCrawled}`);
  console.log(`    Pages enhanced:    ${playwrightStats.pagesUpdated}`);
  console.log(`    Pages added:       ${playwrightStats.pagesAdded}`);
  console.log(`  ── Totals ──`);
  console.log(`    Code examples:     ${totalStats.codeExamplesExtracted}`);
  console.log(`    Sections:          ${totalStats.sectionsCreated}`);
  console.log(`    Errors:            ${totalStats.errors}`);
  console.log(`    DB articles:       ${dbStats.total_articles ?? 0}`);
  console.log(`    DB code examples:  ${dbStats.total_code_examples ?? 0}`);
  console.log(`    DB sections:       ${dbStats.total_sections ?? 0}`);

  db.close();
}

main().catch((err) => {
  console.error(`[${nowChisinau()}] Fatal error:`, err);
  process.exit(1);
});
