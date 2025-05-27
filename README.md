# Komorebi Blog Frontend

一个简约美观的个人博客系统前端，设计用于从 GitHub 仓库动态加载内容，并通过 Cloudflare Pages/Workers 或其他静态托管服务部署【——部分设计和优化由AI辅助实现】。

## 示例站点
https://komorebi.001412.xyz

## 特点

- 🚀 轻量级设计，无需数据库或后端服务
- 📝 使用 Markdown 编写文章
- 🖼️ **内容展示多样**：
    - 文章列表（支持缩略图或标题占位符）
    - 网站导航卡片（支持图片）
    - 相册集展示（支持相册封面）
    - 点击相册进入交互式 3D 照片墙
- ✨ 代码块语法高亮 (支持一键复制)
- 💅 支持 LaTeX 数学公式渲染
- 🏷️ **文章和导航链接的标签系统**：
    - 在卡片上展示标签
    - 侧边栏标签列表，可点击筛选内容
- 👤 **作者信息展示**：
    - 在首页各个内容板块的侧边栏展示作者卡片
    - 从配置文件动态加载作者信息
- 💬 **文章末尾评论区链接** (指向 GitHub Issues)
- 🌌 **动态背景图片切换**：
    - 从配置文件读取背景图片列表
    - 平滑的交叉淡入淡出效果
    - 首页、文章页、相册视图页均支持
- 📸 **相册集与照片墙**：
    - 首页集成“相册集”标签页，展示所有相册
    - 点击相册封面进入独立的 `album.html` 页面
    - `album.html` 以多层交互式 3D 照片墙展示相册内图片 (基于 Three.js)
    - 支持鼠标滚轮缩放和平移视角、点击图片查看大图及信息
    - 照片按时间或原始顺序排序
- 📱 响应式布局，适配各种设备 (电脑、平板、手机)
- 🔄 自动从公开的 GitHub 内容仓库获取最新数据 (文章、导航、作者、相册、背景图等)
- ✨ 带有动效的现代化用户界面
- 🧭 集成网站导航链接功能

## 快速开始

### 准备内容仓库

您需要一个**公开**的 GitHub 仓库来存储博客的实际内容 (例如 `https://github.com/Komorebi-yaodong/komorebiBlog`)。

1.  **创建内容仓库**: 如果还没有，请创建一个新的 **公开** GitHub 仓库。

2.  **内容仓库目录结构与文件**:
    ```
    your-username/myBlogContent/
    ├─ posts/                # 存放 Markdown 格式的博客文章 (.md 文件)
    ├─ figures/              # 存放各类图片资源 (建议按类型分子目录)
    │  ├─ avatars/           #   => 作者头像
    │  ├─ post_covers/       #   => 文章封面
    │  ├─ link_figures/      #   => 导航链接卡片图
    │  ├─ album_covers/      #   => 相册集封面图
    │  ├─ albums/            #   => 相册内图片 (建议再按相册名分子目录)
    │  │  └─ wallpaper/
    │  │     └─ image1.jpg
    │  └─ backgrounds/       #   => 网站动态背景图
    ├─ photos_data/          # 存放各相册的照片元数据 JSON 文件
    │  └─ wallpaper.json
    ├─ list.json             # 文章列表配置文件
    ├─ link.json             # 网站导航链接配置文件
    ├─ author.json           # 作者信息配置文件
    ├─ albums.json           # 相册集列表配置文件
    └─ background.json       # 网站动态背景图片列表配置文件
    ```
    *详细的 JSON 文件格式和图片管理指南见下方“内容管理指南”部分。*

### 部署博客网站 (Komorebi Blog Frontend)

#### 方法一：使用 Cloudflare Pages (推荐)

1.  **获取前端代码**: 克隆或下载本仓库 (Komorebi Blog Frontend)。
2.  **修改配置**:
    *   打开 `js/main.js`, `js/post.js`, `js/album.js` 和 `js/background-switcher.js`。
    *   在这些文件中，找到 `repoUrl` 常量 (或 `repoUrlForBackground` 在 `background-switcher.js` 中，它会由调用它的JS文件初始化)。将其值修改为你的 **内容仓库** 的访问 URL。
        *   **如果内容仓库也部署在 GitHub Pages**:
            ```javascript
            const repoUrl = 'https://your-username.github.io/myBlogContent';
            ```
        *   **如果内容仓库仅作为普通 GitHub 仓库，通过 RawGit 或类似服务访问 (更推荐上述 Pages 方式)**:
            ```javascript
            const repoUrl = 'https://raw.githubusercontent.com/your-username/myBlogContent/main';
            // 注意: 分支名可能是 main, master 或其他
            ```
        *   确保所有引用 `repoUrl` 的 JS 文件都指向了正确的地址。`background-switcher.js` 中的 `repoUrlForBackground` 会被 `main.js`, `post.js`, `album.js` 中的 `initializeDynamicBackgrounds(repoUrl)` 调用时传入的 `repoUrl` 自动设置。
3.  **托管前端代码**:
    *   创建一个**新的 GitHub 仓库** (例如 `your-username/myBlogSite`) 用于托管你修改配置后的**前端代码**。
    *   将本地修改后的前端代码 (所有 HTML, CSS, JS 文件和 `fonts/` 目录等) 推送到这个新仓库 (`myBlogSite`)。
4.  **部署到 Cloudflare Pages**:
    *   登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
    *   进入 "Workers & Pages" -> "创建应用程序" -> "Pages" -> "连接到 Git"。
    *   选择你刚刚创建并推送了前端代码的仓库 (`myBlogSite`)。
    *   **构建配置**:
        *   **构建命令**: (留空 - 因为这是纯静态站点)
        *   **输出目录**: `/` (根目录) 或 `.` (当前目录)
    *   点击 "保存并部署"。

#### 方法二：使用其他静态网站托管服务

你可以将修改配置后的前端代码部署到任何支持静态文件的托管服务，如 GitHub Pages (直接在此前端仓库启用), Vercel, Netlify 等。核心步骤是：
1.  确保 `repoUrl` 在 JS 文件中正确配置，指向你的内容仓库。
2.  将前端代码推送到所选平台。

## 自定义博客

### 修改样式
-   **整体样式**: `css/main.css` (布局、颜色、卡片、动画、背景切换时长 `--background-fade-duration` 等)。
-   **文章渲染**: `css/markdown.css` (Markdown 内容样式，代码块，数学公式等)。
-   **照片墙/相册视图**: `css/album.css` (3D 照片墙的模态框、导航按钮等)。

### 修改网站文本信息
-   **首页 (`index.html`)**:
    *   `<title>` 标签。
    *   Hero 部分: `.hero-title`, `.hero-subtitle`。
    *   Tab 标签名。
    *   页脚年份/版权信息 (`.footer`) 和社交链接。
-   **文章页 (`post.html`)**:
    *   `<title>` 标签 (会被 JS 动态修改为文章标题)。
    *   导航栏品牌 (`.navbar-brand`) 和返回首页链接。
    *   评论区链接 (硬编码，可修改指向的 GitHub Issues 地址)。
-   **相册视图页 (`album.html`)**:
    *   `<title>` 标签 (会被 JS 动态修改为相册名)。
    *   导航栏。

### 调整布局
-   `index.html` 定义了主页的标签页结构。
-   `album.html` 定义了照片墙页面的结构。
-   `main.css` 通过 CSS Grid 和 Flexbox 控制各种卡片列表和侧边栏的布局。

### 修改动态行为
-   **背景图片切换间隔**: `js/background-switcher.js` 中的 `BACKGROUND_CHANGE_INTERVAL_MS`。
-   **照片墙参数**: `js/album.js` 包含大量关于照片墙布局、相机、交互的常量，可按需调整。

## 内容管理指南 (在您的内容仓库中操作)

以下所有 JSON 文件和 Markdown 文件都应存放在您独立的 **内容仓库** (例如 `your-username/myBlogContent`) 中。

### 1. 作者信息 (`author.json`)
在内容仓库根目录创建/编辑 `author.json`。
```json
[
  {
    "name": "Komorebi Yao",
    "avatar": "figures/avatars/my_avatar.png", // 相对于内容仓库根目录的路径
    "description": "热爱生活，探索未知。",
    "link": {
      "GitHub": "https://github.com/Komorebi-yaodong",
      "Email": "your.email@example.com"
    }
  }
]
```
*   `avatar` 图片建议存放于内容仓库的 `figures/avatars/` 目录。

### 2. 文章 (`posts/` 目录 和 `list.json`)
1.  **Markdown 文件**: 在内容仓库的 `posts/` 目录下创建/编辑 `.md` 文件。
    *   文章内图片引用: 可以是相对路径 (如 `./image.png`)，仓库绝对路径 (如 `/figures/some_image.png`) 或完整 URL。`post.js` 会尝试解析。
2.  **文章列表 (`list.json`)**: 在内容仓库根目录创建/编辑 `list.json`。
    ```json
    [
      {
        "title": "我的第一篇文章",
        "time": "2025-05-01", // YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss
        "file": "posts/hello-world.md", // 相对于内容仓库根目录
        "image": "figures/post_covers/post1_thumb.png", // (可选) 卡片封面图
        "description": "这是我的第一篇博客文章...", // (可选) 卡片描述
        "tag": ["技术", "随笔"] // (可选) 标签列表
      }
    ]
    ```
    *   封面 `image` 建议存放于内容仓库的 `figures/post_covers/`。

### 3. 导航链接 (`link.json`)
在内容仓库根目录创建/编辑 `link.json`。
```json
[
  {
    "title": "GuessGame AI",
    "link": "https://guessgame.001412.xyz", // 完整 URL
    "image": "figures/link_figures/guessgame_card.png", // (可选) 卡片图
    "description": "基于AI的猜猜看小游戏...", // (可选) 描述
    "tag": ["AI", "游戏"] // (可选) 标签
  }
]
```
*   卡片 `image` 建议存放于内容仓库的 `figures/link_figures/`。

### 4. 相册集与照片 (`albums.json`, `photos_data/` 目录)
1.  **照片元数据 (例如 `photos_data/albumName.json`)**:
    *   在内容仓库的 `photos_data/` 目录下为每个相册创建一个 JSON 文件。
    *   文件内容是一个照片对象数组:
        ```json
        [ // 内容示例: photos_data/wallpapers.json
          {
            "image": "figures/albums/wallpapers/wallpaper1.jpg", // 相对于内容仓库根目录
            "title": "宁静山谷", // (可选)
            "time": "2023-10-01", // (可选)
            "description": "清晨的山谷..." // (可选)
          }
        ]
        ```
    *   照片 `image` 强烈建议存放于内容仓库的 `figures/albums/相册名/` 目录下。
2.  **相册集列表 (`albums.json`)**: 在内容仓库根目录创建/编辑 `albums.json`。
    ```json
    [
      {
        "name": "壁纸收藏",
        "image": "figures/album_covers/wallpapers_cover.jpg", // (可选) 相册集封面图
        "path": "photos_data/wallpapers.json" // 指向该相册的照片元数据文件
      }
    ]
    ```
    *   相册集封面 `image` 建议存放于内容仓库的 `figures/album_covers/`。

### 5. 动态背景图片 (`background.json`)
在内容仓库根目录创建/编辑 `background.json`。这是一个图片路径字符串列表。
```json
[
  "https://source.unsplash.com/random/1920x1080?nature",
  "figures/backgrounds/my_custom_bg.png" // 相对于内容仓库根目录
]
```
*   背景图片建议存放于内容仓库的 `figures/backgrounds/`。

### 图片路径总结
-   所有在 JSON 文件中指定的图片路径 (`image` 字段等) 都是**相对于内容仓库的根目录**。
-   文章 Markdown 文件 (`.md`) 内的图片路径由 `post.js` 中的 `replaceImagePaths` 函数处理，支持更灵活的相对路径和智能猜测 (如直接文件名则默认查找 `figures/`)。

### 提交流程
完成内容仓库中的任何修改后，提交 (commit) 并推送 (push) 到内容仓库的 `main` (或主) 分支。前端网站配置了从该仓库拉取数据，因此内容会自动更新（可能需要一些时间缓存刷新或重新部署，取决于托管平台的设置）。
