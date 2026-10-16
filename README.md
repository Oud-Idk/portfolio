This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Docker (app + Cloudflare Tunnel)

Runs the production build in a container and exposes it over a Cloudflare Tunnel
without opening any port on your router.

```bash
cp .env.docker.example .env   # fill in the Sanity values
docker compose up --build
```

Get the public URL:

```bash
docker compose logs -f cloudflared | grep -o 'https://[-a-z0-9]*\.trycloudflare\.com'
```

Notes:

- **Quick Tunnel vs Named Tunnel.** The default `command` starts a Quick Tunnel:
  no Cloudflare account needed, but Cloudflare assigns a random `*.trycloudflare.com`
  hostname that changes on every restart. For a stable hostname, create a tunnel in
  the Cloudflare dashboard, set `CLOUDFLARE_TUNNEL_TOKEN` in `.env`, and uncomment the
  `command` / `environment` lines in `docker-compose.yml`. The dashboard's public
  hostname must point at `http://web:3000`.
- **Ports.** The container always listens on `3000` internally; only the host side is
  remapped, to `127.0.0.1:8080`, so it won't clash with a server already using 3000.
  Swap the left side of the mapping to publish on the LAN.
- **`NEXT_PUBLIC_*` must be set at build time.** Next.js inlines them into the client
  bundle, so changing them needs `docker compose build`, not just a restart.
  `SANITY_API_TOKEN` is server-only and is injected at runtime from `.env`.
- Add `--env-file .env.local` to any `docker compose` command to use that file's values.

## Analytics (Umami)

The compose stack includes [Umami](https://umami.is) (cookieless, self-hosted)
plus its PostgreSQL database. The dashboard is **not** exposed through the
tunnel — it's published loopback-only on `127.0.0.1:${UMAMI_HOST_PORT:-3001}`
(SSH-tunnel to it on the deploy server).

First-time setup:

1. Set `UMAMI_APP_SECRET` (any random string) and `UMAMI_DB_PASSWORD` in `.env`.
2. `docker compose up -d umami` and open `http://127.0.0.1:3001`.
3. Log in with `admin` / `umami` and **change the password immediately**.
4. Add a website, copy its website ID into `NEXT_PUBLIC_UMAMI_WEBSITE_ID`.
5. Rebuild the app: `docker compose build web && docker compose up -d`
   (the ID is a `NEXT_PUBLIC_*` var, so it's inlined at build time — a restart
   alone won't pick it up). Leave the ID empty to ship without any tracking.

The tracker script and its collection endpoint are proxied through the site's
own origin via Next.js rewrites (`/a/x.js` and `/a/api/send`), so visitors
never talk to a separate analytics host. Visitor country works out of the box
via Cloudflare headers; for region/city data, enable **Rules → Settings →
Managed Transforms → Add visitor location headers** in the Cloudflare dashboard.

## Blog Search (MeiliSearch)

The blog index page has a search box backed by [MeiliSearch](https://www.meilisearch.com/).

- **Server:** the `docker-compose.yml` stack includes a `meilisearch` service
  (data in the `meili-data` volume, published loopback-only on port 7700).
- **Indexing:** run a full sync with `pnpm search:sync` (uses Sanity + MeiliSearch
  vars from `.env.local`/`.env`).
- **Keeping in sync:** in Sanity → API → Webhooks, add a webhook for the `post`
  type (create/update/delete) pointing at
  `https://<site>/api/webhooks/sanity?secret=$SANITY_WEBHOOK_SECRET`.
- **Config:** set `MEILI_MASTER_KEY`, `MEILISEARCH_API_KEY` (same value) and
  `SANITY_WEBHOOK_SECRET` in `.env`; see `.env.docker.example`.
- **Frontend:** the browser queries `/api/search`, which proxies to MeiliSearch —
  the master key never leaves the server.

## Newsletter (Resend)

Contact signup lives in `src/app/actions/newsletter.ts`; new-post broadcasts are
sent from the Sanity publish webhook (`src/app/api/webhooks/publish`).

- **Config:** set `RESEND_API_KEY`, `RESEND_SEGMENT_ID` and
  `UNSUBSCRIBE_TOKEN_SECRET` in `.env`; see `.env.docker.example`. Generate the
  last one with `openssl rand -base64 32`.
- **Unsubscribing:** `/api/unsubscribe` takes a signed, expiring `?token=`
  rather than a contact id or email address, so nobody can unsubscribe a
  subscriber by guessing or leaking an identifier. `GET` only renders the
  confirmation step — `POST` is the only handler that mutates, which is also
  what RFC 8058 one-click uses. Tokens fail closed: with no secret configured
  every link reports itself invalid, so set it in any deployed environment.
- **Self-serve:** `/unsubscribe` asks for an address and mails a one-hour
  confirmation link to it. Broadcasts carry no per-recipient token, so the
  emailed link is what proves the requester owns the mailbox.

## Uploads (Cloudflare R2 / S3)

Videos, images, and arbitrary private files live in S3-compatible object
storage (written for Cloudflare R2; any S3-compatible endpoint works).

- **Surfaces.** `/admin/uploads` (standalone page) and an **Uploads** panel in
  the Studio (`/studio`). Both upload straight from the browser to storage over
  a presigned URL, so the file never passes through this server.
- **Auth.** There are no user accounts and no upload secret. Both surfaces sit
  behind **Cloudflare Access**, and `/api/uploads/*` refuses anything without a
  token Access signed. Nothing is stored in the browser, so there is no shared
  credential to leak or rotate. It fails closed: with Access unconfigured,
  `/admin/uploads` 404s and `/api/uploads/*` returns 503.
- **Two scopes.** `media/…` objects are public, immutable, and cached for a year
  — these are what you embed in a post. `files/…` objects have no public URL and
  are read through a signed, expiring `/api/files/<key>?token=…` link, which
  redirects to a short-lived presigned GET. They are stored as
  `application/octet-stream` with `Content-Disposition: attachment`, both signed
  into the upload, so an uploaded SVG or HTML downloads rather than executes
  however it is reached.
- **Embedding.** After an upload the UI hands you copy-paste markdown:
  `:::video{src="…"}` for a clip, `![](…)` for an image.

Config (see `.env.docker.example`): `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`,
`S3_PRIVATE_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`S3_PUBLIC_BASE_URL`, `FILE_LINK_SECRET` (`openssl rand -base64 32`, server-side
only — it signs private links), and `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD`.

Verification is real, not header-trusting: Cloudflare stamps every request that
passes an Access policy with a `Cf-Access-Jwt-Assertion` header, and
`src/lib/cloudflare-access.ts` checks its signature against Cloudflare's
published keys, plus the issuer and application audience. A header set by hand —
by anything else on the host that can reach the bound port — fails that check.

R2 setup:

1. Create the media bucket, enable public access (an `r2.dev` subdomain or a
   custom domain), and set `S3_PUBLIC_BASE_URL` to that origin.
2. Create a second, **non-public** bucket for private files and point
   `S3_PRIVATE_BUCKET` at it. If you skip this, `files/` objects share the media
   bucket and are only protected by unguessable keys — not actually private.
3. Create an R2 API token with Object Read & Write for the bucket(s). Use it as
   `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`, and set `S3_ENDPOINT` to
   `https://<account-id>.r2.cloudflarestorage.com` (`S3_REGION` stays `auto`).
4. Allow browser uploads from your origin with CORS on **both** buckets:

```json
[
  {
    "AllowedOrigins": ["https://oud-idk.dev"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "content-disposition", "cache-control"],
    "MaxAgeSeconds": 3600
  }
]
```

Add `http://localhost:3000` to `AllowedOrigins` while developing.

Cloudflare Access setup:

1. In Zero Trust → Access → Applications, add a **Self-hosted** application for
   your tunnel hostname.
2. Create one application per protected path — `/admin`, `/api/uploads` and
   `/studio` — each with an Allow policy for your email. An application has a
   single path, which is why the audiences are a list.
3. Set `CF_ACCESS_TEAM_DOMAIN` to your team domain
   (`https://<team>.cloudflareaccess.com`) and `CF_ACCESS_AUD` to those
   applications' Audience tags, comma-separated.
4. Leave `/api/files/*` **out** of Access: share links exist so someone with no
   account can read a file. Protecting it would make every shared link ask them
   to log in. (One application on the whole hostname with a **Bypass** policy for
   `/api/files/*` works too.)
5. If a surface loads but the panel reports "Not authenticated", the policy is
   too narrow — the API path needs covering as well as the page.

For scripted uploads (curl, CI), create an Access **service token** and send it
as `CF-Access-Client-Id` / `CF-Access-Client-Secret`; the app verifies the token
Access mints from it like any other.

Local development has no tunnel, so set `CF_ACCESS_DEV_BYPASS=1`. That is
deliberately doubly guarded: it is ignored unless `NODE_ENV` is not
`production`, so a stray variable in a deployed image cannot open uploads.

Notes:

- **Limits.** 200 MB for media, 100 MB for other files. The declared length is
  signed into the presigned `PUT`, so a body of any other size is rejected by
  storage with `SignatureDoesNotMatch` — the cap is enforced, not advisory.
- **Keep the media origin separate.** Serve `S3_PUBLIC_BASE_URL` from an `r2.dev`
  subdomain or a custom domain, never from a path on the site's own hostname: an
  SVG in `media/` renders on whatever origin serves it, and a separate origin
  shares no cookies with the site.
- **No rebuild needed.** The `S3_*`, `FILE_LINK_SECRET` and `CF_ACCESS_*` vars are
  read at request time, so a restart is enough — unlike `NEXT_PUBLIC_*`, which is
  inlined at build time.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
