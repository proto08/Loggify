# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Loggify is a Discord server verification system built with Next.js. Users authenticate via Discord OAuth2, complete a Turnstile CAPTCHA, and their data (Discord profile, IP geolocation, GPS coordinates, screen size, user agent) is logged to a Discord webhook. VPN/proxy users are blocked from completing verification.

## Commands

```bash
bun run dev        # Start dev server with Turbopack
bun run build      # Production build
bun run start      # Start production server
bun run check      # Biome lint + format (primary quality gate)
bun run lint       # Biome lint only
bun run format     # Biome format only (writes in place)
bun run knip       # Detect unused files, exports, and dependencies
```

There is no test suite. **Biome settings** (`biome.json`): 100-char line width, double quotes, 2-space indent, ES5 trailing commas.

## Architecture & Data Flow

The app is a single Next.js App Router project with all routes under `app/(main)/`. The core verification flow:

```
/ (home)
  → Discord OAuth redirect (login button)
  → /api/callback  — exchanges code, checks VPN via ASN, stores auth code + CSRF token in iron-session
  → /verify        — client collects GPS + screen size, renders Turnstile widget
  → /api/verify    — validates CSRF, validates Turnstile, exchanges Discord token, calls logger()
      → logger()   — fetches IP info, reverse-geocodes GPS, calls webhook() + assignRole()
  → /result/[status]  — success | vpn | error
```

**Key modules:**

- `lib/functions/logger.ts` — orchestrates all data collection; calls ipinfo.io for IP data and gps-coordinates.net for reverse geocoding
- `lib/functions/webhook.ts` — formats and POSTs a Discord embed with all collected data
- `lib/functions/verify.ts` — Turnstile validation and Discord OAuth token exchange
- `lib/functions/assign-role.ts` — Discord Bot API call to assign the verified role
- `lib/functions/ip-check.ts` — ASN-based VPN/proxy detection against `lib/asn.json`
- `lib/session.ts` — iron-session config (1-hour expiry, encrypted HTTP-only cookie, CSRF token stored per session)
- `lib/constants.ts` — single source of truth for all `process.env.*` values; import from here, not directly from `process.env`
- `lib/types.ts` — all shared TypeScript types (`DiscordUser`, `IpInfo`, `UserLocation`, `ScreenSize`, etc.)

**Client-side data collection** happens via hooks in `lib/hooks/`:
- `useUserLocation` — browser Geolocation API (GPS coordinates)
- `useScreenSize` — `window.innerWidth/Height`
- `useCsrfToken` — fetches token from `/api/csrf` and attaches it to the verify POST

## Conventions

**Imports**: Use the `@/` alias for all internal imports (maps to repo root). Never use relative paths like `../../`.

**Environment variables**: Always access via `lib/constants.ts` exports, not raw `process.env`.

**Styling**: Tailwind CSS v4 with shadcn/ui (new-york style, neutral base, CSS variables). Dark theme is forced — no light mode exists. The `cn()` utility from `lib/utils.ts` merges class names.

**Components**: Layout components live in `components/layouts/`, reusable UI in `components/shared/`. Mark client components with `"use client"` at the top of the file.

**Next.js dynamic params**: Route params are typed as `Promise<{ param: string }>` and must be awaited (Next.js 15+ pattern). See `app/(main)/result/[status]/page.tsx` for reference.

**No comments in source** — the existing codebase has none beyond occasional `console.error` labels.

## Environment Variables

Copy `.env.example` to `.env.local`. Required variables:

| Variable | Purpose |
|---|---|
| `DISCORD_GUILD_ID` | Target guild for role assignment |
| `DISCORD_ROLE_ID` | Role granted after verification |
| `DISCORD_BOT_TOKEN` | Bot token for role assignment API calls |
| `DISCORD_WEBHOOK` | Webhook URL for logging embeds |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | OAuth2 app credentials |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile CAPTCHA |
| `SESSION_PASSWORD` | iron-session encryption key (random string) |
| `BASE_URL` | Full origin URL (e.g. `http://localhost:3000`); used to construct the OAuth redirect URI |

## External Service Dependencies

- **Discord API** — OAuth2 + Bot API (role assignment)
- **Cloudflare Turnstile** — CAPTCHA verification
- **ipinfo.io** — IP geolocation and hostname resolution
- **gps-coordinates.net** — Reverse geocoding GPS coordinates to address strings
