// ==================== SITE CONTENT ====================
function initRichEditors(){
  const contactDesc=document.getElementById('rich-s-contact-desc');
  if(contactDesc){new RichTextEditor(contactDesc,siteData.home.contactDesc||'',html=>{siteData.home.contactDesc=html;});richEditorMap['contactDesc']=contactDesc.querySelector('.rte-content');}
  const aboutFields=['aboutFull','eduFull','workFull','skillsFull'];
  const aboutIds={aboutFull:'rich-a-about-full',eduFull:'rich-a-edu-full',workFull:'rich-a-work-full',skillsFull:'rich-a-skills-full'};
  aboutFields.forEach(key=>{
    const container=document.getElementById(aboutIds[key]);
    if(container){new RichTextEditor(container,siteData.about[key]||'',html=>{siteData.about[key]=html;});richEditorMap[key]=container.querySelector('.rte-content');}
  });
}
function fillHomeForm(){
  const d=siteData.home;
  sf('s-name',d.name);sf('s-role',d.role);sf('s-herobg',d.heroBg);
  sf('s-email',d.email);sf('s-linkedin',d.linkedin);sf('s-instagram',d.instagram);
  sf('s-behance',d.behance);sf('s-dribbble',d.dribbble);
  if(d.heroBg)previewHeroBg();
  if(richEditorMap['contactDesc'])richEditorMap['contactDesc'].innerHTML=safeHTML(d.contactDesc||'');
}
function fillAboutForm(){
  const d=siteData.about;
  sf('a-about-short',d.aboutShort);sf('a-edu-short',d.eduShort);
  sf('a-work-short',d.workShort);sf('a-skills-short',d.skillsShort);
  sf('a-exp-start',d.expStart||'2023');sf('a-projects-count',d.projectsCount||'10+');
  const aboutFields=['aboutFull','eduFull','workFull','skillsFull'];
  aboutFields.forEach(key=>{if(richEditorMap[key])richEditorMap[key].innerHTML=safeHTML(d[key]||'');});
}
function sf(id,val){const el=document.getElementById(id);if(el)el.value=val||'';}
function gf(id){return document.getElementById(id)?.value.trim()||'';}
async function saveSiteContent(section){
  let data,sha,filename;
  if(section==='home'){
    data={name:gf('s-name'),role:gf('s-role'),heroBg:gf('s-herobg'),contactDesc:safeHTML(richEditorMap['contactDesc']?.innerHTML||''),email:gf('s-email'),linkedin:gf('s-linkedin'),instagram:gf('s-instagram'),behance:gf('s-behance'),dribbble:gf('s-dribbble')};
    sha=homeSHA;filename='site-home.json';
  }else if(section==='about'){
    data={...siteData.about,aboutShort:gf('a-about-short'),aboutFull:safeHTML(richEditorMap['aboutFull']?.innerHTML||''),eduShort:gf('a-edu-short'),eduFull:safeHTML(richEditorMap['eduFull']?.innerHTML||''),workShort:gf('a-work-short'),workFull:safeHTML(richEditorMap['workFull']?.innerHTML||''),skillsShort:gf('a-skills-short'),skillsFull:safeHTML(richEditorMap['skillsFull']?.innerHTML||''),expStart:gf('a-exp-start'),projectsCount:gf('a-projects-count'),reviews};
    sha=aboutSHA;filename='site-about.json';
  }else{
    data={eyebrow:gf('pp-eyebrow'),pageTitle:gf('pp-title'),endMarker:gf('pp-end'),recentsLabel:gf('pp-recents-label')};
    sha=null;filename='site-projects.json';
  }
  try{
    const d=await ghPut(filename,JSON.stringify(data,null,2),sha,`CMS: update ${filename} — ${new Date().toLocaleString()}`);
    if(section==='home'){homeSHA=d.content.sha;siteData.home=data;}
    else if(section==='about'){aboutSHA=d.content.sha;siteData.about=data;}
    showStatus(`${section} published ✓`,'success');
  }catch(e){showStatus('Publish failed: '+e.message,'error');}
}
function previewHeroBg(){
  const url=document.getElementById('s-herobg')?.value.trim()||'';
  const div=document.getElementById('hero-bg-preview');
  if(!div)return;
  if(!url){div.innerHTML='';return;}
  div.innerHTML=isVidUrl(url)
    ?`<video src="${esc(url)}" muted loop autoplay style="width:100%;max-height:160px;object-fit:cover;border:1px solid var(--border);margin-top:.5rem;border-radius:3px;"></video>`
    :`<img src="${esc(url)}" style="width:100%;max-height:160px;object-fit:cover;border:1px solid var(--border);margin-top:.5rem;border-radius:3px;" onerror="this.style.display='none'"/>`;
}

// ==================== REVIEWS ====================
function newReviewId(){return 'rev_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);}
function renderReviews(){
  const list=document.getElementById('reviews-list');if(!list)return;
  if(!reviews.length){list.innerHTML=`<div class="booking-empty"><h3>No reviews yet</h3><p>Click "+ Add Review" to add your first client review.</p></div>`;return;}
  list.innerHTML=reviews.map((r,i)=>{
    const id=r.id||('rev_legacy_'+i);if(!r.id)r.id=id;
    const stars=Math.max(1,Math.min(5,Number(r.stars)||5));
    return `<div class="review-item" data-id="${esc(id)}"><div class="review-item-head"><span class="review-num">Review #${i+1}</span><button class="review-delete" title="Delete review" onclick="deleteReview('${esc(id)}')">×</button></div><div class="row2"><div class="fg"><label>Name</label><input type="text" value="${esc(r.name||'')}" oninput="updateReviewField('${esc(id)}','name',this.value)"/></div><div class="fg"><label>Role / Company</label><input type="text" value="${esc(r.role||'')}" oninput="updateReviewField('${esc(id)}','role',this.value)"/></div></div><div class="fg"><label>Quote</label><textarea oninput="updateReviewField('${esc(id)}','quote',this.value)" style="min-height:70px;">${esc(r.quote||'')}</textarea></div><div class="fg"><label>Rating</label><div class="stars-row">${[1,2,3,4,5].map(s=>`<span class="star ${s<=stars?'on':''}" onclick="setReviewStars('${esc(id)}',${s})" title="${s} star${s>1?'s':''}">★</span>`).join('')}</div></div></div>`;
  }).join('');
}
function addReview(){reviews.push({id:newReviewId(),name:'',role:'',quote:'',stars:5});renderReviews();showStatus('Review added — fill in details and publish','info');}
function updateReviewField(id,field,value){const r=reviews.find(x=>x.id===id);if(!r)return;r[field]=value;}
function setReviewStars(id,stars){const r=reviews.find(x=>x.id===id);if(!r)return;r.stars=Math.max(1,Math.min(5,stars));renderReviews();}
async function deleteReview(id){if(!confirm('Delete this review?'))return;reviews=reviews.filter(r=>r.id!==id);renderReviews();showStatus('Review removed — publish to apply','info');}
async function saveReviews(){
  try{
    const data={...siteData.about,reviews};
    const d=await ghPut('site-about.json',JSON.stringify(data,null,2),aboutSHA,`Reviews update — ${new Date().toLocaleString()}`);
    aboutSHA=d.content.sha;siteData.about=data;
    if(typeof renderAnalytics==='function')renderAnalytics();
    showStatus('Reviews published ✓','success');
  }catch(e){showStatus('Publish failed: '+e.message,'error');}
}

// ==================== BOOKINGS ====================
function updateUnreadBadge(){
  const badge=document.getElementById('unread-badge');if(!badge)return;
  const unread=bookings.filter(b=>!b.read&&!b.replied).length;
  if(unread>0){badge.textContent=unread;badge.style.display='inline-block';}
  else{badge.style.display='none';}
}
function renderBookings(){
  const list=document.getElementById('bookings-list');if(!list)return;
  updateUnreadBadge();
  if(!bookings.length){list.innerHTML=`<div class="booking-empty"><h3>No bookings yet</h3><p>Messages sent through your booking page will appear here.</p></div>`;return;}
  const sorted=[...bookings].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  list.innerHTML=sorted.map(b=>{
    const status=b.replied?'replied':b.read?'read':'new';
    const statusLabel=status==='new'?'New':status==='read'?'Read':'Replied';
    const dateStr=b.date?new Date(b.date).toLocaleString():'';
    const isUnread=!b.read&&!b.replied;
    return `<div class="booking-card ${isUnread?'unread':''}" onclick="toggleBookingDetail('${esc(b.id)}')"><div class="booking-card-head"><div><div class="booking-name">${esc(b.name||'Unnamed')}</div><div class="booking-date">${esc(dateStr)}</div></div><div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;">${b.projectType?`<span class="booking-type">${esc(b.projectType)}</span>`:''}<span class="booking-status bs-${status}">${statusLabel}</span></div></div><div class="booking-preview">${esc((b.message||'').slice(0,140))}${(b.message||'').length>140?'…':''}</div><div class="booking-detail" id="bd-${esc(b.id)}"><div class="detail-row"><div class="detail-label">Email</div><div class="detail-val"><a href="mailto:${esc(b.email||'')}" style="color:var(--accent);">${esc(b.email||'')}</a></div></div>${b.phone?`<div class="detail-row"><div class="detail-label">Phone</div><div class="detail-val"><a href="tel:${esc(b.phone)}" style="color:var(--accent);">${esc(b.phone)}</a></div></div>`:''}${b.company?`<div class="detail-row"><div class="detail-label">Company</div><div class="detail-val">${esc(b.company)}</div></div>`:''}${b.budget?`<div class="detail-row"><div class="detail-label">Budget</div><div class="detail-val">${esc(b.budget)}</div></div>`:''}${b.timeline?`<div class="detail-row"><div class="detail-label">Timeline</div><div class="detail-val">${esc(b.timeline)}</div></div>`:''}<div class="detail-row"><div class="detail-label">Message</div><div class="detail-val" style="white-space:pre-wrap;">${esc(b.message||'')}</div></div><div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap;" onclick="event.stopPropagation();"><a class="btn btn-p btn-sm" href="mailto:${esc(b.email||'')}?subject=Re:%20Your%20project%20inquiry">Reply via Email</a>${!b.read&&!b.replied?`<button class="btn btn-s btn-sm" onclick="setBookingStatus('${esc(b.id)}','read')">Mark Read</button>`:''}${!b.replied?`<button class="btn btn-s btn-sm" onclick="setBookingStatus('${esc(b.id)}','replied')">Mark Replied</button>`:''}<button class="btn btn-d btn-sm" onclick="deleteBooking('${esc(b.id)}')">Delete</button></div></div></div>`;
  }).join('');
}
function toggleBookingDetail(id){const el=document.getElementById('bd-'+id);if(el)el.classList.toggle('open');}
async function saveBookings(){
  try{
    const d=await ghPut('bookings.json',JSON.stringify(bookings,null,2),bookingsSHA,`Bookings update — ${new Date().toLocaleString()}`);
    bookingsSHA=d.content.sha;return true;
  }catch(e){showStatus('Save failed: '+e.message,'error');return false;}
}
async function setBookingStatus(id,status){
  const b=bookings.find(x=>x.id===id);if(!b)return;
  if(status==='read'){b.read=true;}
  if(status==='replied'){b.read=true;b.replied=true;b.repliedAt=new Date().toISOString();}
  renderBookings();
  if(await saveBookings()){showStatus('Booking updated ✓','success');if(typeof renderAnalytics==='function')renderAnalytics();}
}
async function deleteBooking(id){
  if(!confirm('Delete this booking?'))return;
  bookings=bookings.filter(b=>b.id!==id);
  renderBookings();
  if(await saveBookings()){showStatus('Booking deleted','success');if(typeof renderAnalytics==='function')renderAnalytics();}
}
async function refreshBookings(){
  const list=document.getElementById('bookings-list');
  if(list)list.innerHTML='<div class="booking-empty"><h3>Refreshing…</h3></div>';
  try{
    const bd=await ghGet('bookings.json');
    if(bd){bookingsSHA=bd.sha;const parsed=ghDecode(bd.content);bookings=Array.isArray(parsed)?parsed:[];}
    else{bookings=[];bookingsSHA=null;}
    lastBookingCount=bookings.length;
    renderBookings();
    if(typeof renderAnalytics==='function')renderAnalytics();
    showStatus('Bookings refreshed','success');
  }catch(e){showStatus('Refresh failed: '+e.message,'error');renderBookings();}
}
async function syncPendingBookings(){
  try{
    const pending=JSON.parse(localStorage.getItem('pending_bookings')||'[]');
    if(!pending.length)return;
    let added=0;
    for(const p of pending){if(!bookings.find(b=>b.id===p.id)){bookings.push(p);added++;}}
    if(added){localStorage.removeItem('pending_bookings');renderBookings();if(await saveBookings())showStatus(`Synced ${added} pending booking${added>1?'s':''}`,'success');}
  }catch(e){console.error('Sync pending failed:',e);}
}
async function clearAllBookings(){
  if(!bookings.length){showStatus('No bookings to clear','info');return;}
  if(!confirm(`Delete all ${bookings.length} booking(s)? This cannot be undone.`))return;
  bookings=[];
  renderBookings();
  if(await saveBookings()){showStatus('All bookings cleared','success');if(typeof renderAnalytics==='function')renderAnalytics();}
}
