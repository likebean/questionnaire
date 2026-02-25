#!/usr/bin/env node
/**
 * 下载问卷星帮助中心所有页面（及可选图片）到 docs/wjx-help/
 * 使用：node scripts/download-wjx-help.mjs
 * 需要 Node 18+（使用原生 fetch）
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://www.wjx.cn/help/help.aspx';
const OUT_DIR = path.resolve(__dirname, '../docs/wjx-help');
const IMAGES_DIR = path.join(OUT_DIR, 'images');
const DELAY_MS = 800; // 请求间隔，避免过快

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 种子 URL：用于从这些页面中提取所有帮助链接 */
const SEED_URLS = [
  BASE,
  `${BASE}?catid=5`,   // 使用流程
  `${BASE}?catid=12`,  // 题型说明
  `${BASE}?catid=53`,  // 设计问卷
  `${BASE}?catid=54`,  // 回收答卷
  `${BASE}?catid=55`,  // 统计分析
  `${BASE}?catid=11`,  // 问卷设置等
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 从 HTML 中提取 help.aspx?helpid= 和 help.aspx?catid= 的链接（去重、规范化） */
function extractHelpUrls(html) {
  const seen = new Set();
  const urls = [];
  const base = 'https://www.wjx.cn/help/';
  const re = /href=["']([^"']*help\.aspx\?(helpid|catid)=\d+)(?:&[^"']*)?["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let u = m[1].replace(/&amp;/g, '&');
    if (!u.startsWith('http')) u = new URL(u, base).href;
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

/** 从 HTML 中提取图片 URL（可选下载） */
function extractImageUrls(html) {
  const urls = new Set();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) urls.add(m[1]);
  return [...urls];
}

/** 规范化 URL 为 key（用于文件名） */
function urlToKey(url) {
  const u = new URL(url);
  const helpid = u.searchParams.get('helpid');
  const catid = u.searchParams.get('catid');
  if (helpid) return `helpid_${helpid}`;
  if (catid) return `catid_${catid}`;
  return 'index';
}

/** 请求并返回 HTML，带简单重试 */
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
      const charset = (charsetMatch && charsetMatch[1]) ? charsetMatch[1].toLowerCase() : 'gb2312';
      if (charset.includes('gb') || charset === 'gb2312' || charset === 'gbk') {
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
}

/** 下载图片到本地，返回本地相对路径（相对 OUT_DIR）*/
async function downloadImage(imgUrl, baseDir) {
  let absoluteUrl = imgUrl;
  if (imgUrl.startsWith('//')) absoluteUrl = 'https:' + imgUrl;
  else if (imgUrl.startsWith('/')) absoluteUrl = 'https://www.wjx.cn' + imgUrl;
  else if (!imgUrl.startsWith('http')) absoluteUrl = new URL(imgUrl, BASE).href;

  const parsed = new URL(absoluteUrl);
  const ext = path.extname(parsed.pathname) || '.png';
  const base = path.basename(parsed.pathname, ext) || 'img';
  const hash = crypto.createHash('md5').update(absoluteUrl).digest('hex').slice(0, 6);
  const name = (base + '_' + hash).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) + ext;
  const localPath = path.join(baseDir, name);
  for (let retry = 0; retry < 2; retry++) {
    try {
      const res = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://www.wjx.cn/',
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, Buffer.from(buf));
      return path.relative(OUT_DIR, localPath).replace(/\\/g, '/');
    } catch (e) {
      if (retry === 1) return null;
      await sleep(800);
    }
  }
  return null;
}

async function main() {
  const downloadImages = process.argv.includes('--images');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (downloadImages) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const toFetch = new Map(); // url -> key

  console.log('1) 收集帮助中心链接...');
  for (const url of SEED_URLS) {
    try {
      const html = await fetchHtml(url);
      for (const u of extractHelpUrls(html)) {
        const key = urlToKey(u);
        if (!toFetch.has(u)) toFetch.set(u, key);
      }
      await sleep(DELAY_MS);
    } catch (e) {
      console.warn(`  跳过种子 ${url}: ${e.message}`);
    }
  }
  // 补全常见 helpid（题型说明页可能未全部出现在侧栏）
  for (const id of [91, 162, 164, 160, 166, 167, 168, 223, 222, 225, 226, 247, 298, 357]) {
    const u = `${BASE}?helpid=${id}`;
    if (!toFetch.has(u)) toFetch.set(u, `helpid_${id}`);
  }

  console.log(`   共 ${toFetch.size} 个页面待下载`);
  let ok = 0,
    fail = 0;

  for (const [url, key] of toFetch) {
    const outFile = path.join(OUT_DIR, `${key}.html`);
    try {
      const html = await fetchHtml(url);
      let outHtml = html;
      if (downloadImages) {
        const imgs = extractImageUrls(html);
        for (const src of imgs) {
          try {
            const local = await downloadImage(src, IMAGES_DIR);
            if (local) {
              const esc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              outHtml = outHtml.replace(new RegExp(esc, 'g'), local);
            }
          } catch (_) {}
          await sleep(200);
        }
      }
      fs.writeFileSync(outFile, outHtml, 'utf8');
      ok++;
      console.log(`   [${ok + fail}/${toFetch.size}] ${key}.html`);
    } catch (e) {
      fail++;
      console.warn(`   [${ok + fail}/${toFetch.size}] ${key} 失败: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const list = [...toFetch.values()].slice(0, 500).map((k) => `  - [${k}.html](${k}.html)`).join('\n');
  const index = `# 问卷星帮助中心镜像\n\n共 ${ok} 页成功，${fail} 页失败。\n\n- 页面：\n${list}\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), index, 'utf8');
  console.log(`\n完成：${ok} 成功，${fail} 失败。输出目录：${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
