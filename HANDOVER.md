# 项目交接 · 薛之谦二十年评论数据可视化

## 一、项目一句话

一个横屏桌面端学术海报风格的交互网页——用 1092 万条网易云评论数据，讲述薛之谦 2006–2026 二十年的声音与文化轨迹。8 页纵向滚动叙事，按"数据 → 文本 → 情感 → 时间 → 节律 → 人物 → 故事"的逻辑脊椎组织。

**当前工作文件**：`index.html`（根目录，~4,080 行，单文件包含全部 CSS/HTML/JS）

---

## 二、开发环境

```
本地服务器：http://localhost:8985/index.html
启动方式（在项目根目录）：
  python -m http.server 8985 --bind 127.0.0.1
  或 npx serve -p 8985
```

编辑 `index.html` 后刷新浏览器即可看到效果。无构建步骤，纯静态 HTML。

---

## 三、当前作品：index.html 8 页叙事结构 + 附录

| 页码 | id | 内容 | 技术 | 数据源 |
|------|-----|------|------|--------|
| PAGE 1 | `#page-necklace` | 专辑宇宙圆环项链 | D3.js radial + force | `universe-data.js` |
| PAGE 2 | `#page-stats` | 基础统计概览（长度直方图+KDE、点赞log直方图、小时节律、Top10用户） | D3.js 四格图表 | 内联 JSON 数据（47K 抽样） |
| PAGE 3 | `#page-words` | 词云 + Top30 条形图 + 热门vs普通对比词云 + 分歧条形图 | D3.js force + bars | `word_freq_all_candidates.json`（词性分词频）；40万条抽样（热/普对比） |
| PAGE 4 | `#page-sentiment` | BERT 情感分析：环形图 + 年趋势双轴图 + 小时柱状图 + 示例评论 | D3.js donut + line + bars | `year_trends.csv`、`hour_profiles.csv`、`five_dimension_summary.csv`、`representative_examples.csv` |
| PAGE 5 | `#page-genealogy` | 评论文化河流图 | iframe → `comment-culture-river.html` | Streamgraph 独立页面 |
| PAGE 6 | `#page-day-migration` | 评论日节律粒子迁移动画 | D3.js + CSS 动画 | `day-migration-data.js` |
| PAGE 7 | `#page-personas` | 四种听众画像 | 原生 DOM + 硬编码数据 | `persona_clusters.csv` → 内联 |
| PAGE 8 | `#page-peace-meme` | "世界和平"暗语溯源（D3散点 + GSAP时间线） | D3.js + GSAP | `wp_timeline.js` |
| 附录 | `#page-xzq` | 薛之谦唱片浏览器（磨砂玻璃3栏） | React 18 + Babel standalone | 内联 `data.js` |

### 叙事脊椎

```
数据层（统计概览）→ 文本层（词云/高频词）→ 情感层（BERT情绪分析）
→ 时间层（河流图/20年演变）→ 节律层（日节律）→ 人物层（用户画像）
→ 故事层（暗语溯源）→ 附录（唱片浏览器）
```

### 依赖的 CDN（已在 `<head>` 中）

- `d3.v7.min.js`
- `react@18.3.1/umd/react.development.js`
- `react-dom@18.3.1/umd/react-dom.development.js`
- `@babel/standalone@7.29.0/babel.min.js`
- `gsap@3.12.5/gsap.min.js`
- Google Fonts: Noto Serif SC, Noto Sans SC, Cormorant Garamond, DM Mono, Lora, Inter, Ma Shan Zheng

### 依赖的本地文件

- `universe-data.js` — PAGE 1 歌曲/专辑数据（`window.UNIVERSE_DATA`）
- `wp_timeline.js` — PAGE 8 暗语溯源数据（`window.WP_TIMELINE_DATA`）
- `day-migration-data.js` — PAGE 6 日节律数据
- `comment-culture-river.html` — PAGE 5 河流图独立页面
- `covers/*.jpg` — 12 张专辑封面（附录使用）
- `page-data.js` — 旧版数据（部分页面可能引用）

### 脚本加载顺序

CDN 脚本在 `<head>` → 页面 HTML → 本地 `.js` 数据文件 → 内联 D3 绘制脚本 → React JSX 脚本（`text/babel`）。顺序不能乱。

所有 D3 绘制代码均以 IIFE `(function(){...})();` 包裹在各页面的 `<script>` 标签内，互不干扰。

---

## 四、数据文件速查

### 核心原始数据（在 `uploads/` 下）

| 文件 | 大小 | 说明 |
|------|------|------|
| `uploads/xue_comments.csv` | 799 MB | 主评论数据，10,925,396 条。字段：song_name, song_id, comment_id, user_nickname, content, liked_count, time_str |
| `uploads/xue_comments_extended.csv` | 618 MB | 扩展评论（引号转义有问题，解析时需注意） |
| `uploads/xu_song_comments.csv` | 423 MB | 按歌曲切分的评论 |
| `uploads/li_ronghao_comments.csv` | 155 MB | 李荣浩对比数据（1550万条，尚未使用） |

### 处理后数据（在项目根目录/子目录）

| 文件 | 大小 | 说明 |
|------|------|------|
| `word_freq_all_candidates.json` | ~20 KB | 名词/动词/形容词各100个高频词，已内联到 PAGE 3 |
| `universe-data.js` | 17 KB | 139首歌聚合指标，PAGE 1 使用 |
| `wp_timeline.json` / `wp_timeline.js` | 34 KB | 世界和平母题数据，20,598条去重评论 |
| `core_song_dates.json` | ~5 KB | 核心歌曲发行日期 |
| `song_dates_complete.json` | ~10 KB | 完整歌曲日期 |
| `.tmp_hot_normal_words.json` | ~5 KB | 热门vs普通评论词频对比（40万抽样），已内联到 PAGE 3 |
| `.tmp_basic_stats.json` | ~10 KB | 评论长度+点赞分布统计数据，已内联到 PAGE 2 |

### advanced_cleaning_v3/（v3 二次清洗与分析产出）

| 文件 | 说明 |
|------|------|
| `five_dimension_summary.csv` | 五维语义框架：情绪/态度极性、主观性等级、行为目标、信息源、文风 |
| `year_trends.csv` | 年度趋势：emotion_mean, subjectivity_mean, avg_len, avg_like（2013–2026） |
| `hour_profiles.csv` | 小时行为画像：emotion_mean, subjectivity_mean, avg_len, long_rate（0–23时） |
| `album_profiles.csv` | 专辑维度语义画像 |
| `duckdb_heavy_users.csv` | 高频用户 Top 20：user_proxy, n, songs, avg_len, max_like |
| `duckdb_global.csv` | 全局统计：10,925,396 条，4,625,102 用户，avg_len=19.4，median_len=12 |
| `statistical_tests.csv` | 年度/专辑/小时维度统计检验 |
| `representative_examples.csv` | 847 条精选评论示例（含情绪标签、歌曲、点赞数） |
| `slice_keywords_tfidf.csv` | 切片关键词 TF-IDF |
| `quality_audit.csv` | 数据质量审计 |

### semantic_output/（语义分析流水线产出）

| 文件 | 说明 |
|------|------|
| `topic_clusters.csv` | BERTopic 主题聚类结果 |
| `persona_clusters.csv` | 用户画像聚类（K-means，4类） |
| `motifs_discovered.csv` | 发现的评论母题（含 known_world_peace） |
| `quote_bank.csv` / `quote_bank.json` | 847 条精选评论引用 |
| `MASTER_ANALYSIS_REPORT.md` | 完整语义分析报告 |
| `dandelion_nodes.csv` / `dandelion_edges.csv` | 蒲公英图网络数据 |

### 其他重要数据

| 文件 | 说明 |
|------|------|
| `analysis_cache/xue_stats_v2.db` | DuckDB 全量统计（7.9 GB），不是 SQLite |
| `analysis_cache/song_meta_v2.csv` | 歌曲 ID / 名称 / 专辑映射 |
| `semantic_output/embeddings.npy` | BERT 嵌入向量（220 MB） |
| `semantic_output/user_features.parquet` | 用户特征聚类（93 MB） |

---

## 五、设计风格规范（所有修改必须遵守）

### 5.1 画布与尺寸

- **目标屏幕**：电脑桌面横屏，1920×1080 或更大
- **页面布局**：纵向滚动，每页 `min-height: 100vh`
- **不要做移动端适配**。这不是手机 H5，是桌面学术海报
- PAGE 5（河流图）和附录（XZQ）使用 `height: 100vh; overflow: hidden`，是完整单屏

### 5.2 色彩系统

```css
--paper: #F4EFEA;      /* 纸色底 */
--paper-warm: #EFE7DD;
--paper-cool: #E8E4EA;
--ink: #2A2230;         /* 墨色 */
--ink-soft: #5B4F5E;
--ink-mute: #8A7E8E;

/* 数据色阶 */
--c-cream: #F2D9CC;    /* 低深夜率 */
--c-blush: #F0B5C0;
--c-rose: #E89AAE;
--c-petal: #D679A1;
--c-plum: #A04B7F;
--c-wine: #6B2D52;     /* 极高峰 */
--c-lilac: #B8A4C9;    /* 次要强调 */
--c-mist: #D4C5D9;

/* 暗语溯源专用 */
--amber: #C2622A;
--amber-light: #E8905A;
```

**原则**：颜色克制，不引入高饱和色。数据色以粉色系为主，中性灰为辅。

### 5.3 字体系统

| 用途 | 字体 | 说明 |
|------|------|------|
| 中文正文 | `Noto Serif SC` | 思源宋体，学术感 |
| 中文标题/书法强调 | `Ma Shan Zheng` | 马山正，手写感 |
| 英文衬线 | `Cormorant Garamond` / `Lora` | 意大利体用于数据标注和英文副标题 |
| 等宽/标注 | `DM Mono` | 年份、数字、标签、masthead |
| 中文无衬线 | `Noto Sans SC` | 极小字号的辅助信息 |

**严禁使用浏览器默认字体**（宋体/Arial/Times New Roman）。

### 5.4 排版规范

- **masthead 小字**：10px DM Mono，字母间距 0.22em，大写
- **标题**：`clamp(28px, 3vw, 44px)`，`line-height: 1.05`
- **正文**：`line-height: 1.65–1.85`，字号 13–15px
- **分割线**：`1px solid rgba(42,34,48,0.22)`
- **页面 padding**：`48–64px`
- **信息密度要高**：学术海报的特点——用网格、细线、小字、留白来组织

### 5.5 CSS 命名空间

每页使用独立的 id 作用域（如 `#page-stats`、`#page-words`），所有 CSS 规则必须加页面 id 前缀防止跨页污染。附录（XZQ）使用 `.page-xzq` 前缀，有其独立的 CSS 变量系统。

---

## 六、当前页面对作业要求的覆盖

| 作业要求 | 分值 | 覆盖页面 | 状态 |
|----------|------|---------|------|
| 评论长度分布直方图+KDE | 基础统计 | PAGE 2 左上 | ✅ |
| 点赞数分布（对数坐标） | 基础统计 | PAGE 2 左下 | ✅ |
| 评论时间分布（按小时） | 基础统计 | PAGE 2 右上 + PAGE 6 | ✅ |
| 高频用户 Top 10 | 基础统计 | PAGE 2 右下 | ✅ |
| 全量评论词云 | 词云 | PAGE 3 气泡云 + Top30 条形图 | ✅ |
| 热门vs普通评论对比词云 | 词云 | PAGE 3 对比面板 + 分歧条形图 | ✅ |
| SnowNLP → BERT 情感分析 | 情感 | PAGE 4 环形图 + 年趋势 + 小时柱 | ✅（用 BERT 替代） |
| 情感分布饼图/环形图 | 情感 | PAGE 4 左上 | ✅ |
| 情感随时间变化趋势 | 情感 | PAGE 4 双轴折线图 | ✅ |
| 积极/消极典型评论示例 | 情感 | PAGE 4 底部 6 张卡片 | ✅ |
| 分析报告（≥400字） | 报告 | `Homework2_Solution_Template.md` | ✅（~4000字） |
| 交互式可视化（加分） | 加分 | 全站 8 页 D3 交互系统 | ✅ |
| 主题聚类（加分） | 加分 | 用户画像聚类 + BERTopic | ✅ |
| 多歌曲对比（加分） | 加分 | 李荣浩数据已准备 | 待完成 |
| 自定义创新（加分） | 加分 | 暗语溯源 + 热普词云对比 + 五维BERT | ✅ |

---

## 七、Git 与版本

### 仓库

- **GitHub**：`https://github.com/Wang-auspicious/joker-xue-20th.git`
- **分支**：`main`

### 最近提交

```
59c2cd1 Complete homework deliverables: basic stats page, hot/normal contrast, sentiment donut + report
99a332f Restructure 7-page narrative spine with new word cloud + BERT sentiment pages
a363e94 Snapshot: pre-restructuring baseline with full diagnosis
```

### 未跟踪/临时文件

根目录有大量 `.py`、`.cjs`、`.md`、`.json`、`.tmp_*` 文件是开发过程中产生的，大多数不再活跃使用。**不要删除 `uploads/` 下的 CSV 数据文件**。

---

## 八、关键数据发现（供叙事参考）

1. **"世界"（216,314次）> "音乐"（118,416次）**：听众来评论区不只为评价歌曲，更为安放自己的故事和感情
2. **50.6% 评论零点赞**：幂律分布，少数表达成为"代言人"，多数声音成为背景
3. **"喜欢"在热门评论中是普通评论的 2.2 倍**：人们点赞的是共鸣和认同；普通评论中"生日快乐"模板占主导
4. **午夜 0 点情绪强度（0.151）是下午 4 点（0.077）的两倍**：深夜评论更长、更主观、更像写给自己的话
5. **2017 年是情感低谷年**：情绪 0.062，但主观性 0.483（峰值）——在"辩护"而非"表达"
6. **"世界和平"从一条评论变成跨越 11 年的群体暗语**：评论区作为有机文化系统的缩影

---

## 九、后续工作方向

按优先级排列：

### 高优先级（作业交付）

1. **李荣浩对比可视化**：155 MB 数据已就绪，尚未使用。XZQ vs 李荣浩的词频/情感对比是加分项
2. **低信息短评（9.34%）独立页面**：约 102 万条"打卡仪式"评论的文化分析
3. **静态截图导出**：作业要求提交 `images/` 文件夹的可视化结果图片
4. **README 补充**：运行说明

### 中优先级（质量提升）

5. **masthead 统一**：PAGE 1（项链）的 masthead 使用 `.masthead` 类，PAGE 5-8 的 masthead 各有自定义样式，可统一
6. **tooltip 统一**：当前多套 tooltip 实现（`#tip`、`#tip2`、`.w-tooltip`、`.sent-tooltip`）
7. **PAGE 5 河流图内联**：当前用 iframe 外挂，考虑改用 D3 直接绘制以便共享颜色变量

### 低优先级（长期优化）

8. **分词模型升级**：当前 jieba + bigram 方案对网络用语支持不足
9. **细粒度时间分析**：按歌曲发布前后时间窗口分析评论行为变化
10. **人工标注验证**：从 v3 样本抽取 500–1000 条进行人工标注，改进 BERT 标签质量
11. **根目录清理**：归档散落的 `.py` `.cjs` `.md` 文件到子目录

---

## 十、技术约束与注意事项

1. **编码**：所有文件 UTF-8。**不要用 PowerShell 默认编码读中文文件**——中文 Windows 默认 GBK，会永久损坏文件。使用 Edit/Write 工具或 bash 修改文本文件。
2. **无构建工具**：index.html 是纯静态 HTML + CDN 脚本。React 组件通过 Babel standalone 在浏览器端编译（`text/babel`）。
3. **D3 版本**：d3.v7。SVG 用 `viewBox` 做响应式，不写死像素尺寸。
4. **数据格式**：`universe-data.js` 暴露 `window.UNIVERSE_DATA`。大型 JSON 数据内联在对应的 `<script>` 标签中（如 PAGE 2 的 LENGTH/LIKES/HOUR/USERS 变量、PAGE 3 的 FREQ 和 HN 变量、PAGE 4 的 YEAR_DATA 和 HOUR_DATA 变量）。
5. **CSS 作用域**：所有页面样式必须加对应页面 id 前缀。每页的 `<style>` 标签写在 `<section>` 内部。
6. **不删除原则**：不要删除 `uploads/` 下的原始 CSV、`analysis_cache/` 下的 DuckDB、`semantic_output/` 下的语义分析产物。
7. **Python 脚本注意**：`analysis_cache/xue_stats_v2.db` 是 DuckDB，不是 SQLite。Python sandbox 内读取 site-packages 可能报权限问题。
8. **Git 提交**：不包含 `Co-authored-by` 或其他 co-author 元数据。
