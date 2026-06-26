# guerrillamail-mcp

[![npm version](https://img.shields.io/npm/v/guerrillamail-mcp.svg)](https://www.npmjs.com/package/guerrillamail-mcp)
[![npm downloads](https://img.shields.io/npm/dm/guerrillamail-mcp.svg)](https://www.npmjs.com/package/guerrillamail-mcp)
[![license](https://img.shields.io/npm/l/guerrillamail-mcp.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/guerrillamail-mcp.svg)](https://nodejs.org)

MCP server for the [Guerrilla Mail](https://www.guerrillamail.com/) temporary/disposable email API. Spin up throwaway inboxes, poll for mail, and read messages from any MCP client — Claude Desktop, Claude Code, Cursor, or any other.

**Zero config. No API key. One command.**

```bash
npx -y guerrillamail-mcp
```

## Why

Need a throwaway email inside an AI workflow — signup testing, OTP capture, scratch inbox — without leaving the agent? This wires Guerrilla Mail's disposable inboxes straight into the Model Context Protocol so your agent can create an address, watch for mail, and read it, all on its own.

## Install & usage

Run directly with npx — no install needed:

```bash
npx -y guerrillamail-mcp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "guerrillamail": {
      "command": "npx",
      "args": ["-y", "guerrillamail-mcp"]
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add guerrillamail -- npx -y guerrillamail-mcp
```

## Tools

| Tool | Description | Inputs |
|------|-------------|--------|
| `get_email_address` | Get a new disposable address and start a session. | `lang` (optional, default `"en"`) |
| `set_email_user` | Set the local part of the address for the session. | `email_user` (required) |
| `check_inbox` | Check the inbox; poll only newer mail with `seq`. | `seq` (optional, default `"0"`) |
| `fetch_email` | Fetch the full body of one email (HTML stripped). | `email_id` (required) |
| `delete_emails` | Delete one or more emails. | `email_ids` (required, `string[]`) |
| `forget_me` | Forget the session and clear local state. | none |

## Notes

- Session state (`sid_token` + `PHPSESSID` cookie) is held in memory for the life of the process.
- No API key required. Uses the public Guerrilla Mail AJAX endpoint.

## License

MIT
