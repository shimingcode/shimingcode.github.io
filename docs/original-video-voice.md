# 原视频女声接入（2026-10-18）

采用用户指定的[晓升视频](https://www.douyin.com/video/7695234259136574385)原声音频。用户在会话中明确确认使用原片段，并确认已获得公开网站使用授权。记录见 [来源与授权](../assets/games/funny-hit/voices/LICENSE.md)，不将其当作开放许可证，不克隆声纹、不合成新台词。

## 实际资源

| 文件 | 原视频区间 | 时长 | 大小 | 峰值 |
| --- | --- | --- | --- | --- |
| xiaosheng-invitation.wav | 0–6.5秒 | 6.500秒 | 312,044 B | -1.95 dBFS |
| xiaosheng-denial.wav | 10.8–15.069秒 | 4.269秒 | 204,956 B | -2.07 dBFS |

位于 `assets/games/funny-hit/voices/`，均为 24kHz 单声道 PCM16 WAV。由原片解码后统一衰减 20%、边缘 8ms 淡入淡出；没有升调、变速或重复有损编码，削波样本数均为 0。保留原视频背景声，不宣称是分离的纯人声。通过画面、口型、字幕定位女性段落，排除中间男性对白；没有进行人工听感验收或声纹鉴定。原始视频只保存在忽略的 test-results/douyin，不上传原视频或其画面。

## 游戏行为

- 默认“原视频女声 · 晓升”，可切回“系统语音 · 游戏台词”，设置保存在 localStorage。
- 原声只有两段：撒娇/开心映射邀请片段，其余映射回应片段。原声模式显示实际视频字幕，不假装视频说出了原有游戏台词；系统模式保留原有台词。
- 邀请字幕：“看看可怜虫，一个人走路。要不要本小姐陪你？”；回应字幕：“我才没有！”。
- 第 1、3、5、8、12、15、20 次节点保持；无限点击、每次短音效、第 20 次彩蛋、原人物照片和樱花不变。
- 保留标准语音模式、语音 65%、音效 40%。普通点击仍有短音效，不让完整片段无限重叠；队列有上限，最终彩蛋优先。
- 不在页面打开时下载两段配音或自动播放语音。首次交互后按需获取，复用一个语音 Audio，至多缓存三段。CD 音乐保持独立实例与音量。
- 原声加载/解码失败时尝试系统朗读对应字幕；系统声音也不可用则保留字幕。切换来源停止当前配音，退出游戏释放缓存和事件。

## 验证

静态构建产出 83 个文件。36 项逻辑/路径检查、7 项真实原声浏览器检查、12 项游戏回归、6 项音频缓存/失败回退检查、1 项路由并行加载检查及 15 项音乐回归，共 77 项通过。原声检查覆盖两段实际解码与播放、自然结束、字幕、音量、缓存、静音、快速点击、来源持久化、320/390/768 布局和外部来源链接。

实际测试使用本机 Edge；没有 iPhone/iPad 真机听感结果。未把测试用音调当作这两段原声的音质证明，也没有重新测量整站 Lighthouse。

## 修改范围与运行

修改 `games/funny-hit/{dialogue,game-state,voice-manager,game}.js`、游戏页面、游戏中心文案、`js/router.js` 和七个页面的路由版本引用；新增两段 WAV、授权记录、本报告和 `tests/original-voice.cjs`；更新已有相关测试、README 与 package.json。修改的游戏脚本 v6，路由 v13，未改背景音乐资源。

```powershell
node scripts/build.mjs
node --test tests/static.test.mjs tests/game.test.cjs tests/funny-hit.test.cjs
$env:BROWSER_CHANNEL='msedge'
node tests/original-voice.cjs
node tests/funny-hit-browser.cjs
node tests/voice-browser.cjs
node tests/router-loading.cjs
node tests/music.cjs
```

通过独立分支 `codex/original-video-voice` 发布，不强制推送。实际 Pages 状态及线上复测以部署记录和交付说明为准。
