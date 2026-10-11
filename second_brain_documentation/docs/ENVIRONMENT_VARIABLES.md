# Environment Variables

This document lists the environment variables required for the Second Brain application.

## Web Application (apps/web)

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for the web app | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key for the web app | Yes |
| `NEXT_PUBLIC_MCP_SERVER_URL` | MCP server URL for agent integration | No |

## Mobile Application (apps/mobile)

| Variable | Description | Required |
|---|---|---|
| `FLUTTER_SUPABASE_URL` | Supabase project URL for the Flutter app | Yes |
| `FLUTTER_SUPABASE_ANON_KEY` | Supabase anonymous key for the Flutter app | Yes |

## MCP Server (packages/mcp-server)

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL for the MCP server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only) | Yes |
| `MCP_PORT` | Port for the MCP server to listen on | No (default: 3001) |

## Shared (all environments)

| Variable | Description | Required |
|---|---|---|
| `NODE_ENV` | Node.js environment (development/production) | No (default: development) |
| `FLUTTER_ENV` | Flutter build environment | No |

### .env.example files

Create `.env.example` files in each project root with placeholder values:

**apps/web/.env.example:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3001
```

**apps/mobile/.env.example:**
```
FLUTTER_SUPABASE_URL=https://your-project.supabase.co
FLUTTER_SUPABASE_ANON_KEY=your_anon_key_here
```

**packages/mcp-server/.env.example:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
MCP_PORT=3001
```

### Security notes

- **Never commit real `.env` files to version control.** The `.env.example` files contain only placeholders.
- The `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to client-side code (web or mobile). It is used only server-side in the MCP service.
- Use Supabase Auth for user authentication; the anon key is safe for client-side use because RLS policies enforce authorization at the database level.
- Rotate keys if exposure is suspected.