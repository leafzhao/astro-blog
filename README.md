# Leaf Zhao · 博客 · 照片 · 生活

Leaf Zhao 的个人生活小站：随笔博客 + 照片相册。

- 线上地址：<https://leafzhao.github.io/astro-blog/>
- 学术主页（另一个仓库）：<https://leafzhao.github.io/>

基于 [Astro](https://astro.build) 和 [Fuwari](https://github.com/saicaca/fuwari) 主题（MIT License），在此基础上增加了中文配置、照片相册页面和 GitHub Pages 部署。

## 本地运行

需要 Node.js 22 和 [pnpm](https://pnpm.io)（`npm install -g pnpm`）。

```sh
pnpm install      # 安装依赖
pnpm dev          # 本地预览：http://localhost:4321/astro-blog/
pnpm build        # 构建到 dist/（同时生成 Pagefind 搜索索引）
pnpm preview      # 预览构建结果
```

> 站点部署在子路径 `/astro-blog/` 下（见 `astro.config.mjs` 的 `base`），本地预览时也要带上这个路径。

## 写文章

文章放在 `src/content/posts/`，每篇一个 Markdown 文件（或一个文件夹 + `index.md`，方便和图片放在一起）。可以用命令快速创建：

```sh
pnpm new-post 我的新文章
```

Frontmatter 示例：

```yaml
---
title: 文章标题
published: 2026-11-21
description: 一句话摘要（显示在首页卡片上）
image: ./cover.jpg      # 可选：封面图，相对于文章文件
tags: [随笔, 旅行]
category: 生活
draft: false            # true 表示草稿，不会发布
---
```

- 文章里引用站内页面请用相对链接（如 `../../photos/`）或完整网址，不要写 `/photos/` 这种以 `/` 开头的绝对路径，否则会丢掉 `/astro-blog/` 前缀。
- 支持 GitHub 风格提示块（`> [!TIP]`）、数学公式、代码高亮等，详见 [Fuwari 文档](https://github.com/saicaca/fuwari)。
- 「关于」页面内容在 `src/content/spec/about.md`。
- 站点标题、简介、头像、导航、社交链接等都在 `src/config.ts`。头像 `src/assets/images/avatar.png`、横幅 `src/assets/images/banner.jpg` 和 `public/favicon/` 下的图标都是生成的占位图，可以直接替换。

## 添加照片

照片放在 `src/assets/photos/` 下，**每个文件夹就是一个相册**：

```
src/assets/photos/
├── 2026-kyoto/
│   ├── album.yaml      # 可选：相册信息
│   ├── 001.jpg
│   └── 002.jpg
└── sample-album/       # 示例相册（占位图），可以删除
```

`album.yaml`（可选，没有时标题默认为文件夹名）：

```yaml
title: 京都秋天
date: 2026-11-21
location: 京都
description: 一句话介绍这个相册。
order: 1            # 可选：手动排序（数字小的在前）；不填则按日期倒序
draft: false        # 可选：true 表示暂不显示
captions:           # 可选：每张照片的说明（键为文件名）
  001.jpg: 清水寺的红叶
```

- 支持 jpg / jpeg / png / webp / avif，同一相册内按文件名排序。
- 构建时 Astro 会自动生成多种尺寸的 WebP（缩略图 + 最长边 2048px 的大图），**不会发布原图**，输出文件也不含 EXIF 元数据。页面在 `/photos/`，点击照片用灯箱查看大图。
- 示例相册 `sample-album` 里是程序生成的渐变占位图，加入自己的照片后请删除它。

### 提交前清理照片（重要）

原始照片文件会被提交到 Git 仓库（公开可见），里面可能包含拍摄地点（GPS）、相机型号等信息。**提交照片前请先运行：**

```sh
pnpm photos:clean
```

它会原地处理 `src/assets/photos/` 下的所有图片：去掉 EXIF / GPS / XMP 等元数据（先按方向信息把照片转正），并把最长边超过 2560px 的照片缩小到 2560px。其他用法：

```sh
pnpm photos:clean -- --no-resize      # 只去元数据，不缩放
pnpm photos:clean -- --max=2048       # 自定义最长边
pnpm photos:clean -- path/to/photos   # 处理指定目录或文件
```

## 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）会自动构建并发布到 GitHub Pages。

首次使用需要在 GitHub 仓库里设置一次：**Settings → Pages → Build and deployment → Source 选择 “GitHub Actions”**。

如果以后改用自定义域名或换仓库名，记得同步修改 `astro.config.mjs` 里的 `site` 和 `base`。

## 许可

- 主题代码来自 Fuwari，使用 MIT License（见 `LICENSE`）。
- 文章内容默认采用 CC BY-NC-SA 4.0（可在 `src/config.ts` 的 `licenseConfig` 修改）；照片版权归作者所有。
