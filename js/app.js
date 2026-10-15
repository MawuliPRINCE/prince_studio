// ==================== INIT ====================
async function initApp(){
  try{
    const [pd,hd,ad,bd] = await Promise.all([
      ghGet('projects.json'),
      ghGet('site-home.json'),
      ghGet('site-about.json'),
      ghGet('bookings.json')
    ]);
    if(pd){ projSHA = pd.sha; projects = ghDecode(pd.content); }
    else { projects = []; projSHA = null; }
    if(!projects.length){
      const draft = localStorage.getItem('cms_projects_draft');
      if(draft){ projects = JSON.parse(draft); }
    }
    normalizeProjects();
    if(hd){ homeSHA = hd.sha; siteData.home = ghDecode(hd.content); fillHomeForm(); }
    if(ad){ aboutSHA = ad.sha; siteData.about = ghDecode(ad.content); fillAboutForm(); }
    reviews = Array.isArray(siteData.about.reviews) ? siteData.about.reviews : [];
    if(bd){
      bookingsSHA = bd.sha;
      const parsed = ghDecode(bd.content);
      bookings = Array.isArray(parsed) ? parsed : [];
    } else {
      bookings = [];
      bookingsSHA = null;
    }
    lastBookingCount = bookings.length;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('repo-display').textContent = `${config.user}/${config.repo}`;
    initSidebarFilterDropdown();
    renderSidebar();
    renderBookings();
    renderReviews();
    renderAnalytics();
    await syncPendingBookings();
    if(config.gaId) setupGA();
    initRichEditors();
    setupKeyboardShortcuts();
    startAutosave();
    startBookingNotifications();
    setupResizeHandler();
    showStatus('Connected ✓','success');
  } catch(e){
    loginErr(e.message);
  }
}

// ==================== SIDEBAR FILTER DROPDOWN ====================
function initSidebarFilterDropdown(){
  const sel = document.getElementById('sb-view-filter');
  if(!sel) return;
  sel.value = sidebarFilter;
  // Reflect any archived count in the dropdown label
  const archivedCount = projects.filter(p => p.isArchived).length;
  const opt = sel.querySelector('option[value="archived"]');
  if(opt) opt.textContent = archivedCount ? `Archived (${archivedCount})` : 'Archived only';
}

// ==================== TABS ====================
const tabIds = ['projects','site','reviews','bookings','analytics'];
function switchTab(tab){
  document.querySelectorAll('.tab').forEach((b,i) => b.classList.toggle('on', tabIds[i] === tab));
  document.querySelectorAll('.panel').forEach((p,i) => p.classList.toggle('on', tabIds[i] === tab));
  if(tab === 'bookings') refreshBookings();
  if(tab === 'analytics') renderAnalytics();
  if(tab === 'projects') closeSidebarDrawer();
}
function switchSiteTab(tab){
  document.querySelectorAll('.st').forEach(b => b.classList.remove('on'));
  if(event && event.target) event.target.classList.add('on');
  document.querySelectorAll('.site-section').forEach(s => s.classList.remove('on'));
  const map = { home:'ss-home', about:'ss-about', 'projects-page':'ss-projects-page' };
  const el = document.getElementById(map[tab]);
  if(el) el.classList.add('on');
}

// ==================== RESIZE (drawer auto-close on desktop) ====================
function setupResizeHandler(){
  let wasMobile = window.matchMedia('(max-width:768px)').matches;
  window.addEventListener('resize', () => {
    const isMobile = window.matchMedia('(max-width:768px)').matches;
    if(wasMobile && !isMobile){
      // Leaving mobile → drawer is now irrelevant, close it
      closeSidebarDrawer();
    }
    wasMobile = isMobile;
  }, { passive: true });
}

// ==================== BOOKING NOTIFICATIONS ====================
function startBookingNotifications(){
  setInterval(async () => {
    try{
      const bd = await ghGet('bookings.json');
      if(bd){
        const current = ghDecode(bd.content);
        if(Array.isArray(current) && current.length > lastBookingCount){
          showStatus(`${current.length - lastBookingCount} new booking(s)`, 'info');
          if(Notification.permission === 'granted'){
            new Notification('New Booking', { body: `${current.length - lastBookingCount} new booking(s)` });
          }
          lastBookingCount = current.length;
          bookings = current;
          renderBookings();
          renderAnalytics();
        }
      }
    } catch(e){}
  }, 60000);
}

// ==================== BOOT ====================
window.onload = () => {
  // If a local config.js was loaded, log in silently — no form
  if(window.STUDIO_CONFIG && window.STUDIO_CONFIG.ghToken){
    handleLogin();
    return;
  }
  const saved = localStorage.getItem('cms_cfg');
  const token = sessionStorage.getItem('cms_tok');
  if(saved && token){
    const c = JSON.parse(saved);
    const cloud = c.cloud || localStorage.getItem('cms_cloud') || '';
    const preset = c.preset || localStorage.getItem('cms_preset') || '';
    config = { ...c, token, cloud, preset };
    document.getElementById('gh-user').value = c.user || '';
    document.getElementById('gh-repo').value = c.repo || '';
    document.getElementById('gh-branch').value = c.branch || 'main';
    document.getElementById('gh-token').value = token;
    document.getElementById('cl-cloud').value = cloud;
    document.getElementById('cl-preset').value = preset;
    if(c.gaId) document.getElementById('ga-id').value = c.gaId;
    initApp();
  }
};
