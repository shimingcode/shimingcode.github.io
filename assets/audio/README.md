在 js/config.js 的 music.src 中配置唯一背景音乐，当前为 bgm-web.mp3。
首次访问会尝试有声播放一次；浏览器拒绝时显示点击播放入口，用户之前暂停则尊重暂停偏好。
播放器使用 HTMLAudioElement.loop 单曲循环，没有播放列表或切歌按钮。
原始 MP3 和 original-upload 目录保持存档，同一首歌的压缩与原始版本不是两首歌曲。
NCM 不直接用于网页播放。请只使用自己拥有使用权的音频。
