import { defineField, defineType } from 'sanity'

export const projectType = defineType({
    name: 'project',
    title: 'Project',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: { source: 'title', maxLength: 96 },
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'thumbnail',
            title: 'Thumbnail Image',
            type: 'image',
            options: { hotspot: true },
        }),
        defineField({
            name: 'summary',
            title: 'Short Summary',
            type: 'string',
        }),
        defineField({
            name: 'tags',
            title: 'Tech Stack Tags',
            type: 'array',
            of: [{ type: 'string' }],
        }),
        defineField({
            name: 'liveUrl',
            title: 'Live URL',
            type: 'url',
        }),
        defineField({
            name: 'githubUrl',
            title: 'GitHub URL',
            type: 'url',
        }),
        defineField({
            name: 'content',
            title: 'Case Study / Write-up (Markdown)',
            type: 'markdown',
        }),
    ],
})