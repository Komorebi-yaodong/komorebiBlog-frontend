document.addEventListener('DOMContentLoaded',function(){
    const postTitle=document.getElementById('post-title');
    const postDate=document.getElementById('post-date');
    const postBody=document.getElementById('post-body');
    const repoUrl='https://raw.githubusercontent.com/Komorebi-yaodong/komorebiBlog/main'; // 已有
    const filePath=new URLSearchParams(window.location.search).get('file');

    // 调用共享的背景初始化函数
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
    marked.setOptions({breaks:true,gfm:true,sanitize:false,smartypants:false,xhtml:false});
    Promise.all([
        fetch(`${repoUrl}/${filePath}`).then(r=>{if(!r.ok)throw new Error(`状态: ${r.status}`);return r.text();}).catch(()=>null),
        fetch(`${repoUrl}/list.json`).then(r=>{if(!r.ok)throw new Error(`状态: ${r.status}`);return r.json();}).catch(()=>null)
    ]).then(([md,posts])=>{
        if(!md)throw new Error("无法获取文章内容文件。");
        const post=posts?posts.find(p=>p.file===filePath):null;
        if(!post){
            document.title=`${filePath.split('/').pop().replace(/\.md$/,'')} - Komorebi's Blog`;
            postTitle.textContent=filePath.split('/').pop().replace(/\.md$/,'')||"无标题";
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
        if(window.MathJax&&window.MathJax.Hub)MathJax.Hub.Queue(["Typeset",MathJax.Hub,postBody]);
    }).catch(e=>{
        console.error(e);
        handleLoadingError(e,filePath);
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
            else if(a.startsWith('../')){const par=base.substring(0,base.lastIndexOf('/'));a=`${repoUrl}/${par}/${a.slice(3)}`;}
            else if(!a.startsWith('/'))a=a.includes('/')?`${repoUrl}/${a}`:`${repoUrl}/figures/${a}`;
            else a=`${repoUrl}${a}`;
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
});
