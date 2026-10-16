# 无限点击与逐次短音效（2026-10-16）

- 默认直接无限互动，累计计数持续增加；不需要点击“自由互动”。
- 保留 1、3、5、8、12、15、20 节点。第 20 次只解锁一次樱花彩蛋，不禁用按钮、不抢走键盘焦点。彩蛋可收起，重开后可再次解锁。
- 音效开启且浏览器允许时，每次点击启动一段短音效，移除原 150ms 冷却。单一 AudioContext、最多四个并发 BufferSource，淘汰旧音效时解绑回调并断开连接。BufferSource 按 Web Audio 一次性节点规范创建，音频数据缓存复用。
- 完整台词继续使用原 VoiceManager 队列与冷却，避免完整语音重叠。原 CD 音乐、音量和静音设置独立保留。
- 动画继续使用原有有限对象池、视觉节流、隐藏页暂停和减少动态效果偏好。没有下载或修改照片、音乐和配音素材。

## 实际验证

本地构建输出 78 个静态文件。逻辑/静态 32 项、游戏浏览器 11 项、语音浏览器 5 项、CD 音乐 15 项，共 63 项通过。

逻辑覆盖连续 10,000 次计数、七个节点、彩蛋每局仅一次、重开；固定时钟下 1,000 次音效请求均启动，活动节点上限四个、旧节点全部清理。浏览器覆盖 20 次后直接连续 200 次点击，观察到 200 次音频 source.start 调用，计数到 220；收起彩蛋后照片点击继续到 221。静音、音量、重置、离页释放、SPA 背景音乐延续及控制台/资源检查通过。

手机/平板纵横屏通过 Edge 触摸与视口模拟；未进行 iPhone、iPad 或 Safari 真机验证。测试确认音频调用与媒体解码，不代表人工试听或角色音色质量评估；超快速合成点击不保证每段尾音完整播放（旧音效会被新音效替换）。用户静音、音量为零或设备禁止声音时不会强制出声。

## 文件与运行

运行时代码：`games/funny-hit/{game-state.js,audio-manager.js,game.js,effects.js,index.html}`、`js/router.js`。入口文案：`games/index.html`；七个页面更新路由版本至 v9，游戏资源 v3。测试：`tests/{funny-hit.test.cjs,funny-hit-browser.cjs,voice-browser.cjs}`。文档：README、本文，保留并修复上一版语音记录的 UTF-8 发布编码。

```sh
node scripts/build.mjs
node --test tests/static.test.mjs tests/game.test.cjs tests/funny-hit.test.cjs
node tests/funny-hit-browser.cjs
node tests/voice-browser.cjs
node tests/music.cjs
```

浏览器测试需要 Playwright 与可用 Edge（或设置 BROWSER_CHANNEL）。继续使用现有 GitHub Pages 分支部署，未添加构建服务或更改仓库权限。发布结果以对应 PR 和 Pages 运行记录为准。
