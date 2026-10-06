import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Emit a self-contained server bundle in .next/standalone so the Docker
    // runtime stage can copy just that, instead of shipping node_modules.
    output: "standalone",
    reactCompiler: true,
    experimental: {
        inlineCss: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.sanity.io',
                pathname: '/**', // or just '/**' if you serve files/assets from there too!
            },
        ],
    },
    async rewrites() {
        return [
            { source: "/rss.xml", destination: "/atom.xml" },
            { source: "/feed.xml", destination: "/atom.xml" },
            { source: "/feed", destination: "/atom.xml" },
            // Proxy the Umami tracker + collection endpoint through this origin
            // so nothing points at a separate analytics host (also dodges
            // blocklists). `umami` is the compose service name; these paths are
            // only requested when NEXT_PUBLIC_UMAMI_WEBSITE_ID is set, so local
            // dev without the container is unaffected.
            { source: "/umami.js", destination: "http://umami:3000/script.js" },
            { source: "/api/send", destination: "http://umami:3000/api/send" },
        ];
    },
};

export default nextConfig;
