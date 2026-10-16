// ==================== ANALYTICS ====================
function renderAnalytics(){
  const totalProjects=projects.length;
  const recents=projects.filter(p=>p.isRecent).length;
  const hidden=projects.filter(p=>p.isHidden).length;
  const totalBookings=bookings.length;
  const unreadBookings=bookings.filter(b=>!b.read&&!b.replied).length;
  const totalReviews=reviews.length;
  const totalMedia=projects.reduce((sum,p)=>sum+(Array.isArray(p.media)?p.media.length:0),0);
  const featured=projects.filter(p=>p.isFeatured).length;
  const avgStars=reviews.length?(reviews.reduce((s,r)=>s+(Number(r.stars)||0),0)/reviews.length).toFixed(1):'—';
  const setNum=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  setNum('an-projects',totalProjects);
  setNum('an-recents',recents);
  setNum('an-bookings',totalBookings);
  setNum('an-unread',unreadBookings);
  setNum('an-reviews',totalReviews);
  setNum('an-media',totalMedia);
  const subProj=document.getElementById('an-projects-sub');
  if(subProj)subProj.textContent=`${featured} featured · ${hidden} hidden`;
  const subRec=document.getElementById('an-recents-sub');
  if(subRec)subRec.textContent=totalProjects?`${Math.round(recents/totalProjects*100)}% of portfolio`:'none yet';
  const subBk=document.getElementById('an-bookings-sub');
  if(subBk)subBk.textContent=totalBookings?`${bookings.filter(b=>b.replied).length} replied`:'no inquiries yet';
  const subUn=document.getElementById('an-unread-sub');
  if(subUn)subUn.textContent=unreadBookings?'need attention':'all caught up';
  const subRev=document.getElementById('an-reviews-sub');
  if(subRev)subRev.textContent=reviews.length?`avg ${avgStars} ★`:'none yet';
  const subMed=document.getElementById('an-media-sub');
  if(subMed)subMed.textContent=`${totalProjects?Math.round(totalMedia/totalProjects*10)/10:0} per project`;
  renderBookingsChart();
  renderContentChecklist();
  renderYearChart();
  renderTagsChart();
  renderRecentBookings();
  renderPublishLog();
  renderHealth({totalProjects,recents,hidden,totalBookings,unreadBookings,totalReviews,totalMedia});
}
function renderBookingsChart(){
  const el=document.getElementById('weekly-chart');if(!el)return;
  const weeks=[];
  const now=new Date();
  for(let i=7;i>=0;i--){
    const end=new Date(now);end.setDate(end.getDate()-i*7);
    const start=new Date(end);start.setDate(start.getDate()-7);
    const count=bookings.filter(b=>{if(!b.date)return false;const d=new Date(b.date);return d>=start&&d<end;}).length;
    const label=i===0?'NOW':`${end.getMonth()+1}/${end.getDate()}`;
    weeks.push({label,count});
  }
  const max=Math.max(1,...weeks.map(w=>w.count));
  el.innerHTML=weeks.map(w=>`<div class="weekly-col"><div class="weekly-value">${w.count||''}</div><div class="weekly-bar-wrap"><div class="weekly-bar" style="height:${(w.count/max)*100}%"></div></div><div class="weekly-label">${w.label}</div></div>`).join('');
  const oneWeek=7*24*60*60*1000,oneMonth=30*24*60*60*1000;
  const nowMs=Date.now();
  const wkEl=document.getElementById('bk-week');if(wkEl)wkEl.textContent=bookings.filter(b=>b.date&&nowMs-new Date(b.date).getTime()<oneWeek).length;
  const moEl=document.getElementById('bk-month');if(moEl)moEl.textContent=bookings.filter(b=>b.date&&nowMs-new Date(b.date).getTime()<oneMonth).length;
  const totEl=document.getElementById('bk-total');if(totEl)totEl.textContent=bookings.length;
  const repEl=document.getElementById('bk-replied');if(repEl)repEl.textContent=bookings.filter(b=>b.replied).length;
  const withReply=bookings.filter(b=>b.date&&b.repliedAt);
  const avgResponse=withReply.length?withReply.reduce((s,b)=>s+(new Date(b.repliedAt)-new Date(b.date)),0)/withReply.length:0;
  const respEl=document.getElementById('bk-response');if(respEl)respEl.textContent=withReply.length?formatDuration(avgResponse):'—';
}
function formatDuration(ms){
  const h=ms/(1000*60*60);
  if(h<1)return Math.round(ms/(1000*60))+'m';
  if(h<24)return Math.round(h)+'h';
  return Math.round(h/24)+'d';
}
function getContentIssues(){
  const stripped=s=>(s||'').replace(/<[^>]*>/g,'').trim();
  return [
    {key:'desc',icon:'📝',label:'Projects missing description',projects:projects.filter(p=>stripped(p.description).length<20),fix:null},
    {key:'subtitle',icon:'💬',label:'Projects missing subtitle',projects:projects.filter(p=>!p.subtitle||!p.subtitle.trim()),fix:null},
    {key:'media',icon:'🖼️',label:'Projects with no media',projects:projects.filter(p=>!p.media||!p.media.length),fix:null},
    {key:'seo',icon:'🔍',label:'Projects missing SEO meta',projects:projects.filter(p=>!p.seoTitle||!p.seoDescription),fix:()=>{projects.forEach(p=>{if(!p.seoTitle)p.seoTitle=(p.title||'Untitled')+' — Ismael Asumanu Prince';if(!p.seoDescription){const src=stripped(p.subtitle)||stripped(p.description);p.seoDescription=src?src.slice(0,155):`View ${p.title||'this project'} — a project by Ismael Asumanu Prince.`;}});}},
    {key:'year',icon:'📅',label:'Projects missing year',projects:projects.filter(p=>!p.year),fix:()=>{const y=new Date().getFullYear()+'';projects.forEach(p=>{if(!p.year)p.year=y;});}},
    {key:'tags',icon:'🏷️',label:'Projects with no tags',projects:projects.filter(p=>!p.tags||!p.tags.length),fix:()=>{projects.forEach(p=>{if(!p.tags||!p.tags.length)p.tags=['Untagged'];});}},
  ];
}
function renderContentChecklist(){
  const el=document.getElementById('content-checklist');if(!el)return;
  const issues=getContentIssues();
  el.innerHTML=issues.map(it=>{
    const count=it.projects.length;
    const isClear=count===0;
    return `<div class="checklist-item ${isClear?'clear':''}" data-key="${it.key}"><div class="checklist-header" ${isClear?'':'onclick="toggleChecklistItem(\''+it.key+'\')"'}><span class="checklist-icon">${it.icon}</span><span class="checklist-label">${it.label}</span><span class="checklist-count ${isClear?'ok':'warn'}">${isClear?'✓ clear':count}</span>${isClear?'':'<span class="checklist-chev">▾</span>'}</div>${isClear?'':`<div class="checklist-detail" id="cl-detail-${it.key}" style="display:none;">${it.fix?`<button class="btn btn-s btn-sm checklist-fix" onclick="applyChecklistFix('${it.key}',event)">⚡ Fix all ${count}</button>`:''}<div class="checklist-projects">${it.projects.slice(0,20).map(p=>`<div class="checklist-project-row" onclick="event.stopPropagation();jumpToProject('${esc(p.id)}')"><span class="checklist-project-title">${esc(p.title||'Untitled')}</span><span class="checklist-project-id">${esc(p.id)}</span></div>`).join('')}${it.projects.length>20?`<div class="checklist-more">…and ${it.projects.length-20} more</div>`:''}</div></div>`}</div>`;
  }).join('');
}
function toggleChecklistItem(key){
  const item=document.querySelector('.checklist-item[data-key="'+key+'"]');
  const detail=document.getElementById('cl-detail-'+key);
  if(!item||!detail)return;
  const isOpen=detail.style.display!=='none';
  detail.style.display=isOpen?'none':'block';
  item.classList.toggle('open',!isOpen);
}
function applyChecklistFix(key,event){
  event.stopPropagation();
  const issue=getContentIssues().find(i=>i.key===key);
  if(!issue||!issue.fix)return;
  const count=issue.projects.length;
  if(count===0)return;
  if(!confirm(`Apply fix to ${count} project${count===1?'':'s'}?\n\nThis edits them in memory. Click "Publish All" to save.`))return;
  issue.fix();
  renderAnalytics();
  renderSidebar();
  if(activeId)renderEditor();
  scheduleAutosave();
  showStatus(`Fixed ${count} project${count===1?'':'s'} — click Publish All to save`,'success');
}
function jumpToProject(id){
  switchTab('projects');
  setTimeout(()=>{
    selectProject(id);
    const sidebar=document.getElementById('sb-list');
    if(sidebar){const row=sidebar.querySelector('.pi.on');if(row)row.scrollIntoView({block:'nearest',behavior:'smooth'});}
  },60);
}
function renderYearChart(){
  const el=document.getElementById('year-chart');if(!el)return;
  const counts={};
  projects.forEach(p=>{const y=p.year||'Unknown';counts[y]=(counts[y]||0)+1;});
  const entries=Object.entries(counts).sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
  if(!entries.length){el.innerHTML='<p class="hint" style="margin:0;">No projects yet.</p>';return;}
  const max=Math.max(...entries.map(e=>e[1]));
  el.innerHTML=entries.map(([year,n])=>`<div class="chart-row"><span class="chart-label">${esc(year)}</span><div class="chart-track"><div class="chart-fill" style="width:${(n/max)*100}%"></div></div><span class="chart-value">${n}</span></div>`).join('');
}
function renderTagsChart(){
  const el=document.getElementById('tags-chart');if(!el)return;
  const counts={};
  projects.forEach(p=>(p.tags||[]).forEach(t=>{counts[t]=(counts[t]||0)+1;}));
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(!entries.length){el.innerHTML='<p class="hint" style="margin:0;">No tags yet.</p>';return;}
  const max=Math.max(...entries.map(e=>e[1]));
  el.innerHTML=entries.map(([tag,n])=>`<div class="chart-row"><span class="chart-label">${esc(tag)}</span><div class="chart-track"><div class="chart-fill" style="width:${(n/max)*100}%"></div></div><span class="chart-value">${n}</span></div>`).join('');
}
function renderRecentBookings(){
  const el=document.getElementById('recent-bookings');if(!el)return;
  if(!bookings.length){el.innerHTML='<p class="hint" style="margin:0;">No bookings yet.</p>';return;}
  const sorted=[...bookings].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,5);
  el.innerHTML=sorted.map(b=>{
    const status=b.replied?'replied':b.read?'read':'new';
    const statusLabel=status==='new'?'NEW':status==='read'?'READ':'REPLIED';
    const dateStr=b.date?new Date(b.date).toLocaleDateString():'';
    return `<div class="activity-row clickable" onclick="switchTab('bookings');setTimeout(()=>toggleBookingDetail('${esc(b.id)}'),50);"><span class="activity-title">${esc(b.name||'Unnamed')} — ${esc(b.projectType||'no type')}</span><span class="activity-meta">${statusLabel} · ${esc(dateStr)}</span></div>`;
  }).join('');
}
function renderPublishLog(){
  const el=document.getElementById('publish-log');if(!el)return;
  const log=JSON.parse(localStorage.getItem('cms_publish_log')||'[]');
  if(!log.length){el.innerHTML='<p class="hint" style="margin:0;">No publishes yet. Publish All to start tracking.</p>';return;}
  el.innerHTML=log.slice(-5).reverse().map(entry=>{
    const d=new Date(entry.timestamp);
    const ago=formatAgo(Date.now()-d.getTime());
    return `<div class="activity-row"><span class="activity-title">Published ${entry.projectCount} project${entry.projectCount===1?'':'s'}</span><span class="activity-meta">${ago} ago</span></div>`;
  }).join('');
}
function formatAgo(ms){
  const s=Math.floor(ms/1000);
  if(s<60)return s+'s';
  const m=Math.floor(s/60);
  if(m<60)return m+'m';
  const h=Math.floor(m/60);
  if(h<24)return h+'h';
  return Math.floor(h/24)+'d';
}
function renderHealth(stats){
  const el=document.getElementById('health-list');if(!el)return;
  const connected=!!(config.user&&config.repo&&config.token);
  const cloud=!!(config.cloud||localStorage.getItem('cms_cloud'));
  const preset=!!(config.preset||localStorage.getItem('cms_preset'));
  const ga=!!(config.gaId);
  el.innerHTML=`
    <div class="health-row"><span class="health-key">GitHub Repo</span><span class="health-val ${connected?'ok':'err'}">${connected?esc(config.user+'/'+config.repo):'Not connected'}</span></div>
    <div class="health-row"><span class="health-key">Cloudinary</span><span class="health-val ${cloud?'ok':'warn'}">${cloud?'Connected ('+esc(config.cloud||localStorage.getItem('cms_cloud'))+')':'Not configured'}</span></div>
    <div class="health-row"><span class="health-key">Upload Preset</span><span class="health-val ${preset?'ok':'warn'}">${preset?esc(config.preset||localStorage.getItem('cms_preset')):'Not set'}</span></div>
    <div class="health-row"><span class="health-key">Video Codec Fix</span><span class="health-val ok">Active (vc_auto)</span></div>
    <div class="health-row"><span class="health-key">Google Analytics</span><span class="health-val ${ga?'ok':'warn'}">${ga?'Connected ('+esc(config.gaId)+')':'Not connected'}</span></div>
    <div class="health-row"><span class="health-key">Hidden Projects</span><span class="health-val">${stats.hidden}</span></div>
    <div class="health-row"><span class="health-key">DOMPurify (XSS filter)</span><span class="health-val ${typeof DOMPurify!=='undefined'?'ok':'warn'}">${typeof DOMPurify!=='undefined'?'Loaded':'Fallback mode'}</span></div>
    <div class="health-row"><span class="health-key">Last loaded</span><span class="health-val">${new Date().toLocaleString()}</span></div>`;
}
function setupGA(){
  const area = document.getElementById('ga-setup-area');
  if(!area) return;
  const gaUrl = 'https://analytics.google.com/analytics/web/#/a/reporting/reporting-overview';
  const clarityUrl = 'https://clarity.microsoft.com/';
  const searchConsoleUrl = 'https://search.google.com/search-console';
  const gaConnected = !!config.gaId;
  area.innerHTML = `
    <div style="display:flex;gap:.55rem;flex-wrap:wrap;margin-bottom:1rem;">
      <a href="${gaUrl}" target="_blank" rel="noopener" class="btn btn-p btn-sm" style="text-decoration:none;">
        📊 Google Analytics
      </a>
      <a href="${clarityUrl}" target="_blank" rel="noopener" class="btn btn-s btn-sm" style="text-decoration:none;">
        🔥 Microsoft Clarity
      </a>
      <a href="${searchConsoleUrl}" target="_blank" rel="noopener" class="btn btn-s btn-sm" style="text-decoration:none;">
        🔎 Search Console
      </a>
    </div>
    <div style="padding-top:.9rem;border-top:1px solid var(--border);">
      <div class="health-row"><span class="health-key">📊 Google Analytics</span><span class="health-val">Who visited · where they came from · device · country</span></div>
      <div class="health-row"><span class="health-key">🔥 Clarity</span><span class="health-val">Session recordings · heatmaps · rage clicks · speed</span></div>
      <div class="health-row"><span class="health-key">🔎 Search Console</span><span class="health-val">Search queries · indexing · sitemaps</span></div>
    </div>
    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
      ${gaConnected
        ? `<div class="ga-connected"><span class="ga-dot"></span><span style="font-size:.78rem;">Connected to <strong>${esc(config.gaId)}</strong></span><button class="btn btn-s btn-sm" onclick="disconnectGA()" style="margin-left:auto;">Disconnect</button></div>`
        : `<div class="ga-setup"><input id="ga-id-update" placeholder="G-XXXXXXXXXX"/><button class="btn btn-p btn-sm" onclick="saveGaId()">Connect GA</button></div>`
      }
    </div>
  `;
}




function saveGaId(){
  const val=(document.getElementById('ga-id-update')?.value||'').trim();
  if(!val||!/^G-[A-Z0-9]+$/i.test(val)){showStatus('Invalid GA ID — should look like G-XXXXXXXX','error');return;}
  config.gaId=val;
  const saved=JSON.parse(localStorage.getItem('cms_cfg')||'{}');
  saved.gaId=val;
  localStorage.setItem('cms_cfg',JSON.stringify(saved));
  setupGA();
  showStatus('Google Analytics connected ✓','success');
}
function disconnectGA(){
  config.gaId='';
  const saved=JSON.parse(localStorage.getItem('cms_cfg')||'{}');
  delete saved.gaId;
  localStorage.setItem('cms_cfg',JSON.stringify(saved));
  setupGA();
  showStatus('Google Analytics disconnected','info');
}
function updateAnalytics(){renderAnalytics();}

// ==================== EXPORT ====================
function exportData(what){
  const stamp=new Date().toISOString().slice(0,10);
  if(what==='projects'){downloadJSON(projects,`projects-${stamp}.json`);}
  else if(what==='bookings'){downloadJSON(bookings,`bookings-${stamp}.json`);}
  else if(what==='reviews'){downloadJSON(reviews,`reviews-${stamp}.json`);}
  else if(what==='all'){const bundle={exportedAt:new Date().toISOString(),projects,bookings,reviews,siteData};downloadJSON(bundle,`prince-backup-${stamp}.json`);}
}
function downloadJSON(data,filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus(`Downloaded ${filename}`,'success');
}
