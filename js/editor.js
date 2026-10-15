// ==================== SIDEBAR ====================
function renderSidebar(){
  const list=document.getElementById('sb-list');
  if(!list)return;
  document.getElementById('proj-count').textContent=projects.length;
  if(!projects.length){list.innerHTML=`<p style="font-size:.68rem;color:var(--muted);padding:.75rem 1rem;">No projects yet.</p>`;return;}
  list.innerHTML=orderedSidebarProjects().map(p=>{
    const hiddenClass=p.isHidden?'hidden':'';
    const hiddenTag=p.isHidden?'<span class="pi-hidden-tag">hidden</span>':'';
    const checked=selectedProjects.has(p.id)?'checked':'';
    return `<div class="pi ${p.id===activeId?'on':''} ${hiddenClass}" onclick="selectProject('${p.id}')"><input type="checkbox" ${checked} onclick="event.stopPropagation();toggleSelect('${p.id}')" style="width:auto;margin-right:.3rem;"/><span class="pi-name">${esc(p.title||'Untitled')}</span>${p.isRecent?'<span class="rb">★</span>':''}${p.tags?.[0]?`<span class="pi-tag">${esc(p.tags[0])}</span>`:''}${hiddenTag}</div>`;
  }).join('');
}
function toggleSelect(id){if(selectedProjects.has(id))selectedProjects.delete(id);else selectedProjects.add(id);renderSidebar();}
function toggleSelectAll(checked){selectedProjects=checked?new Set(projects.map(p=>p.id)):new Set();renderSidebar();}
function bulkHide(){selectedProjects.forEach(id=>{const p=getProj(id);if(p)p.isHidden=true;});selectedProjects.clear();renderSidebar();showStatus('Selected projects hidden','info');}
function bulkShow(){selectedProjects.forEach(id=>{const p=getProj(id);if(p)p.isHidden=false;});selectedProjects.clear();renderSidebar();showStatus('Selected projects shown','info');}
function bulkDelete(){if(!selectedProjects.size)return;if(!confirm('Delete selected projects?'))return;selectedProjects.forEach(id=>{projects=projects.filter(p=>p.id!==id);});selectedProjects.clear();activeId=null;renderSidebar();document.getElementById('editor-wrap').innerHTML=`<div class="empty-state"><h2>No project selected</h2></div>`;showStatus('Deleted selected projects','info');}

// ==================== PROJECT CRUD ====================
function addProject(){
  const id='proj_'+Date.now();
  projects.unshift({id,title:'',subtitle:'',description:'',tags:[],year:new Date().getFullYear()+'',link:'',previewUrl:'',media:[],collaborators:[],isRecent:false,isFeatured:false,isHidden:false,seoTitle:'',seoDescription:'',seoImage:'',projectType:'',clientTestimonial:'',coverIndex:0,aiPercent:0,projectOrder:orderedGroup(false).length,recentOrder:orderedGroup(true).length});
  renderSidebar();selectProject(id);showStatus('New project created','info');
}
function selectProject(id){activeId=id;renderSidebar();renderEditor();}
function getProj(id){return projects.find(p=>p.id===id);}
function setProp(id,key,val){
  const p=getProj(id);if(!p)return;
  if(key==='isRecent'){
    p.isRecent=!!val;
    p[p.isRecent?'recentOrder':'projectOrder']=projects.filter(x=>x!==p&&!!x.isRecent===!!p.isRecent).length;
    resequenceOrders(true);resequenceOrders(false);
    renderSidebar();renderEditor();return;
  }
  p[key]=val;
  if(['title','tags'].includes(key))renderSidebar();
  scheduleAutosave();
}
function normalizeProjects(){
  projects.forEach((p,i)=>{
    p.tags=Array.isArray(p.tags)?p.tags:[];
    p.media=Array.isArray(p.media)?p.media:[];
    p.collaborators=Array.isArray(p.collaborators)?p.collaborators.filter(c=>c&&(c.name||c.title)).map(c=>({name:c.name||'',title:c.title||''})):[];
    if(!Number.isFinite(Number(p.projectOrder)))p.projectOrder=i;
    if(!Number.isFinite(Number(p.recentOrder)))p.recentOrder=i;
    p.isHidden=!!p.isHidden;
    p.seoTitle=p.seoTitle||'';
    p.seoDescription=p.seoDescription||'';
    p.seoImage=p.seoImage||'';
    p.projectType=p.projectType||'';
    p.clientTestimonial=p.clientTestimonial||'';
  });
  resequenceOrders(true);resequenceOrders(false);
}
function orderedGroup(isRecent){const key=isRecent?'recentOrder':'projectOrder';return projects.filter(p=>!!p.isRecent===!!isRecent).sort((a,b)=>(a[key]??0)-(b[key]??0));}
function orderedSidebarProjects(){return [...orderedGroup(true),...orderedGroup(false)];}
function resequenceOrders(isRecent){orderedGroup(isRecent).forEach((p,i)=>p[isRecent?'recentOrder':'projectOrder']=i);}
function moveProject(id,dir){
  const p=getProj(id);if(!p)return;
  const group=orderedGroup(!!p.isRecent),idx=group.findIndex(x=>x.id===id),next=group[idx+dir];
  if(!next){showStatus('Already at the edge','info');return;}
  const key=p.isRecent?'recentOrder':'projectOrder';
  const tmp=p[key];p[key]=next[key];next[key]=tmp;
  resequenceOrders(!!p.isRecent);renderSidebar();renderEditor();showStatus('Moved','info');
}

// ==================== MEDIA DRAG ====================
function initMediaDrag(projectId){
  const grid=document.getElementById(`mgrid-${projectId}`);if(!grid)return;
  let dragSrcIndex=null;
  grid.querySelectorAll('.m-thumb').forEach((thumb,index)=>{
    thumb.setAttribute('draggable','true');
    thumb.addEventListener('dragstart',e=>{dragSrcIndex=index;e.dataTransfer.setData('text/plain',index);thumb.classList.add('dragging');});
    thumb.addEventListener('dragover',e=>{e.preventDefault();thumb.classList.add('drag-over');});
    thumb.addEventListener('dragleave',()=>thumb.classList.remove('drag-over'));
    thumb.addEventListener('drop',e=>{
      e.preventDefault();thumb.classList.remove('drag-over');
      if(dragSrcIndex===null||dragSrcIndex===index)return;
      const p=getProj(projectId);const media=p.media;
      const [moved]=media.splice(dragSrcIndex,1);media.splice(index,0,moved);
      if(p.coverIndex===dragSrcIndex)p.coverIndex=index;
      else if(dragSrcIndex<p.coverIndex&&index>=p.coverIndex)p.coverIndex--;
      else if(dragSrcIndex>p.coverIndex&&index<=p.coverIndex)p.coverIndex++;
      grid.innerHTML=renderThumbs(p);initMediaDrag(projectId);
    });
    thumb.addEventListener('dragend',()=>{grid.querySelectorAll('.m-thumb').forEach(t=>t.classList.remove('dragging','drag-over'));dragSrcIndex=null;});
  });
}
function renderThumbs(p){
  if(!p.media?.length)return `<p style="font-size:.62rem;color:var(--muted);grid-column:1/-1;padding:.5rem 0;">No media yet.</p>`;
  return p.media.map((m,i)=>{
    const isVid=isVidUrl(m.url)||m.type==='video';
    return `<div class="m-thumb ${i===p.coverIndex?'cover-selected':''}" onclick="selectCover('${p.id}',${i})">${isVid?`<video src="${esc(m.url)}" muted loop playsinline></video>`:`<img src="${esc(m.url)}" alt=""/>`}<span class="drag-handle">⠿</span><button class="m-thumb-recent ${m.showInRecents?'on':''}" onclick="toggleMediaRecent('${p.id}',${i},event)">★</button><button class="m-thumb-del" onclick="removeMedia('${p.id}',${i},event)">×</button>${i===p.coverIndex?'<div class="cover-badge">Cover</div>':''}</div>`;
  }).join('');
}

// ==================== RENDER EDITOR ====================
function renderEditor(){
  const p=getProj(activeId);if(!p)return;
  const wrap=document.getElementById('editor-wrap');
  wrap.innerHTML=`
  <div class="ed-header"><div><div class="ed-title" id="live-title">${esc(p.title)||'Untitled'}</div><div class="ed-sub">ID: ${p.id}</div></div><button class="btn btn-d btn-sm" onclick="confirmDel('${p.id}')">Delete</button></div>
  <div class="ed-grid">
    <div>
      <div class="card">
        <p class="card-title">Project Info</p>
        <div class="fg"><label>Title *</label><input type="text" value="${esc(p.title)}" oninput="setProp('${p.id}','title',this.value);document.getElementById('live-title').textContent=this.value||'Untitled'"/></div>
        <div class="fg"><label>Subtitle / Role</label><input type="text" value="${esc(p.subtitle)}" oninput="setProp('${p.id}','subtitle',this.value)"/></div>
        <div class="fg"><label>Description</label><div class="rich-editor-wrap" id="desc-editor-${p.id}"></div></div>
        <div class="row2">
          <div class="fg"><label>Year</label><input type="text" value="${esc(p.year)}" oninput="setProp('${p.id}','year',this.value)"/></div>
          <div class="fg"><label>External Link</label><input type="url" value="${esc(p.link)}" oninput="setProp('${p.id}','link',this.value)"/></div>
        </div>
        <div class="row2">
          <div class="fg"><label>Project Type</label><select onchange="setProp('${p.id}','projectType',this.value)"><option value="">Select Type</option><option value="branding" ${p.projectType==='branding'?'selected':''}>Branding</option><option value="uiux" ${p.projectType==='uiux'?'selected':''}>UI/UX</option><option value="print" ${p.projectType==='print'?'selected':''}>Print</option><option value="motion" ${p.projectType==='motion'?'selected':''}>Motion</option><option value="other" ${p.projectType==='other'?'selected':''}>Other</option></select></div>
          <div class="fg"><label>Client Testimonial</label><textarea oninput="setProp('${p.id}','clientTestimonial',this.value)">${esc(p.clientTestimonial)}</textarea></div>
        </div>
      </div>
      <div class="card">
        <p class="card-title">SEO Metadata</p>
        <div class="fg"><label>SEO Title</label><input type="text" value="${esc(p.seoTitle)}" oninput="setProp('${p.id}','seoTitle',this.value)"/></div>
        <div class="fg"><label>SEO Description</label><textarea oninput="setProp('${p.id}','seoDescription',this.value)">${esc(p.seoDescription)}</textarea></div>
        <div class="fg"><label>SEO Image URL</label><input type="url" value="${esc(p.seoImage)}" oninput="setProp('${p.id}','seoImage',this.value)"/></div>
      </div>
      <div class="card"><p class="card-title">Tags</p><input id="tag-inp-${p.id}" onkeydown="addTag(event,'${p.id}')"/><div class="tags-wrap" id="tags-${p.id}">${renderTags(p)}</div></div>
      <div class="card">
        <p class="card-title">Media</p>
        ${config.cloud?`<div class="upload-area"><input type="file" accept="image/*,video/*" multiple onchange="uploadMedia(event,'${p.id}')"/><p>Upload</p></div>`:''}
        <div class="media-grid" id="mgrid-${p.id}">${renderThumbs(p)}</div>
      </div>
    </div>
    <div>
      <div class="card">
        <p class="card-title">Display Settings</p>
        <div class="tog-row"><div><div class="tog-lbl">Mark as Recent ★</div><div class="tog-desc">Entire project appears in slider</div></div><label class="tog"><input type="checkbox" ${p.isRecent?'checked':''} onchange="setProp('${p.id}','isRecent',this.checked)"/><span class="tog-sl"></span></label></div>
        <div class="tog-row"><div><div class="tog-lbl">Featured</div><div class="tog-desc">Highlighted in projects list</div></div><label class="tog"><input type="checkbox" ${p.isFeatured?'checked':''} onchange="setProp('${p.id}','isFeatured',this.checked)"/><span class="tog-sl"></span></label></div>
        <div class="tog-row"><div><div class="tog-lbl">Hidden</div><div class="tog-desc">Remove from public feed</div></div><label class="tog"><input type="checkbox" ${p.isHidden?'checked':''} onchange="setProp('${p.id}','isHidden',this.checked);renderSidebar();"/><span class="tog-sl"></span></label></div>
        <div class="order-actions"><button class="btn btn-s btn-sm" onclick="moveProject('${p.id}',-1)">Move Up</button><button class="btn btn-s btn-sm" onclick="moveProject('${p.id}',1)">Move Down</button></div>
      </div>
      <div class="card"><p class="card-title">AI Involvement</p><input type="range" min="0" max="100" value="${p.aiPercent??0}" oninput="setProp('${p.id}','aiPercent',parseInt(this.value))"/></div>
    </div>
  </div>`;
  const descContainer=document.getElementById(`desc-editor-${p.id}`);
  if(descContainer)new RichTextEditor(descContainer,p.description||'',html=>setProp(p.id,'description',html));
  const grid=document.getElementById(`mgrid-${p.id}`);
  if(grid&&p.media.length)grid.innerHTML=renderThumbs(p);
  initMediaDrag(p.id);
}

// ==================== PUBLISH ====================
async function publishAll(){
  const btn=document.getElementById('pub-btn'),sp=document.getElementById('pub-spin');
  if(btn)btn.disabled=true;if(sp)sp.style.display='block';
  normalizeProjects();
  const history=JSON.parse(localStorage.getItem('cms_projects_history')||'[]');
  history.push({timestamp:new Date().toISOString(),data:JSON.parse(JSON.stringify(projects))});
  if(history.length>20)history.shift();
  localStorage.setItem('cms_projects_history',JSON.stringify(history));
  try{
    const d=await ghPut('projects.json',JSON.stringify(projects,null,2),projSHA,`CMS update — ${new Date().toLocaleString()}`);
    projSHA=d.content.sha;
    logPublish();
    showStatus('Published ✓','success');
    if(typeof renderAnalytics==='function')renderAnalytics();
  }catch(e){showStatus('Publish failed: '+e.message,'error');}
  if(btn)btn.disabled=false;if(sp)sp.style.display='none';
}
function logPublish(){
  try{
    const log=JSON.parse(localStorage.getItem('cms_publish_log')||'[]');
    log.push({timestamp:new Date().toISOString(),projectCount:projects.length});
    if(log.length>50)log.shift();
    localStorage.setItem('cms_publish_log',JSON.stringify(log));
  }catch(e){}
}

// ==================== TAGS ====================
function addTag(e,id){
  if(e.key!=='Enter')return;
  e.preventDefault();
  const inp=document.getElementById(`tag-inp-${id}`);
  const val=inp.value.trim();
  if(!val)return;
  const p=getProj(id);
  if(!p.tags.includes(val)){p.tags.push(val);document.getElementById(`tags-${id}`).innerHTML=renderTags(p);renderSidebar();}
  inp.value='';
}
function removeTag(id,tag){const p=getProj(id);p.tags=p.tags.filter(t=>t!==tag);document.getElementById(`tags-${id}`).innerHTML=renderTags(p);renderSidebar();}
function renderTags(p){if(!p.tags?.length)return `<span style="font-size:.62rem;color:var(--muted);">No tags yet</span>`;return p.tags.map(t=>`<span class="tag-chip" onclick="removeTag('${p.id}','${esc(t)}')">${esc(t)} ×</span>`).join('');}

// ==================== MEDIA UPLOAD ====================
async function compressImage(file,maxWidth=1600,quality=0.85){
  if(!file.type.startsWith('image/'))return file;
  return new Promise(resolve=>{
    const img=new Image();const reader=new FileReader();
    reader.onload=e=>{
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        let w=img.width,h=img.height;
        if(w>maxWidth){h=h*maxWidth/w;w=maxWidth;}
        canvas.width=w;canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        canvas.toBlob(blob=>resolve(new File([blob],file.name,{type:'image/jpeg',lastModified:Date.now()})),'image/jpeg',quality);
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
async function uploadMedia(e,id){
  const cloud=config.cloud||localStorage.getItem('cms_cloud');
  const preset=config.preset||localStorage.getItem('cms_preset');
  if(!cloud||!preset){showStatus('Cloudinary not configured','error');return;}
  const files=Array.from(e.target.files);if(!files.length)return;
  const p=getProj(id);if(!p){showStatus('Project not found','error');return;}
  let ok=0,fail=0;
  showStatus(`Uploading ${files.length} file${files.length>1?'s':''}…`,'info');
  for(const file of files){
    try{
      const compressed=await compressImage(file);
      const isVideo=compressed.type.startsWith('video/');
      const url=await cloudinaryUpload(compressed,cloud,preset);
      p.media.push({url,type:isVideo?'video':'image',showInRecents:true});
      ok++;
      const grid=document.getElementById(`mgrid-${id}`);
      if(grid){grid.innerHTML=renderThumbs(p);if(typeof initMediaDrag==='function')initMediaDrag(id);}
    }catch(err){console.error('Upload failed for',file.name,err);fail++;}
  }
  e.target.value='';
  scheduleAutosave();
  if(ok&&!fail)showStatus(`Uploaded ${ok} file${ok>1?'s':''} ✓`,'success');
  if(ok&&fail)showStatus(`Uploaded ${ok}, failed ${fail} — check console`,'error');
  if(!ok&&fail)showStatus(`All ${fail} upload${fail>1?'s':''} failed`,'error');
}
async function cloudinaryUpload(file,cloud,preset){
  const fd=new FormData();
  fd.append('file',file);
  fd.append('upload_preset',preset);
  const r=await fetch(`https://api.cloudinary.com/v1_1/${cloud}/upload`,{method:'POST',body:fd});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error?.message||`Cloudinary ${r.status}`);}
  const d=await r.json();
  return makeVideoWebSafe(d.secure_url);
}
async function uploadSiteMedia(e,inputId,previewId,progressId){
  const cloud=config.cloud||localStorage.getItem('cms_cloud');
  const preset=config.preset||localStorage.getItem('cms_preset');
  if(!cloud||!preset){showStatus('Cloudinary not configured','error');return;}
  const file=e.target.files[0];if(!file)return;
  const compressed=await compressImage(file);
  try{
    const url=await cloudinaryUpload(compressed,cloud,preset);
    const inp=document.getElementById(inputId);if(inp)inp.value=url;
    if(typeof previewHeroBg==='function')previewHeroBg();
    e.target.value='';
    showStatus('Uploaded ✓','success');
  }catch(err){showStatus('Upload failed: '+err.message,'error');}
}
function removeMedia(id,index,e){e.stopPropagation();const p=getProj(id);p.media.splice(index,1);if(p.coverIndex>=p.media.length)p.coverIndex=0;const g=document.getElementById(`mgrid-${id}`);if(g){g.innerHTML=renderThumbs(p);initMediaDrag(id);}scheduleAutosave();}
function selectCover(id,index){const p=getProj(id);p.coverIndex=index;document.querySelectorAll(`#mgrid-${id} .m-thumb`).forEach((el,i)=>{el.classList.toggle('cover-selected',i===index);});scheduleAutosave();}
function toggleMediaRecent(id,index,e){e.stopPropagation();const p=getProj(id);p.media[index].showInRecents=!p.media[index].showInRecents;const g=document.getElementById(`mgrid-${id}`);if(g){g.innerHTML=renderThumbs(p);initMediaDrag(id);}scheduleAutosave();}
function isVidUrl(url){return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)||url.includes('/video/upload/');}

// ==================== DELETE ====================
let pendingDel=null;
function confirmDel(id){pendingDel=id;document.getElementById('confirm-overlay').classList.add('show');document.getElementById('confirm-del-btn').onclick=()=>{projects=projects.filter(p=>p.id!==pendingDel);activeId=null;renderSidebar();document.getElementById('editor-wrap').innerHTML=`<div class="empty-state"><h2>Deleted</h2></div>`;closeConfirm();showStatus('Deleted — Publish to apply','info');};}
function closeConfirm(){document.getElementById('confirm-overlay').classList.remove('show');}

// ==================== AUTOSAVE ====================
function scheduleAutosave(){
  clearTimeout(autosaveTimer);
  autosaveTimer=setTimeout(()=>{
    localStorage.setItem('cms_projects_draft',JSON.stringify(projects));
    showStatus('Draft saved','info');
  },3000);
}
function startAutosave(){
  setInterval(()=>localStorage.setItem('cms_projects_draft',JSON.stringify(projects)),30000);
  window.addEventListener('beforeunload',()=>localStorage.setItem('cms_projects_draft',JSON.stringify(projects)));
}

// ==================== VERSION HISTORY ====================
function openHistoryModal(){
  const list=document.getElementById('history-list');
  const history=JSON.parse(localStorage.getItem('cms_projects_history')||'[]');
  if(!history.length){list.innerHTML='<p style="color:var(--muted);">No history yet.</p>';}
  else{list.innerHTML=history.map((h,i)=>`<div style="padding:.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><span>${new Date(h.timestamp).toLocaleString()}</span><button class="btn btn-s btn-sm" onclick="restoreVersion(${i})">Restore</button></div>`).join('');}
  document.getElementById('history-overlay').classList.add('show');
}
function restoreVersion(index){
  const history=JSON.parse(localStorage.getItem('cms_projects_history')||'[]');
  if(history[index]){projects=history[index].data;normalizeProjects();renderSidebar();renderEditor();showStatus('Version restored','success');}
  closeHistoryModal();
}
function closeHistoryModal(){document.getElementById('history-overlay').classList.remove('show');}

// ==================== KEYBOARD ====================
function setupKeyboardShortcuts(){
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();publishAll();}
    if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();addProject();}
    if(e.key==='Escape'){closeConfirm();closeHistoryModal();}
  });
}
