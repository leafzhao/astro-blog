import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
/*
 * Photo album metadata: optional `album.yaml` inside each album folder
 * with import.meta.glob in src/utils/photo-utils.ts.
 */
const albumsCollection = defineCollection({
	loader: glob({
		pattern: "*/album.{yaml,yml}",
		base: "./src/assets/photos",
	}),
	schema: z.object({
		title: z.string().optional(),
		date: z.coerce.date().optional(),
		description: z.string().optional().default(""),
		location: z.string().optional(),
		order: z.number().optional(),
		captions: z.record(z.string()).optional().default({}),
		draft: z.boolean().optional().default(false),
	}),
});
export const collections = {
	posts: postsCollection,
	spec: specCollection,
	albums: albumsCollection,
};
