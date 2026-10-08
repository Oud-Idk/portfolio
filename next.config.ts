import type { NextConfig } from "next";

const umamiInternalUrl =
    process.env.UMAMI_INTERNAL_URL ?? "http://umami:3000";

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
                pathname: '/**',
            },
        ],
    },
    async rewrites() {
        return [
            { source: "/rss.xml", destination: "/atom.xml" },
            { source: "/feed.xml", destination: "/atom.xml" },
            { source: "/feed", destination: "/atom.xml" },
            { source: "/a/x.js", destination: `${umamiInternalUrl}/script.js` },
            { source: "/a/api/send", destination: `${umamiInternalUrl}/api/send` },
        ];
    },
};

export default nextConfig;
