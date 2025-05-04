document.addEventListener('DOMContentLoaded', function() {
    // 获取页面元素
    const postsListElement = document.getElementById('posts-list');
    const linksListElement = document.getElementById('links-list');
    const heroElement = document.querySelector('.hero');

    // 配置
    const repoUrl = 'https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main';
    const scrollThreshold = 50;

    // --- 处理头图遮罩显隐 ---
    function handleHeroOverlay() {
        if (!heroElement) return;
        heroElement.classList.toggle('hero-overlay-hidden', window.scrollY > scrollThreshold);
    }
    handleHeroOverlay();
    window.addEventListener('scroll', handleHeroOverlay);

    // --- 渲染文章列表的函数 ---
    function renderPosts(posts) {
        if (!postsListElement) return;
        postsListElement.innerHTML = '';
        posts.sort((a, b) => new Date(b.time) - new Date(a.time));

        posts.forEach((post, index) => {
            const postElement = document.createElement('a');
            postElement.className = 'post-card';
            postElement.href = `post.html?file=${encodeURIComponent(post.file)}`;
            postElement.style.animationDelay = `${index * 0.05}s`;

            // --- 日期格式化现在只在这里需要 ---
            let formattedDate = "日期未知";
            try {
                const date = new Date(post.time);
                if (!isNaN(date.getTime())) {
                     const year = date.getFullYear();
                     const month = String(date.getMonth() + 1).padStart(2, '0');
                     const day = String(date.getDate()).padStart(2, '0');
                     formattedDate = `${year}年${month}月${day}日`;
                }
            } catch(e) { console.error("Post date error:", e); }
            // --- 日期格式化结束 ---

            let imageHtml = '';
            if (post.image) {
                let imageUrl = post.image;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.replace(/^\.?\//, '');
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                imageHtml = `<div class="post-card-image-container"><img src="${imageUrl}" alt="${post.title}" class="post-card-image"></div>`;
            }
            postElement.innerHTML = `
                <div class="post-card-content">
                    <h3 class="post-card-title">${post.title}</h3>
                    <div class="post-card-meta">
                        <span class="post-card-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                    </div>
                </div>
                ${imageHtml}`;
            postsListElement.appendChild(postElement);
        });
    }

    // --- 渲染导航链接列表的函数 (更新版) ---
    function renderLinks(links) {
        if (!linksListElement) return;
        linksListElement.innerHTML = '';

        links.forEach((link, index) => {
            const linkElement = document.createElement('a');
            linkElement.className = 'link-card'; // 卡片样式
            let targetUrl = link.link;
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = `https://${targetUrl}`;
            }
            linkElement.href = targetUrl;
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.style.animationDelay = `${index * 0.05}s`;

            let imageHtml = '';
            if (link.image) {
                let imageUrl = link.image;
                if (!imageUrl.startsWith('http')) {
                     imageUrl = imageUrl.replace(/^\.?\//, ''); // 处理 ./Linkfigures/.. 路径
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                imageHtml = `<div class="link-card-image-container"><img src="${imageUrl}" alt="${link.title}" class="link-card-image"></div>`;
            } else {
                imageHtml = `<div class="link-card-image-placeholder"></div>`;
            }

            // --- 使用 description, 移除 date ---
            const descriptionHtml = link.description ? `<p class="link-card-description">${link.description}</p>` : '';

            linkElement.innerHTML = `
                ${imageHtml}
                <div class="link-card-content">
                    <h4 class="link-card-title">${link.title}</h4>
                    ${descriptionHtml}
                    <div class="link-card-meta">
                         <span class="link-card-url">${link.link}</span>
                    </div>
                </div>`;
            linksListElement.appendChild(linkElement);
        });
    }

    // --- 使用 Promise.all 获取所有数据 (保持不变) ---
    Promise.all([
        fetch(`${repoUrl}/list.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取文章列表失败 (${res.status})`);
            return res.json();
        }),
        fetch(`${repoUrl}/link.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取导航链接失败 (${res.status})`);
            return res.json();
        })
    ])
    .then(([posts, links]) => {
        renderPosts(posts);
        renderLinks(links);
    })
    .catch(error => {
        console.error('加载内容失败:', error);
         // 更具体的错误提示
         if (postsListElement) postsListElement.innerHTML = `<div class="error-message alert alert-warning"><p>加载文章列表出错: ${error.message.includes('文章列表') ? error.message : ''}</p></div>`;
         if (linksListElement) linksListElement.innerHTML = `<div class="error-message alert alert-warning"><p>加载导航链接出错: ${error.message.includes('导航链接') ? error.message : ''}</p></div>`;
    });

    // --- 处理向下滚动指示器的点击事件 (保持不变) ---
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function(e) {
            e.preventDefault();
            const mainContent = document.querySelector('.main-content');
            const targetScroll = mainContent ? mainContent.offsetTop : window.innerHeight;
            window.scrollTo({
                top: targetScroll - 60,
                behavior: 'smooth'
            });
        });
    }

}); // DOMContentLoaded
