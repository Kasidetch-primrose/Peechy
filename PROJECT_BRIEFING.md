# Peechy — Project Briefing

You are working on **Peechy**, a Thai-language image-guessing game platform. Players reveal tiles on a blurred/hidden image grid one at a time and try to guess what the image shows — fewer tiles revealed before guessing correctly = higher score. Users can create their own games (multi-image sequences with hints), publish them, and browse/play games made by others.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (Runes — `$state`, `$derived`, `$effect`) |
| Language | TypeScript 5 strict mode |
| Styling | Tailwind CSS 4, custom design tokens |
| Database | PostgreSQL via Drizzle ORM |
| Cache | Redis (ioredis) — OTP codes & refresh token storage |
| Auth | Custom JWT (HS256), 24h access / 90d refresh token + bcrypt (12 rounds) |
| OAuth | Google & Facebook login — **started, not finished** |
| Email | Nodemailer (Gmail SMTP) — OTP verification emails |
| File Storage | Cloudflare R2 — image uploads (max 5MB, PNG/JPEG/WebP) |
| Fuzzy Match | Fuse.js (threshold 0.35) for guess checking, see `src/lib/utils/check-guess.ts` |
| Build | Vite 7 + Drizzle Kit migrations |

## Project Structure

```
src/
  app.html
  routes/
    +layout.svelte
    +page.svelte                  # Home: browse/search games
    auth/
      login/ register/ otp/ forget-password/ oauth-callback/
    game/
      create/                     # Multi-image game builder
      detail/[id]/                # Game overview + images
      play/[id]/                  # Live gameplay
    profile/[id]/
    api/
      auth/                       # register, login, refresh, logout, verify-otp, resend-otp, oauth/[provider], oauth/exchange
      games/                      # CRUD + paginate + list + like + play
      images/                     # CRUD + paginate + hints
      game-sessions/              # CRUD + paginate
      upload-image/
  lib/
    components/                   # Navbar, GameCard, GameCardSkeleton, HomeHeader
    data/
      services/                   # Client-side API callers (Auth, Game, Image, GameSession)
      stores/                     # Svelte stores (authUser, gamePlay, gameDetail, gameCreate, register, login, otp, profile)
      interface/                  # TypeScript interfaces (auth, game)
    server/
      db/                         # Drizzle models: UserModel, GamesModel, ImagesModel, ImageHintsModel, GameSessionsModel, base (soft-delete columns), schema.ts (barrel)
      auth-service.ts             # OTP, JWT, bcrypt, OAuth login/link/create logic
      oauth.ts                    # OAuth provider handlers
      logic/                      # Server business logic per domain (games, images, game-sessions)
      upload.ts / r2.ts           # R2 upload handler
      utils/                      # redis.ts, mailer.ts
    styles/                       # colors.ts, tokens.css, typography.ts, spacing.ts, radii.ts
    utils/check-guess.ts          # Fuzzy + exact guess matching
  hooks.server.ts                 # Fire-and-forget cleanup of anonymous games >60 days old
```

## Database Schema (all tables soft-delete via `deleted_at`)

- **`users`** — id, username (unique), email (unique), password (bcrypt hash), name, is_verified
- **`user_oauth_accounts`** — links a user to a provider account (provider, provider_user_id)
- **`games`** — id, name, description, difficulty, is_public, likes, play_count, thumbnail_url, creator_id→users (nullable, null = anonymous), creator_token
- **`images`** — id, game_id→games, name, image_url, thumbnail_url, answer, hint, grid_size, order_index, time_limit, max_reveal
- **`image_hints`** — id, image_id→images, hint, order_index (multiple ordered hints per image)
- **`game_sessions`** — id, user_id→users, game_id→games, current_image_index, revealed_tiles (jsonb int[]), undo_stack (jsonb int[][]), score, is_finished
- **`user_game_likes`**, **`user_saved_games`** — social features (likes/bookmarks)

## Auth Flow

1. Register → OTP email sent (6-digit, 10 min Redis TTL)
2. Verify OTP → `is_verified = true`
3. Login → access + refresh JWT issued → stored client-side in `authUserStore` (localStorage)
4. Refresh token rotates on use; cached in Redis
5. OAuth (Google/Facebook): match by existing OAuth link → else match by email (link account) → else create new user. **Not finished yet.**

## Gameplay Flow

1. Player opens `/game/play/[id]` → `gamePlayStore.loadGame()` creates a session
2. Reveal grid tiles one at a time (N×N), can undo
3. Hints available per image (cost score)
4. Submit guess → exact match or Fuse.js fuzzy match (0.35 threshold) → correct / close / wrong
5. Score is a function of tiles remaining when guessed correctly
6. Multi-image game sequences tracked via `game_sessions.current_image_index`

## Design System

- Pastel pink/orange palette (primary `#FF9B73`), playful claymorphism / soft rounded UI
- All UI copy is in **Thai**
- Design tokens in `src/lib/styles/colors.ts` + `src/lib/styles/tokens.css`

## Environment Variables

```
DATABASE_URL          # postgres://postgres:<pass>@localhost:5432/peechy
REDIS_URL             # redis://localhost:6379
BETTER_AUTH_SECRET    # JWT signing secret
ORIGIN                # http://localhost:5173 (dev)
SMTP_HOST/USER/PASS/FROM
R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL
```

## Dev Commands

```bash
npm run dev          # Start dev server
npm run build
npm run check        # TypeScript + Svelte type check
npm run db:push      # Apply schema to DB
npm run db:generate  # Generate migration files
npm run db:studio    # Drizzle Studio UI
```

## Current State (as of 2026-06-20)

- Facebook & Google OAuth login is **in progress, not finished** (`src/lib/server/oauth.ts`, `src/routes/api/auth/oauth/*`, `src/routes/auth/oauth-callback/`)
- Recently added: profile page, hint system, claude-skill tooling
- Local PostgreSQL is running as a Windows service (`postgresql-x64-18`) and reachable at `localhost:5432`
