# SignalForge — Autonomous AI Marketing Agent

SignalForge continuously researches your niche, drafts platform-optimized ad
posts (caption + AI-generated image) for Facebook, Instagram, and LinkedIn,
and waits for your approval before publishing anything. You stay
human-in-the-loop; the agent handles research, copywriting, creative, and
distribution.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + hand-rolled Shadcn/UI-style primitives (Radix + CVA) + Lucide icons
- **PostgreSQL** + **Prisma ORM**
- **NextAuth.js v5** (Google OAuth, JWT sessions, Prisma adapter for user/account storage)
- **AI**: pluggable provider layer — defaults to **Google Gemini** (text + Imagen 3 for images), with **OpenAI** (GPT-4o + DALL·E 3) as a drop-in alternate. Swap via `AI_TEXT_PROVIDER` / `AI_IMAGE_PROVIDER`.
- **Inngest** for scheduled + event-driven background jobs (research → generate → publish, with retries)
- **Vercel Blob** for storing generated images (falls back to inline data URLs in local dev)
- **Meta Graph API** (Facebook Pages + Instagram Business) and **LinkedIn UGC API** for publishing

## How it works

1. Connect a website under **Websites**. The agent scrapes it (via Firecrawl
   if configured, otherwise a lightweight fetch + text extraction) and infers
   your niche, products, target audience, and brand voice.
2. Connect your **Facebook Page**, **Instagram Business Account**, and
   **LinkedIn Company Page** under **Accounts** via OAuth.
3. The agent runs on a schedule you control (default every 6 hours, see
   **Settings**), or you can trigger it manually from the top bar at any time.
4. Each run: researches current trends in your niche → drafts 1–3 ad
   concepts with platform-specific captions, hashtags, and an image prompt →
   generates the image → saves everything as `PENDING_APPROVAL`.
5. You review drafts on the **Approvals** dashboard, previewed as they'd
   appear on each platform. Edit captions inline, approve, reject, or
   request a full regeneration.
6. Approving a post publishes it to every connected platform selected for
   that post, with automatic retries on transient failures. Results land in
   **History**.

## Project structure

```
app/
  (dashboard)/            # Authenticated app shell: approvals, websites, accounts, settings, history
  login/                  # Sign-in page
  api/
    auth/[...nextauth]/   # NextAuth handlers
    agent/                # Manual trigger + run history
    posts/                # Approve / reject / edit / regenerate
    websites/             # CRUD + analysis
    settings/             # Agent configuration
    social/
      connect/[platform]/   # OAuth kickoff
      callback/[platform]/  # OAuth token exchange + account storage
      accounts/              # List / disconnect connected accounts
    inngest/                # Inngest function serving endpoint
lib/
  ai/                     # Provider-agnostic text + image generation, prompts, research
    providers/            # gemini.ts, openai.ts
  agent/                  # Workflow orchestration (research → content → image → persist)
  social/                 # Facebook, Instagram, LinkedIn publishers + OAuth helpers
  website/                # Website scraping + brand analysis
  inngest/                # Client + background functions (scheduler, agent-run, publish, regenerate)
  auth.ts / auth.config.ts  # NextAuth (split for Edge middleware compatibility)
  db.ts, encryption.ts, notify.ts, storage.ts, utils.ts
components/
  ui/                     # Shadcn-style primitives (Button, Card, Dialog, Tabs, ...)
  dashboard/              # Approval feed + per-platform post previews
  websites/, accounts/, settings/, history/, shell/
prisma/schema.prisma      # Full data model
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in at minimum:

- `DATABASE_URL` — a PostgreSQL connection string.
- `AUTH_SECRET` — `openssl rand -hex 32`.
- `ENCRYPTION_KEY` — `openssl rand -hex 32` (used to encrypt social access tokens at rest).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for signing into the app itself.
- `GEMINI_API_KEY` — powers research, copywriting, and image generation by default.

Everything else (Firecrawl, Meta, LinkedIn, Blob storage, Inngest signing
keys) can be added incrementally — the app degrades gracefully (e.g. website
analysis falls back to basic scraping without Firecrawl; images render as
inline data URLs without Blob storage, though Facebook/Instagram publishing
*requires* a public image URL, so configure `BLOB_READ_WRITE_TOKEN` before
relying on those platforms).

### 3. Set up the database

```bash
npm run db:push      # or: npm run db:migrate
npm run db:generate
```

### 4. Run the app + background jobs

```bash
npm run dev
```

In a second terminal, run the local Inngest dev server so scheduled/event
jobs execute:

```bash
npx inngest-cli dev -u http://localhost:3000/api/inngest
```

Visit `http://localhost:3000`, sign in with Google, connect a website, and
click **Run agent now** in the top bar to generate your first batch of posts.

## Configuring social platform apps

### Meta (Facebook + Instagram)

1. Create an app at [developers.facebook.com](https://developers.facebook.com/apps).
2. Add the **Facebook Login** and **Instagram Graph API** products.
3. Set the OAuth redirect URI to `{NEXT_PUBLIC_APP_URL}/api/social/callback/meta`.
4. Request the `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, and `business_management`
   permissions (Meta App Review is required for production use beyond your
   own test users/pages).
5. Your Instagram account must be a **Business or Creator account** linked to
   the Facebook Page you connect.

### LinkedIn

1. Create an app at [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps).
2. Add the **Community Management API** product (needed for organization
   posting) and request access — this requires LinkedIn's approval.
3. Set the OAuth redirect URI to `{NEXT_PUBLIC_APP_URL}/api/social/callback/linkedin`.
4. You must be an administrator of the LinkedIn Company Page you connect.

## Switching AI providers

The AI layer is provider-agnostic (`lib/ai/index.ts` picks an implementation
based on env vars). To move from Gemini to OpenAI, set:

```
AI_TEXT_PROVIDER="openai"
AI_IMAGE_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
```

To add another provider (Anthropic, Grok, etc.), implement the `TextProvider`
and/or `ImageProvider` interfaces in `lib/ai/types.ts` under
`lib/ai/providers/`, and register it in `lib/ai/index.ts`.

## Deployment (Vercel)

1. Push to a Git repository and import it into Vercel.
2. Add all environment variables from `.env.example` in the Vercel project settings.
3. Provision a PostgreSQL database (Vercel Postgres, Neon, Supabase, etc.) and set `DATABASE_URL`.
4. Enable Vercel Blob storage and set `BLOB_READ_WRITE_TOKEN`.
5. Install the [Inngest Vercel integration](https://www.inngest.com/docs/deploy/vercel) (or set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` manually) so the scheduler and workflow functions run in production — Inngest auto-discovers functions from `/api/inngest`.
6. Run `npx prisma migrate deploy` against the production database as part of your deploy step.

## Notes on production hardening already in place

- Social access tokens are encrypted at rest (AES-256-GCM) before being stored.
- Every publish attempt is retried automatically by Inngest and its
  per-platform result (success/error) is recorded on the post.
- OAuth flows use a signed CSRF `state` parameter validated against an
  httpOnly cookie.
- Middleware auth check runs on the Edge without needing a direct database
  call (JWT sessions), while user/account persistence still goes through
  Prisma via the NextAuth adapter.
