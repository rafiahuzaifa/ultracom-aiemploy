# AutoPost AI — Multi-Brand Autonomous AI Marketing Agent

AutoPost AI manages marketing for **any number of independent brands/websites
under one account**. Every brand — its website analysis, voice, language,
content preferences, connected social accounts, schedule, and generated
posts — is completely isolated from every other brand. Add ten brands and
the agent runs ten independent marketing operations; nothing is ever shared,
cached, or mixed between them.

For each brand, the agent continuously researches its niche and drafts
platform-optimized posts — single images, 3–5 slide carousels, and Instagram
Reel concepts (hook, script, scene breakdown) — with captions in **English,
Urdu, or both**, for that brand's Facebook, Instagram, and LinkedIn. It waits
for your approval before publishing anything. You stay human-in-the-loop;
the agent handles research, copywriting, creative, and distribution.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + hand-rolled Shadcn/UI-style primitives (Radix + CVA) + Lucide icons
- **PostgreSQL** + **Prisma ORM**
- **NextAuth.js v5** (Google OAuth, JWT sessions, Prisma adapter for user/account storage)
- **AI**: pluggable provider layer — defaults to **Google Gemini** (text) + **Pollinations.ai** (free, no-key image generation), with **OpenAI** (GPT-4o + gpt-image-1) as a drop-in alternate. Swap via `AI_TEXT_PROVIDER` / `AI_IMAGE_PROVIDER`.
- **Inngest** for scheduled + event-driven background jobs (research → generate → publish, with retries), fanned out per brand
- **Vercel Blob** for storing generated images (falls back to inline data URLs in local dev)
- **Meta Graph API** (Facebook Pages + Instagram Business) and **LinkedIn UGC API** for publishing

## Multi-brand architecture

`Brand` is the central entity everything else scopes to:

```
User
 └─ Brand (one per website)
     ├─ BrandProfile   — voice, tone, audience, USPs, language, content-type prefs
     ├─ AgentSettings  — this brand's own schedule (frequency, posts/run, auto-approve)
     ├─ SocialAccount  — this brand's own Facebook/Instagram/LinkedIn connections
     ├─ AgentRun       — every agent execution for this brand
     └─ GeneratedPost  — every post drafted for this brand (+ PostMedia for carousels)
```

Every API route that touches brand-scoped data first verifies
`brand.userId === session.user.id` (see `requireOwnedBrand` in
`lib/api-helpers.ts`) — the sole authorization boundary that keeps one
user's brands, and everything under them, unreachable by another user.

A **Brand Switcher** in the sidebar (persisted per-browser) sets which brand
the whole dashboard — Approvals, Accounts, Settings — is currently scoped
to. History additionally lets you view a specific brand or all of them at
once.

## How it works

1. Add a brand under **Brands** (name + website URL), then click **Analyze
   now**. The agent scrapes the site and infers *that brand's* niche,
   products, target audience, brand voice, and unique selling points —
   seeding its own independent **Brand Profile**. Re-analysis fills in
   blanks only; it never overwrites fields you've customized.
2. On **Settings** (scoped to whichever brand is selected), fine-tune brand
   voice/tone, target audience, USPs, language preference (English / Urdu /
   Both), which content types to generate, and run frequency.
3. Connect that brand's own **Facebook Page**, **Instagram Business
   Account**, and **LinkedIn Company Page** under **Accounts**.
4. Trigger the agent for the selected brand (or all brands at once) from the
   top bar, or let its own schedule run it. Research, content generation,
   and image generation for one brand never see any other brand's data —
   every prompt is built strictly from that one brand's context. Each run
   cycles through the brand's selected content types:
   - **Image**: one creative + caption.
   - **Carousel**: 3–5 slides, each with its own image and slide caption.
   - **Reel**: a cover image plus a full creative brief — hook, scene-by-scene
     breakdown, and full script (no video is rendered; this is the plan a
     human or video tool would execute from).
5. Review drafts on **Approvals** (scoped to the selected brand) —
   platform-accurate previews, carousel slide navigation, reel script
   breakdown. Edit captions (per-language), approve, reject, regenerate just
   the image(s), or request a full regeneration.
6. Approving a post publishes it only to that brand's connected accounts,
   with automatic retries on transient failures. Results land in
   **History**, filterable by brand.

### On Reels

No provider in this stack can render actual video, so a "Reel" here is a
complete creative brief (hook + script + shot-by-shot breakdown) plus a cover
image — not a rendered .mp4. Approving one publishes the cover image as a
regular feed post; producing the real video from the script is a manual step.

## Project structure

```
app/
  (dashboard)/            # Authenticated app shell: approvals, brands, accounts, settings, history
  login/                  # Sign-in page
  api/
    auth/[...nextauth]/   # NextAuth handlers
    agent/                # Manual trigger (single brand or "all") + run history
    posts/                # Approve / reject / edit / regenerate / regenerate-image
    brands/                    # List/create brands
      [id]/                     # Get/update/delete/set-primary
        analyze/                # Website analysis for this brand
        profile/                # BrandProfile (voice, tone, USPs, language, content types)
        settings/               # AgentSettings (schedule) for this brand
    social/
      connect/[platform]/   # OAuth kickoff (brandId in query, threaded via signed cookie)
      callback/[platform]/  # OAuth token exchange + account storage, scoped to that brand
      accounts/              # List (by brandId) / disconnect connected accounts
    inngest/                # Inngest function serving endpoint
lib/
  ai/                     # Provider-agnostic text + image generation, prompts, research
    providers/            # gemini.ts, openai.ts, pollinations.ts
  agent/                  # Workflow orchestration (research → content → image → persist), brand-scoped
  social/                 # Facebook, Instagram, LinkedIn publishers (single + carousel) + OAuth helpers
  brand/                  # Website scraping + brand analysis
  inngest/                # Client + background functions (scheduler, agent-run, publish, regenerate)
  auth.ts / auth.config.ts  # NextAuth (split for Edge middleware compatibility)
  api-helpers.ts          # requireUserId / requireOwnedBrand authorization helpers
  db.ts, encryption.ts, notify.ts, storage.ts, utils.ts
components/
  providers/brand-provider.tsx  # Client-side "current brand" context + localStorage persistence
  brands/                 # Brand switcher + brand management panel
  ui/                     # Shadcn-style primitives (Button, Card, Dialog, Tabs, ...)
  dashboard/              # Approval feed, platform previews, carousel/reel previews
  accounts/, settings/, history/, shell/
prisma/schema.prisma      # Full data model
```

## Database model

- **User / Account / Session / VerificationToken** — NextAuth.
- **Brand** — one per website: name, URL, and what was scraped (niche,
  products, raw analysis). Everything below belongs to exactly one Brand.
- **BrandProfile** — the editable brand identity layer every prompt reads
  from: voice, tone, target audience, USPs, language preference, content
  type preferences, do's/don'ts. Seeded by website analysis, never
  overwritten by later re-analysis once you've customized it.
- **AgentSettings** — this brand's schedule: active/paused, frequency, posts
  per run, notifications, auto-approve.
- **GeneratedPost** — one post for one brand; `captions` and `reelScript`
  are JSON since their shape depends on `postType` (IMAGE / CAROUSEL / REEL)
  and language.
- **PostMedia** — ordered carousel slides (image + per-slide bilingual caption).
- **SocialAccount** — encrypted OAuth tokens for one brand's connected platform.
- **AgentRun** — one row per agent execution for one brand, with step logs.
- **Notification** — in-app notifications (user-level, since they surface
  across brands, e.g. "3 new posts ready — Acme Coffee Co.").

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

Visit the app, sign in with Google, add your first brand under **Brands**,
analyze it, set its preferences under **Settings**, and click **Run agent**
in the top bar to generate its first batch of posts. Repeat **Brands** →
**Add brand** for each additional website — the Brand Switcher in the
sidebar moves the whole dashboard between them.

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

Each brand connects its own set of pages independently from **Accounts**
(scoped to whichever brand is currently selected) — one Facebook Page can't
accidentally end up attached to the wrong brand, since the OAuth flow
threads the brand ID through a signed cookie rather than trusting anything
client-supplied.

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

- Every brand-scoped API route verifies brand ownership before touching any
  data (`requireOwnedBrand`) — one user's brands are never reachable by another.
- Social access tokens are encrypted at rest (AES-256-GCM) before being stored.
- Every publish attempt is retried automatically by Inngest and its
  per-platform result (success/error) is recorded on the post; only accounts
  connected to that specific post's brand are ever eligible to receive it.
- OAuth flows use a signed CSRF `state` parameter (plus the target brand ID)
  validated against an httpOnly cookie — never trusted from the query string alone.
- Middleware auth check runs on the Edge without needing a direct database
  call (JWT sessions), while user/account persistence still goes through
  Prisma via the NextAuth adapter.
- Website re-analysis seeds a brand's profile but never overwrites fields
  already customized, and never touches any other brand's profile.
