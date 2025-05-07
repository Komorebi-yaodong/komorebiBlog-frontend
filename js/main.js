document.addEventListener('DOMContentLoaded', function () {
    const postsListElement = document.getElementById('posts-list');
    const linksListElement = document.getElementById('links-list');
    const postsTagsListElement = document.getElementById('posts-tags-list');
    const linksTagsListElement = document.getElementById('links-tags-list');
    const heroElement = document.querySelector('.hero');

    const repoUrl = 'https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main';
    const scrollThreshold = 50;

    let originalPostsData = [];
    let originalLinksData = [];
    let allPostTags = new Set();
    let allLinkTags = new Set();
    let currentPostsFilterTag = null;
    let currentLinksFilterTag = null;

    function handleHeroOverlay() {
        if (!heroElement) return;
        heroElement.classList.toggle('hero-overlay-hidden', window.scrollY > scrollThreshold);
    }
    handleHeroOverlay();
    window.addEventListener('scroll', handleHeroOverlay);

    function displayPosts(postsToRender) {
        if (!postsListElement) return;
        postsListElement.innerHTML = '';

        if (postsToRender.length === 0) {
            postsListElement.innerHTML = `<div class="col-12 text-center p-5"><p class="text-muted">没有找到匹配 "${currentPostsFilterTag || ''}" 标签的文章。</p></div>`;
            return;
        }

        postsToRender.forEach((post, index) => {
            const postElement = document.createElement('a');
            postElement.className = 'post-card';
            postElement.href = `post.html?file=${encodeURIComponent(post.file)}`;
            postElement.style.animationDelay = `${index * 0.05}s`;

            let formattedDate = "日期未知";
            if (post.time) {
                try {
                    const date = new Date(post.time);
                    if (!isNaN(date.getTime())) {
                        formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
                    }
                } catch (e) { console.error(`Post date format error for ${post.file}:`, e); }
            }

            let imageHtml = '';
            if (post.image) {
                let imageUrl = post.image;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.replace(/^\.?\//, '');
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                imageHtml = `<div class="post-card-image-container"><img src="${imageUrl}" alt="${post.title}" class="post-card-image"></div>`;
            }
            
            const tagsHtml = post.tag && post.tag.length > 0 
                ? `<div class="card-tags">${post.tag.map(t => `<span class="tag-badge">${t}</span>`).join(' ')}</div>` 
                : '';

            postElement.innerHTML = `
                 <div class="post-card-content">
                     <div>
                        <h3 class="post-card-title">${post.title}</h3>
                        <div class="post-card-meta">
                            <span class="post-card-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                        </div>
                     </div>
                     ${tagsHtml}
                 </div>
                 ${imageHtml}`;
            postsListElement.appendChild(postElement);
        });
    }

    function displayLinks(linksToRender) {
        if (!linksListElement) return;
        linksListElement.innerHTML = '';

        if (linksToRender.length === 0) {
            linksListElement.innerHTML = `<div class="col-12 text-center p-5"><p class="text-muted">没有找到匹配 "${currentLinksFilterTag || ''}" 标签的导航。</p></div>`;
            return;
        }

        linksToRender.forEach((link, index) => {
            const linkElement = document.createElement('a');
            linkElement.className = 'link-card';
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
                    imageUrl = imageUrl.replace(/^\.?\//, '');
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                imageHtml = `<div class="link-card-image-container"><img src="${imageUrl}" alt="${link.title}" class="link-card-image"></div>`;
            } else {
                imageHtml = `<div class="link-card-image-placeholder"></div>`;
            }

            const descriptionHtml = link.description ? `<p class="link-card-description">${link.description}</p>` : '<p class="link-card-description" style="height: 4.5em;"></p>';
            
            const tagsHtml = link.tag && link.tag.length > 0 
                ? `<div class="card-tags">${link.tag.map(t => `<span class="tag-badge">${t}</span>`).join(' ')}</div>` 
                : '';

            linkElement.innerHTML = `
                ${imageHtml}
                <div class="link-card-content">
                    <div>
                        <h4 class="link-card-title">${link.title}</h4>
                        ${descriptionHtml}
                    </div>
                    <div>
                        ${tagsHtml}
                        <div class="link-card-meta">
                            <span class="link-card-url">${link.link}</span>
                        </div>
                    </div>
                </div>`;
            linksListElement.appendChild(linkElement);
        });
    }

    function extractAllTags() {
        allPostTags.clear();
        allLinkTags.clear();
        originalPostsData.forEach(post => {
            if (post.tag && Array.isArray(post.tag)) {
                post.tag.forEach(t => allPostTags.add(t));
            }
        });
        originalLinksData.forEach(link => {
            if (link.tag && Array.isArray(link.tag)) {
                link.tag.forEach(t => allLinkTags.add(t));
            }
        });
    }

    function renderTagSidebar(type, tagsSet, clickHandler, listElement, currentFilter) {
        if (!listElement) return;
        listElement.innerHTML = '';

        const createTagItem = (tag, label) => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = label;
            button.dataset.tag = tag;
            if ((currentFilter === null && tag === 'all') || currentFilter === tag) {
                li.classList.add('active');
            }
            button.addEventListener('click', () => clickHandler(tag));
            li.appendChild(button);
            return li;
        };
        
        listElement.appendChild(createTagItem('all', '全部标签'));

        const sortedTags = Array.from(tagsSet).sort();
        sortedTags.forEach(tag => {
            listElement.appendChild(createTagItem(tag, tag));
        });
        
        if (tagsSet.size === 0) {
            listElement.innerHTML = '<li class="text-muted small">暂无可用标签。</li>';
        }
    }

    function handlePostTagClick(tag) {
        currentPostsFilterTag = (tag === 'all' ? null : tag);
        const postsToDisplay = currentPostsFilterTag 
            ? originalPostsData.filter(p => p.tag && p.tag.includes(currentPostsFilterTag)) 
            : originalPostsData;
        displayPosts(postsToDisplay);
        renderTagSidebar('posts', allPostTags, handlePostTagClick, postsTagsListElement, currentPostsFilterTag);
    }

    function handleLinkTagClick(tag) {
        currentLinksFilterTag = (tag === 'all' ? null : tag);
        const linksToDisplay = currentLinksFilterTag 
            ? originalLinksData.filter(l => l.tag && l.tag.includes(currentLinksFilterTag)) 
            : originalLinksData;
        displayLinks(linksToDisplay);
        renderTagSidebar('links', allLinkTags, handleLinkTagClick, linksTagsListElement, currentLinksFilterTag);
    }
    
    function sortPosts(posts) {
         const postsWithIndex = posts.map((post, index) => ({ ...post, originalIndex: index }));
        postsWithIndex.sort((a, b) => {
            const dateA = new Date(a.time);
            const dateB = new Date(b.time);
            if (isNaN(dateA) && isNaN(dateB)) return b.originalIndex - a.originalIndex;
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;
            const dateComparison = dateB - dateA;
            if (dateComparison !== 0) return dateComparison;
            return b.originalIndex - a.originalIndex;
        });
        return postsWithIndex;
    }

    Promise.all([
        fetch(`${repoUrl}/list.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取文章列表失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch posts failed:", err); return null; }),
        fetch(`${repoUrl}/link.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取导航链接失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch links failed:", err); return null; })
    ])
    .then(([posts, links]) => {
        if (posts) {
            originalPostsData = sortPosts(posts);
        } else {
            if (postsListElement) postsListElement.innerHTML = `<div class="error-message alert alert-warning col-12"><p>无法加载文章列表。</p></div>`;
        }

        if (links) {
            originalLinksData = links;
        } else {
            if (linksListElement) linksListElement.innerHTML = `<div class="error-message alert alert-warning col-12"><p>无法加载导航链接。</p></div>`;
        }
        
        extractAllTags();

        displayPosts(originalPostsData);
        renderTagSidebar('posts', allPostTags, handlePostTagClick, postsTagsListElement, currentPostsFilterTag);

        displayLinks(originalLinksData);
        renderTagSidebar('links', allLinkTags, handleLinkTagClick, linksTagsListElement, currentLinksFilterTag);

        if (!posts && !links) {
            const contentWrapper = document.querySelector('.main-content .content-wrapper');
            if (contentWrapper) {
                contentWrapper.innerHTML = `<div class="error-message alert alert-danger"><p>未能加载任何内容。请检查网络连接和仓库配置。</p></div>`;
            }
        }
    })
    .catch(error => {
        console.error('未知加载错误:', error);
        const contentWrapper = document.querySelector('.main-content .content-wrapper');
        if (contentWrapper) {
            contentWrapper.innerHTML = `<div class="error-message alert alert-danger"><p>加载内容时发生未知错误：${error.message}</p></div>`;
        }
    });

    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function (e) {
            e.preventDefault();
            const mainContent = document.querySelector('.main-content');
            const targetScroll = mainContent ? mainContent.offsetTop : window.innerHeight;
            window.scrollTo({
                top: targetScroll - 60,
                behavior: 'smooth'
            });
        });
    }
});
