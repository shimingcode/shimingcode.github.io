# CD 音乐播放器升级记录

本次在现有原生 HTML/CSS/JavaScript 网站上升级，没有换框架。沿用 `assets/audio/bgm-web.mp3`（约 79.54 秒）和现有动漫头像。22 个原有图片/音乐二进制文件的 SHA-256 均与修改前记录一致。

## 实现

- `js/music.js` 只管理 HTML 中的一个 `#bgm`，通过单例保护防止重复初始化。音源只在初始化时设置，`audio.loop = true`；没有歌单、切歌或第二个音频实例。
- CD 使用原有头像、反光渐变、中心孔、粉色光晕。旋转为 CSS `transform`，10 秒一圈；通过 `animation-play-state` 暂停，恢复同一个动画。隐藏页面只暂停视觉，系统减少动态效果时禁用旋转。
- 默认收起面板，CD 控制播放/暂停，♫ 展开进度、当前/总时间、音量、静音和状态。桌面 88px，手机 60px，考虑安全区域。小游戏页把同一控件停靠在内容之后的右侧，避免覆盖翻牌与重开按钮；音频实例保持不变。
- 首次访问直接尝试一次 `play()`。所有 Promise 拒绝均处理；`NotAllowedError` 显示“点击播放”，只在真实 CD 点击后再尝试。未使用静音伪装、模拟点击、全页手势解锁或循环重试。用户此前主动暂停时不自动播放。
- `localStorage['shiming:music-state']` 保存 `{currentTime, volume, isPlaying, muted}`。`isPlaying` 是用户希望播放的偏好，实际 UI 依媒体状态显示。元数据就绪后恢复进度；播放期间约 5 秒写一次，交互、隐藏和 `pagehide` 补存。异常 JSON、非法数值、禁用存储均有回退。
- 音频失败显示手动重试；只在重试时重新加载错误音源。手机系统若限制网页音量，应使用设备音量键。后台回收、锁屏、来电和系统音频焦点不受网页完全控制。

## 跨页连续播放

六个真实 HTML 页面保留，可直接访问和刷新，不需要 GitHub Pages 重写。

`js/router.js` 增强普通同源点击：请求目标 HTML，按需加载可信页面模块，只替换 `#main`。播放器、音频、主题、导航和互动根层不销毁。`core.js` 提供页面模块注册、挂载和清理；离页清除小游戏超时并关闭图库弹窗。不会重新设置音频 `src`、`currentTime` 或调用 `play()`。

导航使用 `pushState/popstate`，更新页面标题、描述、导航高亮、主内容焦点与滚动。相对 favicon、样式和头部图标固定为绝对资源地址，避免 URL 改变导致 404。取消过时导航，只允许最新响应生效；页面与资源请求设置超时。外链、下载、修饰键点击、新标签和 `data-full-navigation` 交给浏览器。

未知页面、请求失败、资源错误或不兼容页面壳采用完整跳转。**完整跳转/刷新可能短暂中断**，通过保存进度恢复；它不等同于 SPA 导航的连续播放，恢复有声播放仍取决于浏览器权限。新页面需加入路由模块表才能获得同样的导航增强。

## 测试与边界

运行环境：Windows、Node.js、Playwright 1.62.1，隔离的 Edge 155.0.4283.45。没有连接或干扰用户的浏览器会话。

| 命令/检查 | 结果与范围 |
| --- | --- |
| `node --test tests/static.test.mjs` | 8 项：脚本语法、页面/资源路径、11 个平台入口、图片真实格式、项目配置、唯一音源与外链安全 |
| `node scripts/build.mjs` | 静态输出 `_site/`，49 个文件，无生产依赖 |
| `node tests/browser.cjs` | 14 项原网站回归：主题、目录、复制、存储受限、动画、图库、小游戏、6 个视口和6 条路由；无普通控制台错误或资源 404 |
| `node tests/music.cjs` | 15 项音乐/导航测试，详见下文 |
| `node tests/compat.cjs` | Edge 原生禁止自动播放策略下，手动播放、导航和刷新恢复通过；WebKit 26.5 界面/导航通过，MP3 播放受当前运行环境限制 |
| 原始资源校验 | 22 个原有媒体文件哈希未变 |

本机没有可直接执行的 `npm.cmd`，实际使用上述 Node 命令，等价于 `package.json` 中的 npm scripts；Playwright 使用本机已提供的依赖路径和 `BROWSER_CHANNEL=msedge`。

音乐专项实际检查：

1. 使用测试浏览器“允许自动播放”策略，确认首次有声尝试只有一次、实际播放既有 MP3。该策略只在测试进程中设置，站点没有绕过代码。
2. 点击 CD 暂停，读取 CSS 变换确认角度不变；恢复后仍为同一个 Animation 对象。
3. 将真实音频移到结束前 1 秒，等待自然回绕且仍播放；没有伪造 `ended` 事件。没有等待整首播放 79 秒。
4. 从约 39.77 秒开始反复切换六个页面，确认同一个音频和播放器节点、单个 `audio`、进度前进；没有 `pause/emptied/loadstart` 事件。
5. 前进、后退、锚点导航继续播放；图库和游戏重新挂载后可操作。
6. 刷新恢复约 39.7 秒、60% 音量、静音和暂停偏好；播放偏好另测刷新自动恢复。音乐总长不足 95 秒，因此未使用示例中的 01:35。
7. 隐藏页面/减少动态效果不暂停音乐；5.5 秒内进度保存一次。
8. 检查 320、390、768、844、1440 像素视口，展开面板无越界；小游戏控件不覆盖游戏区。视口模拟不代表真机实测。
9. `NotAllowedError` 测试夹具验证只尝试一次、切页不重试、真实点击可播放；另用 Edge 原生媒体策略验证实际拦截。
10. 音频 404 夹具显示重试并能恢复；快速导航抛弃过时响应；页面请求 503 夹具完整跳转恢复进度。预期故障与正常页面控制台检查分开记录。

输出：`test-results/music-results.json`、`browser-results.json`、`compat-results.json` 及 `cd-*.png`，不提交生成文件。

Windows WebKit 对不含播放器代码的原生 `new Audio()` 播放现有 `bgm-web.mp3` 和原始 `bgm.mp3` 都返回 `NotSupportedError / MEDIA_ERR_SRC_NOT_SUPPORTED(4)`。兼容性命令明确报告 `media-blocked`，没有将 WebKit 音频算作通过。当前没有可用的 Chrome 安装、真实 macOS Safari、iPhone/iPad 或 Android 设备，因此这些浏览器的音频/系统音量/后台行为仍需真机验收。

自动播放处理依据：[Chrome 官方策略](https://developer.chrome.com/blog/autoplay/)、[WebKit macOS 自动播放说明](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)、[WebKit iOS 用户手势说明](https://webkit.org/blog/6784/new-video-policies-for-ios/)。这些策略意味着本地存储不能保证恢复有声播放，必须保留清晰的人工播放入口。

## 修改文件

- 播放器：`js/music.js`、`css/music.css`、`js/config.js`、`css/style.css`（移除旧播放器样式）。
- 导航与生命周期：`js/router.js`、`js/core.js`、`js/main.js`、`js/links.js`、`js/projects.js`、`js/games.js`、`js/works.js`。
- 六个页面：`index.html`、`works.html`、`links/index.html`、`projects/index.html`、`games/index.html`、`about/index.html`。添加播放器样式/导航脚本，版本统一为 `v=3`；图库弹窗移入主内容区域。
- 测试：`tests/static.test.mjs`、`tests/browser.cjs`、`tests/server.cjs`、`tests/music.cjs`、`tests/compat.cjs`、`package.json`。
- 文档：`README.md`、`assets/audio/README.md`、本文件。原优化报告保留为历史记录。

## 本地运行与部署

```powershell
python -m http.server 4173 --bind 127.0.0.1
# http://127.0.0.1:4173/
```

```powershell
npm install
npx playwright install chromium webkit
npm test
npm run build
npm run test:browser
npm run test:music
# 已安装 Edge 时：$env:BROWSER_CHANNEL = 'msedge'
# 附加跨引擎检查（需要本机 Edge 和 WebKit）：
npm run test:compat
```

继续使用现有 `main` 根目录 + `.nojekyll` 的 GitHub Pages 发布，不改仓库权限或部署来源。提交上列源文件和测试后由现有 `pages build and deployment` 执行；`_site/` 是可选打包，不必提交。等待当前提交 Actions 成功后验证首页、各目录直达、MP3 和 SPA 导航。无需 404 重写；原 `404.html` 保留。
