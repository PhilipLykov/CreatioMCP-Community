# CreatioMCP Community Edition — Installation Manual

Step-by-step guide to install and configure the Community Edition.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | [Download](https://nodejs.org/) |
| Creatio | 8.x | Cloud or on-premises instance with admin access |
| IDE | See below | Cursor IDE (v0.40+) or Claude Desktop |

## Step 1: Install Node.js

Download and install Node.js 20 or later from [nodejs.org](https://nodejs.org/). Verify the installation:

```bash
node --version
# Expected: v20.x.x or higher
```

## Step 2: Download and Install CreatioMCP

1. Go to the [Releases](https://github.com/PhilipLykov/CreatioMCP-Community/releases) page
2. Download the **Source code** archive (zip or tar.gz) for the latest version
3. Extract it to a folder on your machine
4. Open a terminal in the extracted folder and run:

```bash
npm install -g .
```

This installs all dependencies and registers the `creatio-mcp-server` command globally.

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

## Step 4: Connect Your IDE

### Option A: Cursor IDE — Settings UI (recommended)

1. Open Cursor Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
2. Navigate to **Tools & MCP**
3. Click **"Add new MCP server"**
4. Fill in:
   - **Name:** `creatio`
   - **Type:** `command`
   - **Command:** `creatio-mcp-server start`
5. Click **Install**
6. **Fully restart Cursor** — close the application completely and reopen it (just reloading the window is not enough)

After restart, you should see `creatio` listed under Tools & MCP with a green status indicator.

### Option A (alternative): Cursor IDE — JSON Configuration

You can also configure Cursor via a JSON file. This is useful for sharing the configuration across a team.

**Project-level** (applies to one project): create `.cursor/mcp.json` in your project root.
**Global** (applies to all projects): create `~/.cursor/mcp.json`.

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

Save the file and **fully restart Cursor**.

### Option B: Claude Desktop

1. Open Claude Desktop
2. Go to **Settings → Developer → Edit Config** (or edit the file directly)

Configuration file locations:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the CreatioMCP server entry:

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

3. **Fully restart Claude Desktop** — close the application completely and reopen it
4. When connected, you should see the tools icon (🔨) in the chat input area indicating MCP tools are available

### Option C: Any MCP-Compatible Client

CreatioMCP uses the standard stdio transport. Any MCP-compatible client can connect by running:

```
creatio-mcp-server start
```

The server communicates via stdin/stdout using the MCP JSON-RPC protocol.

## Step 5: Verify the Connection

In your IDE chat, type:

> "Use creatio_health_check to verify my Creatio connection."

You should receive a response with the Creatio instance status and latency metrics.

If the tools are not visible, check:
1. Did you fully restart the IDE (not just reload)?
2. Is `creatio-mcp-server` accessible from your system PATH? Run `creatio-mcp-server --version` in a terminal to verify.
3. Check the IDE's MCP logs for error messages (in Cursor: Tools & MCP → click on the server name to see logs).

## Step 6 (Optional): Set Up Academy Knowledge Base

The Academy knowledge base provides AI-guided Creatio development assistance. It is optional but recommended.

1. Download `academy-db.zip` from the [latest release](https://github.com/PhilipLykov/CreatioMCP-Community/releases)
2. Create a `data` directory next to the installed package (or any location):

```bash
mkdir data
```

3. Extract `academy.db` from the archive into the `data` directory
4. If using a non-default location, set the environment variable:

```bash
set CREATIO_ACADEMY_DB_PATH=C:\path\to\academy.db
```

5. Restart the MCP server. Academy search and Cursor rules generation with dynamic knowledge will become available.

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
