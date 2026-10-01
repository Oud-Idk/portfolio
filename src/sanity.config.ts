import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'

import { projectType } from './sanity/schemaTypes/projectType'

export default defineConfig({
    name: 'default',
    title: 'My Portfolio Studio',
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    basePath: '/studio',
    plugins: [structureTool()],
    schema: {
        types: [projectType],
    },
})