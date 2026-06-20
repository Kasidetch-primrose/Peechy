# Peechy — Claude Code Context

## What this project is

**Peechy** is a full-stack interactive image-guessing game platform (Thai users, Thai UI language).
Players reveal tiles on a hidden image grid to guess the answer. Fewer tiles revealed = higher score.
Users can create games, set hints, publish, and browse other games.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | SvelteKit 2 + Svelte 5 (Runes — `$state`, `$derived`, `$effect`) |
| Language | TypeScript 5 strict mode |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL via Drizzle ORM |
| Cache | Redis (ioredis) — OTP & refresh token storage |
| Auth | JWT (HS256) — 24h access token / 90d refresh token + bcrypt (12 rounds) |
| Email | Nodemailer (Gmail SMTP) — OTP verification emails |
| File Storage | Cloudflare R2 — image uploads (max 5 MB, PNG/JPEG/WebP) |
| Fuzzy Match | Fuse.js (threshold 0.35) for guess checking |
| Build | Vite 7 + Drizzle Kit migrations |

## Project Structure

```
src/
  app.html                        # Root HTML shell
  routes/
    +layout.svelte                # Root layout (auth store hydration)
    layout.css                    # Global styles
    +page.svelte                  # Home: browse/search games
    auth/
      login/                      # Login page
      register/                   # Register + triggers OTP
      otp/                        # OTP verification page
    game/
      create/                     # Multi-image game builder
      detail/[id]/                # Game overview + images
      play/[id]/                  # Live gameplay
    api/
      auth/                       # register, login, refresh, logout, verify-otp, resend-otp
      games/                      # CRUD + paginate + like + play-count
      images/                     # CRUD + paginate + hint sync
      game-sessions/              # CRUD + paginate
      upload-image/               # R2 upload endpoint
  lib/
    components/
      Navbar.svelte
      GameCard.svelte
      GameCardSkeleton.svelte
    data/
      services/                   # Client-side API callers (AuthService, GameService, ImageService, GameSessionService)
      stores/                     # Svelte writable stores (authUserStore, gamePlayStore, gameDetailStore, gameCreateStore)
      models/                     # TypeScript interfaces for all entities
    server/
      db/
        index.ts                  # Drizzle db instance
        schema.ts                 # All table definitions
      auth-service.ts             # OTP, JWT, bcrypt logic
      logic/                      # Server business logic (games, images, sessions)
      upload.ts                   # R2 upload handler
      utils/
        redis.ts
        mailer.ts
    styles/
      colors.ts                   # Design token values (TS)
      tokens.css                  # CSS variables
    utils/
      check-guess.ts              # Fuzzy + exact guess matching
```

## Database Schema (all tables have soft-delete via `deletedAt`)

- `users` — id, username (unique), email (unique), password, name, isVerified
- `games` — id, name, description, difficulty (easy/medium/hard), isPublic, likes, playCount, thumbnailUrl, creatorId→users
- `images` — id, gameId→games, name, imageUrl, thumbnailUrl, answer, gridSize, orderIndex, timeLimit, maxReveal
- `imageHints` — id, imageId→images, hint, orderIndex
- `gameSessions` — id, userId→users, gameId→games, currentImageIndex, revealedTiles (jsonb), undoStack (jsonb), score, isFinished
- `user_game_likes` — userId + gameId (composite PK)

## Key Stores

| Store | Purpose |
|-------|---------|
| `authUserStore` | accessToken, refreshToken, user — persisted in localStorage |
| `gamePlayStore` | Full gameplay state: tiles, guesses, score, hints, timer, status |
| `gameDetailStore` | Game + images for detail page, `isCreatorStore` derived |
| `gameCreateStore` | Multi-image game builder, upload slots, validation |
| `registerStore` / `loginStore` / `otpStore` | Auth form states |

## Auth Flow

1. Register → OTP email sent (6-digit, 10 min Redis TTL)
2. Verify OTP → `isVerified = true`
3. Login → access + refresh JWT returned → stored in `authUserStore` (localStorage)
4. Refresh token rotates on use; stored in Redis

## Gameplay Flow

1. Player opens `/game/play/[id]` → `gamePlayStore.loadGame()` creates a session
2. Reveal tiles one at a time (N×N grid), can undo
3. Hints available per image (cost score)
4. Submit guess → exact match or fuzzy (Fuse.js 0.35 threshold) → correct/close/wrong
5. Score = function of tiles remaining when correct
6. Multi-image sequences tracked via `gameSessions.currentImageIndex`

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run check        # TypeScript + Svelte type check
npm run db:push      # Apply schema to DB
npm run db:generate  # Generate migration files
npm run db:studio    # Drizzle Studio UI
```

## Environment Variables Required

```
DATABASE_URL         # PostgreSQL connection string
REDIS_URL            # Redis connection string
BETTER_AUTH_SECRET   # JWT signing secret
ORIGIN               # http://localhost:5173 (dev)
SMTP_HOST/USER/PASS  # Gmail SMTP
R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME/PUBLIC_URL
```

## Design System

- Pastel pink / light orange palette — playful, cute, kawaii aesthetic
- Style: claymorphism / rounded soft UI
- Thai-language UI text throughout
- Tailwind CSS 4 with custom CSS token variables in `src/lib/styles/tokens.css`

## Current Work In Progress (as of 2026-06-20)

Files with uncommitted changes:
- `src/app.html`
- `src/lib/components/GameCard.svelte`
- `src/lib/components/GameCardSkeleton.svelte`
- `src/lib/components/Navbar.svelte`
- `src/lib/styles/colors.ts`
- `src/lib/styles/tokens.css`
- `src/routes/auth/login/+page.svelte`
- `src/routes/game/create/+page.svelte`
- `src/routes/game/detail/[id]/+page.svelte`
- `src/routes/layout.css`

Recent commits:
- `8a9b6ce` claude skill
- `179af98` facebook & google login (not finished)
- `f07e8c7` add profile page
- `ae9e5c8` add hint

Facebook & Google OAuth login is started but **not finished**.
