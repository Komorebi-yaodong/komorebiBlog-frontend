# Komorebi Blog Frontend

一个简约美观的个人博客系统前端，设计用于从 GitHub 仓库动态加载内容，并通过 Cloudflare Pages/Workers 或其他静态托管服务部署【——部分设计和优化由AI辅助实现】。

## 示例站点
https://komorebi.001412.xyz

## 特点

- 🚀 轻量级设计，无需数据库或后端服务
- 📝 使用 Markdown 编写文章
- 🖼️ 支持文章列表缩略图和网站导航卡片图片
- ✨ 代码块语法高亮
- 📱 响应式布局，适配各种设备 (电脑、平板、手机)
- 🔄 自动从公开的 GitHub 仓库获取内容 (文章列表、链接列表、文章详情)
- ✨ 带有动效和背景图片的现代化用户界面
- 🧭 集成网站导航链接功能

## 快速开始

### 准备内容仓库

您需要一个**公开**的 GitHub 仓库来存储博客的实际内容。

1.  创建一个 **公开** 的 GitHub 仓库，例如 `your-username/myBlogContent`。

2.  在此内容仓库中创建以下推荐的目录和文件结构：
    ```
    myBlogContent/
    ├─ figures/      # 存放文章 (posts) 中引用的图片
    ├─ Linkfigures/  # 存放导航链接 (links) 卡片上显示的图片
    ├─ posts/        # 存放 Markdown 格式的博客文章 (.md 文件)
    ├─ list.json     # 文章列表配置文件
    └─ link.json     # 网站导航链接配置文件
    ```

3.  在 `posts/` 目录中添加 Markdown 格式的文章，例如 `hello-world.md`, `tech-notes.md`。

4.  创建 `list.json` 文件，用于定义文章列表。内容格式如下：
    ```json
    [
      {
        "title": "我的第一篇文章",
        "time": "2025-05-01", // 文章发布日期
        "file": "posts/hello-world.md", // 指向文章文件的相对路径
        "image": "figures/post1_thumb.png" // (可选) 文章列表卡片右侧显示的图片路径
      },
      {
        "title": "技术笔记分享",
        "time": "2025-05-10",
        "file": "posts/tech-notes.md",
        "image": "figures/tech_cover.jpg"
      }
    ]
    ```
    *   `image` 字段是可选的，如果提供，则会在文章卡片上显示图片。路径相对于仓库根目录。

5.  创建 `link.json` 文件，用于定义网站导航链接。内容格式如下：
    ```json
    [
      {
        "title": "GuessGame AI", // 链接标题
        "link": "guessgame.001412.xyz", // 目标 URL (无需 http/https)
        "image": "Linkfigures/guessgame_card.png", // (可选) 链接卡片顶部显示的图片路径
        "description": "基于AI的猜猜看小游戏，你能猜到AI在扮演谁吗？" // (可选) 链接描述
      },
      {
        "title": "我的 GitHub",
        "link": "github.com/Komorebi-yaodong",
        // "image": "Linkfigures/github_logo.png", // 可以没有图片
        "description": "查看我的其他开源项目。"
      }
    ]
    ```
    *   `image` 和 `description` 字段都是可选的。路径相对于仓库根目录。

### 部署博客网站 (前端代码)

#### 方法一：使用 Cloudflare Pages (推荐)

1.  克隆或下载本仓库 (Komorebi Blog 前端代码) 到本地。
2.  **修改配置**:
    *   打开 `js/main.js` 和 `js/post.js` 文件。
    *   找到 `repoUrl` 变量，将其值修改为你 **内容仓库** 的 GitHub Raw 地址。格式通常是：
        ```javascript
        const repoUrl = 'https://raw.githubusercontent.com/your-username/myBlogContent/main';
        //                                          ^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^ ^^^^
        //                                          你的GitHub用户名  内容仓库名     分支名(通常是main)
        ```
3.  创建一个**新的 GitHub 仓库** (例如 `your-username/myBlogSite`) 用于托管**博客前端代码**。
4.  将本地修改后的前端代码推送到这个新仓库 (`myBlogSite`)。
5.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
6.  进入 "Workers & Pages" -> "创建应用程序" -> "Pages" -> "连接到 Git"。
7.  选择你刚刚创建并推送了前端代码的仓库 (`myBlogSite`)。
8.  设置构建配置：对于这个项目（纯静态文件），通常**不需要构建命令**，**输出目录**设置为 `/` (根目录) 或留空（如果默认即可）。
9.  点击 "保存并部署"。Cloudflare Pages 会自动部署你的网站。

#### 方法二：使用其他静态网站托管服务

你可以将修改配置后的前端代码部署到任何支持静态文件的托管服务，如 GitHub Pages (需要调整部署设置)、Vercel、Netlify 等。主要步骤是确保将代码推送到平台，并正确配置 `repoUrl` 指向你的内容仓库。

## 自定义博客

### 修改样式

- 编辑 `css/main.css` 文件可以修改网站的整体样式、布局、颜色、背景、动画等。
- 编辑 `css/markdown.css` 文件可以修改文章详情页面的 Markdown 内容渲染样式。

### 修改网站信息

- 在 `index.html` 文件中修改 `<title>` 标签、Hero 部分的主标题 (`.hero-title`)、副标题 (`.hero-subtitle`) 和页脚年份/版权信息 (`.footer`)。
- 在 `post.html` 文件中修改 `<title>` 标签、导航栏品牌 (`.navbar-brand`) 和页脚信息。

### 调整布局

- `index.html` 文件定义了 “网站导航” 和 “最新文章” 两个区块的**顺序**。
- `main.css` 通过 CSS Grid (`.posts-list`) 和 Flexbox (`.links-list` 配合 `max-height` 和 `overflow`) 控制这两个区域的布局（列数、行数限制、滚动行为）。你可以调整相关的 CSS 规则来实现不同的布局效果。

## 内容管理指南

管理博客内容非常简单，只需修改你的 **内容仓库** (`myBlogContent`) 中的文件即可。前端网站会自动拉取最新内容。

### 创建/修改文章

1.  在内容仓库的 `posts/` 目录中创建或修改 `.md` 文件。
2.  更新 `list.json` 文件：
    *   添加新文章条目或修改现有条目的 `title`, `time`, `file`。
    *   (可选) 添加或修改 `image` 字段指向 `figures/` 目录中的图片。
3.  提交更改到内容仓库。

### 添加/修改导航链接

1.  更新 `link.json` 文件：
    *   添加或修改链接条目的 `title`, `link`。
    *   (可选) 添加或修改 `description`。
    *   (可选) 添加或修改 `image` 字段指向 `Linkfigures/` 目录中的图片。
2.  提交更改到内容仓库。

### 添加图片

1.  将**文章**相关的图片上传到内容仓库的 `figures/` 目录中。
2.  将**导航链接卡片**相关的图片上传到内容仓库的 `Linkfigures/` 目录中。
3.  在文章 Markdown 文件中引用图片 (路径相对于仓库根目录，`main.js`/`post.js` 会处理)