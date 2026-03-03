# CreatioMCP Community Edition — Installation Manual

Step-by-step guide to install and configure the Community Edition.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | [Download](https://nodejs.org/) |
| Creatio | 8.x | On-premises instance with admin access |
| IDE | Any | Cursor IDE or Claude Desktop recommended |

## Step 1: Install Node.js

Download and install Node.js 20 or later from [nodejs.org](https://nodejs.org/). Verify the installation:

```bash
node --version
# Expected: v20.x.x or higher
```

## Step 2: Install CreatioMCP

Install the package globally via npm:

```bash
npm install -g creatio-mcp-server
```

Verify the installation:

```bash
creatio-mcp-server --version
```

## Step 3: Configure Your Creatio Instance

Run the setup wizard to configure your first Creatio connection:

```bash
creatio-mcp-server setup --url https://myapp.creatio.com --login admin --password yourpassword
```

**Parameters:**
- `--url` — Your Creatio instance URL (HTTPS recommended for production)
- `--login` — Creatio admin username
- `--password` — Creatio admin password

If the connection succeeds, the wizard:
1. Saves encrypted credentials locally in `~/.creatiomcp/`
2. Prints a Cursor MCP configuration block

## Step 4: Configure Your IDE

### Cursor IDE

1. Open Cursor Settings (Ctrl+Comma or Cmd+Comma)
2. Navigate to **MCP** section
3. Add the following configuration:

```json
{
  "mcpServers": {
    "creatio": {
      "command": "creatio-mcp-server",
      "args": ["start"]
    }
  }
}
```

4. Restart Cursor IDE

### Claude Desktop

Add to your Claude Desktop configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "creatio": {
      "command": "creatio-mcp-server",
      "args": ["start"]
    }
  }
}
```

Restart Claude Desktop.

## Step 5: Verify the Connection

In your IDE chat, type:

> "Use creatio_health_check to verify my Creatio connection."

You should receive a response with the Creatio instance status and latency metrics.

## Step 6 (Optional): Set Up Academy Knowledge Base

The Academy knowledge base provides AI-guided Creatio development assistance. To populate it:

```bash
cd tools/academy-scraper
npm install
npx tsx scrape.ts
```

This creates a local SQLite database. The default path is `./data/academy.db`. To use a custom location:

```bash
set CREATIO_ACADEMY_DB_PATH=C:\path\to\academy.db
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | `stdio` (only option for Community) | `stdio` |
| `MCP_LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `info` |
| `CREATIO_DEFAULT_URL` | Default Creatio URL | Set during setup |
| `CREATIO_DEFAULT_LOGIN` | Default login | Set during setup |
| `CREATIO_DEFAULT_PASSWORD` | Default password | Set during setup |
| `CREATIO_DEFAULT_AUTH_TYPE` | `cookie` | `cookie` |
| `CREATIO_ACADEMY_DB_PATH` | Path to Academy SQLite DB | `./data/academy.db` |
| `CREATIO_ALLOW_SELF_SIGNED_CERTS` | `true` for dev environments with self-signed certs | `false` |

## Uninstall

```bash
npm uninstall -g creatio-mcp-server
```

To remove all local configuration:

```bash
# Windows
rmdir /s /q %USERPROFILE%\.creatiomcp

# macOS/Linux
rm -rf ~/.creatiomcp
```

## Upgrading to Paid Editions

If you need full CRUD, schema management, CI/CD, security audits, or other advanced features, upgrade to SMB or Enterprise edition. Contact **philip@itsc.md** for licensing.
