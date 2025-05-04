// post.js - 最终完整代码

document.addEventListener('DOMContentLoaded', function () {
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postBody = document.getElementById('post-body');
    const repoUrl = 'https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main';

    // Get URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const filePath = urlParams.get('file');

    if (!filePath) {
        handleLoadingError(new Error("未指定文章文件路径。"), null);
        return;
    }

    // === Define Marked Extension for ==highlight== ===
    const highlightExtension = {
        name: 'highlight',
        level: 'inline',
        start(src) { return src.indexOf('=='); },
        tokenizer(src, tokens) {
            const rule = /^==((?:(?!==).)+?)==/;
            const match = rule.exec(src);
            if (match) {
                if (match[1].trim() === '') {
                    return { type: 'text', raw: match[0], text: match[0] };
                }
                return {
                    type: 'highlight',
                    raw: match[0],
                    text: match[1].trim(),
                    tokens: this.lexer.inlineTokens(match[1].trim())
                };
            }
        },
        renderer(token) {
            return `<mark>${this.parser.parseInline(token.tokens)}</mark>`;
        }
    };
    // === End Marked Extension ===

    // === Configure Marked ===
    marked.use({ extensions: [highlightExtension] });
    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false, // Necessary for KaTeX, Prism, <mark> etc.
        smartypants: false,
        xhtml: false
    });
    // === End Marked Configuration ===


    // Fetch post content and metadata simultaneously
    Promise.all([
        fetch(`${repoUrl}/${filePath}`).then(res => {
            if (!res.ok) throw new Error(`无法获取文章内容 (状态: ${res.status})`);
            return res.text();
        }).catch(err => { console.error("Fetch post content failed:", err); return null; }),
        fetch(`${repoUrl}/list.json`).then(res => {
            if (!res.ok) throw new Error(`无法获取文章列表 (list.json) (状态: ${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch list.json failed:", err); return null; })
    ])
        .then(([markdown, posts]) => {
            if (!markdown) {
                throw new Error("无法获取文章内容文件。");
            }

            const post = posts ? posts.find(p => p.file === filePath) : null;

            if (!post) {
                console.warn(`在 list.json 中未找到文章信息 (${filePath})，部分元数据可能缺失。`);
                // Render using filename if no metadata found
                document.title = `${filePath.split('/').pop().replace(/\.md$/, '')} - Komorebi's Blog`;
                postTitle.textContent = filePath.split('/').pop().replace(/\.md$/, '') || "无标题";
                postDate.textContent = "日期未知"; // Set default if metadata missing
            } else {
                // Use metadata from list.json if available
                document.title = `${post.title} - Komorebi's Blog`;
                postTitle.textContent = post.title;
                postDate.textContent = post.time ? formatDate(post.time) : "日期未知";
            }


            // Parse and process the markdown
            let html = marked.parse(markdown);
            html = replaceImagePaths(html, filePath); // Fix image paths

            // === Set Content & Run Post-processing in ORDER ===
            postBody.innerHTML = html;

            // Render Math Formulas (KaTeX)
            try {
                if (window.renderMathInElement) {
                    renderMathInElement(postBody, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\]', display: true }
                        ],
                        throwOnError: false
                    });
                }
            } catch (error) {
                console.error("Error rendering KaTeX:", error);
            }

            // Highlight Code Blocks (Prism)
            Prism.highlightAllUnder(postBody);

            // Add Copy Buttons to Code Blocks
            addCopyButtons(postBody);

            // Scroll to top of content if hash is present (e.g., from click)
            // This might interfere with smooth scroll, test if needed
            // if (window.location.hash) {
            //     const targetElement = document.querySelector(window.location.hash);
            //     if (targetElement) {
            //         targetElement.scrollIntoView({ behavior: 'smooth' });
            //     }
            // }

        })
        .catch(error => {
            console.error('处理文章失败:', error);
            // General error if initial fetches failed or subsequent processing failed
            handleLoadingError(error, filePath);
        });

    // --- Helper Functions ---

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error("无效日期字符串");
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}年${month}月${day}日`;
        } catch (e) {
            console.warn("日期格式化错误:", dateString, e);
            return "日期未知";
        }
    }

    function replaceImagePaths(html, postFilePath) {
        const baseDir = postFilePath.substring(0, postFilePath.lastIndexOf('/'));
        return html.replace(/src="((?!(http|https):\/\/)[^"]+)"/g, (match, src) => {
            let absoluteSrc = src;
            // Simple path handling: assume relative to the .md file's directory or repo root/figures
            if (absoluteSrc.startsWith('./')) {
                absoluteSrc = `${repoUrl}/${baseDir}/${absoluteSrc.substring(2)}`;
            } else if (absoluteSrc.startsWith('../')) {
                const parentDir = baseDir.substring(0, baseDir.lastIndexOf('/'));
                absoluteSrc = `${repoUrl}/${parentDir}/${absoluteSrc.substring(3)}`;
            } else if (!absoluteSrc.startsWith('/')) {
                if (absoluteSrc.includes('/')) { // Maybe 'figures/img.png'
                    absoluteSrc = `${repoUrl}/${absoluteSrc}`;
                } else { // Maybe just 'img.png', assume in figures
                    absoluteSrc = `${repoUrl}/figures/${absoluteSrc}`;
                }
            } else { // Starts with '/', treat as repo root
                absoluteSrc = `${repoUrl}${absoluteSrc}`;
            }
            // console.log(`Rewriting image src: ${src} -> ${absoluteSrc}`);
            return `src="${absoluteSrc}"`;
        });
    }

    function handleLoadingError(error, filePath) {
        postBody.innerHTML = `
                <div class="error-message alert alert-danger">
                    <h4>加载失败</h4>
                    <p>无法加载文章内容。</p>
                    <p>错误信息: ${error.message || '未知错误'}</p>
                    ${filePath ? `<p>尝试加载的文件: ${filePath}</p>` : ''}
                    <p>请检查网络连接或文件路径是否正确。</p>
                </div>
            `;
        postTitle.textContent = "加载错误";
        postDate.textContent = "";
        document.title = "错误 - Komorebi's Blog";
    }

    // Function to Add Copy Buttons
    function addCopyButtons(container) {
        const preBlocks = container.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            if (pre.querySelector('.copy-code-button')) return; // Prevent duplicates
            const codeBlock = pre.querySelector('code');
            if (!codeBlock) return;

            const button = document.createElement('button');
            button.className = 'copy-code-button';
            button.innerHTML = '<i class="far fa-copy"></i>';
            button.setAttribute('aria-label', '复制代码');
            button.title = '复制代码';

            button.addEventListener('click', () => {
                const codeToCopy = codeBlock.textContent || "";
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    button.innerHTML = '<i class="fas fa-check"></i>';
                    button.setAttribute('aria-label', '已复制');
                    button.title = '已复制!';
                    // button.disabled = true; // Optional: Disable briefly
                    setTimeout(() => {
                        button.innerHTML = '<i class="far fa-copy"></i>';
                        button.setAttribute('aria-label', '复制代码');
                        button.title = '复制代码';
                        // button.disabled = false; // Optional
                    }, 2000);
                }).catch(err => {
                    console.error('复制代码失败:', err);
                    button.innerHTML = '<i class="fas fa-times"></i>';
                    button.title = '复制失败';
                    setTimeout(() => {
                        button.innerHTML = '<i class="far fa-copy"></i>';
                        button.title = '复制代码';
                    }, 2000);
                });
            });
            pre.appendChild(button); // Append inside pre
        });
    }
    // End Copy Button Function

}); // End DOMContentLoaded
