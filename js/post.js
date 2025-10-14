document.addEventListener('DOMContentLoaded',function(){
    const postTitleElement = document.getElementById('post-title');
    const postDateElement = document.getElementById('post-date');
    const postBodyElement = document.getElementById('post-body');
    const tocListElement = document.getElementById('toc-list');
    const postHeroHeaderElement = document.getElementById('post-hero-header');
    const postHeaderTagsElement = document.getElementById('post-header-tags');
    const mobileTocButtonContainer = document.getElementById('mobile-toc-button-container');
    const mainNavbar = document.querySelector('.navbar.sticky-top');

    // 默认使用：https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main
    // 部署了pages之后：https://komorebi-yaodong.github.io/komorebiBlog
    // 反代：https://mypages.001412.xyz/komorebiBlog
    const repoUrl = 'https://komorebi-yaodong.github.io/komorebiBlog';
    const filePath=new URLSearchParams(window.location.search).get('file');

    if (typeof initializeDynamicBackgrounds === 'function') {
        initializeDynamicBackgrounds(repoUrl);
    }

    if(!filePath){
        handleLoadingError(new Error("未指定文章文件路径。"),null);
        if(postHeroHeaderElement) postHeroHeaderElement.style.display = 'none';
        if(mobileTocButtonContainer) mobileTocButtonContainer.style.display = 'none';
        return;
    }

    const mathBlock={
        name:'mathBlock',level:'block',
        start(src){return src.indexOf('$$');},
        tokenizer(src){
            const m=/^\$\$([\s\S]+?)\$\$/.exec(src);
            if(m){return{type:'mathBlock',raw:m[0],text:m[1]};}
        },
        renderer(token){return`<script type="math/tex; mode=display">${token.text}</script>`;}
    };
    const mathInline={
        name:'mathInline',level:'inline',
        start(src){return src.indexOf('$');},
        tokenizer(src){
            const m=/^\$([^\$]+?)\$/.exec(src);
            if(m){return{type:'mathInline',raw:m[0],text:m[1]};}
        },
        renderer(token){return`<script type="math/tex">${token.text}</script>`;}
    };
    const highlight={
        name:'highlight',level:'inline',
        start(src){return src.indexOf('==');},
        tokenizer(src){
            const m=/^==((?:(?!==).)+?)==/.exec(src);
            if(m){
                if(!m[1].trim())return{type:'text',raw:m[0],text:m[0]};
                return{type:'highlight',raw:m[0],text:m[1].trim(),tokens:this.lexer.inlineTokens(m[1].trim())};
            }
        },
        renderer(t){return`<mark>${this.parser.parseInline(t.tokens)}</mark>`;}
    };

    marked.use({extensions:[mathBlock,mathInline,highlight]});
    marked.setOptions({
        breaks:true,
        gfm:true,
        sanitize:false,
        smartypants:false,
        xhtml:false,
        headerIds: true,
        headerPrefix: 'toc-heading-'
    });

    Promise.all([
        fetch(`${repoUrl}/${filePath}`, { cache: "no-cache" }).then(r=>{if(!r.ok)throw new Error(`状态: ${r.status}`);return r.text();}).catch(()=>null),
        fetch(`${repoUrl}/list.json`, { cache: "no-cache" }).then(r=>{if(!r.ok)throw new Error(`状态: ${r.status}`);return r.json();}).catch(()=>null)
    ]).then(([md,posts])=>{
        if(!md)throw new Error("无法获取文章内容文件。");
        const post=posts?posts.find(p=>p.file===filePath):null;

        let titleText, dateText;

        if(!post){
            titleText = filePath.split('/').pop().replace(/\.md$/,'') || "无标题";
            dateText = "日期未知";
            if(postHeroHeaderElement) postHeroHeaderElement.classList.add('no-image');
        }else{
            titleText = post.title;
            dateText = post.time?formatDate(post.time):"日期未知";
            if(post.image && postHeroHeaderElement){
                let imageUrl = post.image;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.replace(/^\.?\//, '');
                    imageUrl = `${repoUrl}/${imageUrl}`;
                }
                postHeroHeaderElement.style.backgroundImage = `url('${imageUrl}')`;
            } else if (postHeroHeaderElement) {
                postHeroHeaderElement.classList.add('no-image');
            }

            if (post.tag && post.tag.length > 0 && postHeaderTagsElement) {
                postHeaderTagsElement.innerHTML = post.tag.map(t => `<span class="tag-badge header-tag">${t}</span>`).join(' ');
            }
        }

        document.title=`${titleText} - Komorebi's Blog`;
        if(postTitleElement) postTitleElement.textContent=titleText;
        if(postDateElement) postDateElement.textContent=dateText;

        let html=marked.parse(md);
        html=replaceImagePaths(html,filePath);
        if(postBodyElement) postBodyElement.innerHTML=html;

        if(postBodyElement) processImagesAndLightbox(postBodyElement);
        if(postBodyElement) Prism.highlightAllUnder(postBodyElement);
        if(postBodyElement) addCopyButtons(postBodyElement);
        if(postBodyElement && tocListElement) generateTableOfContents(postBodyElement, tocListElement);
        if(mobileTocButtonContainer) setupStickyMobileTocButton();


        if(window.MathJax&&window.MathJax.Hub && postBodyElement)MathJax.Hub.Queue(["Typeset",MathJax.Hub,postBodyElement]);

    }).catch(e=>{
        console.error("Error loading post:",e);
        handleLoadingError(e,filePath);
        if(postHeroHeaderElement) postHeroHeaderElement.style.display = 'none';
        const tocContainer = document.getElementById('toc-container');
        if(tocContainer) tocContainer.style.display = 'none';
        if(mobileTocButtonContainer) mobileTocButtonContainer.style.display = 'none';
    });

    function formatDate(s){
        const d=new Date(s);
        if(isNaN(d))return"日期未知";
        const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
        return`${y}年${m}月${day}日`;
    }

    function replaceImagePaths(html,p){
        const base=p.substring(0,p.lastIndexOf('/'));
        return html.replace(/src="((?!(http|https):\/\/)[^"]+)"/g,(m,src)=>{
            let a=src;
            if(a.startsWith('./'))a=`${repoUrl}/${base}/${a.slice(2)}`;
            else if(a.startsWith('../')){
                const pathParts = base.split('/');
                pathParts.pop();
                const parentBase = pathParts.join('/');
                a = `${repoUrl}/${parentBase}/${a.slice(3)}`;
            }
            else if(!a.startsWith('/'))a=a.includes('/')?`${repoUrl}/${a}`:`${repoUrl}/Figures/${a}`;
            else a=`${repoUrl}${a}`;
            return`src="${a}"`;
        });
    }
    
    function extractImagesFromParagraph(p) {
        const images = [];
        let hasOtherSignificantContent = false;

        Array.from(p.childNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'IMG') {
                    images.push(node);
                } else if (node.tagName === 'A' && node.children.length === 1 && node.children[0].tagName === 'IMG') {
                    let linkOnlyContainsImg = true;
                    Array.from(node.childNodes).forEach(linkChild => {
                        if (linkChild.nodeType === Node.TEXT_NODE && linkChild.textContent.trim() !== '') {
                            linkOnlyContainsImg = false;
                        } else if (linkChild.nodeType === Node.ELEMENT_NODE && linkChild.tagName !== 'IMG') {
                            linkOnlyContainsImg = false;
                        }
                    });
                    if (linkOnlyContainsImg) {
                        images.push(node.children[0]);
                    } else {
                        hasOtherSignificantContent = true;
                    }
                } else if (node.tagName !== 'BR') { // Allow BR tags
                    hasOtherSignificantContent = true;
                }
            } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                hasOtherSignificantContent = true;
            }
        });

        if (hasOtherSignificantContent) {
            return []; // Paragraph has other content, so don't treat its images as a standalone group
        }
        return images; // Returns array of IMG elements if paragraph is image-only
    }


    function processImagesAndLightbox(container) {
        const allImageElementsForGrouping = [];
        const directChildren = Array.from(container.childNodes);

        directChildren.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'P') {
                const imagesInP = extractImagesFromParagraph(child);
                if (imagesInP.length > 0) {
                    imagesInP.forEach(img => allImageElementsForGrouping.push({img: img, p: child}));
                } else {
                    // This paragraph is not purely images, so it breaks any current image sequence
                    if (allImageElementsForGrouping.length > 0 && 
                        allImageElementsForGrouping[allImageElementsForGrouping.length -1].p !== "processed_group") {
                         // Mark the end of a potential sequence from single-image paragraphs
                         allImageElementsForGrouping.push({img: null, p: "break_sequence"});
                    }
                }
            } else {
                // Any non-paragraph element also breaks the image sequence
                if (allImageElementsForGrouping.length > 0 &&
                    allImageElementsForGrouping[allImageElementsForGrouping.length -1].p !== "processed_group") {
                    allImageElementsForGrouping.push({img: null, p: "break_sequence"});
                }
            }
        });
        
        const imageMetaGroups = [];
        let currentMetaGroup = [];

        allImageElementsForGrouping.forEach(item => {
            if (item.p === "break_sequence") {
                if (currentMetaGroup.length > 0) {
                    imageMetaGroups.push(currentMetaGroup);
                    currentMetaGroup = [];
                }
            } else if (item.img) { // it's an image item
                 currentMetaGroup.push(item);
            }
        });
         if (currentMetaGroup.length > 0) {
            imageMetaGroups.push(currentMetaGroup);
        }


        const finalImageGroups = [];
        for (const metaGroup of imageMetaGroups) {
            if (metaGroup.length > 3) {
                for (let i = 0; i < metaGroup.length; i += 3) {
                    finalImageGroups.push(metaGroup.slice(i, i + 3));
                }
            } else if (metaGroup.length > 0) {
                finalImageGroups.push(metaGroup);
            }
        }
        
        const paragraphsToRemove = new Set();

        finalImageGroups.forEach(group => {
            if (group.length === 0) return;

            const imageRow = document.createElement('div');
            imageRow.className = 'image-row image-count-' + group.length;
            
            let insertBeforeRefP = null;

            group.forEach(item => {
                imageRow.appendChild(item.img);
                paragraphsToRemove.add(item.p);
                if(!insertBeforeRefP) insertBeforeRefP = item.p;
            });
            
            if (insertBeforeRefP && insertBeforeRefP.parentNode) {
                 insertBeforeRefP.parentNode.insertBefore(imageRow, insertBeforeRefP);
            } else if (group.length > 0 && group[0].p.parentNode) { // Fallback if refP somehow lost
                 group[0].p.parentNode.insertBefore(imageRow, group[0].p);
            }

        });
        
        paragraphsToRemove.forEach(p => {
            if (p.parentNode && Array.from(p.childNodes).every(node => 
                (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'IMG' || node.tagName === 'BR' || (node.tagName === 'A' && node.children.length > 0 && node.children[0].tagName === 'IMG'))) || 
                (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '')
            )) {
                 p.remove();
            }
        });


        const allImagesInBody = Array.from(container.querySelectorAll('.markdown-body img'));
        const lightbox = document.getElementById('image-lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const captionText = document.getElementById('lightbox-caption');
        const closeBtn = lightbox ? lightbox.querySelector('.lightbox-close') : null;

        allImagesInBody.forEach(img => {
            if (!img.dataset.lightboxInitialized) {
                img.style.cursor = 'pointer';
                img.addEventListener('click', function() {
                    if (lightbox && lightboxImg && captionText) {
                        lightbox.style.display = 'block';
                        lightboxImg.src = this.src;
                        captionText.innerHTML = this.alt || '';
                        document.body.style.overflow = 'hidden';
                    }
                });
                img.dataset.lightboxInitialized = 'true';
            }
        });

        if (lightbox && closeBtn && !closeBtn.dataset.listenerAttached) {
            closeBtn.onclick = function() {
                lightbox.style.display = 'none';
                document.body.style.overflow = '';
            }
            lightbox.onclick = function(event) { 
                if (event.target === lightbox) {
                    lightbox.style.display = 'none';
                    document.body.style.overflow = '';
                }
            }
            closeBtn.dataset.listenerAttached = 'true';
        }
    }

    function handleLoadingError(err,p){
        if(postBodyElement){
            postBodyElement.innerHTML=`
                <div class="alert alert-danger">
                    <h4>加载失败</h4>
                    <p>错误: ${err.message}</p>
                    ${p?`<p>文件: ${p}</p>`:''}
                </div>`;
        }
        if(postTitleElement) postTitleElement.textContent="加载错误";
        if(postDateElement) postDateElement.textContent="";
        document.title="错误 - Komorebi's Blog";
    }

    function addCopyButtons(container){
        container.querySelectorAll('pre').forEach(preElement => {
            // If already wrapped, skip
            if (preElement.parentElement && preElement.parentElement.classList.contains('code-block-wrapper')) {
                return;
            }

            const codeContentElement = preElement.querySelector('code');
            if (!codeContentElement) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            
            // Replace pre with wrapper and move pre inside it
            if (preElement.parentNode) {
                preElement.parentNode.insertBefore(wrapper, preElement);
            }
            wrapper.appendChild(preElement);

            const btn = document.createElement('button');
            btn.className = 'copy-code-button';
            btn.innerHTML = '<i class="far fa-copy"></i>';
            btn.setAttribute('aria-label','复制代码');
            btn.title = '复制代码';
            
            btn.addEventListener('click', () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(codeContentElement.textContent || "").then(() => {
                        btn.innerHTML = '<i class="fas fa-check"></i>';
                        btn.classList.add('copied');
                        setTimeout(() => {
                            btn.innerHTML = '<i class="far fa-copy"></i>';
                            btn.classList.remove('copied');
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                        btn.innerHTML = '<i class="fas fa-times"></i>';
                        btn.classList.add('error');
                        setTimeout(() => {
                            btn.innerHTML = '<i class="far fa-copy"></i>';
                            btn.classList.remove('error');
                        }, 2000);
                    });
                }
            });
            // The wrapper will now contain the button
            wrapper.appendChild(btn);
        });
    }

    function generateTableOfContents(contentContainer, tocListElDesktop) {
        const tocListElMobile = document.getElementById('toc-list-mobile');
        
        tocListElDesktop.innerHTML = '';
        if (tocListElMobile) tocListElMobile.innerHTML = '';

        const headings = Array.from(contentContainer.querySelectorAll('h2, h3, h4'));
        const tocContainerDesktop = document.getElementById('toc-container');

        if (headings.length === 0) {
            const noTocMsg = '<li class="text-muted small">本文无可用大纲。</li>';
            tocListElDesktop.innerHTML = noTocMsg;
            if (tocListElMobile) tocListElMobile.innerHTML = noTocMsg;
            
            if (tocContainerDesktop) tocContainerDesktop.style.display = 'none';
            const mobileTocBtnContainer = document.getElementById('mobile-toc-button-container');
            if(mobileTocBtnContainer) mobileTocBtnContainer.style.display = 'none';
            return;
        }

        if (tocContainerDesktop) tocContainerDesktop.style.display = '';

        let rootUl = document.createElement('ul');
        rootUl.className = 'list-unstyled';

        let currentUl = rootUl;
        let lastLevel = 1;

        headings.forEach(heading => {
            if (!heading.id) return;
            if (!heading.textContent.trim()) return;

            const level = parseInt(heading.tagName.substring(1));
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent.trim();
            link.classList.add('toc-link', `toc-level-${level}`);
            listItem.appendChild(link);

            if (level > lastLevel) {
                if (currentUl.lastChild) {
                    const newUl = document.createElement('ul');
                    newUl.className = 'list-unstyled toc-nested-list';
                    currentUl.lastChild.appendChild(newUl);
                    currentUl = newUl;
                }
            } else if (level < lastLevel) {
                for (let i = 0; i < (lastLevel - level); i++) {
                    if (currentUl.parentElement && currentUl.parentElement.parentElement &&
                        currentUl.parentElement.parentElement.tagName === 'UL') {
                        currentUl = currentUl.parentElement.parentElement;
                    } else {
                        currentUl = rootUl;
                        break;
                    }
                }
            }
            currentUl.appendChild(listItem);
            lastLevel = level;
        });

        if (rootUl.hasChildNodes()) {
            tocListElDesktop.appendChild(rootUl);
            if (tocListElMobile) {
                tocListElMobile.appendChild(rootUl.cloneNode(true));
            }
        } else {
             const failMsg = '<li class="text-muted small">未能生成有效大纲。</li>';
             tocListElDesktop.innerHTML = failMsg;
             if (tocListElMobile) tocListElMobile.innerHTML = failMsg;
             if (tocContainerDesktop) tocContainerDesktop.style.display = 'none';
             const mobileTocBtnContainer = document.getElementById('mobile-toc-button-container');
             if(mobileTocBtnContainer) mobileTocBtnContainer.style.display = 'none';
        }
    }

    const tocOffcanvasElement = document.getElementById('tocOffcanvas');
    if (tocOffcanvasElement) {
        tocOffcanvasElement.addEventListener('click', function(event) {
            if (event.target.matches('#toc-list-mobile a.toc-link') || event.target.closest('#toc-list-mobile a.toc-link')) {
                const offcanvas = bootstrap.Offcanvas.getInstance(tocOffcanvasElement);
                if (offcanvas) {
                    offcanvas.hide();
                }
            }
        });
    }

    function setupStickyMobileTocButton() {
        if (!mobileTocButtonContainer || !mainNavbar) return;

        const heroHeader = document.getElementById('post-hero-header');
        let stickyThreshold = 0;
        let navbarHeight = mainNavbar.offsetHeight;
        const mobileTocButtonInitialStyle = window.getComputedStyle(mobileTocButtonContainer);
        const initialContainerMarginBottom = mobileTocButtonInitialStyle.marginBottom;
        const initialContainerHeight = mobileTocButtonContainer.offsetHeight;


        function updateStickyThreshold() {
            navbarHeight = mainNavbar.offsetHeight;
            if (heroHeader && getComputedStyle(heroHeader).display !== 'none' && heroHeader.offsetHeight > 0) {
                stickyThreshold = heroHeader.offsetTop + heroHeader.offsetHeight;
            } else {
                 stickyThreshold = mobileTocButtonContainer.offsetTop - parseFloat(mobileTocButtonInitialStyle.marginTop);
            }
        }
        updateStickyThreshold();
        
        window.addEventListener('scroll', function() {
            navbarHeight = mainNavbar.offsetHeight; 
            if (window.scrollY + navbarHeight > stickyThreshold) {
                if (!mobileTocButtonContainer.classList.contains('sticky-mobile-toc-button')) {
                    mobileTocButtonContainer.classList.add('sticky-mobile-toc-button');
                    mobileTocButtonContainer.style.top = navbarHeight + 'px';
                    
                    let placeholder = document.getElementById('mobile-toc-placeholder');
                    if (!placeholder && postBodyElement) {
                         placeholder = document.createElement('div');
                         placeholder.id = 'mobile-toc-placeholder';
                         placeholder.style.height = initialContainerHeight + 'px';
                         placeholder.style.marginBottom = initialContainerMarginBottom;
                         mobileTocButtonContainer.parentNode.insertBefore(placeholder, mobileTocButtonContainer);
                    }
                }
            } else {
                if (mobileTocButtonContainer.classList.contains('sticky-mobile-toc-button')) {
                    mobileTocButtonContainer.classList.remove('sticky-mobile-toc-button');
                    mobileTocButtonContainer.style.top = '';
                    const placeholder = document.getElementById('mobile-toc-placeholder');
                    if (placeholder) {
                        placeholder.remove();
                    }
                }
            }
        }, { passive: true });

        window.addEventListener('resize', function() {
            updateStickyThreshold();
            if (mobileTocButtonContainer.classList.contains('sticky-mobile-toc-button')) {
                 mobileTocButtonContainer.style.top = mainNavbar.offsetHeight + 'px';
                 const placeholder = document.getElementById('mobile-toc-placeholder');
                 if(placeholder) {
                    placeholder.style.height = mobileTocButtonContainer.offsetHeight + 'px';
                 }
            }
        });
    }
});