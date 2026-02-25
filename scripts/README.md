# 脚本说明

## 一键下载帮助中心（页面 + 图片，供 AI 参考）

**推荐**：若希望把**页面内容和页面里的图片**都下载到本地，便于 AI 读取并参考，直接运行：

```bash
node scripts/fetch-wjx-help-full.mjs
```

会依次：**从 16 个种子分类页**收集链接 → 下载第一轮页面 → **从已下载页中再扫链接并补抓（最多 3 轮）**，尽量覆盖完整帮助中心 → 下载图片 → 改写 HTML 图片地址 → 生成 `pages-index.json`。若之前只有约 192 页，重新执行后页数会增多（通常可到 250+，视站点链接结构而定）。完成后，AI 可读取 `docs/wjx-help/*.html`、`docs/wjx-help/images/*.png` 及 `pages-index.json` 做参考。

---

## 仅下载页面（download-wjx-help.mjs）

将 [问卷星帮助中心](https://www.wjx.cn/help/help.aspx) 的页面批量下载到本地 `docs/wjx-help/`，便于离线查阅和对照设计稿。

**环境**：Node 18+（使用原生 `fetch`）

**用法**：

```bash
# 仅下载 HTML 页面
node scripts/download-wjx-help.mjs

# 同时尝试下载页面中的图片到 docs/wjx-help/images/（部分图床可能 403）
node scripts/download-wjx-help.mjs --images
```

**输出**：`docs/wjx-help/helpid_91.html`、`catid_12.html` 等；`README.md` 索引；使用 `--images` 时有 `images/` 目录。

---

## 仅下载帮助页中的图片（download-wjx-help-images.mjs）

在**已用上一步下载好 HTML** 的前提下，从所有 `docs/wjx-help/*.html` 里解析出 `<img src>`，把图片下载到 `docs/wjx-help/images/`，并可选地改写 HTML 中的图片地址为本地路径。

**用法**：

```bash
# 只下载图片到 docs/wjx-help/images/，不修改 HTML
node scripts/download-wjx-help-images.mjs

# 下载图片并把 HTML 里的图片地址改成本地路径（离线打开页面也能看图）
node scripts/download-wjx-help-images.mjs --rewrite
```

**说明**：图片文件名按 URL 生成唯一名（避免重名）；请求间隔约 0.4 秒。部分图床（如 pubnew.paperol.cn）可能返回 403，对应图片会跳过。
