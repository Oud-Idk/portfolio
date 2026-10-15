# @oud-idk/markdown

Private markdown rendering system for React/Next.js projects.

Includes `MarkdownRenderer`, `MarkdownWithToc`, table of contents, scroller, copy button, remark/rehype plugin lists, reading time, and language detection helpers.

## Development

```sh
pnpm install
pnpm --filter @oud-idk/markdown build
```

## Consuming in this workspace

The portfolio depends on this package via `workspace:*`.

## Publish

```sh
pnpm --filter @oud-idk/markdown publish
```

`prepublishOnly` rebuilds the package first.

This package ships compiled output from `dist/` and expects the consumer to
provide the Tailwind design tokens/classes it uses (e.g. `bg-surface`,
`text-muted-foreground`, `border-border`, `text-brand`).