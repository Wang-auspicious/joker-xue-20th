# Joker Xue's 20th

一个围绕薛之谦 20 年歌曲与评论数据制作的互动网页作品。

## 仓库里有什么

- `index.html`：最终可直接打开的成品页
- `src/react/`：当前 React/Babel 版场景源码
- `build-react-index.cjs`：把源码和数据打包进 `index.html` 的构建脚本
- `uploads/`：专辑封面与补充素材
- `generated-data.json` / `generated-dormancy.json` / `data.local.js` / `raw-scene-signals.json`：页面使用的数据
- `moxp0x09-薛之谦---尘.mp3` / `moxp0vxi-薛之谦---尘.flac` / `尘.lrc`：第二页《尘》的音频与歌词

## 直接观看

最简单的方式：

1. 下载整个仓库
2. 保持文件结构不变
3. 直接用浏览器打开 `index.html`

> 注意：当前版本仍引用在线字体与 CDN 脚本，所以**联网状态下体验最好**。

## 重新构建

如果你改了 `src/react/` 或数据文件，可以在项目目录运行：

```bash
node build-react-index.cjs
```

运行后会重新生成：

- `index.html`

## 项目结构

```text
.
├─ index.html
├─ build-react-index.cjs
├─ src/
│  └─ react/
│     ├─ app.jsx
│     ├─ core.jsx
│     └─ scenes/
├─ uploads/
├─ generated-data.json
├─ generated-dormancy.json
├─ data.local.js
├─ raw-scene-signals.json
├─ moxp0x09-薛之谦---尘.mp3
├─ moxp0vxi-薛之谦---尘.flac
└─ 尘.lrc
```

## 当前交付重点

- 封面页进入后全局音频持续播放
- 第二页为《尘》的歌词/唱片页
- 后续页面为评论、时间线、词语、日期、情绪等可视化章节

## 备注

这个仓库保留了：

- 可直接展示的最终成品
- 当前这版生成逻辑
- 为这版页面服务的必要素材与数据

如果后续要做“完全离线可打开版”，需要再把外部字体和 CDN 依赖改成本地资源。
