# Shiming · Social Links

一个原生 HTML / CSS / JavaScript 静态主页，无构建步骤、无跟踪脚本、无外部字体依赖。头像和背景已设置。作品页展示 `assets/images/works/` 中登记在 `js/works-data.js` 的照片。

## Windows 本地启动

在本项目文件夹空白处右键，选择“在终端中打开”，运行：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

如系统使用 Python Launcher，可换成 `py -m http.server 4173 --bind 127.0.0.1`。浏览器打开 http://127.0.0.1:4173 。按 Ctrl+C 关闭服务器。如果端口占用，可改成 4174，并相应修改浏览器地址。也可直接打开 index.html，但剪贴板在本地 HTTP / HTTPS 环境下更可靠。

## 文件结构

```text
index.html                 首页和 SEO
404.html                   找不到页面时显示
css/style.css              主题、毛玻璃、响应式和动画
css/works.css              作品页照片网格与 Lightbox 样式
works.html                 独立作品展示页面
js/config.js               个人资料、账号、目录、音乐、樱花配置
js/works-data.js           摄影作品元数据列表
js/works.js                分类筛选、图库和 Lightbox
js/main.js                 渲染与交互
js/music.js                首页和作品页共用的音乐播放控制
assets/images/avatar.png.jpg   头像占位图，直接替换
assets/images/background.jpg.jpg 背景图，直接替换
assets/images/works/      作品原图目录
assets/images/works/thumbs/ 缩略图目录（由脚本生成）
assets/audio/              放入自己的 bgm.mp3
assets/icons/              图标说明，SVG 内置于 main.js
favicon.svg                粉色狐狸 favicon
.nojekyll                  GitHub Pages 直接提供静态文件
scripts/placeholders.ps1   初始占位图生成脚本，无需重复运行
```

## 修改个人资料和账号

使用记事本或 VS Code 打开 `js/config.js`，保持引号和逗号完整，以 UTF-8 保存。

| 要修改的内容 | 配置位置 |
| --- | --- |
| 昵称 | `name` |
| 简介 | `bio` |
| 欢迎状态 | `status` |
| QQ 号 | `qq1`、`qq2`，卡片自动同步 |
| Email | `email`，复制和发邮件入口自动同步 |
| X / Twitter | `socialLinks` 中对应项的 `url` 和 `username` |
| GitHub | `socialLinks` 中对应项的 `url` 和 `username` |
| YouTube | `socialLinks` 中对应项的 `url` 和 `username` |

昵称同时更新浏览器标题和动态 Open Graph 标题。更名时也请更新 `index.html` 中的静态标题和 Open Graph 标题，以便不执行 JavaScript 的搜索引擎读取。SEO 描述不包含 QQ 和邮箱，但账号本身仍是主页上的公开信息。

### 增加或删除平台

只需在 `socialLinks` 数组中添加一项，例如：

```js
{ name: 'Bilibili', icon: 'link', username: '你的用户名', url: 'https://space.bilibili.com/你的UID' },
```

把示例地址换成自己的真实地址。Steam、Discord、Telegram 同样添加 `name`、`username`、`url` 即可。内置 `icon` 有 `x`、`github`、`youtube`、`qq`、`email`、`link`；未知值使用通用链接图标。增加专属 SVG 时可扩展 main.js 的 icons 对象，但增加平台本身无需改 HTML。

删除平台时删除数组里对应的整个 `{ ... }` 项，调整顺序则移动该项。

## 更换图片

- 作品页背景：替换 `assets/images/works-background.jpg`，仅用于作品展示页。当前图片为 1280 × 1720，采用 cover 铺满并优先显示人物上半身；以后可用同名图片替换。
- 头像原图：替换 `assets/images/avatar.png.jpg`，然后运行下方优化脚本更新 WebP/JPEG 小头像。
- 背景：替换 `assets/images/background.jpg.jpg`，建议横向 JPG，至少 1920 × 1080。以 cover 居中裁切，手机会裁掉左右两侧。
- 文件名、大小写不变时无需改代码。换成其他格式时，在 config.js 更新路径；不要仅修改扩展名假装转换格式。
- 替换原图后运行 `py scripts/optimize-images.py` 更新压缩版本，再上传原图及生成文件。更新后浏览器按 Ctrl+F5 强制刷新。不要再次执行占位图脚本，以免覆盖你的图片。

## 新增目录页和作品展示

首页右上角的页面入口由 `js/config.js` 中的 `pages` 数组驱动。当前作品展示入口已经启用。新增实际页面后，按需添加类似配置：

```js
{ number: '02', title: '关于我', subtitle: 'About Me', icon: 'link', url: './about.html', enabled: true }
```

`enabled: false` 会隐藏入口；删除对应对象即可移除入口。每个入口对应独立的 HTML 文件。新增平台图标可在 `js/main.js` 的 `icons` 中添加 SVG。

### 添加摄影作品

1. 将照片放入 `assets/images/works/`，使用简单英文文件名和正确扩展名，例如 `photo-002.jpg`（不要把 `.jpg` 重复加到文件名）。建议先缩小超高分辨率原图；画廊卡片可用 `thumbnail` 指向 WebP/AVIF 缩略图，点开后用 `image` 原图。
2. 在 `js/works-data.js` 的 `window.WORKS` 数组中加入一项：

```js
{
  id: 'photo-002',
  image: './assets/images/works/photo-002.jpg',
  thumbnail: './assets/images/works/thumbs/photo-002.webp',
  title: '作品标题',
  description: '简短介绍',
  date: '2026-09-28',
  category: '风景',
  tags: ['天空', '摄影'],
  width: 1600,
  height: 1200
}
```

`thumbnail`、`description`、`date`、`category`、`tags`、`width`、`height` 都是可选字段。没有填写 thumbnail 时默认使用 thumbs/同名.webp，缺失则显示可点击的占位提示。用逗号分隔数组中不同作品。页面会从作品数据自动生成分类按钮，添加新 `category` 即增加筛选项。

`id` 每张作品唯一；`title` 和 `category` 建议填写，其余字段可选。页面按记录加载照片，不会自动扫描静态服务器目录。若路径无效，卡片会显示“图片加载失败”，并在浏览器 Console 输出失败路径。当前已登记 `photo-001.jpg`、`photo-002.jpg`、`photo-003.jpg` 三张作品。

点击图片可打开大图预览；支持上/下一张、关闭、背景点击关闭、Escape、方向键和触摸左右滑动。照片卡片使用图片懒加载。

静态图库不提供在线上传。未来若需登录后上传与发布，需增加带身份验证和持久化存储的后端（例如对象存储与受控 API），不要把凭据放进静态网页。

## 添加背景音乐

原始音乐保留在 `assets/audio/bgm.mp3`，网页使用 160 kbps 的 `assets/audio/bgm-web.mp3`。配置在 `js/config.js` 的 `music`：`enabled: true` 开启，`volume` 默认 0.25。首页和作品页共用 `js/music.js`。关键图片加载后独立尝试播放；浏览器拦截时保持 Off，首次 pointerdown / touchstart / click / keydown 在原始用户事件中调用 play()，成功后移除解锁监听。主动开关保存在 localStorage；用户关闭后刷新不会强制打开，也不会下载音乐。同一标签页记住播放位置；完整页面跳转会短暂中断，Safari 等浏览器仍可能要求再次触摸。

## 资源优化与更新

原始 JPG 和 MP3 都保留。首页、作品页背景优先使用 WebP，600px 以下屏幕使用 768px 宽的移动版；不支持 WebP 时回退到原始 JPG。头像使用 336×336 WebP，JPEG 兼容版本为 `avatar-small.jpg`，原始头像保留在 `avatar.png.jpg`。替换背景或头像后请重新生成优化文件，并同步 HTML 预加载地址与 config.js（文件名不变则不必改地址）。

```powershell
py -m pip install Pillow
py scripts/optimize-images.py
```

这个离线脚本还会为 `assets/images/works/` 的作品生成 `thumbs/同名.webp`。新增照片后运行它，再在 `js/works-data.js` 添加作品记录及 `thumbnail` 路径。列表仅加载缩略图，首屏之外懒加载，点击预览才请求原图；缩略图缺失时显示可点击的占位提示，避免意外批量下载原图。网页本身不会扫描服务器目录。

重新压缩音乐可用 `ffmpeg -i assets/audio/bgm.mp3 -map_metadata -1 -vn -codec:a libmp3lame -b:a 160k assets/audio/bgm-web.mp3`。没有必要每次运行图片脚本都处理音乐。

仅对首屏背景使用高优先级预加载，没有预加载音频、相册原图或第三方库。所有 URL 固定，不添加时间戳或随机参数，沿用 GitHub Pages 的缓存响应头。樱花桌面最多 24 个、手机最多 12 个，实际为 18/9（作品页 15/8）；后台暂停，减少动态效果设置下关闭。页面原本的 blur 为 0，已移除无视觉贡献的重复 backdrop-filter 合成层，保留透明粉色表面、边框和阴影。

## 调整视觉和动画

在 `css/style.css` 顶部 `:root` 中修改：

| CSS 变量 | 作用 |
| --- | --- |
| `--pink` / `--accent` / `--light-pink` | 主粉色、强调色、浅粉色 |
| `--background-color` | 背景后备色 |
| `--text` / `--muted` | 正文、次要文字颜色 |
| `--overlay-opacity` | 粉色叠加层不透明度，0～1 |
| `--glass-opacity` / `--card-opacity` | 容器、卡片透明度，0～1 |

为保证浅色占位背景上的可读性，文字默认深玫瑰色。更换成深色背景后可将 `--text` 调为 `#FFFFFF`，并相应调整次要文字和玻璃层。

樱花数量在 config.js 的 `sakura.desktop` 和 `sakura.mobile` 修改。设为 0 关闭；桌面上限为 24，手机上限为 12。系统开启“减少动态效果”后，樱花和入场动画关闭。卡片支持 Tab 键、Enter，复制按钮同时支持空格键，状态反馈通过 live region 通知读屏软件。

## 上传 GitHub 并发布到公网

此项目的 GitHub Pages 地址是 https://shimingcode.github.io 。把新页面及资源提交到仓库 `shimingcode/shimingcode.github.io` 的 `main` 分支，Pages 会自动更新。

已部署网站更新步骤（Windows）：

1. 打开本项目文件夹中的终端。
2. 运行 `git status` 确认工作区内容。
3. 运行 `git add index.html works.html css js assets README.md`。
4. 运行 `git commit -m "Add works gallery page"`。
5. 运行 `git push`。GitHub Actions 完成部署后，首页仍是 https://shimingcode.github.io/，作品页是 https://shimingcode.github.io/works.html。

若此电脑尚未克隆仓库，请先从 `https://github.com/shimingcode/shimingcode.github.io` 克隆，再把项目更新复制到克隆目录；不要对已部署仓库重复执行 `git init`。

普通项目仓库也受支持：首页和作品页资源均为相对路径，地址为 `https://shimingcode.github.io/仓库名/`。若使用普通项目仓库，请把 404.html 的首页链接改为 `/仓库名/`；用户主页仓库和独立域名使用 `/`。

## 将来绑定独立域名

当前未创建 CNAME，也未填写虚构域名。购买域名后：

1. 在域名注册商处购买自己选择的域名，确认续费价格并启用账号保护。
2. 按 GitHub 文档先验证域名所有权；在仓库 Settings → Pages → Custom domain 输入实际域名并保存。按分支发布时 GitHub 会创建 CNAME，随后拉取该提交到本地。
3. 在注册商 DNS 管理中，若绑定 `www`，创建 CNAME 指向 `shimingcode.github.io`，目标不要包含 https 或仓库路径。
4. 若绑定根域名，使用注册商支持的 ALIAS / ANAME 指向 `shimingcode.github.io`，或按下方 GitHub 官方文档所列的最新 A 记录地址配置。不要复制过时 IP，也不要设置通配符 DNS。
5. 等待 DNS 检查和证书签发成功，在 Pages 勾选 Enforce HTTPS。DNS 生效可能需要时间。

参考：[GitHub 自定义域名官方文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)、[域名验证](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)。

## 发布前检查

替换真实头像和背景，按需添加 BGM；在手机浏览器检查链接、复制和音乐。音乐文件与剪贴板权限在不同浏览器上的表现可能不同，复制失败时页面提供手动复制输入框。网站没有访问统计、广告、Cookie 或访问者数据收集。


