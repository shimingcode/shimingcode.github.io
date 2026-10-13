# 前端性能与算法优化记录

日期：2026-10-13。基线：`617298ada67d968b5396ee85fe15bdfd10aee6ac`。工作分支：`codex/frontend-performance`。

## 范围与原有问题

先检查 README、六个页面、配置、CSS、全部 JS、图片/音乐、构建和 Pages。保留原生 HTML/CSS/JS、粉色狐娘主题、全部 11 个平台入口、项目展示、图库、音乐、樱花和游戏。根目录静态 Pages 发布方式不变，无运行时第三方依赖。

1. 樱花已有少量 CSS transform 粒子，但没有按实测帧间隔调整预算，偏好变化重建节点。
2. 翻牌已有洗牌功能，但游戏状态、暂停、异步任务版本与计时需要集中管理，原来只有一种难度。
3. 路由反复解析完整 Document，连续切换累积分离文档/节点；没有容量受限的 HTML 缓存。
4. 搜索重复创建卡片与事件；播放面板收起后仍更新进度；部分存储写入过于频繁。
5. 小头像和图库缺少匹配显示尺寸的候选资源；图库预览直接使用 JPEG 原图；初始导航没有预留足够空间。
6. 游戏页狐狐助手会遮挡触摸区域；移动端部分模糊/阴影成本较高。

## 已实施的算法与生命周期改动

- 樱花：保留已有 CSS 合成动画。默认仅 18/9 个粒子，基线约 60FPS，没有证据支持改成整屏 Canvas 会更快，因此采用节点对象池复用。单个 requestAnimationFrame 监测帧间隔，每两秒评估：连续两次明显掉帧减少两个，连续五次稳定增加一个；有上下限和迟滞，不根据 UA 判断、不锁定 60Hz。设备提示仅控制初始数量。隐藏停止采样，禁用/减少动态效果释放池。
- 游戏：Fisher–Yates O(n)，稳定 imageId 配对 O(1)，READY/PLAYING/CHECKING/PAUSED/COMPLETED 状态机。4/6/8/12 对四种难度。最多两张未匹配牌，重复点击和重复完成被阻止；performance.now() 计算累计时间，暂停保留配对等待剩余时间。重开/离页取消定时任务，版本号拒绝旧回调；事件委托和 AbortController 清理监听。仅重开重建棋盘，翻牌只更新相关节点，CSS transform 翻转。现有卡牌是 emoji，不是图片卡，所以不增加无意义的图片预加载。
- 图片：新增 17 份衍生资源，直接从原图生成 AVIF/WebP；背景有移动版和格式回退，头像 160/336px，图库缩略图 320/480/768px，预览用较高清 WebP，保留查看原图入口。所有原有 22 份二进制媒体文件 SHA 不变。非关键图懒加载，尺寸、srcset、sizes 明确；系统字体无网络依赖。并非每个 AVIF 都更小，收益以实际候选资源的网络传输统计为准。
- 音乐：保留唯一原音源和 audio 元素，循环、一次自动播放尝试、被阻止后手动入口、刷新恢复全部保留。关闭/隐藏面板不更新进度 DOM，展开后按帧合并事件；只在显示值变化时写入。音量/进度存储限流并在操作结束、页面隐藏时补存。旋转仍由 CSS 管理，隐藏暂停视觉但不暂停音乐。
- 导航：真实 HTML URL 保留，模板惰性解析，仅替换 main。最多缓存六份 HTML 文本，有效期 60 秒；滚动历史最多 100 项。页面脚本按需加载一次，游戏引擎不在首页加载；沿用现有加载器，没有为小模块强制改成 ES modules 或增加框架。离页释放页面资源，播放器不卸载。失败回退完整导航时仍可能短暂断音，进度恢复不等于无缝播放。
- 搜索：卡片与规范化文本缓存，事件委托、80ms 防抖和输入法处理，离页取消任务。中文排序器仅在首次选择名称排序时初始化并缓存排序结果，避免提前支付初始化成本。
- CSS/触控：保留毛玻璃和动漫背景；手机模糊降至 4px、简化阴影；粒子层及卡片适度 contain；预留页头高度。游戏页 CD 和助手均停靠在内容之后，避免覆盖卡牌。没有添加无收益的 Worker、Service Worker 或额外字体。

## 实验室性能对比

Windows 本机 Edge 155.0.4283.45，无头隔离上下文；390×844、DPR2、触摸模拟，CDP CPU 4 倍减速，80ms 延迟，下行 200000B/s，禁用 HTTP 缓存；前后各三次，表中为中位数，测试串行执行。基线来自修改前静态快照。使用 Performance API、PerformanceObserver、CDP Performance/Memory/HeapProfiler；强制 GC 后观测 JS 堆和 DOM 计数。图片传输量包含协议开销，首页资源量不含 HTML，不能当作整个仓库大小。

变化列表示（后−前）/前，正数不一定是改善。导航包括自动化点击/等待开销；点击到第二帧不是硬件触摸延迟，也不是 INP。FPS 仅为约 2.5 秒本机窗口采样，不代表真机游戏性能。

| 指标 | 优化前 | 优化后 | 变化 |
| --- | ---: | ---: | ---: |
| LCP | 1,656.00 ms | 1,128.00 ms | -31.9% |
| FCP | 984.00 ms | 988.00 ms | +0.4% |
| loadEventEnd | 1,853.20 ms | 1,696.70 ms | -8.4% |
| JS 执行时间 | 54.96 ms | 98.11 ms | +78.5% |
| 主线程 TaskDuration | 1,323.06 ms | 1,496.77 ms | +13.1% |
| 首页图片传输量 | 131,854.00 B | 99,245.00 B | -24.7% |
| 首页资源传输量（不含 HTML） | 226,028.00 B | 202,031.00 B | -10.6% |
| 长任务数量 | 1.00  | 1.00  | +0.0% |
| 观测阻塞时间（非 Lighthouse TBT） | 144.00 ms | 276.00 ms | +91.7% |
| 动画帧率 | 60.00 FPS | 60.00 FPS | +0.0% |
| 首次 GC 后 JS 堆 | 1,043,468.00 B | 1,050,916.00 B | +0.7% |
| 24 次切换后 GC 后 JS 堆 | 2,659,972.00 B | 2,708,052.00 B | +1.8% |
| 站内导航等待中位数 | 234.24 ms | 142.55 ms | -39.1% |
| 点击至第二个动画帧（代理指标） | 27.35 ms | 23.15 ms | -15.4% |

LCP 样本有波动，不能把三次结果泛化为所有用户。首页资源和导航等待改善，但新增自适应采样/功能及初始化工作的总成本并未全面降低：JS 执行时间、主线程占用、观测阻塞时间和 JS 堆仍有增加。保留这些实测结果，不以功能删除换取分数。

24 次导航后，DOM 计数由基线 32 documents / 7435 nodes / 110 listeners，变为 7 documents / 869 nodes / 95 listeners。独立生命周期测试连续三轮、每轮六次进出游戏，GC 后均为 7 / 862 / 95，没有观察到本测试长度内的累积增长；这不是长期无泄漏证明，且 JS 堆不等同于浏览器总内存。

### Lighthouse 独立测量

Lighthouse 13.0.1，默认模拟移动环境，本机 Edge，各一次最终报告，与上面的实际 CDP 限速测量不是同一方法，不能混合计算收益。单位：时间为 ms，CLS 无量纲。

| 指标 | 优化前 | 优化后 |
| --- | ---: | ---: |
| performance | 68 | 90 |
| accessibility | 100 | 100 |
| best-practices | 100 | 100 |
| seo | 100 | 100 |
| largest-contentful-paint | 3047.7417 | 2890.3381 |
| first-contentful-paint | 1144.8924 | 1199.3355 |
| total-blocking-time | 144.0000 | 165.6671 |
| cumulative-layout-shift | 1.0000 | 0.1035 |

性能达到本次实验室 90 分目标；Lighthouse LCP 仍高于 2.5 秒，CLS 仍略高于 0.1，TBT 未改善。独立 PerformanceObserver 样本 CLS 为 0，与 Lighthouse 采集结果不同，不据此宣布 CLS 目标全面通过。没有 RUM/CrUX 数据，真实用户 INP、真实设备内存、iOS/Android 帧率均未测量。

## 验证与兼容性

- `node --test tests/static.test.mjs tests/game.test.cjs`：19/19。覆盖洗牌输入/排列、四难度、稳定 ID、重复/快速点击、暂停/恢复、准确时间、重开版本、樱花预算迟滞、语法/资源/安全配置。
- `node scripts/build.mjs`：成功，68 个公开静态文件；原始上传目录不进入构建，源文件保留。
- `node tests/browser.cjs`：14/14，首页、11 平台入口、筛选排序、主题、复制、播放器、图库、游戏、六种视口/路线和错误检查。
- `node tests/music.cjs`：15/15，实际 MP3 播放、暂停角度、接近曲尾自然循环、连续导航与前进后退、刷新进度、拒绝自动播放降级、媒体错误、存储限流和失败导航回退。
- `node tests/performance.cjs`：9/9，游戏按需加载、搜索节点复用、粒子池复用/停止/释放、四难度通关、旧任务取消、缓存边界、关闭面板零进度 DOM 写入、320/390/768/844 视口与横屏、反复离页 GC 计数稳定。截图人工查看，图库图片实际 decode 成功。
- `node tests/compat.cjs`：Edge 强制用户手势策略通过。Windows Playwright WebKit 26.5 UI/导航通过；该运行时连独立原 MP3 都报 NotSupportedError/code 4，不能宣称 Safari 音频通过。实际 iPhone Safari、iPad Safari、Android Chrome 和独立 Chrome 未实测。
- 回归期间普通页面无未处理异常或丢失资源；故障注入中的失败是测试预期。外部平台只检查配置/安全链接，第三方账号的登录、地区限制及可达性没有全部逐一访问确认。
- 当前环境没有 npm.cmd，实际运行上述 Node 等价命令；没有虚构 npm 执行。Lighthouse 仅临时安装在忽略的测试目录，未进入前端依赖。

## 本地运行、复现与部署

`python -m http.server 4173 --bind 127.0.0.1`，访问 http://127.0.0.1:4173/ 。测试和测量命令见 README。`node scripts/measure-performance.cjs before <旧版快照>` 与 `node scripts/measure-performance.cjs after _site` 生成三次原始采样。另行安装 Lighthouse 13.0.1，设置 LIGHTHOUSE_PATH 后执行 `node scripts/audit-lighthouse.cjs after _site`。默认 Edge，可按脚本设置浏览器路径。不能并行运行两组性能测量。

本地 `test-results/performance/` 保存 before/after JSON、Lighthouse HTML/JSON、布局位移记录；test-results 保存截图与功能结果，均不上传公开站点。此文档保存结果摘要和边界，部署状态见交付回复及 GitHub PR/Actions。

在独立分支测试后通过 PR 合并 main，沿用 GitHub Pages 的 main 根目录发布及 `.nojekyll`，不改权限、不删除分支、不强推。所有页面资源版本统一 v4，真实目录路由和 404 页面保留。上线后复查六页面、图片、播放器持续播放和游戏。

## 尚未完成的目标与后续建议

1. 使用真实手机/平板重复触摸、后台音频、低电量模式和慢网测试；不能由桌面视口模拟替代。
2. 持续分析启动 JS/样式成本、Lighthouse 布局位移和 TBT；当前没有全面达成 LCP/CLS 目标，也没有证明 JS 变快。
3. 如有真实用户采样需求，再经明确隐私方案引入最小 RUM；目前没有新增遥测服务。
4. 长时间游戏/数百次导航和高刷新率硬件压力测试可进一步验证预算与资源释放。当前不需要 Worker、Service Worker、数据库或新框架。

## 修改文件清单

- 404.html
- index.html
- package.json
- README.md
- works.html
- about/index.html
- assets/images/avatar-160.webp
- assets/images/background-mobile.avif
- assets/images/background.avif
- assets/images/works-background-mobile.avif
- assets/images/works-background.avif
- assets/images/works/display/photo-001.webp
- assets/images/works/display/photo-002.webp
- assets/images/works/display/photo-003.webp
- assets/images/works/display/photo-004.webp
- assets/images/works/thumbs/photo-001-320.webp
- assets/images/works/thumbs/photo-001-768.webp
- assets/images/works/thumbs/photo-002-320.webp
- assets/images/works/thumbs/photo-002-768.webp
- assets/images/works/thumbs/photo-003-320.webp
- assets/images/works/thumbs/photo-003-768.webp
- assets/images/works/thumbs/photo-004-320.webp
- assets/images/works/thumbs/photo-004-768.webp
- css/style.css
- css/works.css
- docs/performance-report.md
- games/index.html
- js/config.js
- js/effects.js
- js/game-engine.js
- js/games.js
- js/links.js
- js/main.js
- js/music.js
- js/router.js
- js/sakura.js
- js/works-data.js
- js/works.js
- links/index.html
- projects/index.html
- scripts/audit-lighthouse.cjs
- scripts/measure-performance.cjs
- scripts/responsive-images.py
- tests/browser.cjs
- tests/game.test.cjs
- tests/music.cjs
- tests/performance.cjs
- tests/server.cjs
- tests/static.test.mjs
