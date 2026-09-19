# AutoPost AI — Autonomous AI Marketing Agent

AutoPost AI continuously researches your niche and drafts platform-optimized
posts — single images, 3–5 slide carousels, and Instagram Reel concepts (hook,
script, scene breakdown) — with captions in **English, Urdu, or both**, for
Facebook, Instagram, and LinkedIn. It waits for your approval before
publishing anything. You stay human-in-the-loop; the agent handles research,
copywriting, creative, and distribution.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + hand-rolled Shadcn/UI-style primitives (Radix + CVA) + Lucide icons
- **PostgreSQL** + **Prisma ORM**
- **NextAuth.js v5** (Google OAuth, JWT sessions, Prisma adapter for user/account storage)
- **AI**: pluggable provider layer — defaults to **Google Gemini** (text) + **Pollinations.ai** (free, no-key image generation), with **OpenAI** (GPT-4o + gpt-image-1) as a drop-in alternate. Swap via `AI_TEXT_PROVIDER` / `AI_IMAGE_PROVIDER`.
- **Inngest** for scheduled + event-driven background jobs (research → generate → publish, with retries)
- **Vercel Blob** for storing generated images (falls back to inline data URLs in local dev)
- **Meta Graph API** (Facebook Pages + Instagram Business) and **LinkedIn UGC API** for publishing

## How it works

1. Connect a website under **Websites**. The agent scrapes it (via Firecrawl
   if configured, otherwise a lightweight fetch + text extraction) and infers
   your niche, products, target audience, brand voice, and unique selling
   points — which seed your editable **Brand Profile**.
2. On **Settings**, fine-tune brand voice/tone, target audience, USPs,
   language preference (English / Urdu / Both), which content types to
   generate (image / carousel / reel), and run frequency.
3. Connect your **Facebook Page**, **Instagram Business Account**, and
   **LinkedIn Company Page** under **Accounts** via OAuth.
4. The agent runs on a schedule you control, or you can trigger it manually
   from the top bar at any time. Each run cycles through your selected
   content types, researches current trends, and drafts each post:
   - **Image**: one creative + caption.
   - **Carousel**: 3–5 slides, each with its own image and slide caption.
   - **Reel**: a cover image plus a full creative brief — hook, scene-by-scene
     breakdown, and full script (no video is rendered; this is the plan a
     human or video tool would execute from).
5. You review drafts on the **Approvals** dashboard — platform-accurate
   previews, carousel slide navigation, reel script breakdown. Edit captions
   (per-language), approve, reject, regenerate just the image(s), or request
   a full regeneration.
6. Approving a post publishes it to every connected platform, with automatic
   retries on transient failures. Results land in **History**.

### On Reels

No provider in this stack can render actual video, so a "Reel" here is a
complete creative brief (hook + script + shot-by-shot breakdown) plus a cover
image — not a rendered .mp4. Approving one publishes the cover image as a
regular feed post; producing the real video from the script is a manual step.

## Project structure

```
app/
  (dashboard)/            # Authenticated app shell: approvals, websites, accounts, settings, history
  login/                  # Sign-in page
  api/
    auth/[...nextauth]/   # NextAuth handlers
    agent/                # Manual trigger + run history
    posts/                # Approve / reject / edit / regenerate / regenerate-image
    websites/             # CRUD + analysis
    brand-profile/        # Brand voice, tone, USPs, language, content-type prefs
    settings/             # Agent scheduling configuration
    social/
      connect/[platform]/   # OAuth kickoff
      callback/[platform]/  # OAuth token exchange + account storage
      accounts/              # List / disconnect connected accounts
    inngest/                # Inngest function serving endpoint
lib/
  ai/                     # Provider-agnostic text + image generation, prompts, research
    providers/            # gemini.ts, openai.ts, pollinations.ts
  agent/                  # Workflow orchestration (research → content → image → persist)
  social/                 # Facebook, Instagram, LinkedIn publishers (single + carousel) + OAuth helpers
  website/                # Website scraping + brand analysis
  inngest/                # Client + background functions (scheduler, agent-run, publish, regenerate)
  auth.ts / auth.config.ts  # NextAuth (split for Edge middleware compatibility)
  db.ts, encryption.ts, notify.ts, storage.ts, utils.ts
components/
  ui/                     # Shadcn-style primitives (Button, Card, Dialog, Tabs, ...)
  dashboard/              # Approval feed, platform previews, carousel/reel previews
  websites/, accounts/, settings/, history/, shell/
prisma/schema.prisma      # Full data model
```

## Database model

- **User / Account / Session / VerificationToken** — NextAuth.
- **Website** — a connected site + what was scraped (niche, products, raw analysis).
- **BrandProfile** — the editable brand identity layer every prompt reads
  from: voice, tone, target audience, USPs, language preference, content
  type preferences, do's/don'ts. Seeded by website analysis, never
  overwritten by later re-analysis once you've customized it.
- **AgentSettings** — scheduling only: active/paused, frequency, posts per
  run, notifications, auto-approve.
- **GeneratedPost** — one post; `captions` and `reelScript` are JSON since
  their shape depends on `postType` (IMAGE / CAROUSEL / REEL) and language.
- **PostMedia** — ordered carousel slides (image + per-slide bilingual caption).
- **SocialAccount** — encrypted OAuth tokens per connected platform.
- **AgentRun** — one row per agent execution, with step logs.
- **Notification** — in-app notifications.

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

- `DATABASE_URL` (+ `DIRECT_URL` if using a pooled provider like Supabase — see the comment in `.env.example`).
- `AUTH_SECRET` — `openssl rand -hex 32`.
- `ENCRYPTION_KEY` — `openssl rand -hex 32` (used to encrypt social access tokens at rest).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for signing into the app itself.
- `GEMINI_API_KEY` — powers research and copywriting by default.

Image generation defaults to **Pollinations.ai**, which needs no key or
billing — everything else (Firecrawl, Meta, LinkedIn, Blob storage, Inngest
signing keys, OpenAI) can be added incrementally.

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
npm run inngest:dev
```

Visit the app, sign in with Google, connect a website, set your brand
preferences under Settings, and click **Run agent now** in the top bar to
generate your first batch of posts.

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
based on env vars).

```
AI_TEXT_PROVIDER="gemini"       # or "openai"
AI_IMAGE_PROVIDER="pollinations" # or "gemini" | "openai"
```

Gemini and OpenAI image generation both require a billing-enabled account
(neither has a free image quota) — Pollinations is the zero-setup default.
To add another provider (Anthropic, Grok, etc.), implement the `TextProvider`
and/or `ImageProvider` interfaces in `lib/ai/types.ts` under
`lib/ai/providers/`, and register it in `lib/ai/index.ts`.

## Deployment (Vercel)

1. Push to a Git repository and import it into Vercel.
2. Add all environment variables from `.env.example` in the Vercel project settings.
3. Provision a PostgreSQL database (Vercel Postgres, Neon, Supabase, etc.) and set `DATABASE_URL` (+ `DIRECT_URL` for pooled providers).
4. Enable Vercel Blob storage and set `BLOB_READ_WRITE_TOKEN`.
5. Install the [Inngest Vercel integration](https://www.inngest.com/docs/deploy/vercel) (or set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` manually) so the scheduler and workflow functions run in production — Inngest auto-discovers functions from `/api/inngest`.
6. `prisma generate` runs automatically via the `postinstall` script.

## Notes on production hardening already in place

- Social access tokens are encrypted at rest (AES-256-GCM) before being stored.
- Every publish attempt is retried automatically by Inngest and its
  per-platform result (success/error) is recorded on the post.
- OAuth flows use a signed CSRF `state` parameter validated against an
  httpOnly cookie.
- Middleware auth check runs on the Edge without needing a direct database
  call (JWT sessions), while user/account persistence still goes through
  Prisma via the NextAuth adapter.
- Website re-analysis seeds the Brand Profile but never overwrites fields
  you've already customized.
