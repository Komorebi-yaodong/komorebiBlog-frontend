document.addEventListener('DOMContentLoaded', function() {
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postBody = document.getElementById('post-body');
    const repoUrl = 'https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main';

    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const filePath = urlParams.get('file');

    if (!filePath) {
        postBody.innerHTML = '<div class="error-message">未指定文章文件</div>';
        return;
    }

    // 配置Marked (使用 Prism Autoloader 时，highlight 函数不需要了)
    // marked.setOptions({
    //     highlight: function(code, lang) {
    //         if (Prism.languages[lang]) {
    //             return Prism.highlight(code, Prism.languages[lang], lang);
    //         }
    //         return code;
    //     },
    //     breaks: true,
    //     gfm: true
    // });
     marked.setOptions({
        breaks: true,
        gfm: true,
        // 确保 marked 不转义 HTML，以便 Prism 的类名生效
        sanitize: false, // 注意：如果内容来源不可信，这可能带来安全风险
        smartypants: false,
        xhtml: false
    });


    // 获取文章内容
    fetch(`${repoUrl}/${filePath}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`无法获取文章内容 (状态: ${response.status})`);
            }
            return response.text();
        })
        .then(markdown => {
            // 提取标题（如果文章内以 # 开头） - 可选，因为我们从 list.json 获取
            // let fileTitle = '';
            // const titleMatch = markdown.match(/^# (.+)$/m);
            // if (titleMatch) {
            //     fileTitle = titleMatch[1];
            //     markdown = markdown.replace(/^# .+$/m, '').trim(); // 移除标题行并去除首尾空格
            // }

            // 获取文章元信息 (从 list.json)
            return fetch(`${repoUrl}/list.json`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`无法获取文章列表 (list.json) (状态: ${response.status})`);
                    }
                    return response.json();
                 })
                .then(posts => {
                    const post = posts.find(p => p.file === filePath);

                    if (post) {
                        // 设置页面标题、文章标题和日期
                        document.title = `${post.title} - Komorebi's Blog`;
                        postTitle.textContent = post.title;
                        postDate.textContent = formatDate(post.time);

                        // 渲染Markdown
                        let html = marked.parse(markdown);

                        // 替换图片路径 (确保图片能正确加载)
                        html = html.replace(/src="((?!(http|https):\/\/)[^"]+)"/g, (match, src) => {
                            let absoluteSrc = src;
                            // 简单的路径处理逻辑，可能需要根据你的图片存储方式调整
                            if (absoluteSrc.startsWith('../')) {
                                // 假设 '../' 是相对于 md 文件所在的目录
                                // 需要知道 md 文件相对于 repo 根目录的路径
                                const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
                                const parentDir = fileDir.substring(0, fileDir.lastIndexOf('/'));
                                absoluteSrc = `${repoUrl}/${parentDir}/${absoluteSrc.substring(3)}`;
                            } else if (absoluteSrc.startsWith('./')) {
                                const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
                                absoluteSrc = `${repoUrl}/${fileDir}/${absoluteSrc.substring(2)}`;
                            } else if (!absoluteSrc.startsWith('/')) {
                                // 假设是相对于 repo 根目录的路径，或者特定文件夹如 figures
                                 if (absoluteSrc.includes('/')) { // 假设已经是类似 "figures/image.png"
                                     absoluteSrc = `${repoUrl}/${absoluteSrc}`;
                                 } else { // 假设都放在 figures 文件夹下
                                     absoluteSrc = `${repoUrl}/figures/${absoluteSrc}`;
                                 }
                            } else {
                                // 如果是 / 开头，也认为是相对于 repo 根目录
                                absoluteSrc = `${repoUrl}${absoluteSrc}`;
                            }
                            console.log(`Rewriting image src: ${src} -> ${absoluteSrc}`);
                            return `src="${absoluteSrc}"`;
                        });


                        postBody.innerHTML = html;

                        // 使用 Prism Autoloader 进行代码高亮
                        Prism.highlightAllUnder(postBody);

                    } else {
                        throw new Error('在 list.json 中找不到对应的文章信息');
                    }
                });
        })
        .catch(error => {
            console.error('获取或处理文章失败:', error);
            postBody.innerHTML = `
                <div class="error-message alert alert-danger">
                    <h4>获取文章失败</h4>
                    <p>无法加载文章内容。</p>
                    <p>错误信息: ${error.message}</p>
                    <p>文件路径: ${filePath || '未提供'}</p>
                    <p>请检查文件路径是否正确，或稍后重试。</p>
                </div>
            `;
            // 同时设置标题为错误状态
            postTitle.textContent = "加载错误";
            postDate.textContent = "";
            document.title = "错误 - Komorebi's Blog";
        });

    // 格式化日期
    function formatDate(dateString) {
         try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}年${month}月${day}日`;
        } catch (e) {
            console.error("日期格式化错误:", dateString, e);
            return "日期无效";
        }
    }
});
