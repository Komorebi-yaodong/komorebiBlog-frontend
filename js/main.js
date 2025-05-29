document.addEventListener('DOMContentLoaded', function () {
    const postsListElement = document.getElementById('posts-list');
    const linksListElement = document.getElementById('links-list');
    const albumsListContentElement = document.getElementById('albums-list-content'); // Added
    const postsTagsListElement = document.getElementById('posts-tags-list');
    const linksTagsListElement = document.getElementById('links-tags-list');
    const postsAuthorsContainer = document.getElementById('posts-authors-sidebar');
    const linksAuthorsContainer = document.getElementById('links-authors-sidebar');
    const albumsAuthorsContainer = document.getElementById('albums-authors-sidebar'); // Added
    const heroElement = document.querySelector('.hero');

    // 默认使用：https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main
    // 部署了pages之后：https://komorebi-yaodong.github.io/komorebiBlog
    // 反代：https://mypages.001412.xyz/komorebiBlog
    const repoUrl = 'https://komorebi-yaodong.github.io/komorebiBlog';
    const scrollThreshold = 50;

    let originalPostsData = [];
    let originalLinksData = [];
    let originalAlbumsData = []; // Added
    let authorsData = [];
    let allPostTags = new Set();
    let allLinkTags = new Set();
    let currentPostsFilterTag = null;
    let currentLinksFilterTag = null;

    // Tab activation from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const initialTabId = urlParams.get('initial_tab');
    if (initialTabId) {
        const tabElementButton = document.getElementById(initialTabId); // e.g. albums-tab
        if (tabElementButton) {
            // Ensure the target pane ID is correct for Bootstrap 5
            // The button's data-bs-target should be used, or derive it.
            // Example: if initialTabId is "albums-tab", target is "#albums-tab-pane"
            const tabTrigger = new bootstrap.Tab(tabElementButton);
            tabTrigger.show();

            // Optional: Scroll to tabs if they are below the fold after hero
            // const tabsContainer = document.getElementById('contentTabs');
            // if (tabsContainer) {
            //    tabsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // }
        }
        // Clean the URL parameter (optional, good for UX)
        const newUrl = window.location.pathname + window.location.hash; // Keep hash if any
        window.history.replaceState({}, document.title, newUrl);
    }


    function handleHeroOverlay() {
        if (!heroElement) return;
        heroElement.classList.toggle('hero-overlay-hidden', window.scrollY > scrollThreshold);
    }
    if (heroElement) {
        handleHeroOverlay();
        window.addEventListener('scroll', handleHeroOverlay);
    }

    function displayAuthors(authorsArray, containerElement) {
        if (!containerElement) return;
        containerElement.innerHTML = ''; 
        if (!authorsArray || authorsArray.length === 0) {
            containerElement.innerHTML = '<p class="text-muted small p-3 text-center">未能加载作者信息。</p>';
            return;
        }
        
        const authorsTitle = document.createElement('h5');
        authorsTitle.className = 'sidebar-section-title';
        authorsTitle.textContent = '关于作者';
        containerElement.appendChild(authorsTitle);
        authorsArray.forEach(author => {
            const authorCard = document.createElement('div');
            authorCard.className = 'author-card-item p-2 mb-3 d-flex flex-column align-items-center'; 
            let avatarHtml = '';
            if (author.avatar) {
                let avatarUrl = author.avatar;
                if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
                     avatarUrl = `${repoUrl}/${avatarUrl.replace(/^\.?\//, '')}`;
                }
                avatarHtml = `<img src="${avatarUrl}" alt="${author.name}" class="author-avatar img-fluid rounded-circle mb-2">`;
            }
            let nameHtml = `<h6 class="author-name mb-1 text-center">${author.name}</h6>`;
            
            let descriptionHtml = author.description ? `<p class="author-description small text-muted mb-2 text-center">${author.description}</p>` : '';
            let linksHtml = '<div class="author-contact-links mt-auto text-center">'; 
            if (author.link) {
                for (const [key, value] of Object.entries(author.link)) {
                    let iconClass = '';
                    if (key.toLowerCase() === 'email') iconClass = 'fas fa-envelope';
                    else if (key.toLowerCase() === 'github') iconClass = 'fab fa-github';
                    else if (value.includes('twitter.com')) iconClass = 'fab fa-twitter';
                    else if (value.includes('linkedin.com')) iconClass = 'fab fa-linkedin';
                    else iconClass = 'fas fa-link';
                    linksHtml += `<a href="${key.toLowerCase() === 'email' ? 'mailto:' + value : value}" target="_blank" rel="noopener noreferrer" class="mx-1" title="${key}"><i class="${iconClass}"></i></a>`;
                }
            }
            linksHtml += '</div>';
            
            authorCard.innerHTML = `
                ${avatarHtml}
                ${nameHtml}
                ${descriptionHtml}
                ${linksHtml}
            `;
            containerElement.appendChild(authorCard);
        });
    }


    function displayPosts(postsToRender) {
        if (!postsListElement) return;
        postsListElement.innerHTML = '';
        postsListElement.className = 'posts-list post-cards-grid';
        if (postsToRender.length === 0) {
            postsListElement.innerHTML = `<div class="col-12 text-center p-5"><p class="text-muted lead">没有找到匹配 "${currentPostsFilterTag || '任何'}" 标签的文章。</p></div>`;
            return;
        }
        postsToRender.forEach((post, index) => {
            const postElementWrapper = document.createElement('div');
            postElementWrapper.className = 'post-card-wrapper';
            const postElement = document.createElement('a');
            postElement.className = 'post-card-vertical';
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
            let imageAreaHtml = '';
            if (post.image) {
                let imageUrl = post.image;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.replace(/^\.?\//, '');
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                imageAreaHtml = `<div class="post-card-image-top-container"><img src="${imageUrl}" alt="${post.title}" class="post-card-image-top"></div>`;
            } else {
                imageAreaHtml = `<div class="post-card-image-top-placeholder artistic-title-background">
                                    <h3 class="artistic-title-placeholder-text">${post.title}</h3>
                                 </div>`;
            }
            
            const tagsHtml = post.tag && post.tag.length > 0 
                ? `<div class="card-tags mt-auto pt-2">${post.tag.map(t => `<span class="tag-badge">${t}</span>`).join(' ')}</div>` 
                : '<div class="card-tags mt-auto pt-2" style="height: 28px;"></div>'; 
            let descriptionHtml = '';
            if (post.description) {
                descriptionHtml = `<p class="post-card-description-vertical small">${post.description}</p>`;
            }
            const contentAreaHtml = `
             <div class="post-card-content-vertical">
                 <h5 class="post-card-title-vertical mb-2">${post.title}</h5>
                 ${descriptionHtml}
                 <div class="post-card-footer-vertical mt-2">
                    <span class="post-card-date small text-muted"><i class="far fa-calendar-alt me-1"></i>${formattedDate}</span>
                 </div>
                 ${tagsHtml}
             </div>`;
            
            postElement.innerHTML = imageAreaHtml + contentAreaHtml;
            postElementWrapper.appendChild(postElement);
            postsListElement.appendChild(postElementWrapper);
        });
    }


    function displayLinks(linksToRender) {
        if (!linksListElement) return;
        linksListElement.innerHTML = '';
        linksListElement.className = 'links-list links-grid-layout';


        if (linksToRender.length === 0) {
            linksListElement.innerHTML = `<div class="col-12 text-center p-5"><p class="text-muted lead">没有找到匹配 "${currentLinksFilterTag || '任何'}" 标签的导航。</p></div>`;
            return;
        }

        linksToRender.forEach((link, index) => {
            const linkElementWrapper = document.createElement('div'); 
            linkElementWrapper.className = 'link-card-wrapper';

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
                imageHtml = `<div class="link-card-image-placeholder d-flex align-items-center justify-content-center">
                                <i class="fas fa-link fa-2x text-muted"></i>
                             </div>`;
            }

            const descriptionHtml = link.description ? `<p class="link-card-description">${link.description}</p>` : '<p class="link-card-description" style="min-height: 2.8em;"></p>';
            
            const tagsHtml = link.tag && link.tag.length > 0 
                ? `<div class="card-tags">${link.tag.map(t => `<span class="tag-badge">${t}</span>`).join(' ')}</div>` 
                : '<div class="card-tags" style="height: 28px;"></div>';

            linkElement.innerHTML = `
                ${imageHtml}
                <div class="link-card-content">
                    <div class="link-card-main-info">
                        <h4 class="link-card-title">${link.title}</h4>
                        ${descriptionHtml}
                    </div>
                    <div class="link-card-bottom-info mt-auto">
                        ${tagsHtml}
                        <div class="link-card-meta">
                            <span class="link-card-url"><i class="fas fa-external-link-alt me-1"></i>${link.link}</span>
                        </div>
                    </div>
                </div>`;
            linkElementWrapper.appendChild(linkElement);
            linksListElement.appendChild(linkElementWrapper);
        });
    }

    // New function to display albums in index.html tab
    function displayAlbums(albumsToRender) {
        if (!albumsListContentElement) return;
        albumsListContentElement.innerHTML = ''; // Clear loading state
        // The class 'albums-grid' is already on the container element in index.html

        if (!albumsToRender || albumsToRender.length === 0) {
            albumsListContentElement.innerHTML = `<div class="col-12 text-center p-5"><p class="text-muted lead">暂无相册。</p></div>`;
            return;
        }

        albumsToRender.forEach((album, index) => {
            const albumCardAnchor = document.createElement('a');
            albumCardAnchor.href = `album.html?path=${encodeURIComponent(album.path)}&name=${encodeURIComponent(album.name)}`;
            albumCardAnchor.className = 'album-card'; // Uses styles from main.css
            albumCardAnchor.style.animationDelay = `${index * 0.05}s`;

            let imageUrl = album.image;
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                imageUrl = `${repoUrl}/${imageUrl.replace(/^\.?\//, '')}`;
            } else if (!imageUrl) {
                imageUrl = ''; // Trigger placeholder
            }
            
            const imageAreaHtml = imageUrl 
                ? `<div class="album-card-image-top-container"><img src="${imageUrl}" alt="${album.name}" class="album-card-image-top"></div>`
                : `<div class="album-card-image-top-placeholder d-flex align-items-center justify-content-center">
                       <i class="far fa-images fa-3x text-muted"></i>
                   </div>`;

            albumCardAnchor.innerHTML = `
                ${imageAreaHtml}
                <div class="album-card-content">
                    <h5 class="album-card-title">${album.name}</h5>
                </div>
            `;
            albumsListContentElement.appendChild(albumCardAnchor);
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
        // Albums currently don't have tags in this setup
    }

    function renderTagSidebar(type, tagsSet, clickHandler, listElement, currentFilter) {
        if (!listElement) return;
        listElement.innerHTML = '';

        const createTagItem = (tag, label) => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.className = 'tag-filter-button';
            button.textContent = label;
            button.dataset.tag = tag;
            if ((currentFilter === null && tag === 'all') || currentFilter === tag) {
                button.classList.add('active');
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
            listElement.innerHTML = '<li class="text-muted small p-2">暂无可用标签。</li>';
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

    if (typeof initializeDynamicBackgrounds === 'function') {
        initializeDynamicBackgrounds(repoUrl);
    }

    Promise.all([
        fetch(`${repoUrl}/list.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取文章列表失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch posts failed:", err); return null; }),
        fetch(`${repoUrl}/link.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取导航链接失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch links failed:", err); return null; }),
        fetch(`${repoUrl}/author.json`, { cache: "no-cache" }).then(res => {
            if (!res.ok) throw new Error(`获取作者信息失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch authors failed:", err); return null; }),
        fetch(`${repoUrl}/albums.json`, { cache: "no-cache" }).then(res => { // Added albums fetch
            if (!res.ok) throw new Error(`获取相册列表失败 (${res.status})`);
            return res.json();
        }).catch(err => { console.error("Fetch albums failed:", err); return null; })
    ])
    .then(([posts, links, authors, albums]) => { // Added albums to destructuring
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

        if (authors) {
            authorsData = authors;
        }

        if (albums) { // Process albums data
            originalAlbumsData = albums;
        } else {
            if (albumsListContentElement) albumsListContentElement.innerHTML = `<div class="error-message alert alert-warning col-12"><p>无法加载相册列表。</p></div>`;
        }
        
        extractAllTags();

        // Display content for Posts tab
        displayPosts(originalPostsData);
        renderTagSidebar('posts', allPostTags, handlePostTagClick, postsTagsListElement, currentPostsFilterTag);
        if (postsAuthorsContainer) displayAuthors(authorsData, postsAuthorsContainer);

        // Display content for Links tab
        displayLinks(originalLinksData);
        renderTagSidebar('links', allLinkTags, handleLinkTagClick, linksTagsListElement, currentLinksFilterTag);
        if (linksAuthorsContainer) displayAuthors(authorsData, linksAuthorsContainer);

        // Display content for Albums tab
        displayAlbums(originalAlbumsData); // Call new display function
        if (albumsAuthorsContainer) displayAuthors(authorsData, albumsAuthorsContainer); // Display authors in albums sidebar


        if (!posts && !links && !authors && !albums) {
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
                top: targetScroll - 60, // Adjust for navbar height
                behavior: 'smooth'
            });
        });
    }
});