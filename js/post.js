document.addEventListener('DOMContentLoaded',function(){
    const postTitle=document.getElementById('post-title');
    const postDate=document.getElementById('post-date');
    const postBody=document.getElementById('post-body');
    const tocListElement = document.getElementById('toc-list'); // TOC list element
    const repoUrl='https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main';
    const filePath=new URLSearchParams(window.location.search).get('file');

    if (typeof initializeDynamicBackgrounds === 'function') {
        initializeDynamicBackgrounds(repoUrl);
    }

    if(!filePath){handleLoadingError(new Error("未指定文章文件路径。"),null);return;}

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
        sanitize:false, // Be careful with sanitize: false if content is not trusted.
        smartypants:false,
        xhtml:false,
        headerIds: true, // Crucial for TOC linking
        headerPrefix: 'toc-heading-' // Optional: prefix for generated IDs
    });

    Promise.all([
        fetch(`${repoUrl}/${filePath}`).then(r=>{if(!r.ok)throw new Error(`状态: ${r.status}`);return r.text();}).catch(()=>null),
        fetch(`${repoUrl}/list.json`).then(r=>{if(!r.ok)throw new Error(`状态: ${r.status}`);return r.json();}).catch(()=>null)
    ]).then(([md,posts])=>{
        if(!md)throw new Error("无法获取文章内容文件。");
        const post=posts?posts.find(p=>p.file===filePath):null;
        
        if(!post){
            const defaultTitle = filePath.split('/').pop().replace(/\.md$/,'') || "无标题";
            document.title=`${defaultTitle} - Komorebi's Blog`;
            postTitle.textContent=defaultTitle;
            postDate.textContent="日期未知";
        }else{
            document.title=`${post.title} - Komorebi's Blog`;
            postTitle.textContent=post.title;
            postDate.textContent=post.time?formatDate(post.time):"日期未知";
        }
        
        let html=marked.parse(md);
        html=replaceImagePaths(html,filePath);
        postBody.innerHTML=html;
        
        Prism.highlightAllUnder(postBody);
        addCopyButtons(postBody);
        generateTableOfContents(postBody, tocListElement); // Generate TOC
        
        if(window.MathJax&&window.MathJax.Hub)MathJax.Hub.Queue(["Typeset",MathJax.Hub,postBody]);
    }).catch(e=>{
        console.error("Error loading post:",e);
        handleLoadingError(e,filePath);
        const tocContainer = document.getElementById('toc-container');
        if(tocContainer) tocContainer.style.display = 'none'; // Hide TOC on error
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
                pathParts.pop(); // Go up one directory
                const parentBase = pathParts.join('/');
                a = `${repoUrl}/${parentBase}/${a.slice(3)}`;
            }
            else if(!a.startsWith('/'))a=a.includes('/')?`${repoUrl}/${a}`:`${repoUrl}/figures/${a}`; // Assume figures for non-slashed paths
            else a=`${repoUrl}${a}`; // Path starts with /
            return`src="${a}"`;
        });
    }

    function handleLoadingError(err,p){
        postBody.innerHTML=`
            <div class="alert alert-danger">
                <h4>加载失败</h4>
                <p>错误: ${err.message}</p>
                ${p?`<p>文件: ${p}</p>`:''}
            </div>`;
        postTitle.textContent="加载错误";
        postDate.textContent="";
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
        tocListEl.innerHTML = ''; // Clear "loading..." or previous TOC
        // We typically start TOC from H2, as H1 is the main post title.
        const headings = Array.from(contentContainer.querySelectorAll('h2, h3, h4'));

        const tocContainer = document.getElementById('toc-container');
        if (headings.length === 0) {
            tocListEl.innerHTML = '<li class="text-muted small">本文无可用大纲。</li>';
            if (tocContainer) tocContainer.style.display = 'none'; // Hide TOC container if no headings
            return;
        }
        
        if (tocContainer) tocContainer.style.display = ''; // Ensure TOC container is visible

        let rootUl = document.createElement('ul');
        rootUl.className = 'list-unstyled'; // Base class for root
        
        let currentUl = rootUl;
        // lastLevel: 1 for H1 (page title), 2 for H2, etc.
        // Start assuming we are conceptually "after" an H1 (the main post title)
        let lastLevel = 1; 

        headings.forEach(heading => {
            // Ensure heading has an ID (Marked.js should add this with headerIds: true)
            if (!heading.id) {
                console.warn("TOC: Heading missing ID, skipping:", heading.textContent);
                return; // Skip headings without IDs
            }
            if (!heading.textContent.trim()) {
                console.warn("TOC: Heading has no text content, skipping.");
                return; // Skip empty headings
            }

            const level = parseInt(heading.tagName.substring(1)); // H2 -> 2, H3 -> 3, etc.

            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent.trim();
            link.classList.add('toc-link', `toc-level-${level}`);
            listItem.appendChild(link);

            if (level > lastLevel) {
                // Going deeper: create a new UL as a child of the last LI added
                // The last LI should be in the currentUl
                if (currentUl.lastChild) { 
                    const newUl = document.createElement('ul');
                    newUl.className = 'list-unstyled toc-nested-list';
                    currentUl.lastChild.appendChild(newUl); // Append new UL to the previous LI
                    currentUl = newUl; // The new UL is now the current one
                } else {
                    // This implies currentUl is empty, but we're trying to nest.
                    // This could happen if the first heading is H3+ or levels are skipped.
                    // Fallback: append to rootUl directly if currentUl is not rootUl and rootUl has children
                    if (currentUl !== rootUl && rootUl.lastChild) {
                        const newUl = document.createElement('ul');
                        newUl.className = 'list-unstyled toc-nested-list';
                        rootUl.lastChild.appendChild(newUl);
                        currentUl = newUl;
                    } else {
                         // Fallback to currentUl (might be rootUl), leading to flatter list.
                         // Or, if we want strict nesting, this would be an error or special handling.
                    }
                }
            } else if (level < lastLevel) {
                // Going shallower: go up the DOM tree to find the correct parent UL
                for (let i = 0; i < (lastLevel - level); i++) {
                    // Parent of current UL is an LI, parent of that LI is the UL we want
                    if (currentUl.parentElement && currentUl.parentElement.parentElement && 
                        currentUl.parentElement.parentElement.tagName === 'UL') {
                        currentUl = currentUl.parentElement.parentElement;
                    } else {
                        currentUl = rootUl; // Fallback to root if structure is unexpected
                        break;
                    }
                }
            }
            // If level === lastLevel, just append to the currentUl

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