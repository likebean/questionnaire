#!/usr/bin/env node
/**
 * 从已下载的 docs/wjx-help/*.html 中提取所有 <img src>，下载到 docs/wjx-help/images/
 * 并可选地改写 HTML 中的图片地址为本地路径。
 *
 * 使用：node scripts/download-wjx-help-images.mjs
 *       node scripts/download-wjx-help-images.mjs --rewrite   # 下载后改写 HTML 中的 src
 *
 * 需要先运行过 download-wjx-help.mjs 生成 HTML 文件。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELP_DIR = path.resolve(__dirname, '../docs/wjx-help');
const IMAGES_DIR = path.join(HELP_DIR, 'images');
const DELAY_MS = 400;
const REWRITE_HTML = process.argv.includes('--rewrite');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'https://www.wjx.cn/';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 从 HTML 中提取所有 img 的 src */
function extractImageUrls(html) {
  const urls = new Set();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) urls.add(m[1].trim());
  return [...urls];
}

/** 转为绝对 URL */
function toAbsoluteUrl(src, pageOrigin = 'https://www.wjx.cn') {
  let u = src.replace(/&amp;/g, '&');
  if (u.startsWith('//')) u = 'https:' + u;
  else if (u.startsWith('/')) u = new URL(u, pageOrigin).href;
  else if (!u.startsWith('http')) u = new URL(u, pageOrigin + '/').href;
  return u;
}

/** 生成本地文件名：按 URL 生成唯一名，保留扩展名 */
function urlToFilename(imgUrl) {
  try {
    const parsed = new URL(imgUrl);
    const ext = path.extname(parsed.pathname) || '.png';
    const hash = crypto.createHash('md5').update(imgUrl).digest('hex').slice(0, 8);
    const base = path.basename(parsed.pathname, ext) || 'img';
    const safe = (base + '_' + hash).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    return safe + ext;
  } catch {
    return `img_${Date.now()}.png`;
  }
}

/** 下载单张图片，返回相对路径（相对 HELP_DIR）或 null */
async function downloadImage(imgUrl) {
  const absoluteUrl = toAbsoluteUrl(imgUrl);
  const filename = urlToFilename(absoluteUrl);
  const localPath = path.join(IMAGES_DIR, filename);
  const relativePath = `images/${filename}`;

  if (fs.existsSync(localPath)) return relativePath;

  for (let retry = 0; retry < 2; retry++) {
    try {
      const res = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: REFERER,
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      fs.writeFileSync(localPath, Buffer.from(buf));
      return relativePath;
    } catch (e) {
      if (retry === 1) return null;
      await sleep(1000);
    }
  }
  return null;
}

/** 转义用于正则的字符串 */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  if (!fs.existsSync(HELP_DIR)) {
    console.error('请先运行: node scripts/download-wjx-help.mjs');
    process.exit(1);
  }

  const htmlFiles = fs.readdirSync(HELP_DIR).filter((f) => f.endsWith('.html'));
  if (htmlFiles.length === 0) {
    console.error('docs/wjx-help/ 下没有 .html 文件');
    process.exit(1);
  }

  const allImgUrls = new Set();
  const fileToImgs = new Map(); // file -> [ { originalSrc, absoluteUrl } ]

  console.log('1) 从 HTML 中收集图片链接...');
  for (const file of htmlFiles) {
    const filePath = path.join(HELP_DIR, file);
    const html = fs.readFileSync(filePath, 'utf8');
    const urls = extractImageUrls(html);
    const entries = urls.map((src) => ({
      originalSrc: src,
      absoluteUrl: toAbsoluteUrl(src),
    }));
    for (const e of entries) allImgUrls.add(e.absoluteUrl);
    if (entries.length) fileToImgs.set(file, entries);
  }

  console.log(`   共 ${allImgUrls.size} 个唯一图片 URL，涉及 ${fileToImgs.size} 个 HTML 文件`);

  const urlToLocal = new Map(); // absoluteUrl -> relativePath
  let ok = 0,
    fail = 0;

  console.log('2) 下载图片...');
  const list = [...allImgUrls];
  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    const local = await downloadImage(url);
    if (local) {
      urlToLocal.set(url, local);
      ok++;
    } else fail++;
    if ((i + 1) % 20 === 0 || i === list.length - 1) {
      console.log(`   [${i + 1}/${list.length}] 成功 ${ok}，失败 ${fail}`);
    }
    await sleep(DELAY_MS);
  }

  const pagesIndex = {};
  function getPageTitle(html) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m ? m[1].trim().replace(/\s+/g, ' ') : '';
  }

  if (REWRITE_HTML && urlToLocal.size > 0) {
    console.log('3) 改写 HTML 中的图片地址为本地路径...');
    for (const [file, entries] of fileToImgs) {
      let html = fs.readFileSync(path.join(HELP_DIR, file), 'utf8');
      let changed = false;
      const localImages = [];
      for (const { originalSrc, absoluteUrl } of entries) {
        const local = urlToLocal.get(absoluteUrl);
        if (local) {
          localImages.push(local);
          const esc = escapeRe(originalSrc);
          html = html.replace(new RegExp(esc, 'g'), local);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(path.join(HELP_DIR, file), html, 'utf8');
      const key = file.replace(/\.html$/, '');
      pagesIndex[key] = { title: getPageTitle(html), images: [...new Set(localImages)] };
    }
  } else {
    for (const file of htmlFiles) {
      const html = fs.readFileSync(path.join(HELP_DIR, file), 'utf8');
      const entries = fileToImgs.get(file) || [];
      const localImages = entries.map((e) => urlToLocal.get(e.absoluteUrl)).filter(Boolean);
      pagesIndex[file.replace(/\.html$/, '')] = { title: getPageTitle(html), images: [...new Set(localImages)] };
    }
  }

  for (const file of htmlFiles) {
    const key = file.replace(/\.html$/, '');
    if (!pagesIndex[key]) {
      const html = fs.readFileSync(path.join(HELP_DIR, file), 'utf8');
      pagesIndex[key] = { title: getPageTitle(html), images: [] };
    }
  }
  fs.writeFileSync(path.join(HELP_DIR, 'pages-index.json'), JSON.stringify(pagesIndex, null, 2), 'utf8');
  const readme = `# 问卷星帮助中心（本地镜像）

供 AI 或人工离线查阅、对照设计稿。页面与图片均在 \`docs/wjx-help/\`，AI 可 Read \`.html\` 与 \`images/\` 下图片做参考。

- **页面**：\`helpid_91.html\`（填空题）、\`helpid_162.html\`（单选题）等
- **图片**：\`images/\`，HTML 内 \`<img src>\` 已改为本地路径
- **索引**：\`pages-index.json\` 记录每页 title 与 images 列表

图片：成功 ${ok}，失败 ${fail}。
`;
  fs.writeFileSync(path.join(HELP_DIR, 'README.md'), readme, 'utf8');

  console.log(`\n完成：图片成功 ${ok}，失败 ${fail}。保存到 ${IMAGES_DIR}`);
  if (REWRITE_HTML) console.log('已改写 HTML 内图片地址为本地路径，已生成 pages-index.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
