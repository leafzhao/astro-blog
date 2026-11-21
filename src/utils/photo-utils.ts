import { getCollection } from "astro:content";
import type { ImageMetadata } from "astro";

/*
 * Photos live in src/assets/photos/<album-folder>/*.{jpg,jpeg,png,webp,avif}.
 * Each folder is one album. An optional album.yaml in the folder provides
 * title / date / description / location / order / captions / draft
 * (schema: the `albums` collection in src/content/config.ts).
 */
const photoModules = import.meta.glob<ImageMetadata>(
	"/src/assets/photos/*/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP,avif,AVIF}",
	{ eager: true, import: "default" },
);

export type Photo = {
	file: string;
	image: ImageMetadata;
	width: number;
	height: number;
	caption: string;
};

/*
 * Read width/height without marking the original file as "referenced".
 * Astro only copies an original image into dist/ when a property of the
 * imported image is read directly; going through the hidden `clone` (as
 * Astro's own getImage does) avoids publishing the unprocessed original.
 */
function dimensions(image: ImageMetadata): { width: number; height: number } {
	const meta =
		(image as ImageMetadata & { clone?: ImageMetadata }).clone ?? image;
	return { width: meta.width, height: meta.height };
}

export type Album = {
	slug: string;
	title: string;
	date?: Date;
	description: string;
	location?: string;
	order?: number;
	photos: Photo[];
};

export async function getAlbums(): Promise<Album[]> {
	const metaEntries = await getCollection("albums");
	const metaBySlug = new Map(
		metaEntries.map((entry) => [
			(entry.filePath ?? entry.id).split("/").slice(-2, -1)[0] ?? entry.id,
			entry.data,
		]),
	);

	const grouped = new Map<string, { file: string; image: ImageMetadata }[]>();
	for (const [modulePath, image] of Object.entries(photoModules)) {
		const parts = modulePath.split("/");
		const file = parts[parts.length - 1];
		const slug = parts[parts.length - 2];
		if (!grouped.has(slug)) grouped.set(slug, []);
		grouped.get(slug)?.push({ file, image });
	}

	const albums: Album[] = [];
	for (const [slug, files] of grouped) {
		const meta = metaBySlug.get(slug);
		if (meta?.draft) continue;
		const captions = meta?.captions ?? {};
		albums.push({
			slug,
			title: meta?.title || slug,
			date: meta?.date,
			description: meta?.description ?? "",
			location: meta?.location,
			order: meta?.order,
			photos: files
				.sort((a, b) =>
					a.file.localeCompare(b.file, undefined, { numeric: true }),
				)
				.map(({ file, image }) => ({
					file,
					image,
					...dimensions(image),
					caption: captions[file] ?? "",
				})),
		});
	}

	// `order` first (ascending), then newest date first, then folder name
	return albums.sort((a, b) => {
		if (a.order !== undefined || b.order !== undefined) {
			return (
				(a.order ?? Number.MAX_SAFE_INTEGER) -
				(b.order ?? Number.MAX_SAFE_INTEGER)
			);
		}
		const da = a.date?.getTime() ?? 0;
		const db = b.date?.getTime() ?? 0;
		if (da !== db) return db - da;
		return a.slug.localeCompare(b.slug);
	});
}
