# Namefield — live domain name search

Type a word, pick where it should sit in the domain label (exact / starts with /
ends with / contains), and the app checks it live against 120+ TLDs using the
public RDAP registry protocol. Registered domains get a best-effort page title
and server lookup; nothing is pre-crawled or stored.

## How it works

1. `lib/candidates.ts` builds the list of `word + tld` combinations to check,
   based on the selected mode. It always checks the exact word across every
   TLD first, then (for non-exact modes) fills the remaining budget with a
   small set of prefix/suffix variants (`get`, `my`, `hub`, `ly`, …).
2. `lib/rdap.ts` looks up IANA's public RDAP bootstrap file to find each TLD's
   registry endpoint, then queries it directly — no third-party WHOIS API,
   no API key needed. A `200` means registered, `404` means available.
3. For the first ~40 registered domains, `lib/pagemeta.ts` does a quick,
   best-effort fetch of the homepage to pull a `<title>` and `Server` header.
   This step fails silently for sites that are slow or unreachable — it's
   decoration, not something the result depends on.
4. Everything happens at request time in `app/api/search/route.ts`. There is
   no database and nothing is cached between searches yet (see "Possible
   next steps" below).

## Limits and trade-offs (read this before showing it to anyone)

- **No screenshots.** This was a deliberate choice to keep the app free,
  fast, and simple to deploy — see the chat where this was decided. Result
  cards show text only (title, server, status).
- **Not every TLD has public RDAP.** Some ccTLDs don't run one; those show
  up as "unchecked" rather than a guess.
- **A full search can take 20–50 seconds** with the default 120+ TLD list,
  since each RDAP query and each title fetch has its own network round trip.
  `app/api/search/route.ts` exports `maxDuration = 60` for the search route.
  Vercel's Hobby plan supports up to 60s per function; Pro supports up to
  300s. If searches still time out for you, either upgrade the plan, raise
  `maxDuration` (Pro+), or shrink `TLD_LIST` in `lib/tlds.ts`.
- **"Starts with" / "Ends with" / "Contains"** don't search a pre-existing
  index of real domains (there isn't one) — they generate word + a small set
  of common prefixes/suffixes (`get`, `my`, `hub`, `ly`, `co`, …) and check
  those. Edit `PREFIXES` / `SUFFIXES` in `lib/tlds.ts` to change the set.
- **No caching yet.** Searching the same word twice re-checks everything
  from scratch. See below for adding a cache.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying (GitHub + Vercel)

1. Push this folder to a new GitHub repository.
2. In Vercel: **New Project** → import that repository → Deploy. No
   environment variables are required for the current feature set.
3. The extended function duration (`maxDuration = 60`) is set directly in
   `app/api/search/route.ts`, so it's picked up automatically — no extra
   Vercel config needed.

## Possible next steps

- **Cache results** (e.g. Vercel Postgres or Upstash Redis) keyed by
  `domain`, with a TTL of a few days, so repeat searches for the same word
  are instant and don't re-hit every registry.
- **Stream results progressively** to the browser as each RDAP check
  resolves, instead of waiting for the whole batch — would make the UI feel
  much faster for large TLD lists.
- **Add screenshots back in** later using a screenshot API (ScreenshotOne,
  Microlink, etc.) once the text-only version is validated.
