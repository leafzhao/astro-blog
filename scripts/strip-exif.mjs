/*
 * 清理照片元数据：删除 EXIF / GPS / XMP 等信息，并可选地缩小尺寸。
 *
 * 用法：
 *   pnpm photos:clean                 # 处理 src/assets/photos 下所有图片，长边最大 2560px
 *   pnpm photos:clean -- --no-resize  # 只去除元数据，不缩放
 *   pnpm photos:clean -- --max=2048   # 自定义长边上限
 *   pnpm photos:clean -- path/to/dir  # 处理指定目录或文件
 *
 * 文件会被原地覆盖（保持原格式）。方向信息会先应用到像素上，再丢弃，
 * 所以竖拍的照片不会被转歪。建议在提交照片前运行一次。
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_DIR = "src/assets/photos";
const EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".avif",
	".tif",
	".tiff",
]);

const args = process.argv.slice(2).filter((a) => a !== "--");
let maxEdge = 2560;
let resize = true;
const targets = [];
for (const arg of args) {
	if (arg === "--no-resize") resize = false;
	else if (arg.startsWith("--max="))
		maxEdge = Number.parseInt(arg.slice(6), 10);
	else if (arg === "-h" || arg === "--help") {
		console.log(
			"Usage: node scripts/strip-exif.mjs [--no-resize] [--max=2560] [paths...]",
		);
		process.exit(0);
	} else targets.push(arg);
}
if (!Number.isFinite(maxEdge) || maxEdge <= 0) {
	console.error("--max must be a positive integer");
	process.exit(1);
}
if (targets.length === 0) targets.push(DEFAULT_DIR);

async function collect(p) {
	const stat = await fs.stat(p).catch(() => null);
	if (!stat) {
		console.warn(`跳过不存在的路径: ${p}`);
		return [];
	}
	if (stat.isFile())
		return EXTENSIONS.has(path.extname(p).toLowerCase()) ? [p] : [];
	const out = [];
	for (const entry of await fs.readdir(p, { withFileTypes: true })) {
		out.push(...(await collect(path.join(p, entry.name))));
	}
	return out;
}

async function processFile(file) {
	const input = await fs.readFile(file);
	const meta = await sharp(input).metadata();
	const hadMeta = Boolean(
		meta.exif ||
			meta.xmp ||
			meta.iptc ||
			(meta.orientation && meta.orientation !== 1),
	);

	// rotate() 依据 EXIF Orientation 旋转像素；sharp 默认输出不带任何元数据
	let pipeline = sharp(input).rotate();
	const w = meta.orientation >= 5 ? meta.height : meta.width;
	const h = meta.orientation >= 5 ? meta.width : meta.height;
	const needsResize = resize && Math.max(w, h) > maxEdge;
	if (needsResize) {
		pipeline = pipeline.resize({
			width: maxEdge,
			height: maxEdge,
			fit: "inside",
			withoutEnlargement: true,
		});
	}
	if (!hadMeta && !needsResize) return "unchanged";

	switch (meta.format) {
		case "jpeg":
			pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
			break;
		case "png":
			pipeline = pipeline.png({ compressionLevel: 9 });
			break;
		case "webp":
			pipeline = pipeline.webp({ quality: 88 });
			break;
		case "avif":
		case "heif":
			pipeline = pipeline.avif({ quality: 70 });
			break;
		case "tiff":
			pipeline = pipeline.tiff();
			break;
		default:
			return `skipped (format ${meta.format})`;
	}
	const output = await pipeline.toBuffer();
	await fs.writeFile(file, output);
	return [
		hadMeta && "metadata stripped",
		needsResize && `resized to <= ${maxEdge}px`,
	]
		.filter(Boolean)
		.join(", ");
}

let changed = 0;
const files = (await Promise.all(targets.map(collect))).flat();
for (const file of files) {
	try {
		const result = await processFile(file);
		if (result !== "unchanged") changed++;
		console.log(`${result.padEnd(40)} ${file}`);
	} catch (err) {
		console.error(`失败: ${file}: ${err.message}`);
		process.exitCode = 1;
	}
}
console.log(`\n共检查 ${files.length} 个文件，修改 ${changed} 个。`);
