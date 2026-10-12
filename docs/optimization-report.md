# 优化与验收记录

日期：2026-10-12。项目：Shiming Personal Website。

## 基线与范围

- 先阅读 README、目录、HTML、两份 CSS、全部原有 JS、配置及图片/音乐资源，再进行修改。
- 保留原生静态栈，不引入前端框架、数据库、付费 API 或运行时依赖。
- 远端基线：`c0faffbd9eddf0473c812ef8028fb892ded7a016`。
- Pages 原有 `pages build and deployment` 成功，从 `main` 发布；没有仓库内自定义 Actions 工作流需要替换。
- 本地为无 `.git` 的源文件目录，因此发布采用基于当前远端 tree 的增量提交，不覆盖远端历史、不删除分支。
- 原有 11 个社交入口（包括两个 QQ）逐项比对，名称、账号、URL、复制字段完整保留。所有原有二进制资源 SHA-256 不变。

## 八阶段交付

| 阶段 | 修改文件 | 实现 | 兼容性与检查 |
| --- | --- | --- | --- |
| 1 分析 | 本报告、README | 识别单列导航、重复樱花、音乐自动尝试、缺失独立页、图库尺寸错误 | 检查远端 main 与部署状态，确认原生栈和资源 |
| 2 平台方格 | `js/config.js`、`js/core.js`、`js/icons.js`、`js/links.js`、`css/style.css` | 5/4/3/2 列 Grid、分类、搜索、三种排序、复制和无效入口提示 | 原有 11 项完全保留；实际搜索、排序、剪贴板、恶意 URL 测试通过 |
| 3 首页视觉 | `index.html`、`js/main.js`、`css/style.css` | 导航、个人区、玻璃卡片、统一焦点与触屏尺寸 | 320–1440 宽度及横屏无横向溢出，查看桌面/手机截图 |
| 4 项目与主题 | `js/projects-data.js`、`js/projects.js`、`js/theme-init.js`、四个项目 SVG | 实际站点与小游戏、三个明确示例、分类、三主题及存储 | 分类、主题刷新持久化、禁用存储测试通过；SVG 全部解析和解码通过 |
| 5 音乐与互动 | `js/music.js`、`js/effects.js`、`js/main.js` | 音量/歌单/切歌、手动播放、共享樱花、狐狐问候/隐藏/快捷导航 | 真实 MP3 播放暂停通过；多曲切换用测试歌单；浏览器拦截用拒绝播放夹具；降动效和后台暂停通过 |
| 6 独立页面 | `links/index.html`、`projects/index.html`、`games/index.html`、`about/index.html`、`js/games.js`、`works.html` | 真实目录路由、完整平台页、项目页、介绍、可通关的记忆翻牌 | 六条页面路由正常，无尾斜杠跳转及刷新通过；游戏完成一局、重置通过 |
| 7 性能与适配 | `css/works.css`、`js/works.js`、`js/works-data.js`、共用脚本和样式 | 原有 WebP、懒加载、按页面加载脚本、移除重复樱花与旧样式、修正作品尺寸 | 全部原有素材不变；首屏无音频请求；四张图库缩略图及大图正常 |
| 8 验证与交付 | `tests/`、`scripts/build.mjs`、`package.json`、`.gitignore`、`.nojekyll`、文档 | 可复现静态检查、浏览器回归、静态打包与部署说明 | 8 个静态测试、15 组浏览器检查最终全部通过，47 文件静态包生成成功 |

## 实际执行的命令与结果

```powershell
node --test tests/static.test.mjs
node scripts/build.mjs
$env:NODE_PATH = 'C:\Users\86150\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:BROWSER_CHANNEL = 'msedge'
node tests/browser.cjs
```

此环境使用已提供的 Playwright 1.62.1 和已安装 Edge。默认 Playwright Chromium 未安装，因此首次启动未能运行；改用 Edge 后完成以下真实浏览器检查。普通电脑安装开发依赖后使用 `npm test`、`npm run build`、`npm run test:browser`，不需要上述本机 NODE_PATH。

最终结果：静态 8/8，浏览器 15/15。

1. 原有 11 个平台入口与安全外链属性；首次载入无音频下载。
2. 搜索、空结果、分类、排序与筛选后焦点保留。
3. QQ 点击复制与实际剪贴板内容。
4. 项目分类、示例标记及未伪造演示地址。
5. 三主题与刷新后持久化。
6. 系统减少动画、樱花关闭/恢复、模拟页面隐藏时暂停。
7. 狐狐问候、隐藏、恢复、关闭互动动画。
8. 真实音频播放/暂停、音量与持久化，刷新后不擅自播放。
9. 非法脚本链接被禁用，恶意显示文本不能插入 HTML。
10. 存储受限时主要功能正常。
11. 测试歌单的多曲切换，以及模拟浏览器拒绝播放后的可恢复提示。
12. 六页面 × 六视口组合，无横向溢出；方格列数为 2/2/3/4/5/4；目录路由直接访问/刷新正常。
13. 相册四张缩略图实际解码、作品 04 原图 1280×960、大图上一张/键盘 Escape/分类。
14. 完成翻牌小游戏并重新开始。
15. 测试过程中无未捕获 JavaScript 异常、console.error 或缺失资源响应。

视口：320×740、390×844、768×1024、1024×768、1440×1000、844×390。它们是 Edge 模拟视口，不是对应设备真机验证。

测试发现并已修复：项目封面高度不随宽度缩放、SVG 封面文字中的未转义 `&`。测试脚本自身的跨 VM 数组比较及媒体偏好事件等待也已修正。没有隐藏失败来获得通过结果。

结果文件：`test-results/browser-results.json`、`test-results/initial-resources.json`。截图：`home-1440.png`、`home-390.png`、对应 `-viewport.png`、`home-night.png`、`works-desktop.png`。这些本地产物不会提交到网站仓库。

## 性能与安全

- 本地首页首次载入记录：JS 34,463 B，CSS 20,004 B，两张实际使用的 WebP 共 188,666 B；另有轻量 SVG。统计为资源解码大小，不含 HTML、网络压缩和真实公网时延。
- 未请求 MP3、外部字体或第三方脚本。约 1.59 MB 的压缩音乐只在主动播放后加载。
- 图片懒加载，图库点击后才加载原图。优化脚本继续可用于后续新图片，本次不重复有损压缩。
- 樱花最多 18/9 个，低性能提示或省流模式最多 6 个；后台暂停，减少动画时不创建。
- 只在平台页载入图标和平台模块，只在项目页载入项目模块，只在游戏页载入游戏逻辑。
- CSS 变量统一三主题；仅少量悬浮表面使用 8px blur，没有大面积重复滤镜堆叠。
- 配置内容通过 textContent 展示；innerHTML 只用于源码内固定模板/受控 SVG。HTTP(S) 链接校验，拒绝脚本协议和带用户名密码的 URL。
- 无新增第三方运行时依赖；Playwright 仅为开发测试依赖。检查前端配置及常见凭据模式，没有发现 Token/API key/私钥。

## 完整修改文件清单

页面：`index.html`、`works.html`、`404.html`、`links/index.html`、`projects/index.html`、`games/index.html`、`about/index.html`。

样式：`css/style.css`、`css/works.css`。

脚本：`js/config.js`、`js/core.js`、`js/icons.js`、`js/links.js`、`js/main.js`、`js/theme-init.js`、`js/projects-data.js`、`js/projects.js`、`js/music.js`、`js/effects.js`、`js/games.js`、`js/works.js`、`js/works-data.js`。

新 SVG：`assets/images/project-web.svg`、`assets/images/project-game.svg`、`assets/images/project-code.svg`、`assets/images/project-circuit.svg`。

工程与文档：`.gitignore`、`.nojekyll`、`package.json`、`scripts/build.mjs`、`tests/static.test.mjs`、`tests/browser.cjs`、`README.md`、`assets/icons/README.md`、`assets/audio/README.md`、`docs/optimization-report.md`。

## 已知边界与后续建议

- 真实 iPhone/iPad、Android、Safari 和 Firefox 未逐一测试；特别是 iOS 音量由设备控制、跨页音乐中断仍需真机确认。
- 第三方社交平台的登录、地区限制、账号状态无法由本站可靠自动检测；保留原链接并提供无效配置/手动禁用提示，不宣称所有外站均已登录验证。
- 当前仅一首真实歌曲；没有为了演示切歌编造歌单，功能已用测试夹具验证。
- C/Python/电气项目仍为显式示例。后续优先补真实项目、原创音频与作品信息。
- 没有 Lighthouse 跑分或真实用户监测，不虚构性能评分。
- 本地运行命令、完整部署步骤和维护示例见项目 README。现有 Pages 发布方式、权限与分支保留。
