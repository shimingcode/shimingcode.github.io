# 狐狐暴击求饶模拟器 V1.0

2026-10-15，基于 main `92047327316d01c6075760a6b13e15a08b79fc18`，独立分支 `codex/funny-hit-v1`。检查确认旧项目只有记忆翻牌，此次为新增小游戏，不是替换翻牌。

## 实现

- `/games/funny-hit/` 真实静态目录；原生脚本通过 Site.register 生命周期和按需路由加载，原主页、翻牌、助手和 CD 保留。所有页面的 router 版本更新至 v7；游戏自身资源为 v1。
- GameState 的七个节点为 1/3/5/8/12/15/20，台词按需求固定；20 次只通关一次，锁定点击，选择自由互动后继续响应但计数保持 20。重置清理旧语音、声音和动画。700ms 内点击累计连击。
- VoiceManager 的状态为 IDLE/PLAYING/COOLDOWN/PRIORITY/MUTED。默认 standard、语音 65%，关键节点绕过普通冷却并中断旧语音；普通完整语音仅活跃模式开启，至少间隔 2 秒。字幕与被接受的语音共享同一文本、旧回调由版本号失效，静音与播放失败保留字幕。
- **只有临时浏览器语音，未生成高质量害羞狐狐配音。** 检查可用中文音色后使用 rate 0.88 / pitch 1.12；声音不可用时字幕回退。台词属于虚构旁白，不代表照片人物。无付费 API、无声纹模仿、无第三方音频下载。
- AudioManager 用户首次点击才创建游戏专属 AudioContext，缓存四种原创合成短音效，默认 40%；普通音效至少 150ms 间隔，最多四个 source，最终庆祝优先。不创建额外背景音乐 Audio。
- 手机 12 / 桌面 20 个复用粒子，另一个速度线图层；CSS transform/opacity 关键帧由 Web Animations 调度，没有每帧 JS 循环。照片轻摇、星星、BOOM、虚构分数、COMBO、速度线、爱心与樱花独立叠层，不修改照片。减少动态效果时不运行动画。
- 页面隐藏停止语音、声音和动画，返回后等待下一次点击；离页取消监听器与字幕超时，关闭游戏 AudioContext、清空 buffer 和动画池。全局 CD 不清理。
- 三套现有透明主题继承；照片完整按比例展示，手机纵向布局，按钮最小 44px，照片和按钮支持键盘/触摸。设置在操作完成后写 localStorage，禁用存储时由公共存储工具兜底。

## 图片与性能

原图 2,317,074 字节，新增 1086px WebP 210,212 字节、640px WebP 87,858 字节。保留全部画面，quality 90，无裁剪。原 PNG 未改动；两种 WebP 按显示尺寸和像素密度选择，不保证每台手机一定选择较小文件。

游戏图片、代码只在游戏页加载。没有新增第三方运行时依赖。无高频存储或无限 DOM 创建，桌面效果池上限 20、手机 12，最多 4 个短音 source。本机 Edge 的单次 200 次同步程序点击压力检查耗时 5.5ms，DOM 数量未增长；此值不代表真人点击延迟、INP、帧率或手机性能。

## 验证

- `node scripts/build.mjs`：78 个静态公开文件，成功。
- `node --test tests/static.test.mjs tests/game.test.cjs tests/funny-hit.test.cjs`：27 项通过，含 8 个新游戏/语音/音效测试。语音调度测试使用可控模拟语音引擎，不能据此宣称实际配音音质。
- `node tests/funny-hit-browser.cjs`：11 项通过，真实点击 20 次与七个字幕、结束锁定、自由互动、200 次点击、设置、隐藏清理、离页释放、刷新、音乐实例、移动视口和减少动画设置。头部语音在当前无头环境会报不可用，字幕回退正常。
- 原有浏览器 `node tests/browser.cjs` 14/14、音乐 `node tests/music.cjs` 15/15、首次交互播放 `node tests/music-gesture.cjs` 9/9 全部通过；本次合计 76 项检查。浏览器截图与原始 JSON 存在被忽略的 `test-results/funny-hit/`，不进入发布文件。
- 视口含 1280×1000、390×844、844×390、768×1024、1024×768；触摸通过 Edge 模拟。未测试真实 iPhone/iPad/Android 或 Safari/Firefox，不保证这些设备的系统语音可用。
- 检查的是资源清理和有界对象数量，未执行长期 heap snapshot 泄漏分析、Lighthouse 或真实用户性能采集。

## 文件与本地运行

新增 `games/funny-hit/{index.html,style.css,game.js,game-state.js,dialogue.js,voice-manager.js,audio-manager.js,effects.js}`，两张 WebP 与资源说明；新增 `tests/funny-hit.test.cjs`、`tests/funny-hit-browser.cjs` 和本文。

修改小游戏中心入口、`js/router.js`，六个原有页面的路由脚本版本，`tests/static.test.mjs`、`package.json`、`README.md`。

```powershell
python -m http.server 4173 --bind 127.0.0.1
# http://127.0.0.1:4173/games/funny-hit/
node scripts/build.mjs
node --test tests/static.test.mjs tests/game.test.cjs tests/funny-hit.test.cjs
$env:BROWSER_CHANNEL='msedge'
node tests/funny-hit-browser.cjs
```

浏览器测试需安装开发依赖 Playwright。当前环境没有 npm.cmd，实际使用上述 Node 命令与已提供的 Playwright。标准环境也可 `npm test` / `npm run build` / `npm run test:funny-hit`。

部署沿用 main 根目录 GitHub Pages，独立分支通过 PR 合并，禁止强推。实际 PR、部署状态及线上复查见最终交付；没有改写仓库权限或原有音乐、图片资源。
