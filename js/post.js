// post.js - Complete Code
document.addEventListener('DOMContentLoaded', function() {
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postBody = document.getElementById('post-body');
    const repoUrl = 'https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main';

    const urlParams = new URLSearchParams(window.location.search);
    const filePath = urlParams.get('file');

    if (!filePath) {
        postBody.innerHTML = '<div class="error-message">未指定文章文件</div>';
        return;
    }

    // === Define Marked Extension for ==highlight== ===
    const highlightExtension = {
        name: 'highlight',
        level: 'inline', // Type of extension
        start(src) { return src.indexOf('=='); }, // Find the first '=='
        tokenizer(src, tokens) {
            const rule = /^==((?:(?!==).)+?)==/; // Regex: == non-greedy content ==
            const match = rule.exec(src);
            if (match) {
                // Check if the content inside is just whitespace, ignore if so
                if (match[1].trim() === '') {
                    return {
                        type: 'text', // Treat as plain text if only whitespace inside
                        raw: match[0],
                        text: match[0] // Render the raw == ==
                    };
                }
                // Create a 'highlight' token
                return {
                    type: 'highlight', // Name of the token
                    raw: match[0], // The full matched text "==...=="
                    text: match[1].trim(), // The content inside, trimmed
                     // Tokenize the content inside the highlight tags
                    tokens: this.lexer.inlineTokens(match[1].trim())
                };
            }
        },
        renderer(token) {
           // Render the content using the parser to handle nested inline tokens
           return `<mark>${this.parser.parseInline(token.tokens)}</mark>`;
        }
    };
    // === End Marked Extension ===


    // === Configure Marked ===
    marked.use({ extensions: [highlightExtension] }); // Use the custom extension

    marked.setOptions({
        breaks: true, // Convert '\n' in paragraphs into <br>
        gfm: true,    // Use GitHub Flavored Markdown
        sanitize: false, // IMPORTANT: Allows HTML, necessary for KaTeX, Prism classes, and <mark>
        smartypants: false, // Don't auto-change quotes, dashes, etc.
        xhtml: false      // Don't self-close tags like <br />
    });
    // === End Marked Configuration ===


    // Fetch post content and metadata
    fetch(`${repoUrl}/${filePath}`)
        .then(response => {
            if (!response.ok) throw new Error(`无法获取文章内容 (状态: ${response.status})`);
            return response.text();
        })
        .then(markdown => {
            return fetch(`${repoUrl}/list.json`) // Fetch metadata simultaneously
                .then(response => {
                    if (!response.ok) throw new Error(`无法获取文章列表 (list.json) (状态: ${response.status})`);
                    return response.json();
                })
                .then(posts => {
                    const post = posts.find(p => p.file === filePath);
                    if (!post) throw new Error('在 list.json 中找不到对应的文章信息');

                    // Set page title, post title, and date
                    document.title = `${post.title} - Komorebi's Blog`;
                    postTitle.textContent = post.title;
                    postDate.textContent = formatDate(post.time); // Assuming post object still HAS time

                    // === Process Markdown and Render ===
                    // 1. Parse Markdown (Marked runs the extension)
                    let html = marked.parse(markdown);
                    // 2. Fix image paths
                    html = replaceImagePaths(html, filePath);
                    // 3. Set the HTML content
                    postBody.innerHTML = html;

                    // === Run post-processing in ORDER ===
                    // 4. Render Math Formulas
                    try {
                         if (window.renderMathInElement) {
                             renderMathInElement(postBody, {
                                delimiters: [
                                    {left: '$$', right: '$$', display: true},
                                    {left: '$', right: '$', display: false},
                                    {left: '\\(', right: '\\)', display: false},
                                    {left: '\\[', right: '\\]', display: true}
                                ],
                                throwOnError : false
                            });
                            // console.log("KaTeX auto-render executed.");
                         } else {
                             console.warn("KaTeX auto-render function not found.");
                         }
                    } catch (error) {
                        console.error("Error rendering KaTeX:", error);
                    }

                    // 5. Highlight Code Blocks
                    Prism.highlightAllUnder(postBody);
                    // console.log("Prism highlighting executed.");

                    // 6. Add Copy Buttons to Code Blocks
                    addCopyButtons(postBody);
                    // console.log("Copy buttons added.");
                    // === End Post-processing ===
                });
        })
        .catch(error => {
            console.error('获取或处理文章失败:', error);
             handleLoadingError(error, filePath);
        });

    // --- Helper Functions --- (Keep formatDate, replaceImagePaths, handleLoadingError)

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error("无效日期字符串");
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}年${month}月${day}日`;
        } catch (e) {
            console.error("日期格式化错误:", dateString, e);
            return "日期未知";
        }
    }

    function replaceImagePaths(html, postFilePath) {
       // ... (Keep the existing replaceImagePaths function) ...
        const baseDir = postFilePath.substring(0, postFilePath.lastIndexOf('/'));
        return html.replace(/src="((?!(http|https):\/\/)[^"]+)"/g, (match, src) => {
            let absoluteSrc = src;
            if (absoluteSrc.startsWith('./')) {
                 absoluteSrc = `${repoUrl}/${baseDir}/${absoluteSrc.substring(2)}`;
            } else if (absoluteSrc.startsWith('../')) {
                const parentDir = baseDir.substring(0, baseDir.lastIndexOf('/'));
                absoluteSrc = `${repoUrl}/${parentDir}/${absoluteSrc.substring(3)}`;
            } else if (!absoluteSrc.startsWith('/')) {
                 if (absoluteSrc.includes('/')) {
                      absoluteSrc = `${repoUrl}/${absoluteSrc}`;
                 } else {
                      absoluteSrc = `${repoUrl}/figures/${absoluteSrc}`;
                 }
            } else {
                 absoluteSrc = `${repoUrl}${absoluteSrc}`;
            }
            return `src="${absoluteSrc}"`;
        });
    }

    function handleLoadingError(error, filePath) {
        // ... (Keep the existing handleLoadingError function) ...
         postBody.innerHTML = `
                <div class="error-message alert alert-danger">
                    <h4>获取文章失败</h4>
                    <p>无法加载文章 "${filePath || '未知文件'}" 的内容。</p>
                    <p>错误信息: ${error.message}</p>
                    <p>请检查文件路径是否正确，或稍后重试。</p>
                </div>
            `;
        postTitle.textContent = "加载错误";
        postDate.textContent = ""; // Clear date as well
        document.title = "错误 - Komorebi's Blog";
    }

    // Function to Add Copy Buttons (Keep as is)
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
                    button.disabled = true;
                    setTimeout(() => {
                        button.innerHTML = '<i class="far fa-copy"></i>';
                        button.setAttribute('aria-label', '复制代码');
                         button.title = '复制代码';
                        button.disabled = false;
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
            // Append inside pre might cause issues with Prism if pre has padding.
            // Consider appending to a wrapper around pre if styling becomes tricky.
            pre.appendChild(button);
        });
    }
    // End Copy Button Function

}); // End DOMContentLoaded
