  window._today = new Date().toISOString().split('T')[0];
  document.getElementById('dateInput').value = window._today;
  window._imgBase64 = null; window._imgFile = null;
  window._editImgBase64 = null; window._editImgFile = null;

  // ── Theme toggle ──
  (function() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isLight = saved ? saved === 'light' : !prefersDark;
    if (isLight) document.documentElement.classList.add('light');
    document.getElementById('themeToggle').textContent = isLight ? '☀️' : '🌙';
    document.querySelector('meta[name="theme-color"]').content = isLight ? '#f5f0eb' : '#0e0b0f';
  })();

  window.toggleTheme = function() {
    const html = document.documentElement;
    const nowLight = html.classList.toggle('light');
    const btn = document.getElementById('themeToggle');
    btn.textContent = nowLight ? '☀️' : '🌙';
    document.querySelector('meta[name="theme-color"]').content = nowLight ? '#f5f0eb' : '#0e0b0f';
    localStorage.setItem('theme', nowLight ? 'light' : 'dark');
  };

  const BRAND_COLORS = {
    risque:'#d9546a', impala:'#9960c0', colorama:'#4a9ee0', outras:'#4fc87a', '':'#5e4f5a'
  };
  window.updateBrandDot = function(dotId, selectId) {
    const val = document.getElementById(selectId).value;
    const col = BRAND_COLORS[val] || BRAND_COLORS[''];
    const el = document.getElementById(dotId);
    el.style.background = col;
    el.style.boxShadow = val ? `0 0 6px ${col}66` : 'none';
  };

  window._allItems = [];
  window._activeFilter = 'all';
  window._activeStatus = 'all';
  window._usedItems = JSON.parse(localStorage.getItem('usedItems') || '{}');

  // ── Surpreenda-me ──
  window.openSurprise = function() {
    const escHtml = window._escHtml || (s => s);
    const fmtDate = window._fmtDate || (d => d);
    const valid = window._allItems.filter(n => !n.date || window.getDaysUntilExpiry(n.date) > 0);
    if (!valid.length) { showToast('Nenhum esmalte válido na coleção!'); return; }
    const n = valid[Math.floor(Math.random() * valid.length)];
    const BL = {risque:'Risqué',impala:'Impala',colorama:'Colorama',outras:'Outras'};
    const b = n.brand||''; const bl = BL[b]||'';
    const wrap = document.getElementById('surpriseImgWrap');
    wrap.innerHTML = n.img
      ? `<img src="${escHtml(n.img)}" alt="${escHtml(n.name)}" onerror="this.style.display='none'"/>`
      : `<span class="surprise-no-img">🧴</span>`;
    document.getElementById('surpriseName').textContent = n.name || '—';
    document.getElementById('surpriseDate').textContent = n.date ? `Válido até ${fmtDate(n.date)}` : '';
    document.getElementById('surpriseBrandTag').innerHTML = bl
      ? `<span class="brand-tag ${escHtml(b)}">${escHtml(bl)}</span>` : '';
    document.getElementById('surpriseOverlay').classList.add('open');
  };
  window.closeSurprise = function() {
    document.getElementById('surpriseOverlay').classList.remove('open');
  };
  document.getElementById('surpriseOverlay').addEventListener('click', function(e) {
    if (e.target === this) window.closeSurprise();
  });

  // ── Alert banners ──
  window.updateAlerts = function() {
    const escHtml = window._escHtml || (s => s);
    const fmtDate = window._fmtDate || (d => d);
    const all = window._allItems;
    const expired  = all.filter(n => n.date && window.getDaysUntilExpiry(n.date) < 0);
    const expiring = all.filter(n => n.date && window.getDaysUntilExpiry(n.date) >= 0 && window.getDaysUntilExpiry(n.date) <= 7);

    const elExp  = document.getElementById('alertExpired');
    const elExpi = document.getElementById('alertExpiring');

    if (expired.length) {
      const names = expired.slice(0,2).map(n=>`<strong>${escHtml(n.name)}</strong>`).join(', ');
      const extra = expired.length > 2 ? ` e mais ${expired.length-2}` : '';
      document.getElementById('alertExpiredText').innerHTML =
        `${names}${extra} ${expired.length===1?'está vencido':'estão vencidos'}. Considere descartar.`;
      elExp.classList.add('visible');
    } else {
      elExp.classList.remove('visible');
    }

    if (expiring.length) {
      const soonest = expiring.sort((a,b) => a.date.localeCompare(b.date))[0];
      const days = window.getDaysUntilExpiry(soonest.date);
      const when = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`;
      document.getElementById('alertExpiringText').innerHTML =
        `<strong>${escHtml(soonest.name)}</strong> vence ${when}${expiring.length>1?` e mais ${expiring.length-1} esmalte${expiring.length>2?'s':''}`:''}. Use logo!`;
      elExpi.classList.add('visible');
    } else {
      elExpi.classList.remove('visible');
    }

    // title tab
    const totalProblems = expired.length;
    document.title = totalProblems > 0 ? `(${totalProblems}) My collection` : 'My collection';
  };

  window.getDaysUntilExpiry = function(dateStr) {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const exp = new Date(dateStr + 'T00:00:00');
    return Math.ceil((exp - today) / (1000*60*60*24));
  };

  window.setFilter = function(btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    window._activeFilter = btn.dataset.brand;
    window._activeStatus = 'all';
    applyFilters();
  };

  window.setStatusFilter = function(btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    window._activeStatus = btn.dataset.status;
    window._activeFilter = 'all';
    applyFilters();
  };

  window.toggleUsed = async function(id) {
    const isUsed = !!window._usedItems[id];
    const newVal = !isUsed;
    // Optimistic update
    if (newVal) { window._usedItems[id] = true; } else { delete window._usedItems[id]; }
    localStorage.setItem('usedItems', JSON.stringify(window._usedItems));
    applyFilters();
    try {
      const { error } = await window._supabase.from('esmaltes').update({ used: newVal }).eq('id', id);
      if (error) throw error;
    } catch(e) {
      // Revert on error
      if (isUsed) { window._usedItems[id] = true; } else { delete window._usedItems[id]; }
      localStorage.setItem('usedItems', JSON.stringify(window._usedItems));
      applyFilters();
      showToast('❌ Erro ao salvar.');
    }
  };
  window.applyFilters = function() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    document.getElementById('searchClear').classList.toggle('visible', query.length > 0);
    let filtered = window._allItems;
    if (window._activeFilter !== 'all')
      filtered = filtered.filter(n => (n.brand||'') === window._activeFilter);
    if (query)
      filtered = filtered.filter(n => (n.name||'').toLowerCase().includes(query));

    // status filter
    if (window._activeStatus === 'expired')
      filtered = filtered.filter(n => n.date && window.getDaysUntilExpiry(n.date) < 0);
    else if (window._activeStatus === 'expiring')
      filtered = filtered.filter(n => n.date && window.getDaysUntilExpiry(n.date) >= 0 && window.getDaysUntilExpiry(n.date) <= 30);
    else if (window._activeStatus === 'used')
      filtered = filtered.filter(n => window._usedItems[n.id]);
    else if (window._activeStatus === 'notused')
      filtered = filtered.filter(n => !window._usedItems[n.id]);

    renderGrid(filtered, true);
  };
  window.clearSearch = function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').classList.remove('visible');
    applyFilters();
  };

  window.closeGallery = function() {
    const ov = document.getElementById('galleryOverlay');
    ov.classList.remove('open');
    if (ov._ts) ov.removeEventListener('touchstart', ov._ts);
    if (ov._te) ov.removeEventListener('touchend',   ov._te);
    document.getElementById('galleryToggle').textContent = '⊞';
  };

  window.galleryNav = function(dir) {
    const len = window._galleryItems.length;
    window._galleryIndex = (window._galleryIndex + dir + len) % len;
    window._renderGallerySlide(window._galleryIndex);
  };

  window._renderGallerySlide = function(idx) {
    const items = window._galleryItems;
    const n = items[idx];
    const escHtml = window._escHtml || (s => s);
    const fmtDate = window._fmtDate || (d => d);
    const BL = {risque:'Risqué',impala:'Impala',colorama:'Colorama',outras:'Outras'};

    const wrap = document.getElementById('galleryImgWrap');
    wrap.style.opacity = '0';
    setTimeout(() => {
      wrap.innerHTML = n.img
        ? `<img src="${escHtml(n.img)}" alt="${escHtml(n.name)}" onerror="this.style.display='none'"/>`
        : `<span class="gallery-no-img">🧴</span>`;
      wrap.style.opacity = '1';
    }, 120);

    document.getElementById('galleryName').textContent = n.name || '—';
    const brand = BL[n.brand] || '';
    const date  = n.date ? `Válido até ${fmtDate(n.date)}` : '';
    document.getElementById('galleryMeta').textContent = [brand, date].filter(Boolean).join(' · ');

    // dots — show max 12 for performance
    const dots = document.getElementById('galleryDots');
    const show = Math.min(items.length, 12);
    const offset = Math.max(0, Math.min(idx - Math.floor(show/2), items.length - show));
    dots.innerHTML = Array.from({length: show}, (_,i) => {
      const real = i + offset;
      return `<div class="gallery-dot${real===idx?' active':''}" onclick="window._renderGallerySlide(${real});window._galleryIndex=${real}"></div>`;
    }).join('');

    document.getElementById('galleryPrev').disabled = false;
    document.getElementById('galleryNext').disabled = false;
  };

  // ── Confete ──
  window.launchConfetti = function() {
    const colors = ['#c8a96a','#e8c98a','#c4697c','#e8869a','#9b6fa8','#f7e4b8','#fff'];
    const count = 120;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({length: count}, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 120,
      r: 4 + Math.random() * 5,
      d: 2.5 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltSpeed: 0.1 + Math.random() * 0.2,
      angle: 0,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    }));
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.angle += p.tiltSpeed;
        p.tilt = Math.sin(p.angle) * 12;
        p.y += p.d;
        p.x += Math.sin(p.angle) * 1.2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / 140);
        if (p.shape === 'rect') { ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r); }
        else { ctx.beginPath(); ctx.arc(0, 0, p.r/2, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
      });
      frame++;
      if (frame < 160) requestAnimationFrame(draw);
      else canvas.remove();
    }
    draw();
  };

  window.openSheet    = () => { document.getElementById('sheet').classList.add('open');     document.getElementById('overlay').classList.add('open'); };
  window.closeSheet   = () => { document.getElementById('sheet').classList.remove('open');  document.getElementById('overlay').classList.remove('open'); };
  window.openEditSheet  = () => { document.getElementById('editSheet').classList.add('open');    document.getElementById('editOverlay').classList.add('open'); };
  window.closeEditSheet = () => { document.getElementById('editSheet').classList.remove('open'); document.getElementById('editOverlay').classList.remove('open'); };

  window.showToast = function(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  };
  window.closeModal = function() { document.getElementById('modalOverlay').classList.remove('open'); };

  function setPreview(src) {
    const p = document.getElementById('preview');
    p.src = src; p.style.display = 'block';
    document.querySelector('#imgLabel .up-icon').style.display = 'none';
    document.getElementById('uploadHint').style.display = 'none';
  }
  window.clearPreview = () => {
    const p = document.getElementById('preview');
    p.src = ''; p.style.display = 'none';
    document.querySelector('#imgLabel .up-icon').style.display = '';
    document.getElementById('uploadHint').style.display = '';
  };
  function setEditPreview(src) {
    const p = document.getElementById('editPreview');
    p.src = src; p.style.display = 'block';
    document.getElementById('editUpIcon').style.display = 'none';
    document.getElementById('editUploadHint').style.display = 'none';
  }
  function clearEditPreview() {
    const p = document.getElementById('editPreview');
    p.src = ''; p.style.display = 'none';
    document.getElementById('editUpIcon').style.display = '';
    document.getElementById('editUploadHint').style.display = '';
  }

  function compress(file, setFn, b64key) {
    const ou = URL.createObjectURL(file); setFn(ou);
    const r = new FileReader();
    r.onload = e => {
      const i = new Image();
      i.onload = () => {
        try {
          const MAX=900; let w=i.width, h=i.height;
          if(w>h&&w>MAX){h=Math.round(h*MAX/w);w=MAX;} else if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}
          const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
          cv.getContext('2d').drawImage(i,0,0,w,h);
          window[b64key]=cv.toDataURL('image/jpeg',0.78);
          URL.revokeObjectURL(ou); setFn(window[b64key]);
        } catch(err){}
      };
      i.src = e.target.result;
    };
    r.readAsDataURL(file);
  }

  document.getElementById('imgInput').addEventListener('change', function() {
    const f=this.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')){ showToast('⚠️ Imagem inválida.'); this.value=''; return; }
    document.getElementById('urlInput').value='';
    window._imgFile=f; window._imgBase64=null;
    compress(f, setPreview, '_imgBase64');
  });
  window.handleUrlInput = () => {
    const u=document.getElementById('urlInput').value.trim();
    document.getElementById('imgInput').value='';
    window._imgBase64=null; window._imgFile=null;
    u ? setPreview(u) : clearPreview();
  };
  document.getElementById('editImgInput').addEventListener('change', function() {
    const f=this.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')){ showToast('⚠️ Imagem inválida.'); this.value=''; return; }
    document.getElementById('editUrlInput').value='';
    window._editImgFile=f; window._editImgBase64=null;
    compress(f, setEditPreview, '_editImgBase64');
  });
  window.handleEditUrlInput = () => {
    const u=document.getElementById('editUrlInput').value.trim();
    document.getElementById('editImgInput').value='';
    window._editImgBase64=null; window._editImgFile=null;
    u ? setEditPreview(u) : clearEditPreview();
  };

  [['sheet','closeSheet'],['editSheet','closeEditSheet']].forEach(([id,fn])=>{
    const el=document.getElementById(id); let sy=0;
    el.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;},{passive:true});
    el.addEventListener('touchend',  e=>{if(e.changedTouches[0].clientY-sy>80)window[fn]();},{passive:true});
  });

