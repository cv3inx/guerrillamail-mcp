# guerrillamail-mcp

MCP server for the [Guerrilla Mail](https://www.guerrillamail.com/) temporary/disposable email API. Spin up throwaway inboxes, poll for mail, and read messages from any MCP client.

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
