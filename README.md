# Shiming Personal Website

原生 HTML / CSS / JavaScript 个人网站，保留原有二次元头像、背景、社交账号和摄影作品。没有框架、数据库、运行时 CDN、外部字体或访问统计。GitHub Pages 继续从 `main` 仓库根目录发布。

## 本地运行

在项目根目录运行：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

打开 http://127.0.0.1:4173/ 。停止服务按 Ctrl+C。不要用 `file://` 测试剪贴板、目录路由或媒体行为。

Node.js 22+ 可执行验证和可选打包；线上部署本身不依赖 Node：

```powershell
npm test
npm run build
```

`build` 只把公开静态文件复制到 `_site/`，不转译、不压缩原图。该目录可独立部署，也可继续直接发布仓库根目录。原始音乐上传目录、开发脚本和测试文件不进入 `_site/`。原文件仍保留在项目中。

浏览器回归使用 Playwright，仅为开发依赖：

```powershell
npm install
npx playwright install chromium
npm run build
npm run test:browser
```

也可以使用已安装的 Edge，避免下载 Chromium：

```powershell
$env:BROWSER_CHANNEL = 'msedge'
npm run test:browser
```

截图和测试结果写入 `test-results/`（不提交）。此次验证使用本机 Edge 的隔离无头浏览器，实际结果见 [优化记录](docs/optimization-report.md)。没有用模拟视口替代 iPhone/iPad 真机测试的结论。

## 页面与文件

| 路径 | 内容 |
| --- | --- |
| `/` / `index.html` | 个人区、全部平台入口、项目与相册入口 |
| `/links/` | 完整平台导航、分类、搜索和排序 |
| `/projects/` | 项目展示与分类 |
| `/games/` | 可使用键盘或触屏的记忆翻牌 |
| `/about/` | 个人介绍与本地隐私说明 |
| `/works.html` | 原有摄影作品、筛选与大图预览 |
| `404.html` | 找不到页面时返回首页 |
| `js/config.js` | 唯一的个人资料、平台账号、导航、音乐和助手配置 |
| `js/projects-data.js` | 项目数据；`example: true` 明确标注示例 |
| `js/works-data.js` | 摄影作品数据 |
| `js/icons.js` | 原有平台 SVG 图标 |
| `js/core.js` | URL 校验、DOM、复制和存储辅助函数 |
| `js/main.js` | 共用导航、设置、个人资料和页脚 |
| `js/links.js` / `js/projects.js` | 平台与项目渲染 |
| `js/music.js` / `js/effects.js` | 音乐、樱花与狐狐助手 |
| `js/theme-init.js` | 首次绘制前恢复主题 |
| `js/games.js` / `js/works.js` | 游戏与图库交互 |
| `css/style.css` / `css/works.css` | 共用主题、响应式样式与图库 |
| `scripts/build.mjs` | 可选静态打包 |
| `scripts/optimize-images.py` | 原有离线图片优化工具 |
| `tests/` | 静态与浏览器回归测试 |

新页面使用真实目录和 `index.html`，没有客户端路由、History API 回退或重写要求。`/projects` 由静态服务器补全为 `/projects/`，刷新不会依赖首页脚本。新增页面的 HTML 资源采用 `../`；配置中的 `./` 路径由 `core.js` 相对站点根解析，支持仓库子路径部署。

## 维护社交平台

保留了原来的 11 个入口，包含两个 QQ、Email、Telegram 和 Reddit。所有平台信息只编辑 `js/config.js` 的 `socialLinks`：

```js
{
  name: '平台名称',
  icon: 'link',
  username: '@你的账号',
  url: 'https://example.com/your-account',
  category: '社交',
  description: '简短说明',
  disabled: false
}
```

数组顺序就是默认顺序。分类来自数据，自动生成。名称排序使用中文本地化排序；最近使用依据本机点击时间，不上传任何记录。搜索匹配平台名称、账号、分类和说明。

- 外链只接受完整 HTTP(S) 地址，拒绝携带用户名/密码的地址及脚本协议；新标签使用 `noopener noreferrer`。
- `disabled: true` 或非法地址会显示不可用卡片，不会让整个列表崩溃。
- 无法在浏览器可靠检查第三方账号状态、登录要求或地区限制；不能把跨域请求失败直接等同于链接失效。请手动确认账号并在必要时标记 `disabled`。
- QQ/Email 使用 `action: 'copy'` 和 `field: 'qq1'` / `qq2` / `email`；值从同一配置读取。剪贴板不可用时提供手动复制提示。Email 保留发邮件入口。
- 内置图标：`x`、`github`、`telegram`、`reddit`、`youtube`、`facebook`、`bilibili`、`douyin`、`qq`、`email`、`link`。未知图标回退到 `link`。

## 项目展示

编辑 `js/projects-data.js`：

```js
{
  id: 'unique-id',
  name: '真实项目名',
  category: 'Python',
  description: '真实的功能与用途',
  stack: ['Python'],
  cover: './assets/images/project-code.svg',
  source: null,
  demo: null,
  example: true
}
```

请在有真实内容后设置源码/演示地址，并移除 `example: true`。缺少地址时显示“待添加/暂无在线体验”，没有伪造跳转。当前本站与记忆翻牌是实际实现；C、Python、电气工程三张卡片是明确标注的示例。封面为项目内新绘制的简单 SVG，不含新下载的角色素材。

## 三套主题与互动

右上角外观设置提供樱花粉、星空蓝和暗夜。CSS 变量集中在 `css/style.css` 顶部。

主题、樱花开关、助手可见性、助手动画、音乐音量和最近使用记录保存到 `localStorage`；浏览器禁用存储时功能仍可使用，仅不记忆。音乐播放进度使用 `sessionStorage`，完整页面跳转仍会有中断，切页后需要主动播放。

樱花桌面最多 18 个、手机最多 9 个，低性能设备或省流模式最多 6 个。可调 `sakura.desktop/mobile`，设置 0 即不显示。页面隐藏时暂停 CSS 动画；系统减少动态效果时不创建粒子。关闭樱花会移除粒子，不占用点击区域。

狐狐助手使用现有头像，是可替换的轻量互动组件，不是 Live2D 模型。点击头像显示按时间变化的问候、随机短句和快捷导航。可以隐藏、恢复、关闭悬浮动画；按 Escape 收起。替换素材或问候可编辑 `config.assistant`，不接入 AI API。

## 音乐

默认只显示明确的播放按钮，**不会自动发出声音或在首次点击其他内容时偷播**。点击播放后才设置 `audio.src`；`preload="none"`。播放失败、浏览器拦截、缓冲、暂停均有文字状态。

编辑 `music.playlist` 增加自己有使用权的音频：

```js
music: {
  enabled: true,
  volume: 0.25,
  src: './assets/audio/bgm-web.mp3', // 兼容旧配置
  playlist: [
    { title: '歌曲标题', artist: '作者', src: './assets/audio/bgm-web.mp3' }
  ]
}
```

支持播放/暂停、音量、选择曲目、上/下一首、播放结束切歌。当前只有一首独立可播放歌曲，所以切歌按钮禁用；原始 MP3 的多个副本不是新歌曲，不重复列入歌单。`.ncm` 是原始存档，不作为网页音频加载。iOS Safari 的音量可能由设备按键控制。没有测试或承诺无缝跨页播放。

原来的 JPG/MP3/NCM 文件全部保留，不要把凭据放入此目录。原始上传文件若不希望公开，请在确认用途后另行移出公开仓库；本次不删除原有文件。

## 添加摄影作品与图片优化

保留 `assets/images/works/` 的四张原图和相应缩略图。卡片加载 WebP 缩略图，点击后才请求原图；第一屏之外懒加载。列表和大图均有错误提示。作品 02/03 的尺寸已修正为 993×1584，作品 04 为 1280×960。

1. 将图片放入 `assets/images/works/photo-005.jpg`。
2. 运行原有脚本（需要 Pillow）：

```powershell
python -m pip install Pillow
python scripts/optimize-images.py
```

3. 在 `js/works-data.js` 添加真实尺寸、标题、分类、`image` 和 `thumbnail`。
4. 同时提交原图、生成的 `thumbs/photo-005.webp` 和作品数据。

仅重命名 `.jpg` 为 `.webp` 不会转换格式，也不要出现 `.webp.jpg`。`npm test` 会检查原图和缩略图是否存在及其真实格式，避免先前的缩略图 404。

主页背景、作品背景、头像已经有 WebP 与移动尺寸版本，本次保留现有压缩结果和所有原图，不重复进行有损压缩。更换原图后运行脚本，同步配置即可。网站使用系统字体，无外部字体加载。

## GitHub Pages 部署

仓库： https://github.com/shimingcode/shimingcode.github.io

首页： https://shimingcode.github.io/

现有 Pages 服务从 `main` 根目录发布，GitHub 生成 `pages build and deployment`。保持该流程；`.nojekyll` 让静态文件直接提供。未修改仓库权限、删除分支或强制推送历史。

本目录可能是 ZIP 解压目录，没有 `.git`。这种情况下先克隆已存在仓库，再把更新文件复制到克隆目录；不要对已部署仓库重复 `git init`：

```powershell
git clone https://github.com/shimingcode/shimingcode.github.io.git
cd shimingcode.github.io
# 将更新文件复制到这个克隆目录，然后：
npm test
npm run build
git status
git add index.html works.html 404.html links projects games about css js assets/images/project-*.svg .nojekyll .gitignore package.json scripts/build.mjs tests README.md docs assets/icons/README.md assets/audio/README.md
git commit -m "Improve personal site navigation, themes and interactive pages"
git push origin main
```

检查 Actions 的当前提交部署成功后，再打开各个线上页面。CSS/JS 使用稳定的 `?v=2` 版本标识避开上一版缓存；以后发布不兼容版本时统一更新该值，不使用每次访问变化的随机参数。浏览器缓存旧内容时可 Ctrl+F5 刷新。

如改为另一个普通项目仓库，目录页面和配置资源仍使用相对路径；请将 `404.html` 的首页及 favicon 地址从 `/` 和 `/favicon.svg` 改为实际项目子路径。当前没有 `CNAME`，此次未设置自定义域名。

## 测试边界与后续扩展

- 静态检查覆盖脚本语法、页面资源、配置、图库格式和音乐懒加载约束。
- 浏览器回归覆盖真实音频播放、复制、主题、存储受限、非法链接、动态开关、图库、游戏、6 种视口和 6 条页面路由。
- Safari、Firefox、真实 iPhone/Android/iPad 和不同网络环境未逐一实测；仍建议上线后用常用手机检查媒体播放和触摸体验。
- 没有宣称 Lighthouse 分数或真实用户性能指标。`test-results/initial-resources.json` 是本地测试资源记录，不等同于生产网络测速。
- 后续优先填入真实项目、补充原创音乐与作品；可按需要接入 GitHub 公共项目数据或更多小游戏。当前没有必要引入数据库或前端框架。
