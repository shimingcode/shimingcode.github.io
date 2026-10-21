# 全站性能优化与验证（2026-10-18）

本轮以开始工作时的完整工作区为基准，保留之前未提交的内容。优化前静态快照在 `test-results/fullsite-baseline/`；没有用 Git HEAD 覆盖源码，没有提交、推送或部署。

## 项目审计

- 技术栈为原生 HTML、CSS、JavaScript，无框架、远程 CDN、网络字体和生产依赖。共七个业务入口：首页、平台、项目、关于、相册、翻牌和暴击游戏，另有 404。翻牌卡面实际为 emoji，不存在需要预解码的牌面图片。
- 原构建仅复制文件到 `_site/`。路由使用真实目录 URL 和 HTML，客户端替换 `main`，音乐 DOM 保持常驻；初始脚本已使用 `defer`，仅小型主题初始化同步运行以避免配色闪烁。
- `.nojekyll`、canonical、站点地图以及 README 表明目标为 `https://shimingcode.github.io/`，README 记载从 main 根目录发布。本次目录属于父目录 `D:/code` 的 Git 工作区，没有可用 Git remote，也没有本项目 Pages workflow；无法独立确认远程发布设置。
- 图片已有 AVIF/WebP 和 JPEG 回退、小头像、相册 srcset、明确尺寸、非关键图 lazy；保留这些措施。背景约占原首页子资源传输的 47%。原首页脚本 53,195 B，12 个 JS 请求，仍有合并压缩收益。
- 原音乐脚本把 HTML 的 `preload=none` 改成 metadata，导致自动播放被阻止时仍请求 MP3。游戏已有单音频复用、150ms 重启节流、粒子池和按帧计分更新；没有必要重新实现游戏业务。
- 樱花已有单个间歇 rAF 采样器、粒子预算/池、隐藏暂停、低性能设备提示和 reduced-motion。翻牌已有状态机、委托监听和离页定时器清理；本轮验证并保留。粉色、透明面板、模糊层次及三种配色继续存在。
- 原始音频/上传素材体积较大，但不应为了磁盘大小删除；它们不在首页请求链上。系统字体没有可子集化的网络字体，因此没有增加字体文件或依赖。

## 已实施的改动

1. **构建与加载**：esbuild 仅用于开发构建。主题脚本、共享 shell、页面包及 CSS 压缩并生成 SHA-256 内容哈希。首页从 12 个 JS 请求降到 3 个；about 仅两个。页面包保留内部执行顺序，路由通过动态 `import()` 首次加载，重复进入使用加载缓存。12 秒失败超时和完整导航回退继续有效。没有引入框架。
2. **样式**：首屏共用样式优先加载，翻牌专属 CSS 从共用文件拆出，仅在游戏页载入。相册和暴击 CSS 也保持按页加载。压缩后的共用 CSS 为 16,170 B。没有为了极小的同步主题脚本或已有小样式引入另一套加载器，也没有用不可靠的文本规则删除可能使用的选择器。
3. **背景**：从原 JPEG 新生成四个 AVIF 衍生图，分辨率不变。主页桌面 144,522 → 93,903 B、移动 87,027 → 53,899 B；相册桌面 125,140 → 81,938 B、移动 58,409 → 38,145 B。预加载、CSS 和配置指向同一候选图。旧衍生图、JPEG 和 WebP 回退全部保留。已检查移动端截图，人物、粉色和毛玻璃层次保留。
4. **音乐**：默认 `preload=none`，保存的暂停进度或用户打开控制面板时才读取 metadata；保留一次自动播放尝试、真实手势恢复、单曲循环、进度、音量、静音、光碟和全站常驻实例。被策略阻止的冷首页不再请求 MP3。用户允许播放时仍遵循原播放偏好。
5. **游戏原声**：仅当用户悬停、聚焦或按下暴击/试听按钮时预热现有 WAV；Save-Data 时跳过提前预热。首次播放仍同步使用点击手势。预热和播放共享同一个 Audio，保留节流、固定音色/语速、全部 100 条台词、10 个阶段和通关上限；预热失败后显式点击可对同一实例重新加载。退出释放原声和动画，背景音乐连续播放。
6. **移动与异常**：交互元素使用 `touch-action:manipulation`，保留缩放能力；小屏搜索框和 select 为 16px，减少 iOS 聚焦自动缩放。补上图片在绑定监听前已失败时的提示。保留触控尺寸、横竖屏布局、断网和音频错误文字降级。
7. **可复现验证**：新增内容哈希/产物引用检查和生产包/源码两种加载测试，更新原先硬编码旧文件名的浏览器夹具；提供串行回归命令，避免多个测试浏览器争抢 CPU。所有原有打包媒体逐字节对比均无变化。

## 同条件实测

计时使用本地 Microsoft Edge 155，Lighthouse 13.0.1。每版 Lighthouse 三次移动端默认测试；浏览器采样每版三次，390×844、DPR 2、4 倍 CPU 降速、配置 80ms 网络延迟、200,000 B/s 下载、93,750 B/s 上传、禁用缓存。服务器提供相同的本地静态与 Range 响应，不做 gzip。Lighthouse 的默认模拟节流与浏览器 CDP 限速是两套方法，数值不能混用。

原始三次样本和计算口径见 [JSON 汇总](fullsite-performance-samples-2026-10-18.json)。保留全部样本，没有只选择最高分。报告不代表线上 CDN、真实手机或用户分位数；宿主机负载不能完全固定，尤其是 TBT 和交互采样有波动。

| 指标 | 优化前 | 优化后 | 口径 |
|---|---:|---:|---|
| Lighthouse Performance | 91（87–98） | 98（97–98） | 三次中位数和范围 |
| Lighthouse LCP | 2.366 s | 1.977 s | 三次中位数 |
| Lighthouse FCP | 1.073 s | 1.065 s | 三次中位数 |
| Lighthouse CLS | 0.00116 | 0.00116 | 三次相同 |
| Lighthouse TBT | 318 ms（70–422） | 147 ms（126–165） | 波动明显，不等于 INP |
| Lighthouse Speed Index | 1.550 s | 1.601 s | 未改善 |
| 浏览器 LCP / FCP | 1.048 s / 1.048 s | 0.868 s / 0.868 s | 同一 CDP 方法，中位数 |
| 本地 TTFB | 9.6 ms | 11.7 ms | 没有改善，不反映线上服务端 |
| 浏览器 CLS | 0 | 0 | 三次相同 |
| 首页 JS 内容 | 53,195 B | 36,921 B | encodedBodySize 合计，约减少 30.6% |
| 首屏传输 | 190,183 B | 130,710 B | 包含 HTML 和请求响应开销，约减少 31.3% |
| 首屏请求 | 20 | 10 | 包含主文档与 favicon |
| JS 请求 | 12 | 3 | 同一冷加载 |
| 樱花帧率采样 | 约 60 FPS | 约 60 FPS | 未发现可量化提升，不代表所有设备 |
| Event Timing 最大值的中位数 | 200 ms | 208 ms | 未证明交互延迟改善；**不是 INP** |
| 真实用户 INP | 未测 | 未测 | 缺少真实访问会话与分位数数据 |

整套源 JS 目前为 94,745 B（包含不参与加载的历史文件）；该数字不是首屏下载量。没有删除历史语音模块来制造“总体积下降”。首次逐页加载会增加模块、HTML 和 CSS 缓存，不能把冷启动到热缓存之间的约 1.6 MB 堆增长直接认定为泄漏；重复挂载/卸载的稳定性另由生命周期测试检查。

Lighthouse 的三次最终首页结果均超过 90，LCP 和 CLS 达到本次实验目标。**真实 INP ≤200ms 尚未验证，实验交互样本也不能据此声称达标。**

## 回归、发布与缓存

32 项静态/单元/产物检查通过；串行回归记录的 13 个套件全部通过（包括 Edge 和 WebKit 26.5 的媒体与路由检查）。热身后的三轮重复挂载/卸载经 GC 后均为 7 个文档、850 个节点、84 个监听器，没有持续增长。最后补充的预热错误重试与静止鼠标行为修正已重新验证，首页 JS 内容仍为 36,921 B。详细回归结果保存在 `test-results/fullsite-verification/results.json`，每个套件有独立日志。测试覆盖平台筛选/复制、主题、相册、翻牌四难度/暂停/通关、暴击 100 条台词/十阶段/上限、原声实际解码与重播、音乐实际播放/循环/进度/静音/跨页、自动播放拒绝、粒子清理、320–1440px 布局、横屏、加载失败完整导航、失败预热重试和 `/preview/` 子目录路径。故障夹具中的 503 与损坏音频是刻意注入，与普通请求 404/控制台异常分开判断。

源码直接发布与 `_site/` 都有独立加载回归。**脚本压缩、合并和内容哈希只存在于构建产物中；继续直接发布源码根目录不会获得这部分收益。** 本轮没有擅自更改 Pages 来源，也没有远程部署。要发布与本报告相同的产物，需要现有发布流程提供 `_site/` 的内容，公开 URL 不变。使用自定义工作流时可参考 [GitHub 官方 Pages 工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

不引入 Service Worker，避免旧 HTML 被离线缓存固定；不伪造 GitHub Pages 无法通过本项目代码设置的响应头。内容哈希让构建 JS/CSS 在变更时自然换 URL；源码直出仍使用同步更新过的 `?v=`。HTML 的实际缓存与 CDN 失效由 Pages 控制。路由 HTML 缓存继续限制六份、60 秒，失败恢复完整导航；没有把页面永久缓存到 localStorage。构建可重复执行，旧 `_site/` 清理范围限制在本项目内部。

完整页面回退和浏览器刷新可能短暂打断音乐，再恢复进度；正常站内路由保持同一实例。没有将“进度恢复”描述成无缝播放。

## 修改文件清单

| 文件 | 改动 |
|---|---|
| `index.html`, `works.html`, `about/index.html`, `links/index.html`, `projects/index.html`, `games/index.html`, `games/funny-hit/index.html` | 预加载候选、版本引用和游戏样式 |
| `css/style.css`, `css/works.css`, 新增 `css/games.css` | 背景引用、样式拆分、移动输入与触控 |
| `js/config.js`, `js/music.js`, `js/router.js` | 资源配置、按需音频、构建 manifest/动态加载/故障回退 |
| `games/funny-hit/voice-manager.js`, `games/funny-hit/game.js` | 原声预热与错误恢复、图片失败状态 |
| 新增四个 `assets/images/*-optimized.avif` | 主页与相册的移动/桌面背景衍生图 |
| `scripts/build.mjs`, `scripts/responsive-images.py`, `scripts/measure-performance.cjs` | 压缩哈希、生成衍生图、补齐统计口径 |
| 新增 `scripts/verify-performance.cjs` | 串行回归及日志 |
| `tests/browser.cjs`, `tests/site-quality.cjs`, `tests/router-loading.cjs`, `tests/server.cjs` | 适配哈希资源夹具和 WAV MIME |
| 新增 `tests/build.test.mjs`, `tests/loading.cjs` | 哈希、引用、懒加载、实例复用和恢复测试 |
| `package.json`, 新增 `pnpm-lock.yaml` | 固定开发工具与验证命令，无生产依赖 |
| `README.md`, 本报告及 JSON 汇总 | 使用方法、发布边界与真实样本 |

`_site/` 和 `test-results/` 为已有忽略目录中的本地产物，不会自动加入 Git。其他原先未提交/未跟踪文件不属于本次新增清单。

## 复现与未验证事项

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm run test:regression
node scripts/measure-performance.cjs repeat-after _site
node scripts/audit-lighthouse.cjs repeat-after _site
# 比较基线时将最后一个参数替换为 test-results/fullsite-baseline
```

Windows 默认浏览器为本机 Edge；其他 Chromium 设置 `BROWSER_CHANNEL`，Lighthouse 可设置 `CHROME_PATH`。性能测试应串行进行。背景重生成需 Pillow 的 AVIF 支持，执行 `python scripts/responsive-images.py`；不参与浏览器运行。

未验证真实 iPhone/iPad/Android 的 Safari/Chrome、长达数小时的运行、线上 TTFB/CDN、远程 Pages 发布和真实用户 INP。Playwright 的移动 viewport/触控模拟不能代替实机；WebKit 的媒体能力以回归日志中的实际探针结果为准。后续应先发布已验证的构建产物，再用实机和真实访问数据核查 INP，优先调查较慢交互，而不进一步削弱现有视觉或游戏功能。
