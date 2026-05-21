# 项目交接 · 薛之谦二十年评论数据可视化

## 一、项目一句话

一个横屏桌面端学术海报风格的交互网页——用 1092 万条网易云评论数据，讲述薛之谦 2006–2026 二十年的声音轨迹。四页纵向滚动：专辑星团 → 唱片浏览器 → 时间项链 → 评论文化谱系。

**当前工作文件**：`index.html`（根目录，~73 KB，1600 行）

---

## 二、开发环境

```
本地服务器：http://localhost:8765/index.html
启动方式（在项目根目录）：npx serve -p 8765
（或已配置的其他静态文件服务器）
```

编辑 `index.html` 后刷新浏览器即可看到效果。无构建步骤，纯静态 HTML。

---

## 三、当前作品：index.html 四页结构

| 页码 | id | 内容 | 技术 | 数据源 |
|------|-----|------|------|--------|
| Page 01 | `#page-galaxies` | 14 个专辑气泡星团 | D3.js force + pack | `universe-data.js` |
| Page 02 | `#page-xzq` | 薛之谦二十年唱片浏览器（磨砂玻璃 3 栏） | React 18 + Babel standalone | 内联 `data.js` |
| Page 03 | `#page-necklace` | 17 年项链 + 深夜率雷达图 | D3.js radial | `universe-data.js` |
| Page 04 | `#page-genealogy` | 评论文化谱系（6 条脉络 110+ 节点） | D3.js + `genealogy.js` | 内联在 `genealogy.js` |

### 依赖的 CDN（已在 `<head>` 中）

- `d3.v7.min.js`
- `react@18.3.1/umd/react.development.js`
- `react-dom@18.3.1/umd/react-dom.development.js`
- `@babel/standalone@7.29.0/babel.min.js`

### 依赖的本地文件

- `universe-data.js` — Page 1 和 Page 3 的歌曲/专辑数据
- `genealogy.js` — Page 4 的谱系图绘制代码
- `covers/*.jpg` — 12 张专辑封面（Page 2 使用）

---

## 四、数据文件速查

### 核心原始数据（在 `uploads/` 下）

| 文件 | 大小 | 说明 |
|------|------|------|
| `uploads/xue_comments.csv` | 799 MB | 主评论数据 |
| `uploads/xue_comments_extended.csv` | 618 MB | 扩展评论文本 |
| `uploads/xu_song_comments.csv` | 423 MB | 按歌曲切分的评论 |
| `uploads/li_ronghao_comments.csv` | 155 MB | 李荣浩对比数据 |

### 处理后数据

| 文件 | 大小 | 说明 |
|------|------|------|
| `universe-data.js` | 17 KB | 当前可视化主数据（139 首歌的聚合指标） |
| `analysis_cache/xue_stats_v2.db` | 7.9 GB | SQLite 全量统计（DuckDB 产出） |
| `semantic_output/embeddings.npy` | 220 MB | BERT 嵌入向量 |
| `semantic_output/user_features.parquet` | 93 MB | 用户特征聚类结果 |

### 歌曲元数据

- `analysis_cache/song_meta_v2.csv` — 歌曲 ID / 名称 / 专辑映射
- `song_dates_complete.json` — 歌曲发行日期
- `core_song_dates.json` — 核心歌曲日期

---

## 五、目录导航（只读重要的）

```
项目根目录/
├── index.html              ← ★ 当前唯一编辑中的作品文件
├── universe-data.js        ← Page 1/3 数据
├── genealogy.js            ← Page 4 绘制代码
├── covers/                 ← 12 张专辑封面 JPG
│
├── uploads/                ← 原始爬取数据 + 歌词 + 媒体
│   ├── xue_comments*.csv   ← 主评论数据（大文件，勿删）
│   ├── lyrics/             ← 137 首纯文本歌词
│   └── media/              ← MP3 + LRC 歌词
│
├── semantic_output/        ← 语义分析全流程产出（CSV/JSON/Parquet/Python）
│   ├── motifs_discovered.csv    ← 发现的母题
│   ├── topic_clusters.csv       ← BERTopic 聚类
│   ├── persona_clusters.csv     ← 用户画像
│   ├── quote_bank.csv           ← 精选评论引用
│   └── MASTER_ANALYSIS_REPORT.md ← 完整分析报告
│
├── deliverables/           ← 项目交付物（报告/图表/方法论文档）
│   ├── REPORT.md           ← 中文完整报告
│   ├── REPORT_EN.md        ← 英文报告
│   ├── supplementary/      ← 数据声明/方法论/可复现性
│   └── figures/            ← 12 张 SVG 图表
│
├── analysis_cache/         ← SQLite 数据库 + 元数据
│
├── xzq/                    ← Page 2 的原始独立版本（已合并入 index.html）
│   └── xzq-career/         ← React JSX 源文件 + CSS
│
├── src/                    ← 旧版 React 场景源码（已不直接使用，保留参考）
│
├── NeteaseCloudMusic_PythonSDK/  ← 网易云 API SDK（爬虫依赖）
├── weibo-crawler/          ← 微博爬虫（独立子项目）
├── Userszjz65pretext/      ← Pretext 排版框架实验（独立子项目）
│
├── *.py                    ← 根目录散落的 Python 脚本（爬虫/分析/构建，非活跃）
├── *.cjs                   ← 根目录散落的 Node 脚本（数据处理，非活跃）
└── node_modules/           ← 仅依赖 NeteaseCloudMusicApi
```

**冗余说明**：根目录有大量 `.py`、`.cjs`、`.md` 文件是开发过程中产生的，大多数已经不再活跃使用。当前唯一活跃编辑的文件是 `index.html`。不要删除 `uploads/` 下的 CSV 数据文件（原始数据）。

---

## 六、设计风格规范（后续修改必须遵守）

### 6.1 画布与尺寸

- **目标屏幕**：电脑桌面横屏，1920×1080 或更大
- **页面布局**：纵向滚动，每页 `min-height: 100vh`，内容不超出视口宽度
- **Page 2（XZQ）例外**：`height: 100vh; overflow: hidden`，自身是一个完整的单屏应用
- **不要做移动端适配**。这不是手机 H5，是桌面学术海报

### 6.2 字体系统

**严禁使用浏览器默认字体**（宋体/Arial/Times New Roman）。当前使用的字体栈：

| 用途 | 字体 | 备选 |
|------|------|------|
| 中文正文 | `Noto Serif SC` | 思源宋体，学术感 |
| 中文标题/书法 | `Ma Shan Zheng` | 马山正，手写感 |
| 英文衬线 | `Cormorant Garamond` / `Lora` | 意大利体用于数据标注 |
| 等宽/标注 | `DM Mono` | 年份、数字、标签 |
| 中文无衬线 | `Noto Sans SC` | 极小字号的辅助信息 |
| UI 无衬线 | `Inter` | XZQ 页面的 sans-serif 角色 |

**原则**：
- 中文字体只用 Noto Serif SC 或 Ma Shan Zheng，不用系统默认中文字体
- 数字/英文标注用 DM Mono，不用系统等宽字体
- Google Fonts 的 CDN link 已经在 `<head>` 中，**不要删**

### 6.3 排版规范（学术海报风格）

- **标题要小**。masthead 字号 10px，不是 48px。标题区的 h1 用 `clamp(34px, 4vw, 56px)` 已经偏大，后续可以缩小
- **标题紧贴顶部**。masthead 在 `padding-top: 60px` 区域内，行距紧凑（`padding-bottom: 14px`），不要加空白行
- **不要巨大行距**。正文 `line-height: 1.65–1.85`，标题 `line-height: 1.05`
- **信息密度要高**。学术海报的特点就是信息量大但不杂乱——用网格、细线、小字、留白来组织
- **分割线用细线**。`1px solid rgba(42,34,48,0.22)`，不是粗黑线
- **颜色克制**。当前是纸色底（`#F4EFEA`）+ 深棕墨色（`#2A2230`）+ 粉色系数据色。不要引入高饱和色

### 6.4 CSS 变量体系

```css
--paper: #F4EFEA;       /* 纸色底 */
--ink: #2A2230;          /* 墨色 */
--c-cream: #F2D9CC;      /* 数据色阶: 低深夜率 */
--c-blush: #F0B5C0;
--c-rose: #E89AAE;
--c-petal: #D679A1;
--c-plum: #A04B7F;
--c-wine: #6B2D52;       /* 数据色阶: 极高深夜率 / 病毒式 */
```

### 6.5 Page 2（XZQ）的独立设计系统

Page 2 有自己的 CSS 变量（全部 scoped 在 `.page-xzq` 下），不与主页面共享：

```css
--c1, --c2, --c3   /* 每张专辑的磨砂玻璃调色板，由 React 动态设置 */
--ink: #2A2528
--serif: 'Lora', 'Noto Serif SC'
--sans: 'Inter'
```

**修改 Page 2 样式时**，必须在选择器前加 `.page-xzq` 前缀，否则会污染其他页面。

---

## 七、技术约束与注意事项

1. **编码**：所有文件 UTF-8。**绝对不要用 PowerShell 的 `Get-Content` 不加 `-Encoding utf8` 读取中文文件**——中文 Windows 系统默认 GBK，会永久损坏文件。只使用 Edit/Write 工具或 bash 修改文本文件。

2. **无构建工具**：index.html 是纯静态 HTML + CDN 脚本。React 组件通过 Babel standalone 在浏览器端编译（`text/babel`）。不需要 webpack/vite。

3. **D3 版本**：d3.v7。SVG 用 `viewBox` 做响应式，不写死像素尺寸。

4. **数据格式**：`universe-data.js` 暴露 `window.UNIVERSE_DATA`。XZQ 数据暴露 `window.ERAS`、`window.ALBUMS`、`window.HOURLY`。

5. **脚本加载顺序**：CDN 脚本在 `<head>` → 页面 HTML → `universe-data.js` → 内联 D3 绘制脚本 → XZQ 数据 + JSX 脚本（`text/babel`）→ `genealogy.js`。顺序不能乱。

6. **两个 tooltip**：`#tip` 服务于 Page 1/3，`#tip2` 服务于 Page 4。格式不同，不要混用。

---

## 八、后续工作方向

按优先级排列：

1. **统一设计语言**：当前四页风格不完全统一（Page 1/3 是纸色底学术风，Page 2 是磨砂玻璃唱片风，Page 4 是白底谱系图）。需要让它们更像"同一套 poster"
2. **缩小标题字号**：当前 masthead 和 h1 仍然偏大，往学术海报的方向收
3. **Page 2 加 masthead**：目前 XZQ 页面没有页眉，和其他三页不一致
4. **数据更新**：`universe-data.js` 的评论数是某一时刻的快照，如有新数据需重新跑 `compute_xue_stats_v2.py`
5. **清理根目录**：大量 `.py` `.cjs` `.md` `.json` 散落在根目录，可以归档到子目录

---

## 九、v3 二次清洗与高级语义分析进展

> 更新时间：2026-05-17 夜间。该部分记录基于《方法论OCR提取.md》后的二次清洗与更高阶数据分析进展。

### 9.1 已完成的工作

1. 已读取并吸收方法论文档：`C:\Users\zjz65\Documents\Obsidian Vault\方法论OCR提取.md`。
2. 已在不破坏既有 `analysis_cache/xue_stats_v2.db` / `master_final` 的前提下，对原始全量评论数据追加 v3 清洗标记。
3. 新增工作目录：`advanced_cleaning_v3/`。
4. 已完成一套“二次清洗 + 高级语义切片 + 统计检验 + 可视化草图”的离线分析链路。

### 9.2 新增文件与用途

核心目录：`advanced_cleaning_v3/`

- `ADVANCED_ANALYSIS_REPORT.md`：v3 高级清洗与分析报告，优先阅读。
- `advanced_cleaning_analysis.py`：抽样/分层语义分析、五维标签、统计检验、图表产出脚本。
- `full_cleaning_flags.py`：全量评论清洗标记脚本，只追加标记，不覆盖原始数据。
- `sample_enriched.parquet` / `sample_enriched.csv`：高级分析分层样本及标签结果。
- `cleaning_flags_full.parquet`：全量评论的清洗标记结果。
- `five_dimension_summary.csv`：五维语义框架汇总。
- `year_trends.csv`：年度趋势切片。
- `album_profiles.csv`：专辑维度画像。
- `hour_profiles.csv`：小时/深夜行为画像。
- `slice_keywords_tfidf.csv`：切片关键词 TF-IDF。
- `statistical_tests.csv`：年度、专辑、小时等维度的统计检验结果。
- `figures/*.svg` / `figures/*.png`：可视化草图，可供后续接入页面。

### 9.3 清洗策略与方法论决定

本轮清洗不采用简单删除逻辑，而是采用“保留原文 + 标记层”的方式：

- 原始数据与既有 DuckDB 缓存保持不变。
- 在全量数据上追加清洗标记，便于不同研究问题使用不同过滤口径。
- “低信息短评”不直接删除；它既可能是噪声，也可能是粉丝仪式、打卡文化、在场证明、情绪宣泄的有效信号。
- 做严肃语义分析时，可以过滤低信息短评；做粉丝文化/传播仪式研究时，低信息短评反而应作为单独指标。
- 匿名用户/系统代理不简单丢弃，而是作为平台身份机制和评论生态的重要结构性变量。

### 9.4 当前采用的高级分析框架

五维语义框架：

1. **情绪/态度**：怀旧、陪伴、伤感、治愈、赞美、争议等。
2. **目标**：面向歌曲、歌手、个人经历、他人互动、平台仪式等。
3. **态度目标**：喜欢/认同、共鸣、批评、求互动、纪念等。
4. **行为意图**：打卡、循环播放、分享、告白、回忆、安利等。
5. **信息源**：歌词触发、时间触发、生活事件、粉丝身份、平台互动等。

额外扩展维度：

- 主观性强弱。
- 表达风格：叙事、抒情、短促仪式、口语互动等。
- 语境复杂度：是否包含时间、人物、事件、地点、关系等上下文。
- 年度/专辑/小时切片差异。
- TF-IDF 切片关键词。
- 基础统计检验，用于判断差异是否只是视觉错觉。

### 9.5 关键数值结果

- 全量评论：`10,925,396`。
- 匿名用户代理：`4,625,102`。
- 全量低信息短评：`1,019,912`，约 `9.34%`。
- 全量可进入严肃语义分析：`10,143,745`，约 `92.85%`。
- 高级分析分层样本：`257,432`。
- 样本可分析评论：`250,243`，约 `97.2%`。
- 全量深夜率最高年份：`2023`，约 `36.5%`。

### 9.6 对页面与产品化的接入建议

如果继续把 v3 分析接入当前静态网页，建议优先级如下：

1. **Page 1 / Page 3**：加入低信息率、主观性、语境复杂度等“清洗后质量指标”，使数据分析更可信。
2. **Page 2（XZQ 专辑页）**：接入 `album_profiles.csv`，展示不同专辑的评论语义画像，而不是只看播放/评论总量。
3. **Page 4 谱系图**：从单纯关键词谱系升级为“目标—行为意图—表达风格”的评论文化谱系。
4. **时间分析**：接入 `year_trends.csv` 与 `hour_profiles.csv`，强调 2023 年深夜率峰值及不同时段评论语义差异。
5. **方法说明区**：明确说明低信息短评不是简单噪声，而是“仪式性表达”的可研究对象。

### 9.7 后续研究路线

- 从 `sample_enriched.parquet` 抽取 500–1000 条评论进行人工标注。
- 用当前 v3 规则标签作为弱监督标签，训练 BERT + sigmoid 的多标签分类模型。
- 将人工标注结果反哺规则体系，区分“噪声短评”和“仪式短评”。
- 若要论文/报告化，优先围绕以下问题组织：
  - 评论是否只是歌曲反馈，还是一种长期陪伴关系的记录？
  - 深夜评论是否更高主观性、更强情绪密度？
  - 不同专辑是否形成不同的情绪共同体？
  - 低信息短评是否构成平台化音乐消费中的“打卡仪式”？

### 9.8 注意事项

- `analysis_cache/xue_stats_v2.db` 是 DuckDB，不是 SQLite。
- 不要删除 `uploads/` 下的大型原始 CSV。
- 不要直接覆盖原始评论数据；后续继续采用“派生数据/标记数据”方式。
- Python 在 sandbox 内读取 `site-packages` 可能报权限问题；正式分析脚本此前是在提权后运行成功的。
- 读写中文文件必须显式 UTF-8，尤其不要用 PowerShell 默认编码直接改中文 Markdown。

## 10. 2026-05-18 Page1 星图最新精修记录

### 10.1 用户要求

- 红框内的 Page1 星图主体要占满首屏，不要缩在中间。
- 不要再有外侧大框或 SVG 内部矩形底框。
- 背景要更漂亮，可以是动态模糊 / 磨砂星云质感。
- 图例需要说明大圆之间的连线，以及三片大椭圆雾带如何划分。
- 不要恢复用户已要求删掉的长说明文案，不要写 DuckDB、真实数据映射、第一卷等自我说明。

### 10.2 已改动文件

- `index.html`：只继续精修现有 Page1 星图，没有重做整页，也没有改 Page3 圆环图。

### 10.3 已完成的视觉与布局调整

- Page1 改为 `height: 100vh`、`padding: 0`，星图 SVG 绝对定位铺满首屏。
- SVG 改为 `viewBox="0 0 1600 900"`、`preserveAspectRatio="xMidYMid slice"`，使主体更接近全屏海报。
- 去掉原先外层大磨砂玻璃框与 SVG 内部矩形暗底，避免“外侧套两个大框”的观感。
- 背景改为全屏暗色磨砂星云：多层 radial-gradient、星点噪声和动态模糊雾层。
- 新增慢速动画：`page1MistDrift`、`page1StarsDrift`、`page1SvgMist`。
- 星团整体放大并铺开：`albumR` 调为 `[42, 138]`，`tx = 112 + t * (W - 224)`，fit 缩放上限调到 `1.24`。
- 底部时间轴保留但降低存在感，不作为主要叙事文案。

### 10.4 当前图例内容

左上角保留标题“薛之谦专辑星图”，下方是极简中文图例：

1. **星体面积**：每颗星是一首歌，越大评论越多。
2. **深夜占比**：0—5 点评论 ÷ 全部评论；颜色从暖色到酒紫表示由低到高。
3. **柔光连线**：大圆按发行时间依次连接。
4. **三片椭圆雾带**：左侧早期，中部回潮，右下近年深夜高峰。

### 10.5 数据状态

- Page1 歌曲颜色仍沿用真实 `nightRate` / 深夜占比映射。
- 星体面积仍对应歌曲评论数。
- 专辑大圆尺寸仍对应专辑评论规模。
- 本次没有改动 `universe-data.js`。

### 10.6 验证记录

已运行并通过：

```powershell
node --check universe-data.js
# 抽取 index.html 非 Babel script 后 node --check 通过
git diff --check -- index.html universe-data.js
```

已用 Playwright 打开本地 `http.server` 进行 1440×900 首屏截图检查：Page1 能正常显示，星图已铺满首屏且无外层大框。临时截图和 `.playwright-cli/` 已清理。

### 10.7 后续接手注意

- 若继续调 Page1，优先微调 `drawA()` 里的 `albumR`、`tx/ty`、`padTop/padBot/padSide`、`fitScale`，不要重新生成整页。
- 不要恢复被删掉的长说明文案。
- 不要把 Page1 改回外框式卡片；当前方向是“全屏星云海报”。
- 不要影响 Page3，Page3 的专辑宇宙圆环图此前已基本定稿。

---

## 11. 2026-05-18 评论文化河流图接入 index.html 记录

### 11.1 用户要求

- 将已确认“很好”的 `comment-culture-river.html` 接入 `index.html` 最后一页。
- 不要打扰其他 agent；不要和其他人同时乱改同一个 HTML 导致报错。
- 及时 git，但不能把其他 agent 的无关改动混进提交。

### 11.2 本次实际改动

- `comment-culture-river.html` 保持为独立单页，不再重做视觉。
- 在 `index.html` 中新增/移动最终页：

```html
<!-- ============ FINAL PAGE: 评论文化河流图 (1920×1080) ============ -->
<section class="page" id="page-genealogy" style="padding:0; min-height:100vh; overflow:hidden;">
  <iframe
    src="./comment-culture-river.html"
    title="薛之谦评论文化河流图"
    style="width:100%; height:100vh; border:0; display:block; background:#E8E1D2;"
  ></iframe>
</section>
```

- 当前 `index.html` 已存在另一个 agent 新增的 `#page-emotion-scrolly`，因此河流图已放在它之后，确保 `#page-genealogy` 是 body 下最后一个 `.page` section。
- 修复了 Page3 `#page-necklace` 末尾错误闭合：原来是裸 `<span>继续向下</span><div class="line"></div></div>`，会导致后续页面嵌进 Page3；已改为标准 `.divider` 并用 `</section>` 正确闭合。

### 11.3 验证记录

使用本地静态服务器 + Chrome CDP 验证：

- 访问：`http://127.0.0.1:8985/index.html#page-genealogy`
- `body > section.page` 顺序为：
  1. `page-galaxies`
  2. `page-xzq`
  3. `page-necklace`
  4. `page-emotion-scrolly`
  5. `page-genealogy`
- 验证结果：`isLast: true`
- iframe 加载结果：
  - title = `薛之谦评论文化河流图`
  - iframe 内存在 `svg path.layer`
  - 页面文本开头为“薛之谦评论文化河流图 / COMMENT CULTURE RIVER MAP”
- 截图文件曾生成在 `.tmp/index-final-river-cdp.png`，仅用于本地核验；`.tmp/` 已在 `.gitignore` 中。

### 11.4 Git 状态与提交注意

本次没有提交 commit。原因：当前工作区在接入前/接入期间已有大量其他 agent 未提交改动，包括但不限于：

- `build-react-index.cjs`
- `index.html`
- `src/react/app.jsx`
- `src/react/core.jsx`
- `src/react/scenes/cover-scene.jsx`
- `src/react/scenes/scenes-5-14.jsx`
- `uploads/progress.json`
- 新增 `emotion-scrolly-data.js` 等未跟踪文件

如果直接 `git add index.html && git commit`，会把其他 agent 对 `index.html` 的大规模改动和本次 iframe 接入混在一起。后续如需提交，建议：

1. 先和当前负责 `index.html` / React 页面的 agent 对齐。
2. 若只提交本次接入，使用 `git add -p index.html` 精确 stage 以下两类 hunk：
   - Page3 末尾 `.divider` + `</section>` 修复。
   - `FINAL PAGE: 评论文化河流图` 的 iframe section。
3. 不要 stage React 文件、`uploads/progress.json` 或其他 agent 的新页面数据文件，除非明确要一起交付。

### 11.5 后续接手注意

- `comment-culture-river.html` 是用户刚确认过的最终河流图视觉，不要再擅自重绘。
- `index.html` 里保留 `<script src="genealogy.js"></script>` 目前不会阻塞：`genealogy.js` 开头会查找 `#genealogy`，不存在则返回。若后续清理，可再统一删除旧谱系脚本和 `#tip2`，但不要在多人并行时贸然删。
- 如果用普通 Chrome headless `--screenshot` 直接截 `#page-genealogy` 得到空白，不一定代表页面没渲染；此前已通过 CDP 确认 iframe 实际加载正常。更可靠的验证方式是进入页面后执行 `document.getElementById('page-genealogy').scrollIntoView()` 再截图。

---

## 12. 2026-05-19 Page 11 评论暗语溯源（Peace Meme）接入 index.html

### 12.1 用户要求

构建单屏可视化「评论暗语溯源」——追踪「世界和平」这个短语在薛之谦歌曲评论中 2015–2026 的传播史。从语义分析产出的 `motifs_discovered.csv` 中提取 `known_world_peace` 母题数据。

**8 条铁律**（IEEE VIS 级别）：

1. 内容决定形式——先问「这个值得看吗」
2. 一个深层故事 > 二十个浅层统计——单屏，一件事
3. 数据质量检查必须上游——发现「自己己的」叠字类 bug 立刻报告
4. 绝不画「形式上正确但内容空洞」的图——数据填不满就少画
5. 视觉差异 = 信息差异——如果四张卡片看起来一样信息不同，那是失败
6. 字号、位置、颜色全是数据维度——等大网格 = 否认差异
7. 文本本身就是可视化——不只是标注，文本可以是主体
8. 用户应该能一句话概括这一屏——做不到就是失败

**布局**：1920×1080 横屏，30/40/30 三栏：
- 左 (30%)：原点故事——标题「零号 · 2015 年那条评论」，巨型引用，元数据
- 中 (40%)：扩散视图——SVG 时间线 2015-2026，琥珀色圆点按歌曲×月，GSAP 自动播放
- 右 (30%)：变体画廊——「它的 23 个孩子」，可滚动卡片含引用文本、歌曲、日期、点赞数

### 12.2 数据管线

**数据源**：
- `uploads/xue_comments.csv`（799 MB，1092 万条评论）——主数据源
- `uploads/xue_comments_extended.csv`（618 MB）——因 CSV 引号转义问题被排除
- `semantic_output/motifs_discovered.csv`——`known_world_peace` 条目：46,577 次，128 首歌，23 张专辑

**数据质量问题（已发现并报告）**：
- n-gram tokenizer 产生垃圾模式：「自己己的」「现在在的」「世界界和」「界和和平」——所有 `ngram_` 前缀条目应过滤，仅 `known_` 条目有效
- xue_comments_extended.csv 的 content 字段未正确引号转义，逗号破坏简单 split 解析
- `song_name="MEMORY"` 是占位符，非真实歌曲

**最终数据文件**：
- `wp_timeline.json`（34 KB）——20,598 条去重评论，45 首歌，每首歌含月度计数、首发/末次时间、最高赞评论
- `wp_timeline.js`（34 KB）——同上内容，包装为 `window.WP_TIMELINE_DATA = {...};`，遵循项目已有的数据文件模式（`universe-data.js`、`page-data.js`）

**关键数据点**：
- 始祖评论：《认真的雪》，2015-07-09 12:04，82,401 赞
- 时间最早评论：《绅士》，2015-05-21 12:28
- 最高频歌曲：《跃》(3,442 条)、《我好像在哪见过你》(1,589 条)、《天外来物》(1,588 条)

### 12.3 对 index.html 的改动

**新增 CDN 依赖**：
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
```
GSAP 驱动时间线动画（0.3 秒/月，~41 秒播完 137 个月）。

**CSS 新增**（`#page-peace-meme` 作用域下）：
- 两个新 CSS 变量：`--amber: #C2622A`、`--amber-light: #E8905A`
- ~40 条 `.pm-*` 前缀样式规则：三栏 flex 布局、左栏引用排版、中栏 SVG 圆点/光标、右栏可滚动变体卡片、底部播放条

**HTML 新增**：
- Page 11 divider + `<section id="page-peace-meme">`，位于 Page 10（专辑语义演变）之后
- 页面结构：`.pm-top-bar` → `.pm-main`（三栏）→ `.pm-bot-bar`

**JS 新增**：
- `<script src="wp_timeline.js"></script>` 在 `page-data.js` 之后
- `drawPeaceMeme()` 函数在主 `<script>` 块末尾，包含：
  - D3 散点图渲染（`d3.scaleSqrt` 映射 count → 半径 2.5–12px）
  - 月度网格 + 年份标签 + 歌曲名标签
  - GSAP `gsap.to` 动画自动播放
  - 时间光标拖拽 + SVG 点击跳转
  - 圆点 ↔ 右侧变体卡片的双向 hover 交叉高亮
  - 动态标题更新（用实际数据覆盖静态占位符）
  - `window.resize` 响应式 viewBox 更新

### 12.4 设计决策

- **不用 React**：此页面是 D3 + GSAP + 原生 DOM，不依赖 React 或 Babel standalone
- **数据外挂而非内联**：`wp_timeline.js` 独立加载（34 KB），不写入 index.html 内联，保持 index.html 可维护
- **CSS 命名空间**：所有选择器使用 `#page-peace-meme` + `.pm-*` 前缀，不污染其他 10 页
- **起源选择**：视觉原点用《认真的雪》的 82,401 赞评论，而非时间最早的《绅士》（2015-05-21），因为前者传播影响力更大
- **motifs 数据声称 128 首歌，实际仅找到 45 首**：差异源于 xue_comments_extended.csv 被排除（解析质量问题）。如需补全，需修复 extended CSV 的解析

### 12.5 遗留问题

- **128 vs 45 首歌的差距**：motifs CSV 声称 `known_world_peace` 覆盖 128 首歌，但主 CSV 仅产出 45 首。差距在 xue_comments_extended.csv 中（因解析质量问题被跳过）。修复 extended CSV 解析可补全
- **peace-meme.html 独立版**：仍存在于项目根目录，但已改用 `fetch('wp_timeline.json')` 加载数据（`file://` 协议下无法工作）。如需独立打开，用本地 HTTP 服务器（`npx serve -p 8765`）或删除它
- **GSAP 许可**：`gsap.min.js` 从 CDN 加载，免费用于非商业/教育用途。若商用需购买许可

### 12.6 验证方法

用本地 HTTP 服务器打开 `index.html`，滚动到 Page 11 或直接访问 `http://localhost:8765/index.html#page-peace-meme`：
- 左侧应显示起源引用（82,401 赞）
- 中间 SVG 应显示 45 行琥珀色圆点网格，随播放按钮动画扩散
- 右侧应显示 23 张变体卡片，hover 时圆点交叉高亮
- 控制台应打印 `Peace Meme ready: <N> dots across 45 songs, 137 months`
