# 互动算法与性能优化（2026-10-17）

## 原有问题与实际修改

1. 每次点击同步改写两处计数文字，还重复设置已经不变的彩蛋进度/可见性。现在输入、计数逻辑和音效仍逐次同步处理，只将视觉计数合并到一个 requestAnimationFrame；同一帧内任意数量的输入都只绘制最新状态。重置、隐藏页及时刷新，离页取消待绘制任务。
2. 每次动画重复查询 getAnimations，粒子路径查询两次，并在样式写入之间读取浏览器动画状态。改用以节点为键的 Map，直接取消本组件持有的动画，O(1) 查找；固定照片和速度线关键帧复用。旧回调解绑，结束回调校验当前所有权，资源数量仍受 20/12 粒子池限制。
3. 每击重新 Object.keys/map/find 下一语音节点。改为预计算节点表、单调游标，仅跨过节点或更改语音设置时预取下一段。音效 resume 未完成时复用一个 Promise，相同音量不反复设置；每击仍新启动短音效，音频数据复用、最多四个活动源。
4. 站内首次进入游戏按六个脚本逐个等待下载。现在同时插入 async=false 的 classic scripts，浏览器并行下载并依插入顺序执行；样式同批加载，全部成功后才挂载。保留真实 HTML URL、失败回退、缓存上限和单一 CD 实例。
5. 同一录音每次重播重新设置 src。现在同源仅归零进度；解码失败立即释放媒体引用、Blob URL 与缓存槽。权限拒绝仍保留手动试听，不误判为坏文件。当前无正式角色配音，这一条是录音通道优化，以自制测试音验证。

未更换框架，未删除图片、音乐、动画、游戏或其他功能。公共樱花已有池化和自适应预算，翻牌已有 Fisher–Yates 与 O(1) 配对，故保留现有实现。没有为简单交互引入 Worker、Service Worker 或后端。

## 同条件实验室对比

基线提交：`ba654e5032898bec76671027314112bb7e5224be`。Windows Edge 155.0.4283.45，无头独立浏览器；390×844、DPR 2、触摸模拟、4 倍 CPU 降速。每版三次，先预热 20 次点击，语音关闭、短音效开启、CD 暂停；分别测量单个任务中的 1,000 次合成点击和随后 60 次间隔至少 35ms 的点击。浏览器测试没有与基准并行运行。

下表为三次样本中位数，原始值见 [完整样本](interaction-performance-samples.json)。

| 指标 | 优化前 | 优化后 | 解释 |
| --- | ---: | ---: | --- |
| 1,000 次连点同步处理 | 348.9ms | 167.7ms | 降低约 51.9%，仅此压力场景 |
| 同窗口 JS 执行 | 284.03ms | 138.90ms | Chrome DevTools Protocol ScriptDuration 差值 |
| 同窗口布局时间 | 14.85ms | 2.43ms | 包括随后两帧 |
| 同窗口样式重算 | 10.23ms | 2.52ms | 包括随后两帧 |
| 计数区 DOM 变更 | 2,000 | 2 | MutationObserver 实测，不减少输入次数 |
| 60 次持续点击的动画查询 | 308 | 0 | 直接管理动画所有权 |
| 持续点击帧间隔 P95 | 16.9ms | 16.9ms | 没有明显变化 |
| 大批量任务的长任务数量 | 1 | 1 | 同步音效/输入仍有成本，不宣称消除全部长任务 |
| 长任务时长 | 353ms | 170ms | PerformanceObserver 实测 |
| 回收后的 JS 堆 | 2,392,940B | 2,385,244B | 约 0.3% 差异，视作噪声，不宣称内存显著降低 |

前版连点耗时范围 239.7–486.2ms，后版 159.7–169.5ms，存在环境波动。该测试是极端合成压力，不能推导整站加载提高 51.9%，也不能当作真实用户 INP、LCP、Lighthouse TBT 或手机真机成绩。此次没有重新测量 Lighthouse/Core Web Vitals，也没有压缩新图片；资源体积优化不属于此次收益。

## 验证

- 构建：78 个静态文件。
- 静态/逻辑：34 项，包括 10,000 次计数、1,000 次短音效、1,000 次动画替换、共享待恢复音频 Promise。
- 狐狐游戏浏览器：12 项，包含每次音效、连点后每帧只改写两处计数、离页取消待绘制更新、照片、手机/平板纵横屏和 CD 连续播放。
- 语音浏览器：6 项，使用原创 24kHz 测试音验证解码、缓存、音量、抢占、同源重播零 loadstart、损坏音频释放与字幕回退。不是角色配音试听。
- 路由并行加载：1 项，阻塞第一批脚本响应，验证全部六个请求均已发起，再放行并确认依赖完成及游戏可玩。
- 既有性能/生命周期：9 项，覆盖樱花资源、搜索节点复用、四种翻牌难度、暂停重开、路由缓存、关闭音乐面板、移动布局和多次挂载后 GC 的节点/监听器数量。
- CD 音乐：15 项，覆盖播放、循环、进度、切页、前后退、自动播放拒绝和失败回退。

共 77 项本地检查通过。移动测试为 Edge 视口与触摸模拟；没有 Safari/iPhone/iPad 真机结果。线上部署和复测结果以 PR、Pages 运行与交付记录为准。

## 文件与复现

主要修改：`games/funny-hit/{game.js,effects.js,audio-manager.js,voice-manager.js}`、`js/router.js`，七个页面统一路由 v11，游戏资源 v5。测试修改 `tests/funny-hit.test.cjs`、`tests/funny-hit-browser.cjs`、`tests/voice-browser.cjs`；新增 `tests/router-loading.cjs`、`scripts/measure-hit-performance.cjs`。README、package.json 增加运行入口，本文及 JSON 保存真实测量。

```sh
node scripts/build.mjs
node --test tests/static.test.mjs tests/game.test.cjs tests/funny-hit.test.cjs
node tests/funny-hit-browser.cjs
node tests/voice-browser.cjs
node tests/router-loading.cjs
node tests/performance.cjs
node tests/music.cjs
node scripts/measure-hit-performance.cjs after _site
```

需安装 Playwright 和可用 Edge，或配置 BROWSER_CHANNEL。按现有 GitHub Pages main 根目录流程部署，不修改仓库权限、不强制推送。后续可真机复核 iOS 音频、不同刷新率下的樱花预算；这些未被列为已完成优化。
