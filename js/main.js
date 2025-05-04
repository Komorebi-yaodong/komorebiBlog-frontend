// main.js - 最终完整代码 (包含多条件排序)

document.addEventListener('DOMContentLoaded', function () {
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
        // 使用 classList.toggle 更简洁
        heroElement.classList.toggle('hero-overlay-hidden', window.scrollY > scrollThreshold);
    }
    // Initial check and event listener
    handleHeroOverlay();
    window.addEventListener('scroll', handleHeroOverlay);

    // --- 渲染文章列表的函数 (包含多条件排序) ---
    function renderPosts(posts) {
        if (!postsListElement) return;
        postsListElement.innerHTML = ''; // Clear loading indicator

        // ===> New Sorting Logic: by time descending, then by original index descending <===
        // 1. Add original index to each post object
        const postsWithIndex = posts.map((post, index) => ({ ...post, originalIndex: index }));

        // 2. Sort the new array
        postsWithIndex.sort((a, b) => {
            const dateA = new Date(a.time);
            const dateB = new Date(b.time);

            // Primary sort: by time descending
            // Handle invalid dates: invalid dates go to the end, and compare by index if both invalid
            if (isNaN(dateA) && isNaN(dateB)) {
                return b.originalIndex - a.originalIndex; // Both invalid, sort by index descending
            }
            if (isNaN(dateA)) return 1; // Only a is invalid, a comes after b
            if (isNaN(dateB)) return -1; // Only b is invalid, b comes after a

            // If dates are valid and different, sort by date descending
            const dateComparison = dateB - dateA;
            if (dateComparison !== 0) {
                return dateComparison;
            }

            // Secondary sort: if dates are the same (or same invalidity status), sort by original index descending
            return b.originalIndex - a.originalIndex;
        });
        // === End Sorting ===


        // Render each post card from the sorted array
        postsWithIndex.forEach((post, index) => {
            // ... (rest of your loop code for rendering each post card) ...
            const postElement = document.createElement('a');
            postElement.className = 'post-card';
            postElement.href = `post.html?file=${encodeURIComponent(post.file)}`;
            postElement.style.animationDelay = `${index * 0.05}s`; // Add entry animation delay

            let formattedDate = "日期未知";
            if (post.time) {
                try {
                    const date = new Date(post.time);
                    if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        formattedDate = `${year}年${month}月${day}日`;
                    }
                } catch (e) { console.error(`Post date format error for ${post.file}:`, e); }
            }

            let imageHtml = '';
            if (post.image) {
                let imageUrl = post.image;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.replace(/^\.?\//, ''); // Remove leading ./ or /
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                // Image on the right for post cards
                // Use link-card styles as base if similar layout is desired, or stick to post-card specific
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

    // --- 渲染导航链接列表的函数 ---
    function renderLinks(links) {
        if (!linksListElement) return;
        linksListElement.innerHTML = ''; // Clear loading indicator

        links.forEach((link, index) => {
            const linkElement = document.createElement('a');
            linkElement.className = 'link-card'; // Use a distinct class
            let targetUrl = link.link;
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = `https://${targetUrl}`;
            }
            linkElement.href = targetUrl;
            linkElement.target = '_blank'; // Open in a new tab
            linkElement.rel = 'noopener noreferrer'; // Security best practice
            linkElement.style.animationDelay = `${index * 0.05}s`;

            let imageHtml = '';
            if (link.image) {
                let imageUrl = link.image;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.replace(/^\.?\//, ''); // Handle ./Linkfigures/..
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                // Image container on top for link cards (grid layout)
                imageHtml = `<div class="link-card-image-container"><img src="${imageUrl}" alt="${link.title}" class="link-card-image"></div>`;
            } else {
                // Placeholder if no image
                imageHtml = `<div class="link-card-image-placeholder"></div>`;
            }

            // Use description
            const descriptionHtml = link.description ? `<p class="link-card-description">${link.description}</p>` : '';

            // Render the card structure based on CSS grid layout
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

    // --- Fetch all data using Promise.all ---
    Promise.all([
        fetch(`${repoUrl}/list.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取文章列表失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch posts failed:", err); return null; }), // Handle individual fetch errors
        fetch(`${repoUrl}/link.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取导航链接失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch links failed:", err); return null; })
    ])
        .then(([posts, links]) => {
            // Check if data was successfully fetched before attempting to render
            if (posts) {
                renderPosts(posts); // renderPosts now handles sorting
            } else {
                if (postsListElement) postsListElement.innerHTML = `<div class="error-message alert alert-warning"><p>无法加载文章列表。</p></div>`;
            }

            if (links) {
                renderLinks(links);
            } else {
                if (linksListElement) linksListElement.innerHTML = `<div class="error-message alert alert-warning"><p>无法加载导航链接。</p></div>`;
            }

            // More robust error handling if both fail
            if (!posts && !links) {
                const contentWrapper = document.querySelector('.main-content .content-wrapper');
                if (contentWrapper) {
                    contentWrapper.innerHTML = `<div class="error-message alert alert-danger"><p>未能加载任何内容。请检查网络连接和仓库配置。</p></div>`;
                }
            }
        })
        .catch(error => {
            // This catch should theoretically not be reached with .catch on individual fetches,
            // but good to have as a fallback.
            console.error('未知加载错误:', error);
            const contentWrapper = document.querySelector('.main-content .content-wrapper');
            if (contentWrapper) {
                contentWrapper.innerHTML = `<div class="error-message alert alert-danger"><p>加载内容时发生未知错误：${error.message}</p></div>`;
            }
        });


    // --- Handle Scroll Indicator Click ---
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function (e) {
            e.preventDefault();
            const mainContent = document.querySelector('.main-content');
            const targetScroll = mainContent ? mainContent.offsetTop : window.innerHeight;
            window.scrollTo({
                top: targetScroll - 60, // Adjust for navbar height
                behavior: 'smooth'
            });
        });
    }

}); // DOMContentLoaded
