#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "http://api.guerrillamail.com/ajax.php";
const IP = "127.0.0.1";
const AGENT = "guerrillamail-mcp/1.0";

// Session state, persisted across tool calls within this process.
let sidToken: string | null = null;
let cookieJar: string | null = null;

// ponytail: regex HTML strip is good enough for plaintext excerpts; swap for a parser only if real markup fidelity is needed.
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toIso(timestamp: unknown): string {
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n === 0) return "";
  return new Date(n * 1000).toISOString();
}

async function api(params: Record<string, string>): Promise<any> {
  const url = new URL(BASE_URL);
  url.searchParams.set("ip", IP);
  url.searchParams.set("agent", AGENT);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (sidToken) url.searchParams.set("sid_token", sidToken);

  const headers: Record<string, string> = {};
  if (cookieJar) headers["Cookie"] = cookieJar;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);

  // Capture PHPSESSID from Set-Cookie if present.
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/PHPSESSID=[^;]+/);
    if (match) cookieJar = match[0];
  }

  // Some endpoints (e.g. del_email) can return an empty body — guard the parse.
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (data && typeof data.sid_token === "string") sidToken = data.sid_token;
  return data;
}

function ok(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

const TOOLS = [
  {
    name: "get_email_address",
    description: "Get a new disposable Guerrilla Mail address and start a session.",
    inputSchema: {
      type: "object",
      properties: {
        lang: { type: "string", description: "Language code (default 'en')." },
      },
    },
  },
  {
    name: "set_email_user",
    description: "Set the local part of the email address for the current session.",
    inputSchema: {
      type: "object",
      properties: {
        email_user: { type: "string", description: "Desired local part (before the @)." },
      },
      required: ["email_user"],
    },
  },
  {
    name: "check_inbox",
    description: "Check the inbox. Pass seq to poll only emails newer than that id.",
    inputSchema: {
      type: "object",
      properties: {
        seq: { type: "string", description: "Sequence id to poll from (default '0')." },
      },
    },
  },
  {
    name: "fetch_email",
    description: "Fetch the full body of a single email by id.",
    inputSchema: {
      type: "object",
      properties: {
        email_id: { type: "string", description: "The email id to fetch." },
      },
      required: ["email_id"],
    },
  },
  {
    name: "delete_emails",
    description: "Delete one or more emails by id.",
    inputSchema: {
      type: "object",
      properties: {
        email_ids: {
          type: "array",
          items: { type: "string" },
          description: "List of email ids to delete.",
        },
      },
      required: ["email_ids"],
    },
  },
  {
    name: "forget_me",
    description: "Forget the current session and clear local session state.",
    inputSchema: { type: "object", properties: {} },
  },
];

const server = new Server(
  { name: "guerrillamail-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    switch (name) {
      case "get_email_address": {
        const lang = (args.lang as string) ?? "en";
        const data = await api({ f: "get_email_address", lang });
        return ok({
          email_addr: data.email_addr,
          alias: data.alias,
          email_timestamp: toIso(data.email_timestamp),
          sid_token: data.sid_token,
        });
      }
      case "set_email_user": {
        const email_user = args.email_user as string;
        if (!email_user) throw new Error("email_user is required");
        const data = await api({ f: "set_email_user", email_user });
        return ok({ email_addr: data.email_addr, alias: data.alias });
      }
      case "check_inbox": {
        const seq = (args.seq as string) ?? "0";
        const data = await api({ f: "check_email", seq });
        const list = Array.isArray(data.list) ? data.list : [];
        const mapped = list.map((m: any) => ({
          id: m.mail_id,
          from: m.mail_from,
          subject: m.mail_subject,
          excerpt: m.mail_excerpt,
          date: toIso(m.mail_timestamp),
          read: m.mail_read === "1" || m.mail_read === 1,
        }));
        return ok(mapped);
      }
      case "fetch_email": {
        const email_id = args.email_id as string;
        if (!email_id) throw new Error("email_id is required");
        const data = await api({ f: "fetch_email", email_id });
        return ok({
          id: data.mail_id,
          from: data.mail_from,
          subject: data.mail_subject,
          body: stripHtml(String(data.mail_body ?? "")),
          date: toIso(data.mail_timestamp),
        });
      }
      case "delete_emails": {
        const email_ids = args.email_ids as string[];
        if (!Array.isArray(email_ids) || email_ids.length === 0)
          throw new Error("email_ids must be a non-empty array");
        const data = await api({ f: "del_email", email_ids: email_ids.join(",") });
        return ok({ deleted_ids: data.deleted_ids ?? email_ids });
      }
      case "forget_me": {
        await api({ f: "forget_me" });
        sidToken = null;
        cookieJar = null;
        return ok("Session forgotten and local state cleared.");
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return fail(err);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
