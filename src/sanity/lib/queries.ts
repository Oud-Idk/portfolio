import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

import { client } from "./client";

export interface Project {
    _id: string;
    title: string;
    slug?: string;
    summary?: string;
    tags?: string[];
    liveUrl?: string;
    githubUrl?: string;
    thumbnail?: SanityImageSource;
}

export interface ProjectDetail extends Project {
    content?: string;
}

export const PROJECTS_QUERY = `*[_type == "project"] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  summary,
  tags,
  liveUrl,
  githubUrl,
  thumbnail
}`;

export const PROJECT_QUERY = `*[_type == "project" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  summary,
  tags,
  liveUrl,
  githubUrl,
  thumbnail,
  content
}`;

const builder = createImageUrlBuilder(client);

export function imageUrl(source: SanityImageSource, width = 1400): string {
    return builder.image(source).width(width).fit("max").auto("format").url();
}

export async function getProjects(): Promise<Project[]> {
    try {
        return await client.fetch(PROJECTS_QUERY, {}, { next: { revalidate: 60 } });
    } catch (error) {
        console.warn("Could not fetch projects from Sanity:", error);
        return [];
    }
}

export async function getProject(slug: string): Promise<ProjectDetail | null> {
    try {
        return await client.fetch(PROJECT_QUERY, { slug }, { next: { revalidate: 60 } });
    } catch (error) {
        console.warn(`Could not fetch project "${slug}" from Sanity:`, error);
        return null;
    }
}