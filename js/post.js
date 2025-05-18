document.addEventListener('DOMContentLoaded',function(){
    const postTitleElement = document.getElementById('post-title');
    const postDateElement = document.getElementById('post-date');
    const postBodyElement = document.getElementById('post-body');
    const tocListElement = document.getElementById('toc-list');
    const postHeroHeaderElement = document.getElementById('post-hero-header');
    const postHeaderTagsElement = document.getElementById('post-header-tags');

    // 部署了pages之后：https://komorebi-yaodong.github.io/komorebiBlog
    // 默认使用：https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main
    const repoUrl='https://komorebi-yaodong.github.io/komorebiBlog';
    const filePath=new URLSearchParams(window.location.search).get('file');

    if (typeof initializeDynamicBackgrounds === 'function') {
        initializeDynamicBackgrounds(repoUrl);
    }

    if(!filePath){
        handleLoadingError(new Error("未指定文章文件路径。"),null);
        if(postHeroHeaderElement) postHeroHeaderElement.style.display = 'none';
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

        // 这行是关键，它会调用 PrismJS 对 postBodyElement 内的所有代码块进行高亮
        if(postBodyElement) Prism.highlightAllUnder(postBodyElement);
        if(postBodyElement) addCopyButtons(postBodyElement);
        if(postBodyElement && tocListElement) generateTableOfContents(postBodyElement, tocListElement);

        if(window.MathJax&&window.MathJax.Hub && postBodyElement)MathJax.Hub.Queue(["Typeset",MathJax.Hub,postBodyElement]);

    }).catch(e=>{
        console.error("Error loading post:",e);
        handleLoadingError(e,filePath);
        if(postHeroHeaderElement) postHeroHeaderElement.style.display = 'none';
        const tocContainer = document.getElementById('toc-container');
        if(tocContainer) tocContainer.style.display = 'none';
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
            else if(!a.startsWith('/'))a=a.includes('/')?`${repoUrl}/${a}`:`${repoUrl}/figures/${a}`;
            else a=`${repoUrl}${a}`;
            return`src="${a}"`;
        });
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

    function addCopyButtons(c){
        c.querySelectorAll('pre').forEach(pre=>{
            if(pre.querySelector('.copy-code-button'))return;
            const code=pre.querySelector('code');
            if(!code)return;
            const btn=document.createElement('button');
            btn.className='copy-code-button';
            btn.innerHTML='<i class="far fa-copy"></i>';
            btn.setAttribute('aria-label','复制代码');
            btn.title='复制代码';
            btn.addEventListener('click',()=>{
                navigator.clipboard.writeText(code.textContent||"").then(()=>{
                    btn.innerHTML='<i class="fas fa-check"></i>';
                    btn.setAttribute('aria-label','已复制');
                    btn.title='已复制!';
                    setTimeout(()=>{
                        btn.innerHTML='<i class="far fa-copy"></i>';
                        btn.setAttribute('aria-label','复制代码');
                        btn.title='复制代码';
                    },2000);
                }).catch(()=>{
                    btn.innerHTML='<i class="fas fa-times"></i>';
                    btn.title='复制失败';
                    setTimeout(()=>{
                        btn.innerHTML='<i class="far fa-copy"></i>';
                        btn.title='复制代码';
                    },2000);
                });
            });
            pre.appendChild(btn);
        });
    }

    function generateTableOfContents(contentContainer, tocListEl) {
        tocListEl.innerHTML = '';
        const headings = Array.from(contentContainer.querySelectorAll('h2, h3, h4'));
        const tocContainer = document.getElementById('toc-container');

        if (headings.length === 0) {
            tocListEl.innerHTML = '<li class="text-muted small">本文无可用大纲。</li>';
            if (tocContainer) tocContainer.style.display = 'none';
            return;
        }

        if (tocContainer) tocContainer.style.display = '';

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
            tocListEl.appendChild(rootUl);
        } else {
             tocListEl.innerHTML = '<li class="text-muted small">未能生成有效大纲。</li>';
             if (tocContainer) tocContainer.style.display = 'none';
        }
    }
});
