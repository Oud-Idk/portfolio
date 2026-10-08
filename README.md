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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
