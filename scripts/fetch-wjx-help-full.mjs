#!/usr/bin/env node
/**
 * 一键下载问卷星帮助中心：页面 HTML + 页面内图片，全部落盘到 docs/wjx-help/
 * 并生成 pages-index.json，便于 AI 按页读取并参考（Read 本地 HTML 与 images/ 下图片）。
 *
 * 使用：node scripts/fetch-wjx-help-full.mjs
 * 需要 Node 18+
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELP_DIR = path.resolve(__dirname, '../docs/wjx-help');
const IMAGES_DIR = path.join(HELP_DIR, 'images');
const BASE = 'https://www.wjx.cn/help/help.aspx';
const DELAY_PAGE = 700;
const DELAY_IMAGE = 350;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'https://www.wjx.cn/';

/** 种子：入口页 + 帮助中心全部一/二/三级菜单对应的 catid（从侧栏完整提取，确保每层分类都抓）*/
const CATID_SEEDS = [
  5, 10, 11, 12, 14, 15, 16, 17, 19, 21, 22, 30, 35, 36, 38, 40, 42, 44, 48,
  50, 51, 52, 53, 54, 55, 58, 65, 68, 69, 70, 72, 73, 74, 75, 77, 79, 82, 87, 88, 89,
  92, 93, 94, 95, 97, 98, 102, 104, 105, 107, 108, 109, 110, 111, 113, 114, 115,
  116, 117, 118, 121, 122, 123, 125, 126, 127, 128, 131, 132, 133, 134, 135,
];
const SEED_URLS = [
  BASE,
  ...CATID_SEEDS.map((id) => `${BASE}?catid=${id}`),
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractHelpUrls(html) {
  const seen = new Set();
  const urls = [];
  const re = /href=["']([^"']*help\.aspx\?(helpid|catid)=\d+)(?:&[^"']*)?["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let u = m[1].replace(/&amp;/g, '&');
    if (!u.startsWith('http')) u = new URL(u, 'https://www.wjx.cn/help/').href;
    try {
      const parsed = new URL(u);
      const id = parsed.searchParams.get('helpid') || parsed.searchParams.get('catid');
      const type = parsed.searchParams.has('helpid') ? 'helpid' : 'catid';
      const key = `${type}_${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      urls.push(parsed.origin + parsed.pathname + '?' + type + '=' + id);
    } catch (_) {}
  }
  return urls;
}

function urlToKey(url) {
  try {
    const u = new URL(url);
    if (u.searchParams.has('helpid')) return `helpid_${u.searchParams.get('helpid')}`;
    if (u.searchParams.has('catid')) return `catid_${u.searchParams.get('catid')}`;
  } catch (_) {}
  return 'index';
}

async function fetchHtml(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const raw = new TextDecoder('utf-8').decode(buf);
      const charsetMatch = raw.match(/charset=["']?([^"'\s>]+)/i);
      const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'gb2312';
      if (charset.includes('gb') || charset === 'gbk') {
        try {
          return new TextDecoder('gb18030').decode(buf);
        } catch {
          return raw;
        }
      }
      return raw;
    } catch (e) {
      if (i === 1) throw e;
      await sleep(2000);
    }
  }
  return '';
}

function extractImageUrls(html) {
  const urls = new Set();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) urls.add(m[1].trim());
  return [...urls];
}

function toAbsoluteUrl(src) {
  let u = (src || '').replace(/&amp;/g, '&');
  if (u.startsWith('//')) u = 'https:' + u;
  else if (u.startsWith('/')) u = 'https://www.wjx.cn' + u;
  else if (!u.startsWith('http')) u = new URL(u, BASE).href;
  return u;
}

function urlToFilename(imgUrl) {
  try {
    const parsed = new URL(imgUrl);
    const ext = path.extname(parsed.pathname) || '.png';
    const hash = crypto.createHash('md5').update(imgUrl).digest('hex').slice(0, 8);
    const base = path.basename(parsed.pathname, ext) || 'img';
    const safe = (base + '_' + hash).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90);
    return safe + ext;
  } catch {
    return `img_${Date.now()}.png`;
  }
}

function getPageTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim().replace(/\s+/g, ' ') : '';
}

async function downloadImage(imgUrl) {
  const absoluteUrl = toAbsoluteUrl(imgUrl);
  const filename = urlToFilename(absoluteUrl);
  const localPath = path.join(IMAGES_DIR, filename);
  const relativePath = `images/${filename}`;
  if (fs.existsSync(localPath)) return relativePath;
  for (let retry = 0; retry < 2; retry++) {
    try {
      const res = await fetch(absoluteUrl, {
        headers: { 'User-Agent': USER_AGENT, Referer: REFERER, Accept: 'image/webp,image/apng,image/*,*/*;q=0.8' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      fs.writeFileSync(localPath, Buffer.from(buf));
      return relativePath;
    } catch (e) {
      if (retry === 1) return null;
      await sleep(800);
    }
  }
  return null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PLAYWRIGHT_URLS_PATH = path.join(HELP_DIR, 'playwright-urls.json');

async function main() {
  fs.mkdirSync(HELP_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const toFetch = new Map();

  if (fs.existsSync(PLAYWRIGHT_URLS_PATH)) {
    console.log('1) 使用 Playwright 链接列表（playwright-urls.json）...');
    let list;
    try {
      list = JSON.parse(fs.readFileSync(PLAYWRIGHT_URLS_PATH, 'utf8'));
    } catch (e) {
      console.warn(`   读取失败: ${e.message}，回退到种子页`);
      list = null;
    }
    if (Array.isArray(list) && list.length > 0) {
      for (const url of list) {
        const key = urlToKey(url);
        if (key) toFetch.set(url, key);
      }
    }
  }

  if (toFetch.size === 0) {
    console.log('1) 第一轮：从种子页收集链接...');
    for (const url of SEED_URLS) {
      try {
        const html = await fetchHtml(url);
        for (const u of extractHelpUrls(html)) {
          const key = urlToKey(u);
          if (!toFetch.has(u)) toFetch.set(u, key);
        }
        await sleep(DELAY_PAGE);
      } catch (e) {
        console.warn(`  跳过种子 ${url}: ${e.message}`);
      }
    }
    for (const id of [91, 162, 164, 160, 166, 167, 168, 223, 222, 225, 226, 247, 298, 357]) {
      const u = `${BASE}?helpid=${id}`;
      if (!toFetch.has(u)) toFetch.set(u, `helpid_${id}`);
    }
  }
  console.log(`   待下载共 ${toFetch.size} 个页面`);

  const savedPages = new Map();
  let pageOk = 0,
    pageFail = 0;

  const downloadBatch = async (batch) => {
    for (const [url, key] of batch) {
      try {
        const html = await fetchHtml(url);
        const outFile = path.join(HELP_DIR, `${key}.html`);
        fs.writeFileSync(outFile, html, 'utf8');
        savedPages.set(key, { html, title: getPageTitle(html), imgUrls: extractImageUrls(html) });
        pageOk++;
        console.log(`   [${pageOk + pageFail}] ${key}.html`);
      } catch (e) {
        pageFail++;
        console.warn(`   [${pageOk + pageFail}] ${key} 失败: ${e.message}`);
      }
      await sleep(DELAY_PAGE);
    }
  };

  console.log('2) 下载页面 HTML（第一轮）...');
  await downloadBatch(toFetch);

  /** 第二轮：从已下载的 HTML 中再扫链接，补抓未收录的页面（最多做 3 轮）*/
  for (let round = 2; round <= 4; round++) {
    const existingKeys = new Set(savedPages.keys());
    const secondBatch = new Map();
    const htmlFiles = fs.readdirSync(HELP_DIR).filter((f) => f.endsWith('.html'));
    for (const file of htmlFiles) {
      const html = fs.readFileSync(path.join(HELP_DIR, file), 'utf8');
      for (const u of extractHelpUrls(html)) {
        try {
          const full = u.startsWith('http') ? u : new URL(u, 'https://www.wjx.cn/help/').href;
          const key = urlToKey(full);
          if (existingKeys.has(key)) continue;
          const parsed = new URL(full);
          const id = parsed.searchParams.get('helpid') || parsed.searchParams.get('catid');
          const type = parsed.searchParams.has('helpid') ? 'helpid' : 'catid';
          const normUrl = parsed.origin + parsed.pathname + '?' + type + '=' + id;
          secondBatch.set(normUrl, key);
          existingKeys.add(key);
        } catch (_) {}
      }
    }
    if (secondBatch.size === 0) break;
    console.log(`   第 ${round} 轮：从已下载页中发现 ${secondBatch.size} 个新链接，继续下载...`);
    await downloadBatch(secondBatch);
  }
  console.log(`   共下载 ${pageOk} 页成功，${pageFail} 页失败`);

  const allImgUrls = new Set();
  for (const { imgUrls } of savedPages.values()) {
    for (const src of imgUrls) allImgUrls.add(toAbsoluteUrl(src));
  }
  console.log(`3) 下载图片（共 ${allImgUrls.size} 个唯一 URL）...`);
  const urlToLocal = new Map();
  let imgOk = 0,
    imgFail = 0;
  const list = [...allImgUrls];
  for (let i = 0; i < list.length; i++) {
    const local = await downloadImage(list[i]);
    if (local) {
      urlToLocal.set(list[i], local);
      imgOk++;
    } else imgFail++;
    if ((i + 1) % 30 === 0 || i === list.length - 1) console.log(`   [${i + 1}/${list.length}] 成功 ${imgOk}，失败 ${imgFail}`);
    await sleep(DELAY_IMAGE);
  }

  console.log('4) 改写 HTML 中的图片地址并生成索引...');
  const pagesIndex = {};
  for (const [key, { html, title, imgUrls }] of savedPages) {
    let outHtml = html;
    const localImages = [];
    for (const src of imgUrls) {
      const abs = toAbsoluteUrl(src);
      const local = urlToLocal.get(abs);
      if (local) {
        localImages.push(local);
        outHtml = outHtml.replace(new RegExp(escapeRe(src), 'g'), local);
      }
    }
    fs.writeFileSync(path.join(HELP_DIR, `${key}.html`), outHtml, 'utf8');
    pagesIndex[key] = { title, images: [...new Set(localImages)] };
  }

  fs.writeFileSync(path.join(HELP_DIR, 'pages-index.json'), JSON.stringify(pagesIndex, null, 2), 'utf8');
  const readme = `# 问卷星帮助中心（本地镜像）

供 **AI 或人工** 离线查阅、对照设计稿。页面与图片均已落盘，AI 可通过 Read 工具读取 \`.html\` 与 \`images/\` 下图片做参考。

- **页面**：\`helpid_91.html\`（填空题）、\`helpid_162.html\`（单选题）等
- **图片**：\`images/\`，HTML 内 \`<img src>\` 已改为本地路径
- **索引**：\`pages-index.json\` 记录每页 \`title\` 与 \`images\` 列表，便于按页定位

共 **${pageOk} 页**，${imgOk} 张图片成功，${imgFail} 张图片失败（部分图床可能 403）。若发现页数偏少可重新执行本脚本，会从已下载页中再扫链接并补抓。
`;
  fs.writeFileSync(path.join(HELP_DIR, 'README.md'), readme, 'utf8');

  console.log(`\n完成：${pageOk} 页，图片 ${imgOk} 成功 / ${imgFail} 失败`);
  console.log(`输出：${HELP_DIR}`);
  console.log(`索引：docs/wjx-help/pages-index.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
