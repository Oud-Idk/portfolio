import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { markdownSchema } from 'sanity-plugin-markdown'

import { projectType } from './sanity/schemaTypes/projectType'
import { postType } from './sanity/schemaTypes/postType'

export default defineConfig({
    name: 'default',
    title: 'My Portfolio Studio',
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    basePath: '/studio',
    plugins: [structureTool(), markdownSchema()],
    schema: {
        types: [projectType, postType],
    },
})