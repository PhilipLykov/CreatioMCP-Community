# CreatioMCP Community Edition

[![license](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)

**AI-Powered MCP Server for Creatio Platform Development**

A product of **ITSC** | Contact: philip@itsc.md

---

## What is CreatioMCP?

CreatioMCP is a Model Context Protocol (MCP) server that connects AI development environments (Cursor IDE, Claude Desktop) directly to Creatio 8.x instances — both cloud and on-premises. It enables AI-assisted development — replacing manual configuration with natural-language-driven automation to dramatically shorten time-to-market for Creatio projects.

All MCP server processing runs locally on your machine, ensuring full auditability and data sovereignty.

## Community Edition Features

The Community Edition is **free** and provides the core capabilities needed to get started with AI-assisted Creatio development:

### Environment Management
- Connect and authenticate to Creatio 8.x instances (cloud or on-premises)
- Cookie-based authentication (Community), OAuth 2.0 (SMB+)
- Single environment support
- Health checks with latency metrics
- Session lifecycle management

### Data Operations (Read-Only)
- OData-based querying with filtering, pagination, and column selection
- Safe read-only access — no risk of accidental data modifications

### Machine Academy™
Knowledge-assisted implementation guidance grounded in practical Creatio development patterns:
- Full-text search across curated implementation guidance
- Component catalog with Freedom UI patterns
- Handler patterns and deployment best practices
- Cross-database SQL reference
- Auto-generated Cursor IDE rules (.mdc files)

### AI-Generated Development Rules
- Automatic generation of `.cursor/rules/*.mdc` files with Creatio conventions
- Dynamic component catalogs and UI knowledge from Academy database

## Quick Start

### Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/)
- **Creatio 8.x** — on-premises instance with admin access
- **Cursor IDE** or **Claude Desktop**

### Installation

1. Download the latest release from [Releases](https://github.com/PhilipLykov/CreatioMCP-Community/releases)
2. Extract the archive
3. Open a terminal in the extracted directory and install globally:

```bash
npm install -g .
```

This registers the `creatio-mcp-server` command on your system.

### Setup

Configure your Creatio instance:

```bash
creatio-mcp-server setup --url https://myapp.creatio.com --login admin --password pass
```

The setup wizard validates the connection and prints a Cursor MCP configuration block.

### Connect to Your IDE

#### Option A: Cursor IDE (via Settings UI)

1. Open Cursor Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
2. Navigate to **Tools & MCP**
3. Click **"Add new MCP server"**
4. Fill in:
   - **Name:** `creatio`
   - **Type:** `command`
   - **Command:** `creatio-mcp-server start`
5. Click **Install**
6. **Fully restart Cursor** (close and reopen — not just reload)

#### Option A (alternative): Cursor IDE (via JSON file)

Create or edit `.cursor/mcp.json` in your project root (project-level) or `~/.cursor/mcp.json` (global):

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

Fully restart Cursor after saving.

#### Option B: Claude Desktop

Edit the Claude Desktop configuration file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

You can also open it via Claude Desktop: **Settings → Developer → Edit Config**.

Add the CreatioMCP server:

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

**Fully restart Claude Desktop** (close and reopen, not just close the window).

When connected, you should see the tools icon (🔨) in the chat input area.

### Verify the Connection

In your IDE chat, type:

> "Use creatio_health_check to verify my Creatio connection."

You should receive a response with the Creatio instance status and latency metrics.

### First Query

Ask the AI to read data:

> "Use creatio_query_data to read the first 5 Contacts from my Creatio instance."

You should see JSON results with Contact records.

## Available Tools (Community Edition)

| Tool | Description |
|------|-------------|
| `creatio_connect` | Connect to a Creatio instance with authentication |
| `creatio_disconnect` | Disconnect from a Creatio instance |
| `creatio_list_environments` | List all configured environments |
| `creatio_health_check` | Check Creatio instance health with latency metrics |
| `creatio_query_data` | Query data via OData with filtering and pagination |
| `creatio_get_record` | Retrieve a single record by ID |
| `creatio_search_academy` | Search the Creatio knowledge base |
| `creatio_generate_cursor_rules` | Generate Cursor IDE development rules |

## Optional: Academy Knowledge Base

The Academy knowledge base provides AI-assisted guidance for Creatio development. It is optional but recommended.

1. Download `academy-db.zip` from the [latest release](https://github.com/PhilipLykov/CreatioMCP-Community/releases)
2. Extract `academy.db` to the `data/` directory (or any location of your choice)
3. Set the path if using a non-default location:

```bash
set CREATIO_ACADEMY_DB_PATH=C:\path\to\academy.db
```

Without the Academy database, Academy search and Academy-backed prompts are unavailable — all other tools work normally.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | Transport mode (Community supports `stdio` only) | `stdio` |
| `MCP_LOG_LEVEL` | Log level: `debug`, `info`, `warn`, `error` | `info` |
| `CREATIO_DEFAULT_URL` | Default Creatio URL | N/A |
| `CREATIO_DEFAULT_LOGIN` | Default login | N/A |
| `CREATIO_DEFAULT_PASSWORD` | Default password | N/A |
| `CREATIO_DEFAULT_AUTH_TYPE` | Authentication type (`cookie`) | `cookie` |
| `CREATIO_ACADEMY_DB_PATH` | Path to Academy SQLite database | `./data/academy.db` |

## Troubleshooting

### Connection Refused
Verify the Creatio URL is correct and reachable. Ensure HTTPS for production environments. Check firewall rules for outbound connections (typically port 443).

### Authentication Failed
Confirm login and password. For cookie auth, ensure the user has web UI access. Try logging in manually at `https://your-instance/0`.

### No Default Environment
Run `creatio-mcp-server setup` again or use the `creatio_connect` tool with url, login, and password parameters.

### Academy Search Returns Empty
The Academy knowledge base is optional. Download `academy-db.zip` from the [Releases](https://github.com/PhilipLykov/CreatioMCP-Community/releases) page, extract `academy.db` to the `data/` directory, and restart the server.

## Upgrade to SMB or Enterprise

CreatioMCP is available in three editions:

| Edition | Key Capabilities |
|---------|-----------------|
| **Community** (Free) | Connect, read-only queries, Academy search, Cursor rules |
| **SMB** (Paid) | Full CRUD, schema management, CI/CD, testing, security audits, Business Bridge™ |
| **Enterprise** (Paid) | HTTP transport, unlimited environments, SQL execution, DLP, advanced security, load testing |

For pricing and licensing inquiries, contact: **philip@itsc.md**

## Requirements

- Node.js 20+
- Creatio 8.x (cloud or on-premises)
- Cursor IDE (v0.40+) or Claude Desktop

## Security

- AES-256-GCM credential encryption at rest
- File integrity verification with SHA-256 manifests
- OWASP Top 10 compliance
- No telemetry or data collection — all processing stays on-premises

## License

The software is proprietary and governed by the [EULA](EULA.md) and [LICENSE](LICENSE).

Community Edition is free-to-use for personal and commercial purposes under the EULA terms.

---

**CreatioMCP**, **Machine Academy**, and **Business Bridge** are trademarks of ITSC.
