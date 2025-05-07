# Komorebi Blog Frontend

一个简约美观的个人博客系统前端，设计用于从 GitHub 仓库动态加载内容，并通过 Cloudflare Pages/Workers 或其他静态托管服务部署【——部分设计和优化由AI辅助实现】。

## 示例站点
https://komorebi.001412.xyz

## 特点

- 🚀 轻量级设计，无需数据库或后端服务
- 📝 使用 Markdown 编写文章
- 🖼️ 支持文章列表缩略图和网站导航卡片图片
- ✨ 代码块语法高亮 (支持一键复制)
- 💅 支持 LaTeX 数学公式渲染
- 🏷️ **文章和导航链接的标签系统**：
    - 在卡片上展示标签
    - 侧边栏标签列表，可点击筛选内容
- 💬 **文章末尾评论区链接** (指向 GitHub Issues)
- 🌌 **动态背景图片切换**：
    - 从配置文件读取背景图片列表
    - 平滑的交叉淡入淡出效果
    - 首页和文章页均支持
- 📱 响应式布局，适配各种设备 (电脑、平板、手机)
- 🔄 自动从公开的 GitHub 仓库获取内容 (文章列表、链接列表、文章详情、背景图片列表)
- ✨ 带有动效的现代化用户界面
- 🧭 集成网站导航链接功能

## 快速开始

### 准备内容仓库

您需要一个**公开**的 GitHub 仓库来存储博客的实际内容。

1.  创建一个 **公开** 的 GitHub 仓库，例如 `your-username/myBlogContent`。

2.  在此内容仓库中创建以下推荐的目录和文件结构：
    ```
    myBlogContent/
    ├─ figures/          # 存放文章 (posts) 中引用的图片
    ├─ Linkfigures/      # 存放导航链接 (links) 卡片上显示的图片
    ├─ backgrounds/      # (可选) 存放用作网站背景的图片
    ├─ posts/            # 存放 Markdown 格式的博客文章 (.md 文件)
    ├─ list.json         # 文章列表配置文件
    ├─ link.json         # 网站导航链接配置文件
    └─ background.json   # (可选) 动态背景图片列表配置文件
    ```

3.  在 `posts/` 目录中添加 Markdown 格式的文章。

4.  创建 `list.json` 文件，用于定义文章列表。内容格式如下：
    ```json
    [
      {
        "title": "我的第一篇文章",
        "time": "2025-05-01",
        "file": "posts/hello-world.md",
        "image": "figures/post1_thumb.png", // (可选) 文章卡片图片
        "tag": ["技术", "随笔"] // (可选) 文章标签列表
      },
      {
        "title": "技术笔记分享",
        "time": "2025-05-10",
        "file": "posts/tech-notes.md",
        "image": "figures/tech_cover.jpg",
        "tag": ["技术", "教程"]
      }
    ]
    ```
    *   `image` 和 `tag` 字段都是可选的。图片路径相对于仓库根目录。

5.  创建 `link.json` 文件，用于定义网站导航链接。内容格式如下：
    ```json
    [
      {
        "title": "GuessGame AI",
        "link": "guessgame.001412.xyz",
        "image": "Linkfigures/guessgame_card.png", // (可选) 链接卡片图片
        "description": "基于AI的猜猜看小游戏...", // (可选) 链接描述
        "tag": ["AI", "游戏"] // (可选) 导航链接标签列表
      },
      {
        "title": "我的 GitHub",
        "link": "github.com/Komorebi-yaodong",
        "description": "查看我的其他开源项目。",
        "tag": ["代码", "开源"]
      }
    ]
    ```
    *   `image`, `description`, 和 `tag` 字段都是可选的。图片路径相对于仓库根目录。

6.  (可选) 创建 `background.json` 文件，用于定义网站的动态背景图片。内容格式为一个字符串列表，每个字符串是一个图片地址（可以是完整的 URL，也可以是相对于内容仓库根目录的路径，例如存放在 `backgrounds/` 目录下）：
    ```json
    [
      "https://example.com/path/to/your/background1.jpg",
      "backgrounds/my-custom-bg.png",
      "backgrounds/another-landscape.jpeg"
    ]
    ```
    *   如果此文件不存在或为空，网站将使用 CSS 中定义的默认背景（如果有）或纯色背景。

### 部署博客网站 (前端代码)

#### 方法一：使用 Cloudflare Pages (推荐)

1.  克隆或下载本仓库 (Komorebi Blog 前端代码) 到本地。
2.  **修改配置**:
    *   打开 `js/main.js` 和 `js/post.js` 文件 (以及 `js/background-switcher.js` 如果你修改了它的 `repoUrlForBackground` 默认行为)。
    *   找到 `repoUrl` 常量 (在 `main.js` 和 `post.js` 中，`background-switcher.js` 会从调用它的文件中获取此值)，将其值修改为你 **内容仓库** 的 GitHub Raw 地址。格式通常是：
        ```javascript
        const repoUrl = 'https://raw.githubusercontent.com/your-username/myBlogContent/main';
        //                                          ^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^ ^^^^
        //                                          你的GitHub用户名  内容仓库名     分支名(通常是main)
        ```
3.  创建一个**新的 GitHub 仓库** (例如 `your-username/myBlogSite`) 用于托管**博客前端代码**。
4.  将本地修改后的前端代码（包括 `index.html`, `post.html`, `css/`, `js/` 目录等）推送到这个新仓库 (`myBlogSite`)。
5.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
6.  进入 "Workers & Pages" -> "创建应用程序" -> "Pages" -> "连接到 Git"。
7.  选择你刚刚创建并推送了前端代码的仓库 (`myBlogSite`)。
8.  设置构建配置：对于这个项目（纯静态文件），通常**不需要构建命令**，**输出目录**设置为 `/` (根目录) 或留空（如果默认即可）。
9.  点击 "保存并部署"。Cloudflare Pages 会自动部署你的网站。

#### 方法二：使用其他静态网站托管服务

你可以将修改配置后的前端代码部署到任何支持静态文件的托管服务，如 GitHub Pages, Vercel, Netlify 等。主要步骤是确保将代码推送到平台，并正确配置 `repoUrl` 指向你的内容仓库。

## 自定义博客

### 修改样式

-   编辑 `css/main.css` 文件可以修改网站的整体样式、布局、颜色、动画、背景切换的淡入淡出时长 (`--background-fade-duration`) 等。
-   编辑 `css/markdown.css` 文件可以修改文章详情页面的 Markdown 内容渲染样式。

### 修改网站信息

-   在 `index.html` 文件中修改 `<title>` 标签、Hero 部分的主标题 (`.hero-title`)、副标题 (`.hero-subtitle`) 和页脚年份/版权信息 (`.footer`)。
-   在 `post.html` 文件中修改 `<title>` 标签、导航栏品牌 (`.navbar-brand`) 和页脚信息。
-   评论区链接硬编码在 `post.html` 中，你可以在那里修改指向的 GitHub Issues 地址。

### 调整布局

-   `index.html` 文件定义了主页的整体结构，包括 “网站导航” 和 “最新文章” 区块以及它们的标签侧边栏。
-   `main.css` 通过 CSS Grid 和 Flexbox 控制卡片列表和侧边栏的布局。

### 修改背景图片切换行为

-   在 `js/background-switcher.js` 中，你可以修改 `BACKGROUND_CHANGE_INTERVAL_MS`常量来调整背景图片自动切换的间隔时间。

## 内容管理指南

管理博客内容非常简单，只需修改你的 **内容仓库** (`myBlogContent`) 中的文件即可。前端网站会自动拉取最新内容。

### 创建/修改文章

1.  在内容仓库的 `posts/` 目录中创建或修改 `.md` 文件。
2.  更新 `list.json` 文件：
    *   添加新文章条目或修改现有条目的 `title`, `time`, `file`。
    *   (可选) 添加或修改 `image` 字段指向 `figures/` 目录中的图片。
    *   (可选) 添加或修改 `tag` 字段 (一个字符串列表) 为文章添加标签。
3.  提交更改到内容仓库。

### 添加/修改导航链接

1.  更新 `link.json` 文件：
    *   添加或修改链接条目的 `title`, `link`。
    *   (可选) 添加或修改 `description`。
    *   (可选) 添加或修改 `image` 字段指向 `Linkfigures/` 目录中的图片。
    *   (可选) 添加或修改 `tag` 字段 (一个字符串列表) 为导航链接添加标签。
2.  提交更改到内容仓库。

### 管理背景图片

1.  将用作背景的图片上传到内容仓库中，例如 `backgrounds/` 目录。
2.  更新 `background.json` 文件，添加或移除图片路径 (URL 或相对路径)。
3.  提交更改到内容仓库。

### 添加其他图片

1.  将**文章**相关的图片上传到内容仓库的 `figures/` 目录中。
2.  将**导航链接卡片**相关的图片上传到内容仓库的 `Linkfigures/` 目录中。
3.  在文章 Markdown 文件中引用图片。路径处理逻辑在 `js/post.js` 的 `replaceImagePaths` 函数中，通常可以智能处理相对路径。