# Shiming · Social Links

一个原生 HTML / CSS / JavaScript 静态主页，无构建步骤、无跟踪脚本、无外部字体依赖。当前图片为本地制作的简单占位图，不包含音乐文件。

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
js/config.js               个人资料、账号、音乐、樱花配置
js/main.js                 渲染与交互
assets/images/avatar.png   头像占位图，直接替换
assets/images/background.jpg 背景占位图，直接替换
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
| QQ 号 | `qq`，卡片自动同步 |
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

- 头像：替换 `assets/images/avatar.png`，建议正方形 PNG，至少 320 × 320。
- 背景：替换 `assets/images/background.jpg`，建议横向 JPG，至少 1920 × 1080。以 cover 居中裁切，手机会裁掉左右两侧。
- 文件名、大小写不变时无需改代码。换成其他格式时，在 config.js 更新路径；不要仅修改扩展名假装转换格式。
- 更新后浏览器按 Ctrl+F5 强制刷新。不要再次执行占位图脚本，以免覆盖你的图片。

## 添加背景音乐

1. 将拥有使用权的 MP3 保存为 `assets/audio/bgm.mp3`。
2. 在 config.js 中将 `music.enabled` 改为 `true`。
3. `volume` 为 0～1，可调整默认音量。
4. 页面右下角点击 ♫ 播放，再次点击暂停。不会自动播放。

当前没有音频，点击按钮会提示尚未添加，也不会请求不存在的文件。启用后如文件缺失、格式不支持或浏览器拒绝播放，会显示错误提示。

## 调整视觉和动画

在 `css/style.css` 顶部 `:root` 中修改：

| CSS 变量 | 作用 |
| --- | --- |
| `--pink` / `--accent` / `--light-pink` | 主粉色、强调色、浅粉色 |
| `--background-color` | 背景后备色 |
| `--text` / `--muted` | 正文、次要文字颜色 |
| `--background-blur` | 背景模糊，例如 `2px` |
| `--background-brightness` | 背景亮度，例如 `0.9` |
| `--overlay-opacity` | 粉色叠加层不透明度，0～1 |
| `--glass-blur` | 毛玻璃模糊，例如 `22px` |
| `--glass-opacity` / `--card-opacity` | 容器、卡片透明度，0～1 |

为保证浅色占位背景上的可读性，文字默认深玫瑰色。更换成深色背景后可将 `--text` 调为 `#FFFFFF`，并相应调整次要文字和玻璃层。

樱花数量在 config.js 的 `sakura.desktop` 和 `sakura.mobile` 修改。设为 0 关闭；代码上限为 60。系统开启“减少动态效果”后，樱花和入场动画关闭。卡片支持 Tab 键、Enter，复制按钮同时支持空格键，状态反馈通过 live region 通知读屏软件。

## 上传 GitHub 并发布到公网

项目尚未关联或创建远程仓库。推荐使用账号 `shimingcode` 创建名为 `shimingcode.github.io` 的公开仓库。

### 方法一：网页上传（无需 Git 命令）

1. 登录 GitHub，点击右上角 `+` → `New repository`。
2. Repository name 填 `shimingcode.github.io`，选择 Public，创建仓库。
3. 使用 `uploading an existing file` 或 `Add file → Upload files`。
4. 上传本项目文件及 css、js、assets 文件夹，确保 index.html 在仓库根目录，不要外套一层项目文件夹。不上传 .git、artifacts 或测试截图。
5. 点击 Commit changes 保存。
6. 进入仓库 `Settings → Pages`。
7. 在 Build and deployment 下选择 `Deploy from a branch`，分支选 `main`、目录选 `/(root)`，点击 Save。
8. 等待 Actions 中部署任务成功，再打开 https://shimingcode.github.io 。这是未来发布地址，并不表示当前已经上线。

### 方法二：Windows Git 命令

先在 GitHub 创建空仓库，然后在项目终端运行：

```powershell
git init
git add index.html 404.html css js assets favicon.svg README.md .gitignore .nojekyll scripts
git commit -m "Create Shiming social links site"
git branch -M main
git remote add origin https://github.com/shimingcode/shimingcode.github.io.git
git push -u origin main
```

如果已经有 origin，先用 `git remote -v` 检查，不要重复添加或覆盖不相关仓库。根据 Git 的提示完成登录，不要将令牌写入源码。推送后按上面的 Settings → Pages 步骤开启发布。

后续更新：修改文件，执行 `git add`、`git commit` 和 `git push`，GitHub Pages 会重新发布。

普通项目仓库也受支持：首页资源均为相对路径，地址为 `https://shimingcode.github.io/仓库名/`。若使用普通项目仓库，请把 404.html 的首页链接改为 `/仓库名/`；用户主页仓库和独立域名使用 `/`。

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
