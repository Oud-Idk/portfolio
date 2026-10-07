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

export interface Post {
    _id: string;
    title: string;
    slug?: string;
    excerpt?: string;
    tags?: string[];
    author?: string;
    publishedAt?: string;
    featured?: boolean;
    coverImage?: SanityImageSource;
}

export interface PostDetail extends Post {
    content?: string;
}

export const POSTS_QUERY = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  tags,
  author,
  publishedAt,
  featured,
  coverImage
}`;

export const POST_QUERY = `*[_type == "post" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  tags,
  author,
  publishedAt,
  featured,
  coverImage,
  content
}`;

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

export function withFeaturedFirst(posts: Post[]): Post[] {
    return [...posts].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
}

export async function getPosts(): Promise<Post[]> {
    try {
        return await client.fetch(POSTS_QUERY, {}, { next: { revalidate: 60 } });
    } catch (error) {
        console.warn("Could not fetch posts from Sanity:", error);
        return [];
    }
}

export async function getPost(slug: string): Promise<PostDetail | null> {
    try {
        return await client.fetch(POST_QUERY, { slug }, { next: { revalidate: 60 } });
    } catch (error) {
        console.warn(`Could not fetch post "${slug}" from Sanity:`, error);
        return null;
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