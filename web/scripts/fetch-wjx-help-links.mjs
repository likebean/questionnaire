#!/usr/bin/env node
/**
 * 用 Playwright 打开问卷星帮助中心，展开侧栏所有菜单，收集全部 help.aspx 链接。
 * 输出到 docs/wjx-help/playwright-urls.json，供 fetch-wjx-help-full.mjs 使用（覆盖更全）。
 *
 * 使用：在项目根目录执行
 *   cd web && node scripts/fetch-wjx-help-links.mjs
 * 或：npm run fetch-wjx-help-links（需在 web/package.json 中加 script）
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELP_DIR = path.resolve(__dirname, '../../docs/wjx-help');
const BASE = 'https://www.wjx.cn/help/help.aspx';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  let urls = [];

  try {
    // 先打开「题型说明」页，该页侧栏会渲染全部 helpid 链接，再展开所有一级菜单
    console.log('打开帮助中心（题型说明页以加载完整侧栏）...');
    await page.goto(`${BASE}?catid=12`, { waitUntil: 'networkidle', timeout: 20000 });

    const menuSelector = '#ctl00_ContentPlaceHolder1_my_menu';
    await page.waitForSelector(menuSelector, { timeout: 15000 });

    // 先尝试页面自带的 expandAll（SDMenu）
    await page.evaluate(() => {
      if (typeof window.myMenu !== 'undefined' && window.myMenu.expandAll) {
        window.myMenu.expandAll();
      }
    });
    await page.waitForTimeout(600);

    // 若未全部展开，则逐个点击 collapsed 的一级项
    let collapsed = await page.$$(`${menuSelector} div.collapsed`);
    while (collapsed.length > 0) {
      const span = await collapsed[0].$('span:first-child');
      if (span) {
        await span.click();
        await page.waitForTimeout(400);
      }
      collapsed = await page.$$(`${menuSelector} div.collapsed`);
    }

    // 从侧栏 + 正文中收集所有 help 链接（含 data-url 里的 help.aspx）
    urls = await page.evaluate((base) => {
      const seen = new Set();
      const list = [];
      const add = (href) => {
        if (!href || !href.includes('help.aspx')) return;
        try {
          const u = href.startsWith('http') ? new URL(href) : new URL(href, 'https://www.wjx.cn/help/');
          const helpid = u.searchParams.get('helpid');
          const catid = u.searchParams.get('catid');
          let key, norm;
          if (helpid) {
            key = `helpid_${helpid}`;
            norm = `${base}?helpid=${helpid}`;
          } else if (catid) {
            key = `catid_${catid}`;
            norm = `${base}?catid=${catid}`;
          } else return;
          if (seen.has(key)) return;
          seen.add(key);
          list.push(norm);
        } catch (_) {}
      };

      document.querySelectorAll(`a[href*="help.aspx"]`).forEach((a) => add(a.getAttribute('href')));
      document.querySelectorAll(`a[data-url*="help.aspx"]`).forEach((a) => add(a.getAttribute('data-url')));
      return list;
    }, BASE);

    // 确保包含首页
    if (urls.length && !urls.some((u) => u === BASE || u === BASE + '?')) {
      urls = [BASE, ...urls];
    }

  } finally {
    await browser.close();
  }

  const unique = [...new Set(urls)];
  fs.mkdirSync(HELP_DIR, { recursive: true });
  const outPath = path.join(HELP_DIR, 'playwright-urls.json');
  fs.writeFileSync(outPath, JSON.stringify(unique, null, 2), 'utf8');

  console.log(`收集到 ${unique.length} 个帮助页链接`);
  console.log(`已写入: ${outPath}`);
  console.log('可执行: node scripts/fetch-wjx-help-full.mjs 进行下载（将优先使用此列表）');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
