# 狐狐暴击求饶模拟器 V2 验证记录

日期：2026-10-18。基于现有原生 HTML/CSS/JS 游戏增量修改，保留照片、路由、漫画和樱花粒子池。开发分支：codex/funny-hit-v2-100。

## 规则与实现

- 原版本实际上是无限点击，20 次解锁彩蛋。V2 改为 100 次通关，之后拒绝计数，重新挑战重置。
- dialogue.js 集中配置 MAX_HITS、STAGE_SIZE、STAGES、DIALOGUES、AUDIO_VOLUME、AUDIO_PATH。100 条台词唯一，前 50 条沿用用户原文，第 100 条使用指定通关台词。
- 第 1/11/21/31/41/51/61/71/81/91 次分别进入 10 个阶段。为避免边界歧义，界面显示“距离阶段终点”；例如 35 次还差 5 次完成第四阶段，第 41 次进入第五阶段。整十次提示“下一次点击进入新阶段”。
- 每次输入同步修改状态和文字，计数/进度绘制每帧合并。进度条使用 transform: scaleX。
- 通关使用原生 dialog，支持键盘焦点、Escape、重新挑战。关闭弹窗不解锁计数。
- 原图及两段现有 WAV 都没有修改。V2 唯一点击声音为 assets/games/funny-hit/voices/xiaosheng-denial.wav（204,956 字节），保留默认 65% 音量；另一段录音保留但不加载。
- VoiceManager 首次用户点击创建一个 Audio，暂停后 currentTime=0 重播。最短重启间隔 150ms，最多一个延迟任务，游戏计数完全独立。无 TTS、无新音频、无音调/语速变换。旧音效模块文件保留，但不再加载或实例化。
- 互动文字不是音频逐字字幕。声音失败不改变文字，保留手动试听入口。旧音量/静音偏好继续保留，旧系统语音选项不再生效。
- 页面隐藏、重新开始、离开路由取消游戏音频/动画/监听器，不停止 CD 音乐。粒子池桌面 20、手机 12，阶段增强反馈有上限，尊重 reduced-motion。

## 实际验证

使用本机 Edge 155.0.4283.45、Playwright，测试构建目录 _site。Node 测试和构建命令实际执行；本机 npm 不在 PATH，使用其脚本对应的 node 命令。

| 命令 | 结果 |
| --- | --- |
| node --test tests/static.test.mjs tests/game.test.cjs tests/funny-hit.test.cjs | 29 项通过 |
| node tests/funny-hit-browser.cjs | 11 项通过 |
| node tests/voice-browser.cjs | 4 项通过 |
| node tests/original-voice.cjs | 原 WAV 解码、自然结束、重播、音量及不重载检查通过 |
| node tests/router-loading.cjs | 5 个游戏模块并行加载、按依赖初始化检查通过 |
| node tests/music.cjs | 15 项通过 |
| node tests/site-quality.cjs | 8 项通过 |
| node tests/browser.cjs | 14 项通过 |
| node scripts/build.mjs | 83 个静态文件构建成功 |

共 83 个测试/检查项（两个专项脚本各计一个整体检查）。覆盖 100 条显示、阶段边界、2000 次快速输入封顶、重置、静音、拒播/坏音频、隐藏/退出清理、CD 持续播放、照片、其他小游戏、路由及资源路径。普通运行未出现未捕获异常或资源 404。

移动端为触摸模拟视口 320、390、844、768、1024 CSS 像素；全站测试另覆盖桌面宽度。未测试 iPhone/iPad 真机或 macOS Safari。iOS 的软件音量和用户手势行为仍可能与 Edge 不同；保留设备音量和显式试听入口。原生 dialog 需要现代浏览器。

## 性能记录与边界

运行 node scripts/measure-hit-performance.cjs v2 _site：390×844、DPR2、4 倍 CPU 降速、3 轮、每轮 100 次有效连点与 60 次间隔点击，音频静音。原始数据保存在 test-results/hit-performance/v2.json。三轮同步连点处理为 24.1 / 202.9 / 105.5ms，中位数 105.5ms；间隔点击帧间隔 P95 为 16.9 / 66.2 / 50.0ms，均检测到长任务（分别 1 / 12 / 7 个），不能宣称低性能设备稳定 60FPS。旧无限点击 1000 次测试与本轮规则不同，不能计算前后提升百分比；未重新测量 Lighthouse 或真实用户 INP。

游戏模块从 6 个减少到 5 个，不再加载合成音效模块。音频字节未增加，单一媒体元素不重置 src；每次计数更新无需查询布局或浏览器动画状态。动画复用固定节点，结束与退出时清理。

## 文件清单

运行时代码：
- games/funny-hit/dialogue.js
- games/funny-hit/game-state.js
- games/funny-hit/voice-manager.js
- games/funny-hit/game.js
- games/funny-hit/effects.js
- games/funny-hit/style.css
- games/funny-hit/index.html
- js/router.js
- games/index.html
- index.html、works.html、links/index.html、projects/index.html、about/index.html（仅路由缓存版本）

验证与文档：
- tests/funny-hit.test.cjs
- tests/funny-hit-browser.cjs
- tests/voice-browser.cjs
- tests/original-voice.cjs
- tests/router-loading.cjs
- scripts/measure-hit-performance.cjs
- README.md
- assets/games/funny-hit/voices/README.md
- docs/funny-hit-v2.md（新增）

## 发布

沿用 GitHub Pages main 根目录发布方式，独立分支通过 PR 合并，不强推。部署运行与线上复测结果在交付回复中记录，不以本地构建成功代替线上成功。
