# 全站质量与性能优化（2026-10-17）

基线为 `7462593dabed6918973ae6684d122ae17f1dc480`（PR #9 后）。在现有原生 HTML/CSS/JavaScript 项目上修改，没有迁移框架，没有删除照片、音乐、游戏、个人资料或社交入口。独立分支为 `codex/site-quality-performance`。

## 审计结果与实施

| 优先级 | 实际发现 | 处理与验证 |
| --- | --- | --- |
| 高 | 路由启动时重新赋值全部样式链接，冷缓存重复加载主样式和音乐样式，Lighthouse 出现首屏跳动 | 保留已加载样式属性，仅固定 favicon 地址；禁用浏览器缓存验证样式各请求一次，子页面图标无 404 |
| 高 | CD 旋转后的方形边界超过页面右缘，部分角度让平板游戏页面横向溢出 | 增加不旋转的圆形裁切容器，播放提示独立保留；固定到 45° 检查最宽边界 |
| 中 | 移动端延迟创建导航后改变页头高度 | 在原有断点预留实际导航行高度，避免首屏内容向下移动 |
| 中 | 项目/作品分类反复创建图片和卡片；再次点击当前分类仍重建列表 | 每次挂载缓存卡片，筛选移动已有节点；事件委托；当前分类不产生 DOM 变更 |
| 中 | 相册关闭后保留大图资源引用，页面清理只覆盖部分监听器 | 按需加载大图，异步解码；关闭移除 src；AbortController 统一解除事件，清空卡片引用；防止快速关闭后重开被迟到的 close 事件清空 |
| 中 | 全局樱花虽然由 CSS 动画，但性能采样仍每帧唤醒 JavaScript | 改为采样 2 秒、休息 4 秒，保留粒子池、渐进预算及 CSS 飘落；隐藏/关闭/reduced-motion 清理 rAF 和待执行计时器 |
| 中 | 重复挂载可能重复追加平台筛选或个人介绍段落 | 初始化前清空相应容器，重复挂载测试验证无重复 |
| 低 | 缺少 canonical、完整 Open Graph URL/图片、站点地图；SPA 元信息未同步完整 | 为七个真实页面补齐元信息，切页同步 canonical/OG；新增 robots.txt/sitemap.xml；404 设置 noindex；构建包含新增文件 |

路由沿用真实静态 HTML 和局部内容替换；浏览器前后退、直接打开、刷新及 `/preview/` 子路径都纳入回归。游戏脚本仍按页加载，音乐和樱花保持在公共页面容器。滚动位置、页面缓存、搜索防抖、游戏有限状态机、单实例音频已有实现，本次保留并验证。

## 资源、样式与安全

- 保留全部原图及音频。本次没有重复压缩已经适配的图片；不将图片字节降低冒充本轮收益。
- 背景已有移动/桌面 AVIF/WebP/JPEG 回退；移动背景 AVIF 87,027 B、桌面 144,522 B，160px 头像 WebP 10,184 B。相册已有缩略图和较高清预览，原图通过单独入口访问。卡片复用避免反复创建 Image 元素；未打开相册不加载大图。
- 静态资源清点：24 个 WebP 共 2,258,836 B，4 个 AVIF 共 415,098 B，8 个 JPEG 共 1,539,270 B；4 个 MP3 共 9,228,059 B，原始 NCM 9,349,239 B。清点包含备份/原始上传，不等于首屏传输量；构建排除 original-upload。
- 无运行时第三方框架、外部字体或统计脚本；开发依赖是 Playwright，没有升级全部依赖。Lighthouse 只用于本地测试，不打包到网站。
- 保留三套透明主题、圆角、背景人物及现有低性能模糊降级；没有新增全屏滤镜、动画层或 Service Worker。
- 外部链接协议校验、noopener/noreferrer、展示文字使用 textContent 等现有措施保留。回归包含恶意展示文本和无效 URL；本地存储不可用时仍可交互。未在检查的公开配置中发现 API 密钥；这不等同于专业渗透测试。
- GitHub Pages 继续使用既有 main 根目录动态 Pages 工作流，无仓库内自定义 workflow。保留 .nojekyll；可选 `_site/` 构建含 80 个文件。静态 JS/CSS 使用版本查询参数，不声称它们是内容哈希文件；不能为 Pages 随意设置响应头。本次没有引入额外缓存层。部署后实际检查 HTML、CSS、JS、AVIF、MP3、robots 和 sitemap，均返回 200，Cache-Control 为 max-age=600，带 ETag；不假设支持自定义响应头。

## 音乐、助手与小游戏

- CD 音乐仅增加视觉裁切容器，播放管理逻辑保持：单音频元素、单曲循环、音量/进度保存、play Promise 处理、手动播放入口、站内切页保留实例。完整文档刷新仍可能短暂中断，进度恢复不是无缝播放保证。
- 狐狐助手实际为头像、时间问候、随机文字、快捷导航和显示/隐藏控制；保留现有功能。没有拖拽、Live2D 或助手语音，不将这些列为已实现。
- 翻牌游戏实际使用 emoji 卡牌、四种难度、Fisher–Yates、稳定 ID 配对、performance.now 计时、暂停/重开和任务取消；不是动漫图片卡牌。
- 暴击游戏保留无限点击、每次短音效、第 20 次庆祝一次、标准语音模式及 65% 默认语音/40% 音效音量。没有改成 20 次强制停止。
- 当前没有正式授权的高质量狐娘录音清单；仍使用明确标注的浏览器 SpeechSynthesis 临时语音，声音随设备变化。本轮没有生成或下载角色配音，测试解码音频不能当作真人试听或音质认证。

## 性能测量

原始三轮数据与 Lighthouse 环境记录在 [site-quality-samples.json](site-quality-samples.json)。本地完整 Lighthouse HTML/JSON 在 `test-results/performance/`，不发布到站点。

实验一：同机 Edge，390×844 CSS px、DPR 2、CPU 4 倍减速、80ms 延迟、200,000 B/s 下载，缓存关闭，每版三轮；表格为中位数。资源量为 PerformanceResourceTiming transferSize 合计，包含协议估算开销，排除 HTML 文档本身；不是线上压缩传输总量。INP 没有真实用户数据。

| 指标 | 优化前 | 最终优化后 | 变化 |
| --- | ---: | ---: | ---: |
| LCP | 1,204.00 ms | 1,172.00 ms | -2.7% |
| FCP | 1,056.00 ms | 1,172.00 ms | +11.0% |
| loadEventEnd | 1,868.00 ms | 1,824.90 ms | -2.3% |
| 首屏资源传输 | 209,482.00 B | 183,900.00 B | -12.2% |
| 其中图片传输 | 99,245.00 B | 99,245.00 B | +0.0% |
| 加载窗口 JS 执行 | 102.51 ms | 107.22 ms | +4.6% |
| 长任务数量 | 2.00  | 1.00  | -50.0% |
| 观察到的长任务阻塞（非 Lighthouse TBT） | 298.00 ms | 265.00 ms | -11.1% |
| 24 次导航耗时（包含冷/热访问） | 163.52 ms | 141.01 ms | -13.8% |
| 游戏点击至随后两帧 | 24.75 ms | 25.35 ms | +2.4% |
| 路由循环后 GC 的 JS 堆 | 2,712,812.00 B | 2,714,216.00 B | +0.1% |
| 动画采样 | 60.00 FPS | 60.00 FPS | -0.0% |


实验二：Lighthouse 13.0.1 默认模拟移动条件，每版一次，同机 Edge；其网络模拟与上表不同，不应混用指标。基线为修改前保存的静态构建，最终复测包含 CD 裁切修复。一次重跑因自动审批服务额度暂不可用被拦截，之后审批恢复并实际完成补测；先前中间版本结果也保存在 JSON 中，不替代最终数据。

| 指标 | 基线 | 最终优化版 |
| --- | ---: | ---: |
| Performance | 70 | 98 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| LCP | 2925.16 ms | 2344.21 ms |
| FCP | 1281.32 ms | 1069.21 ms |
| TBT | 197.5 ms | 68 ms |
| CLS | 0.58954 | 0.00116 |

分数有环境波动，不是对生产环境/所有手机的保证。PerformanceObserver 基线 CLS 为 0，而 Lighthouse 录制暴露了样式重新加载造成的大幅跳动；不同模拟条件会影响复现时机，两者均如实保留。帧率接近 60 FPS 是本机采样；内存没有显著改善，不宣称“完全无泄漏”或用实验室 Event Timing 替代真实用户 INP。

## 测试、兼容性与剩余项

- 构建通过：80 个公开静态文件，资源路径检查通过。
- 静态/逻辑：35 项通过；包括七个暴击节点、无限计数、音频上限、翻牌洗牌/状态机、樱花采样和清理。
- 全站新增质量检查：8 项通过；35 个页面/视口组合、子路径、重复挂载、项目/作品节点复用、相册快速关闭重开、元信息与冷缓存样式请求。
- 基础浏览器：14 项通过；平台、筛选、主题、助手、存储拒绝、XSS 展示文本、图片、音乐和翻牌。
- 性能/生命周期：9 项通过；按需加载、四种难度、任务清理、路由缓存、音乐面板、45° CD 边界、重复挂载后的 DOM/监听器。
- 音乐：15 项通过；包括真实 MP3 播放、接近结尾自然循环、暂停角度、跨路由同实例、前后退、刷新恢复、加载失败与自动播放拒绝。
- 音乐首次手势：9 项通过；真实鼠标/触摸/键盘，合成事件不触发，尊重手动暂停，不反复强制播放。
- 暴击游戏：12 项通过；20 次彩蛋后仍可点击、每次音效、默认设置、字幕、隐藏/退出清理、照片和移动布局。
- 语音：6 项通过；原创测试音的真实解码、缓存、音量、优先级、失败回退和控件。不是高质量狐娘配音试听。
- 路由并行脚本：1 项通过。上述共 109 项检查。
- 三主题×桌面/手机的 6 种毛玻璃场景及低性能降级检查通过，截图人工复核手机播放器和暗夜游戏；未发现本轮测试中的未捕获脚本错误或资源 404。
- Edge 155 自动播放策略检查通过；WebKit 26.5 界面和媒体失败降级通过，但独立 MP3 探针返回 NotSupportedError，无法确认该运行时音频播放。

测试中曾复现 CD 旋转引起的溢出，修复后改为固定 45° 检查并通过。一次 GC 节点数量阈值断言有波动；保留诊断后复测三组均为 871 节点、90 个监听器、7 个文档，未见逐轮增长。它是有限循环检查，不替代长时间堆快照分析。

移动测试为 Edge 视口/触摸模拟及 Windows WebKit，不是 iPhone、iPad、Android、macOS Safari 真机。没有独立运行 Chrome 全套。浏览器自动播放限制保留：失败显示入口，用户主动操作才触发受限制的声音；不保证首次有声自动播放。

剩余工作：授权角色配音、真实设备长时间运行/音频策略、真实用户 INP、外部平台登录后账号可达性。现有 11 个平台链接已保留并校验 URL/渲染；不声称绕过平台登录或地区限制逐一验证了账号内容。Lighthouse 可访问性满分只代表该轮首页自动检查，不能保证所有动态背景位置或页面都满足人工对比度验收。

## 修改文件与复现

运行时：`js/router.js`、`js/projects.js`、`js/works.js`、`js/links.js`、`js/main.js`、`js/sakura.js`、`js/music.js`、`css/style.css`、`css/music.css`；七个页面 `index.html`、`works.html`、`links/index.html`、`projects/index.html`、`games/index.html`、`games/funny-hit/index.html`、`about/index.html`；`404.html`。

工程/文档：`scripts/build.mjs`、`tests/game.test.cjs`、`tests/performance.cjs`、`package.json`、`README.md`。新增 `robots.txt`、`sitemap.xml`、`tests/site-quality.cjs`、本报告和测量 JSON。无图片或音频删除。

```powershell
node scripts/build.mjs
node --test tests/static.test.mjs tests/game.test.cjs tests/funny-hit.test.cjs
$env:BROWSER_CHANNEL='msedge'
node tests/site-quality.cjs
node tests/browser.cjs
node tests/performance.cjs
node tests/music.cjs
node tests/music-gesture.cjs
node tests/funny-hit-browser.cjs
node tests/voice-browser.cjs
node tests/router-loading.cjs
node tests/compat.cjs
node tests/glass.cjs after
node scripts/measure-performance.cjs after _site
python -m http.server 4173 --bind 127.0.0.1 --directory _site
```

需 Node.js 22+、Playwright 与可用浏览器；环境可通过 NODE_PATH 指向已安装 Playwright。Lighthouse 额外需要本地安装 lighthouse@13.0.1，并可通过 LIGHTHOUSE_PATH 指定其 core/index.js 后运行 `node scripts/audit-lighthouse.cjs after _site`。

开发工作区为 ZIP 展开目录，没有 .git；不初始化或覆盖本地历史。已通过连接器从真实 main 建立独立分支。代码已通过 [PR #10](https://github.com/shimingcode/shimingcode.github.io/pull/10) 合并，提交为 cec33049be0b1d1faa5410b52c7242713729513b；[Pages 发布运行](https://github.com/shimingcode/shimingcode.github.io/actions/runs/39024044260) 成功。实际线上再次通过 25 项检查（全站 7、游戏 12、语音 6），并确认新路由 v12、音乐 CSS v7 和圆形裁切已生效；没有强制推送。此后文档补充最终 Lighthouse 与线上验证记录，不改变运行时代码。
