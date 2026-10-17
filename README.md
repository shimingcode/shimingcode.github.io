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
npm run test:music
npm run test:performance
```

也可以使用已安装的 Edge，避免下载 Chromium：

```powershell
$env:BROWSER_CHANNEL = 'msedge'
npm run test:browser
npm run test:music
npm run test:performance
```

截图和测试结果写入 `test-results/`（不提交）。最新审计、加载对比、兼容性限制及修改清单见 [全站质量与性能报告](docs/site-quality-2026-10-17.md)，数据见 [原始测量记录](docs/site-quality-samples.json)。此前改版见 [性能与算法报告](docs/performance-report.md) 和 [优化记录](docs/optimization-report.md)。没有用模拟视口替代 iPhone/iPad 真机测试的结论。

新增 `npm run test:site-quality`：检查冷缓存样式请求、卡片复用、相册生命周期、页面元信息、全站响应式及子目录部署。音乐旋转边界由 `npm run test:performance` 在 45° 角度检查。`robots.txt` 和 `sitemap.xml` 随静态构建发布；新增页面时需要同时维护站点地图。

## 页面与文件

| 路径 | 内容 |
| --- | --- |
| `/` / `index.html` | 个人区、全部平台入口、项目与相册入口 |
| `/links/` | 完整平台导航、分类、搜索和排序 |
| `/projects/` | 项目展示与分类 |
| `/games/` | 可使用键盘或触屏的记忆翻牌 |
| `/games/funny-hit/` | 狐狐暴击求饶模拟器，无限点击、20 次樱花彩蛋 |
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
| `js/music.js` / `css/music.css` | 持久化 CD 播放器与旋转样式 |
| `js/router.js` / `js/effects.js` | 有界导航缓存、狐狐助手 |
| `js/sakura.js` | 可复用樱花池、帧间隔自适应预算 |
| `js/theme-init.js` | 首次绘制前恢复主题 |
| `js/game-engine.js` / `js/games.js` | 独立游戏状态机与页面生命周期 |
| `js/works.js` | 图库交互 |
| `css/style.css` / `css/works.css` | 共用主题、响应式样式与图库 |
| `scripts/build.mjs` | 可选静态打包 |
| `scripts/responsive-images.py` | 从原图生成新增 AVIF、响应式 WebP |
| `scripts/measure-performance.cjs` / `scripts/audit-lighthouse.cjs` | 本地实验室性能测量与 Lighthouse |
| `tests/` | 静态与浏览器回归测试 |

新页面使用真实目录和 `index.html`，通过轻量客户端导航保持音乐连续，仍不需要服务器重写规则。`/projects` 由静态服务器补全为 `/projects/`，刷新不会依赖首页脚本。新增页面的 HTML 资源采用 `../`；配置中的 `./` 路径由 `core.js` 相对站点根解析，支持仓库子路径部署。

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

主题、樱花开关、助手可见性、助手动画、音乐音量和最近使用记录保存到 `localStorage`；浏览器禁用存储时功能仍可使用，仅不记忆。音乐进度、音量、播放偏好、静音统一保存在 `localStorage` 的 `shiming:music-state`；站内导航保留音频元素，完整刷新按元数据恢复进度。

樱花默认上限为桌面 18 个、手机 9 个；低性能提示或省流模式初始最多 8 个。复用 CSS 粒子，单一 requestAnimationFrame 采样帧间隔，每 2 秒评估，连续掉帧减少、持续稳定再逐步恢复。配置 `sakura.desktop/mobile` 可调整上限，0 表示关闭。页面隐藏停止采样并暂停视觉动画；关闭或减少动态效果时移除粒子并停止循环。

狐狐助手使用现有头像，是可替换的轻量互动组件，不是 Live2D 模型。点击头像显示按时间变化的问候、随机短句和快捷导航。可以隐藏、恢复、关闭悬浮动画；按 Escape 收起。替换素材或问候可编辑 `config.assistant`，不接入 AI API。

## 音乐

右下角 CD 复用现有动漫头像，播放时每 10 秒转一圈，暂停时停在当前角度。点击光碟播放/暂停，点击 ♫ 展开进度、时间、音量与静音面板。手机缩小至 60px，支持安全区域、系统减少动态效果；页面隐藏时仅暂停旋转。

```js
music: {
  enabled: true,
  volume: 0.25,
  src: './assets/audio/bgm-web.mp3',
  title: 'Music Box',
  artist: 'miromaxmusic · 现有背景音乐'
}
```

只使用这一首已有 MP3，`audio.loop = true`，没有歌单和上一首/下一首。首次访问会调用一次 `play()` 尝试播放有声音乐；用户之前主动暂停则尊重暂停偏好。所有 Promise 拒绝都被处理，自动播放被拦截时提示“轻触页面播放”，首次真实点击、触摸结束或按键会同步尝试播放一次；忽略模拟事件，不监听滚动事件，随后移除交互监听。点击 CD 仍可直接播放，不会重复触发。若交互后仍被拦截，只保留 CD 手动入口；手动暂停偏好继续生效，不强制静音或循环重试。iOS 的音量限制可能需要使用设备音量键。

`js/router.js` 为七个页面提供同源导航增强：请求真实 HTML，只替换 `main`，播放器、音频和共用设置始终保留。前进/后退使用 History API，更新标题、描述、当前导航、焦点和滚动位置；图库与游戏通过页面生命周期挂载、离页清理。页面模块按需加载且只注册一次。导航缓存最多 6 份 HTML 文本、有效期 60 秒；使用惰性 template 解析，避免反复创建分离文档，滚动历史最多保留 100 条。不拦截外链、下载、新窗口或带修饰键的点击。

刷新、禁用导航增强、未知页面或请求失败时使用真实 HTML 跳转，可能有短暂音乐中断；元数据加载后恢复进度，并根据偏好尝试播放。存储不能绕过浏览器自动播放限制。浏览器/系统在后台回收页面、锁屏或音频焦点中断时也不能保证持续播放。

播放期间约每 5 秒保存一次状态，进度/音量连续事件限流、操作完成补存，切换偏好、页面隐藏和卸载前补存。收起或隐藏控制面板时不更新进度 DOM；音频保持运行；关闭存储不影响播放。详见 [CD 播放器实现与验证记录](docs/music-upgrade.md)。

原来的 JPG/MP3/NCM 文件全部保留，不要把凭据放入此目录。原始上传文件若不希望公开，请在确认用途后另行移出公开仓库；本次不删除原有文件。

## 添加摄影作品与图片优化

保留 `assets/images/works/` 的四张原图和相应缩略图。卡片通过 srcset/sizes 按显示尺寸选择 320/480/768px WebP，点击后才请求较高清 WebP，预览中提供“查看原图”链接；第一屏之外懒加载。列表和大图均有错误提示。作品 02/03 的尺寸已修正为 993×1584，作品 04 为 1280×960。

1. 将图片放入 `assets/images/works/photo-005.jpg`。
2. 运行原有脚本（需要 Pillow）：

```powershell
python -m pip install Pillow
python scripts/optimize-images.py
python scripts/responsive-images.py
```

3. 在 `js/works-data.js` 添加真实尺寸、标题、分类、`image`、`thumbnail`、`thumbnailSrcset` 和 `preview`。
4. 同时提交原图、生成的缩略图、display 预览图和作品数据。

仅重命名 `.jpg` 为 `.webp` 不会转换格式，也不要出现 `.webp.jpg`。`npm test` 会检查原图和缩略图是否存在及其真实格式，避免先前的缩略图 404。

主页与作品背景新增 AVIF，旧 WebP/JPG 作为回退；头像新增 160px WebP。所有新增衍生图直接从原图生成，原图和已有衍生资源全部保留。首次配置不需要重新压缩图片；更换原图后再运行脚本，同步配置即可。网站使用系统字体，无外部字体加载。

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
git switch -c codex/frontend-performance
# 逐项检查改动，只暂存准备发布的源码、图片、测试和文档
git add index.html works.html links projects games about css js assets/images package.json scripts tests README.md docs
git commit -m "Optimize rendering, image delivery and memory game lifecycle"
git push -u origin codex/frontend-performance
# 测试通过后通过 Pull Request 合并到 main，触发现有 Pages 部署
```

检查 Actions 的当前提交部署成功后，再打开各个线上页面。音乐脚本使用 `?v=5`，样式、主题初始化及路由脚本使用 `?v=6`，其余 JS 保持 `?v=4` 版本标识避开上一版缓存；以后发布不兼容版本时统一更新该值，不使用每次访问变化的随机参数。浏览器缓存旧内容时可 Ctrl+F5 刷新。

如改为另一个普通项目仓库，目录页面和配置资源仍使用相对路径；请将 `404.html` 的首页及 favicon 地址从 `/` 和 `/favicon.svg` 改为实际项目子路径。当前没有 `CNAME`，此次未设置自定义域名。

## 测试边界与后续扩展

- 静态检查覆盖脚本语法、页面资源、配置、图库格式和唯一音源和持久播放器结构。
- 浏览器回归覆盖真实音频播放、复制、主题、存储受限、非法链接、动态开关、图库、游戏、6 种视口和 6 条页面路由。
- Safari、Firefox、真实 iPhone/Android/iPad 和不同网络环境未逐一实测；仍建议上线后用常用手机检查媒体播放和触摸体验。
- 本次 Lighthouse 与 Performance API 对比均为本机实验室测量，不代表真实用户 INP 或真机结果；包含未改善项，详见性能报告。
- 后续优先填入真实项目、补充原创作品；可按需要接入 GitHub 公共项目数据或更多小游戏。当前没有必要引入数据库或前端框架。

## 记忆翻牌与性能复测

四种难度为 4/6/8/12 对，保持现有 emoji 图案。Fisher–Yates 洗牌为 O(n)，稳定 imageId 配对为 O(1)。READY / PLAYING / CHECKING / PAUSED / COMPLETED 状态机控制快速点击，performance.now() 计算累计时间。页面隐藏暂停，恢复需要点击继续；离页销毁游戏，音乐继续。游戏页的播放器和助手停靠在内容之后，不覆盖卡牌。

```powershell
npm test
npm run build
npm run test:browser
npm run test:music
npm run test:performance
npm run test:compat
npm run measure -- after _site
```

Lighthouse 是可选开发工具，不进入站点依赖或发布包：另行安装 `lighthouse@13.0.1`，使用 `LIGHTHOUSE_PATH` 指向其 `core/index.js`，然后 `npm run audit -- after _site`。默认使用本机 Edge；其他 Chromium 可设置 `CHROME_PATH`。对比前先保留旧版独立静态快照，测量时不要并行运行浏览器测试。原始 JSON、HTML 报告及截图写入被忽略的 `test-results/`。

首次交互播放回归：`npm run test:music-gesture`，覆盖鼠标、触摸、键盘、模拟事件、重复拒绝、暂停偏好和跨页行为。

## 透明面板

新增小游戏《狐狐暴击求饶模拟器》使用用户提供的真实照片与虚构狐狐旁白，保留记忆翻牌与原 CD 播放器。默认标准语音、语音 65%、原创合成音效 40%，无限点击，每次触发短音效，第 20 次解锁彩蛋后仍可继续；目前语音是明确标注的临时系统中文合成音，设备不支持时保留字幕。运行 `npm run test:funny-hit` 验证。详见 [游戏实现与验收记录](docs/funny-hit-v1.md)。游戏和其他页面使用路由脚本 v11。

透明背景、边框、圆角、阴影和模糊集中在 `css/style.css` 的 `--glass-*` 变量中；`.glass` 与 `.glass-panel` 共用基础样式。三套主题保留不同文字与透明底色。手机列表卡片关闭模糊，弱设备提示关闭大面板模糊、播放器仅保留 2px。图片、CD 和游戏卡牌本体保留清晰度。运行 `npm run test:glass` 生成三套主题截图和计算样式检查。详见 [透明面板验收记录](docs/transparent-panels.md)。

语音专项配置：新增五种情绪试听、恢复默认和本地配音缓存通道；实际仍为明确标注的系统临时语音，没有下载未授权的 B 站角色音频。运行 `npm run test:voice`，详见 [语音配置记录](docs/fox-voice-upgrade.md)。游戏资源 v5，路由脚本 v11。

无限互动更新：移除 20 次锁定与短音效冷却，保留静音、音量和语音防重叠。见 [无限点击与音效验证](docs/funny-hit-unlimited.md)。

## 连点算法与性能优化（2026-10-17）

连点输入和短音效立即处理，计数面板每帧合并更新；按节点管理特效动画，避免反复查询浏览器动画状态。游戏脚本并行下载、按依赖顺序执行，同源录音重播复用已加载资源。原图、CD、樱花、无限点击和翻牌游戏保留。

本机 4 倍 CPU 降速、三次测试的 1,000 次连点处理中位数由 348.9ms 降至 167.7ms；这是压力场景，不是整站加载速度或真实用户 INP。完整方法、未改善项与原始数据见 [本轮性能报告](docs/interaction-performance-2026-10-17.md)。运行 `npm run measure:hit -- after _site`、`npm run test:route-loading` 可复核。
