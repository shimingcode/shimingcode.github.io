# 2026-10-19 效率复查与修复

本轮基于 [10 月 18 日完整优化](fullsite-performance-2026-10-18.md) 继续检查实际代码，保留粉色、毛玻璃、樱花、全部游戏规则和音乐。没有提交、推送或远程部署。原始比较数据见 [JSON 汇总](efficiency-review-2026-10-19.json)。

## 已实施的改动

1. **跨页复用功能包。** 首页直接引用平台、项目两个共享包；去掉重复包含两者的首页包。首页进入平台、项目页不再下载和执行同一批逻辑。
2. **缩小发布后的缓存失效范围。** 页面资源哈希清单放入 HTML，在共享 shell 前执行；修改独立页面或样式时不再改变整个 shell 的内容哈希。内联 JSON 转义 `<`，不引入额外清单请求、Service Worker 或运行时依赖。
3. **恢复首屏加载失败。** 最早的主题脚本记录脚本和样式的实际加载结果，路由只缓存已成功或正在加载的资源。首屏 503 后离开再返回会重试。超出 12 秒后才成功的脚本仍补回成功缓存；早期记录脚本自身失败时也可以继续导航。捕获监听在 DOMContentLoaded 后移除，资源完成后清理各自监听和计时器。
4. **减少音乐的重复工作。** 相同状态不重复写 localStorage；保存失败允许重试。慢速元数据请求期间反复收放面板不会重启 `audio.load()`；播放和失败重试入口保留。
5. **停止已完成的音效预热监听。** 创建可用的原声实例后移除 pointermove、pointerdown、focusin 三个预热监听；静音、节流网络设置和显式点击重试仍有效。

## 可复现的前后比较

同一台 Windows、Edge 155.0.4283.45、390×844 移动视口，本地 no-store HTTP，每个异常场景使用新页面或上下文。音频自动播放拒绝使用相同测试夹具；旧版为修改前保留的静态快照。

| 测量项 | 修改前 | 修改后 |
| --- | ---: | ---: |
| 首页→平台→项目→首页：额外 JS 请求 | 2 | 0 |
| 上述切换：额外 JS 内容字节 | 9,263 B | 0 B |
| 整段浏览：外部 JS 内容合计 | 46,184 B | 37,384 B |
| 首屏外部 JS 请求 | 3 | 4 |
| 首屏外部 JS 内容 | 36,921 B | 37,384 B |
| 慢速 metadata 请求期间反复收放：`load()` 次数 | 3 | 1 |
| 连续 10 次相同音乐状态保存：重复存储写入 | 10 | 0 |
| 预热后 100 次 pointermove：累计 prepare 调用 | 101 | 1 |
| 首屏脚本 503 后返回项目页：卡片数量 | 0 | 5 |
| 首屏专属 CSS 503 后返回：请求次数 | 1，未重试 | 2，重试成功 |

这些次数来自浏览器观测或函数调用计数，不代表 CPU 耗时或用户 INP。外部 JS 字节不包含新增的 HTML 内联清单；首页增加一个小请求，首屏脚本总负载略增。收益主要来自站内复用、缓存稳定性及减少无效工作。

## 首屏性能复测

Lighthouse 13.0.1，默认移动模拟节流，同一浏览器、本地静态服务，测量时没有并行运行浏览器回归。修改前、最终版本各一次；不是多次中位数，不能将微小变化视为稳定提升。

| Lighthouse 指标 | 修改前 | 最终版本 |
| --- | ---: | ---: |
| Performance | 99 | 100 |
| LCP | 1,892 ms | 1,891 ms |
| FCP | 917 ms | 916 ms |
| TBT | 82.7 ms | 63.9 ms |
| CLS | 0.00116 | 0.00116 |
| Speed Index | 1,152 ms | 1,176 ms |

LCP/FCP 基本持平，Speed Index 略有波动。本轮没有新的真实用户 INP 或线上 TTFB 数据；不能用 TBT 替代 INP。原始 Lighthouse JSON/HTML 位于 `test-results/performance/lighthouse-efficiency-{before,after}.*`。

## 验证结果与异常说明

- 构建通过；34 项静态、构建和游戏规则检查通过。
- 15 组回归最新结果全部通过，包括首页、平台、项目、图库、四种翻牌难度、狐娘 100 次/10 阶段、原声复用、音乐播放/暂停/循环/进度、移动布局和监听器数量检查。
- 新增效率用例：构建模式 12 项、源码模式 11 项通过；覆盖首次失败恢复、13 秒延迟脚本、早期跟踪失败、存储失败重试及慢速媒体加载。
- Edge 与 WebKit 26.5 的真实媒体播放和进度恢复通过。复测曾出现一次 WebKit 在元数据就绪后进度暂为 0 的断言失败；追加 8 次带事件记录的测试均成功。原用例只等待 `readyState`，不足以确认异步定位完成，现改为等待非 seeking 状态且与实际保存位置相差小于 0.5 秒；并检查刷新前确实保存了目标位置，复测通过。没有据此改写未经证实有问题的恢复逻辑。
- 修改前后 `assets/` 下 49 个文件、共 9,139,416 字节逐字节一致，未删除或替换素材。

完整串行验证后，对最后调整的初始加载逻辑重跑了相关套件，兼容性用例修正后再次复测；汇总是本轮各套件的最新结果。日志在 `test-results/fullsite-verification/`，新增浏览器数据在 `test-results/efficiency/`。

## 本轮修改文件

| 文件 | 用途 |
| --- | --- |
| `scripts/build.mjs` | 共享功能包、HTML 清单、独立 shell 哈希 |
| `js/theme-init.js`, `js/router.js` | 初始资源加载状态、失败及慢网恢复 |
| `js/core.js`, `js/music.js` | 持久化结果、去重保存、metadata 加载复用 |
| `games/funny-hit/game.js` | 预热监听释放 |
| `index.html`, `works.html`, `links/index.html`, `projects/index.html`, `games/index.html`, `games/funny-hit/index.html`, `about/index.html` | 更新源码模式资源版本引用 |
| `tests/build.test.mjs`, 新增 `tests/efficiency.cjs`, `tests/compat.cjs` | 构建共享、浏览器异常/效率、媒体定位验证 |
| `scripts/verify-performance.cjs`, `package.json` | 纳入新增验证命令和源码模式用例 |
| `README.md`, 本报告与 JSON | 复现说明、实测结果、限制 |

## 复现与发布边界

```powershell
pnpm run build
pnpm run test:regression
pnpm run test:efficiency
node tests/efficiency.cjs . source
node scripts/audit-lighthouse.cjs efficiency-repeat _site
```

`_site/` 是验证过的构建产物；源码直接发布也已检查，但不会自动享有构建合并与哈希缓存收益。没有改变 GitHub Pages 地址、公开路径和远程设置。未验证真实 iPhone/iPad/Android、线上部署和数小时持续运行，也没有新的现场 INP 数据。后续应在实际发布构建产物后，再检查 CDN、实机和真实访问数据。
