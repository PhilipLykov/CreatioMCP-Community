# Creatio Academy Scraper

Downloads all Creatio Academy documentation, extracts code examples and article sections into a SQLite knowledge database optimized for machine teaching.

The scraper uses a two-pass approach:
- Pass 1: `CheerioCrawler` for URL discovery and static extraction
- Pass 2: `PlaywrightCrawler` for JavaScript-rendered article content

## Prerequisites

- Node.js 20+
- Dependencies installed: `npm install`
- Playwright browser: `npx playwright install chromium`

## Usage

### Full Crawl (first time or reset)

```bash
npx tsx scrape.ts
```

Downloads all pages from `academy.creatio.com/docs/8.x/`, extracts code examples and sections, stores in `data/academy.db`.

### Incremental Update

```bash
npx tsx scrape.ts --incremental
```

Only re-processes pages that have changed since the last crawl (compared via SHA-256 content hash).

### Search

```bash
# Search everything (code + docs)
npx tsx search-cli.ts "handler patterns"

# Search code examples only
npx tsx search-cli.ts --code "crt.ComboBox"

# Search documentation only
npx tsx search-cli.ts --docs "business rules"

# Show database statistics
npx tsx search-cli.ts --stats
```

## Database

Output: `../../data/academy.db` (SQLite with FTS5)

### Tables

| Table | Purpose |
|-------|---------|
| `articles` | Full article content (archive) |
| `code_examples` | Extracted code blocks with purpose classification |
| `sections` | Article sections chunked by H2/H3 headings |
| `categories` | Topic hierarchy |
| `code_fts` | Full-text search index on code examples |
| `sections_fts` | Full-text search index on sections |
| `crawl_log` | Crawl history and statistics |
| `metadata` | Database metadata (last crawl date, version, etc.) |

### Code Example Classification

Each code block is auto-classified by purpose:

| Purpose | Detection Pattern |
|---------|------------------|
| `handler` | `crt.Handle*Request`, `next?.handle` |
| `schema-config` | `viewConfigDiff`, `modelConfigDiff` |
| `ui-component` | `crt.Input`, `crt.Button`, `crt.ComboBox`, etc. |
| `odata-query` | `/odata/`, `$filter=`, `$select=` |
| `entity-definition` | `entitySchemaName`, `EntitySchemaManager` |
| `api-call` | `/rest/`, `fetch(`, `.svc/` |
| `sql` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `business-process` | `ProcessSchemaManager`, `FlowElement` |
| `csharp-backend` | `namespace`, `public class`, C# patterns |
| `configuration` | `descriptor.json`, `SysSettings` |
| `general` | Everything else |

## Polite Crawling

- Rate limited to 30 requests/minute per crawler pass
- Max 3 concurrent connections per crawler pass
- `respectRobotsTxtFile: true` is enabled for both crawler passes

## Temporary Files

- Temporary crawler state is written to `storage-cheerio/` and `storage-playwright/`.
- These folders are safe to delete between runs.
