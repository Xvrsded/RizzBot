# RizzBot

Discord Bot Management System for Roblox store operations. All management is done directly through Discord — no website, no frontend, no HTTP server.

## Tech Stack

- **Node.js** + **TypeScript**
- **Discord.js** v14
- **MongoDB** + **Mongoose**
- **Zod** (environment validation)
- **tsx** (development runtime)

## Project Structure (Phase 1)

```text
RizzBot/
├── bot/
│   ├── index.ts              # Entry point + graceful shutdown
│   ├── client.ts             # Discord client factory
│   ├── commands/
│   │   └── user/
│   │       └── ping.ts       # /ping command
│   ├── events/
│   │   ├── ready.ts
│   │   └── interactionCreate.ts
│   ├── loaders/
│   │   ├── command.loader.ts
│   │   └── event.loader.ts
│   ├── types/
│   │   └── command.ts
│   └── utils/
│       ├── errorHandler.ts
│       └── logger.ts
├── config/
│   └── env.ts                # Zod environment validation
├── database/
│   └── mongodb.ts            # MongoDB connection
├── scripts/
│   └── deploy-commands.ts    # Slash command deployment
├── .env.example
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- Discord Application with Bot token

## Setup

1. **Clone / open the project**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   Copy `.env.example` to `.env` and fill in the values:

   ```env
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_application_id
   DISCORD_GUILD_ID=your_test_guild_id
   MONGODB_URI=mongodb://localhost:27017/rizzbot
   ```

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `DISCORD_TOKEN` | Yes | Bot token from Discord Developer Portal |
   | `DISCORD_CLIENT_ID` | Yes | Application ID |
   | `DISCORD_GUILD_ID` | No | Deploy commands to a single guild (faster for dev) |
   | `MONGODB_URI` | Yes | MongoDB connection string |

4. **Deploy slash commands**

   ```bash
   npm run deploy:commands
   ```

   Set `DISCORD_GUILD_ID` during development so commands appear instantly on your test server. Omit it to deploy globally (can take up to an hour).

5. **Run the bot**

   Development (with hot reload):

   ```bash
   npm run dev:bot
   ```

   Production (direct):

   ```bash
   npm run bot
   ```

   Production (compiled):

   ```bash
   npm run build
   npm start
   ```

## Expected Output

When the bot starts successfully:

```text
[INFO] Starting RizzBot...
[MONGODB] Connecting to MongoDB...
[MONGODB] MongoDB connected
[INFO] Loaded 1 command(s)
[INFO] Loaded 2 event(s)
[DISCORD] Logging into Discord...
[DISCORD] RizzBot is online
```

Test with `/ping` in Discord — the bot should reply:

```text
Pong! 🏓
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run bot` | Run bot with tsx |
| `npm run dev:bot` | Run bot with tsx watch (hot reload) |
| `npm run deploy:commands` | Deploy slash commands to Discord |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled bot (`node dist/bot/index.js`) |

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| **1 — Core** | ✅ Done | Bot startup, MongoDB, logger, `/ping`, graceful shutdown |
| 2 — Dashboard | Pending | Persistent Discord management dashboard |
| 3 — Store | Pending | Product CRUD and catalog |
| 4 — Order | Pending | Order system |
| 5 — Ticket | Pending | Ticket system |
| 6 — Payment | Pending | Payment integration |
| 7 — Automation | Pending | Welcome, auto-role, announcements |

## Architecture Notes

- **No web server** — this project runs only as a Discord bot.
- **Multi-guild ready** — future models will use `guildId` for per-server configuration.
- **Modular loaders** — commands and events are auto-loaded from their directories; new features can be added without modifying core files.
- **Centralized error handling** — interaction errors and process-level exceptions are caught without crashing the bot.

## License

MIT
