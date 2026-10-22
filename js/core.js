// ==================== PASSCODE ====================
const VALID_HASH=(async()=>await crypto.subtle.digest('SHA-256',new TextEncoder().encode('$$$143419$$$')).then(h=>Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))();
async function checkPasscode(){
  const input=document.getElementById('passcode-input').value;
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)).then(h=>Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''));
  const valid=await VALID_HASH;
  if(hash===valid)document.getElementById('passcode-gate').style.display='none';
  else document.getElementById('passcode-error').style.display='block';
}

// ==================== SAFE HTML ====================
const ALLOWED_TAGS=['p','br','b','strong','i','em','u','s','strike','h1','h2','h3','h4','h5','h6','ul','ol','li','a','span','blockquote','code','pre','div'];
const ALLOWED_ATTR=['href','target','rel','style','class'];
function safeHTML(html){
  if(!html)return '';
  if(typeof DOMPurify!=='undefined'){
    try{return DOMPurify.sanitize(String(html),{ALLOWED_TAGS,ALLOWED_ATTR,ALLOW_DATA_ATTR:false,ADD_ATTR:['target']});}catch(e){console.warn('DOMPurify error:',e);}
  }
  let s=String(html);
  s=s.replace(/<\s*(script|iframe|object|embed|link|meta|style|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,'');
  s=s.replace(/<\s*(script|iframe|object|embed|link|meta|style|form|input|button|textarea|select)[^>]*\/?>/gi,'');
  s=s.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
  s=s.replace(/(href|src|action)\s*=\s*(?:"|')?\s*javascript:[^"'\s>]*/gi,'$1=""');
  return s;
}

// ==================== VIDEO SAFETY ====================
function makeVideoWebSafe(url){
  if(!url||typeof url!=='string')return url;
  if(!url.includes('/video/upload/'))return url;
  if(/vc_/.test(url))return url;
  return url.replace('/video/upload/','/video/upload/vc_auto/');
}

// ==================== STATE ====================
let config={},projects=[],sitesList=[],activeSiteId="",activeId=null,projSHA=null;
let siteData={home:{},about:{}};
let homeSHA=null,aboutSHA=null,bookingsSHA=null;
let bookings=[],reviews=[];
const richEditorMap={};
let selectedProjects=new Set();
let autosaveTimer=null;
let lastBookingCount=0;

// ==================== RICH TEXT EDITOR ====================
class RichTextEditor{
  constructor(container,initialValue,onChange){this.container=container;this.onChange=onChange;this.build(initialValue);}
  build(initialValue){
    const toolbar=document.createElement('div');toolbar.className='rte-toolbar';
    toolbar.innerHTML='<button data-cmd="bold"><b>B</b></button><button data-cmd="italic"><i>I</i></button><button data-cmd="underline"><u>U</u></button><span class="rte-sep"></span><select class="rte-size-select"><option value="">Size</option><option value="1">Small</option><option value="3">Medium</option><option value="5">Large</option></select><span class="rte-sep"></span><button data-cmd="h1">H1</button><button data-cmd="h2">H2</button><button data-cmd="h3">H3</button><span class="rte-sep"></span><label><input type="color" class="rte-color-fg" value="#f0ede8"/></label><label><input type="color" class="rte-color-bg" value="#ffff00"/></label><span class="rte-sep"></span><button data-cmd="insertUnorderedList">•</button><button data-cmd="insertOrderedList">1.</button><span class="rte-sep"></span><button data-cmd="createLink">🔗</button><button data-cmd="unlink">✂</button>';
    this.editableDiv=document.createElement('div');this.editableDiv.contentEditable=true;this.editableDiv.className='rte-content';
    this.editableDiv.innerHTML=this.sanitize(initialValue||'');
    this.editableDiv.addEventListener('input',()=>this.onChange(this.getValue()));
    this.container.innerHTML='';this.container.appendChild(toolbar);this.container.appendChild(this.editableDiv);
    this.bindToolbar(toolbar);
  }
  sanitize(html){
    if(!html)return '';
    const temp=document.createElement('div');temp.innerHTML=html;
    temp.querySelectorAll('font').forEach(f=>{
      const span=document.createElement('span');span.innerHTML=f.innerHTML;
      if(f.color)span.style.color=f.color;
      if(f.size)span.style.fontSize=f.size==='1'?'0.75em':f.size==='3'?'1em':'1.4em';
      f.replaceWith(span);
    });
    return safeHTML(temp.innerHTML);
  }
  bindToolbar(toolbar){
    toolbar.querySelectorAll('button[data-cmd]').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.preventDefault();
        const cmd=btn.dataset.cmd;
        if(cmd==='h1'||cmd==='h2'||cmd==='h3')document.execCommand('formatBlock',false,cmd);
        else if(cmd==='createLink'){const url=prompt('Enter URL (include https://):','https://');if(url&&/^https?:\/\//i.test(url)){document.execCommand('createLink',false,url);this.editableDiv.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener';});}}
        else document.execCommand(cmd,false,null);
        this.editableDiv.focus();this.onChange(this.getValue());
      });
    });
    toolbar.querySelector('.rte-size-select').addEventListener('change',e=>{
      const sz=e.target.value;if(sz){document.execCommand('fontSize',false,sz);this.onChange(this.getValue());}e.target.value='';
    });
    toolbar.querySelector('.rte-color-fg').addEventListener('input',e=>{document.execCommand('foreColor',false,e.target.value);this.onChange(this.getValue());});
    toolbar.querySelector('.rte-color-bg').addEventListener('input',e=>{document.execCommand('hiliteColor',false,e.target.value);this.onChange(this.getValue());});
  }
  getValue(){return this.sanitize(this.editableDiv.innerHTML);}
  setValue(html){this.editableDiv.innerHTML=this.sanitize(html);}
}

// ==================== GITHUB API ====================
async function ghGet(path){
  const r=await fetch(`https://api.github.com/repos/${config.user}/${config.repo}/contents/${path}?ref=${config.branch}`,{headers:{'Authorization':`Bearer ${config.token}`,'Accept':'application/vnd.github.v3+json'}});
  if(r.status===404)return null;
  if(!r.ok)throw new Error(`GitHub ${r.status} — check credentials`);
  return r.json();
}
async function ghPut(path,content,sha,msg){
  const body={message:msg,content:btoa(unescape(encodeURIComponent(content))),branch:config.branch};
  if(sha)body.sha=sha;
  const r=await fetch(`https://api.github.com/repos/${config.user}/${config.repo}/contents/${path}`,{method:'PUT',headers:{'Authorization':`Bearer ${config.token}`,'Accept':'application/vnd.github.v3+json','Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){const e=await r.json();throw new Error(e.message);}
  return r.json();
}
function ghDecode(content){return JSON.parse(decodeURIComponent(escape(atob(content.replace(/\n/g,'')))));}

// ==================== LOGIN ====================
function handleLogin(){
  // Prefer window.STUDIO_CONFIG (from config.js) if present, else read the form
  const c=window.STUDIO_CONFIG||{};
  const u=c.ghUser||gv('gh-user');
  const r=c.ghRepo||gv('gh-repo');
  const b=c.ghBranch||gv('gh-branch')||'main';
  const t=c.ghToken||gv('gh-token');
  const cl=c.cloudName||gv('cl-cloud');
  const pr=c.uploadPreset||gv('cl-preset');
  const ga=c.gaId||gv('ga-id');
  if(!u||!r||!t){loginErr('GitHub username, repo and token are required.');return;}
  if(!cl){loginErr('Cloudinary Cloud Name is required for uploads.');return;}
  if(!pr){loginErr('Cloudinary Upload Preset is required for uploads.');return;}
  config={user:u,repo:r,branch:b,token:t,cloud:cl,preset:pr,gaId:ga};
  sessionStorage.setItem('cms_tok',t);
  localStorage.setItem('cms_cfg',JSON.stringify({user:u,repo:r,branch:b,cloud:cl,preset:pr,gaId:ga}));
  localStorage.setItem('cms_cloud',cl);localStorage.setItem('cms_preset',pr);
  initApp();
}
function gv(id){return document.getElementById(id)?.value.trim()||'';}
function loginErr(m){const e=document.getElementById('login-error');e.textContent='⚠ '+m;e.style.display='block';}
function logout(){sessionStorage.removeItem('cms_tok');localStorage.removeItem('cms_tok_persist');location.reload();}

// ==================== STATUS BAR ====================
let stTimeout;
function showStatus(msg,type='info'){
  const bar=document.getElementById('status-bar');
  if(!bar)return;
  document.getElementById('status-msg').textContent=msg;
  bar.className=`show ${type}`;
  clearTimeout(stTimeout);
  stTimeout=setTimeout(()=>bar.classList.remove('show'),3500);
}

// ==================== ESCAPE ====================
function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ==================== MULTI-TENANT LOGIC ====================
async function loadSites() {
  try {
    const res = await fetch("sites.json?t=" + Date.now());
    let baseSites = res.ok ? await res.json() : [];
    const custom = getCustomSites();
    sitesList = [...baseSites, ...custom];
    const sel = document.getElementById("site-switcher");
    if(!sel) return;
    sel.innerHTML = sitesList.map(s => `<option value="${s.repo}">${s.name}</option>`).join("");
    if(sitesList.length > 0) {
      const active = localStorage.getItem("cms_default_repo") || sitesList[0].repo;
      sel.value = active;
    }
  } catch(e) {
    console.error("Could not load sites", e);
  }
}

function changeSite(newRepo) {
  if(!newRepo || config.repo === newRepo) return;
  config.repo = newRepo;
  localStorage.setItem('cms_default_repo', newRepo);
  showStatus(`Switched to ${newRepo}. Reloading...`, 'info');
  setTimeout(() => location.reload(), 1000);
}

// ==================== CUSTOM SITE MANAGER ====================
function getCustomSites() {
  try { return JSON.parse(localStorage.getItem('cms_custom_sites') || '[]'); } catch(e) { return []; }
}

window.openSiteManager = function() {
  const list = document.getElementById('custom-sites-list');
  const custom = getCustomSites();
  if(!custom.length) {
    list.innerHTML = '<p style="font-size:0.75rem; color:var(--muted);">No custom sites added yet.</p>';
  } else {
    list.innerHTML = custom.map((s, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface2); padding:0.5rem; border-radius:4px; font-size:0.75rem;">
        <span><strong>${s.name}</strong> (${s.repo})</span>
        <button class="btn btn-d btn-sm" onclick="removeCustomSite(${i})" style="padding:0.2rem 0.5rem; font-size:0.6rem;">Delete</button>
      </div>
    `).join('');
  }
  document.getElementById('site-manager-overlay').classList.add('show');
};

window.closeSiteManager = function() {
  document.getElementById('site-manager-overlay').classList.remove('show');
};

window.addCustomSite = function() {
  const name = document.getElementById('new-site-name').value.trim();
  const repo = document.getElementById('new-site-repo').value.trim();
  if(!name || !repo) return alert('Please enter both a name and a repo.');
  
  const custom = getCustomSites();
  if(custom.find(s => s.repo === repo)) return alert('This repo is already in the list.');
  
  custom.push({ name, repo });
  localStorage.setItem('cms_custom_sites', JSON.stringify(custom));
  
  document.getElementById('new-site-name').value = '';
  document.getElementById('new-site-repo').value = '';
  
  loadSites(); // Refresh the dropdown
  openSiteManager(); // Refresh the list
};

window.removeCustomSite = function(index) {
  const custom = getCustomSites();
  custom.splice(index, 1);
  localStorage.setItem('cms_custom_sites', JSON.stringify(custom));
  loadSites();
  openSiteManager();
};
