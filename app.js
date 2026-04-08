  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  const SUPABASE_URL      = 'https://irkintnlpyryynewafer.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlya2ludG5scHlyeXluZXdhZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzU5MzgsImV4cCI6MjA4OTg1MTkzOH0.SE1bzdRRaHwGFXk2PyiPDBoAudS9kbAAL5xWWIvkeyQ';

  const BRAND_LABELS = {risque:'Risqué',impala:'Impala',colorama:'Colorama',outras:'Outras'};

  function setSyncStatus(state,label){
    document.getElementById('syncDot').className=`sync-dot ${state}`;
    document.getElementById('syncLabel').textContent=label;
  }
  function escHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
  function fmtDate(d){
    if(!d) return '';
    const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`;
  }
  // Expose helpers needed by non-module code
  window._escHtml = escHtml;
  window._fmtDate = fmtDate;

  function buildCardHtml(n, i, extra='') {
    const b=n.brand||''; const bl=BRAND_LABELS[b]||'';
    const ribbon=b?`<div class="brand-ribbon ${escHtml(b)}">${escHtml(bl)}</div>`:'';
    const tag   =b?`<span class="brand-tag ${escHtml(b)}">${escHtml(bl)}</span>`:'';
    const isUsed = !!window._usedItems[n.id];
    const usedClass = isUsed ? ' used-card' : '';
    const usedStamp = isUsed ? `<div class="used-stamp">✓ já usei</div>` : '';
    return `
    <div class="nail-card${usedClass}" style="animation-delay:${i*0.05}s">
      <div class="card-accent"></div>
      ${extra}
      <div class="img-wrap">
        ${n.img
          ?`<img src="${escHtml(n.img)}" alt="${escHtml(n.name)}" loading="lazy"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
            <span class="no-img" style="display:none">🧴</span>`
          :`<span class="no-img">🧴</span>`}
        ${ribbon}
        ${usedStamp}
      </div>
      <div class="info">
        <div class="name">${escHtml(n.name)}</div>
        <div class="meta">
          <div class="date">${fmtDate(n.date)}</div>
          ${tag}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn-action used${isUsed?' marked':''}" title="${isUsed?'Desmarcar':'Já usei'}"
          onclick="window.toggleUsed('${escAttr(n.id)}')">✓</button>
        <button class="btn-action edit"
          onclick="window._openEdit('${escAttr(n.id)}','${escAttr(n.name)}','${escAttr(n.date||'')}','${escAttr(n.img||'')}','${escAttr(n.brand||'')}')">✎</button>
        <button class="btn-action delete"
          onclick="window._askDelete('${escAttr(n.id)}','${escAttr(n.name)}','${escAttr(n.img||'')}')">✕</button>
      </div>
    </div>`;
  }

  function getDaysUntilExpiry(dateStr) {
    return window.getDaysUntilExpiry(dateStr);
  }

  const PAGE_SIZE = 20;
  window._validBatch = [];
  window._validPage  = 0;

  function renderBatch(grid, items, page) {
    const start = page * PAGE_SIZE;
    const slice = items.slice(start, start + PAGE_SIZE);
    grid.insertAdjacentHTML('beforeend', slice.map((n,i) => buildCardHtml(n, start+i)).join(''));
  }

  function addLoadMoreBtn(grid, items, page) {
    const existing = document.getElementById('loadMoreBtn');
    if (existing) existing.remove();
    const remaining = items.length - (page + 1) * PAGE_SIZE;
    if (remaining <= 0) return;
    const btn = document.createElement('button');
    btn.id = 'loadMoreBtn';
    btn.className = 'btn-load-more';
    btn.textContent = `Ver mais ${Math.min(remaining, PAGE_SIZE)} esmaltes`;
    btn.onclick = function() {
      window._validPage++;
      renderBatch(grid, items, window._validPage);
      addLoadMoreBtn(grid, items, window._validPage);
      btn.remove();
    };
    // loadMoreBtn sits outside the grid (after it)
    grid.parentNode.insertBefore(btn, grid.nextSibling);
  }

  window.renderGrid = function(items, isFiltered) {
    const today = new Date(); today.setHours(0,0,0,0);
    const WARN_DAYS = 30;

    // Update stats from ALL items (not filtered)
    const allItems = window._allItems;
    const totalExpired  = allItems.filter(n => n.date && getDaysUntilExpiry(n.date) < 0).length;
    const totalExpiring = allItems.filter(n => n.date && getDaysUntilExpiry(n.date) >= 0 && getDaysUntilExpiry(n.date) <= WARN_DAYS).length;
    document.getElementById('statTotalNum').textContent    = allItems.length;
    document.getElementById('statExpiringNum').textContent = totalExpiring;
    document.getElementById('statExpiredNum').textContent  = totalExpired;
    document.getElementById('statExpired').className  = 'stat-card' + (totalExpired  > 0 ? ' danger' : '');
    document.getElementById('statExpiring').className = 'stat-card' + (totalExpiring > 0 ? ' warn'   : '');
    window.updateAlerts();

    const expired  = items.filter(n => n.date && getDaysUntilExpiry(n.date) < 0);
    const expiring = items.filter(n => n.date && getDaysUntilExpiry(n.date) >= 0 && getDaysUntilExpiry(n.date) <= WARN_DAYS);
    const valid    = items.filter(n => !n.date || getDaysUntilExpiry(n.date) > WARN_DAYS);

    const total = window._allItems.length;
    document.getElementById('countNum').textContent = isFiltered ? items.length : total;

    // ── Expired section ──
    const secExp = document.getElementById('sectionExpired');
    const gridExp = document.getElementById('gridExpired');
    if (expired.length) {
      secExp.style.display = '';
      document.getElementById('expiredCount').textContent = `${expired.length} esmalte${expired.length>1?'s':''} vencido${expired.length>1?'s':''}`;
      gridExp.innerHTML = expired.map((n,i) => buildCardHtml(n, i)).join('');
    } else {
      secExp.style.display = 'none';
    }

    // ── Expiring soon section ──
    const secExpiring = document.getElementById('sectionExpiring');
    const gridExpiring = document.getElementById('gridExpiring');
    if (expiring.length) {
      secExpiring.style.display = '';
      document.getElementById('expiringCount').textContent = `${expiring.length} esmalte${expiring.length>1?'s':''} — vence${expiring.length>1?'m':''} em até 30 dias`;
      gridExpiring.innerHTML = expiring.map((n,i) => {
        const days = getDaysUntilExpiry(n.date);
        const label = days === 0 ? 'Vence hoje!' : days === 1 ? 'Vence amanhã' : `${days} dias`;
        const badge = `<div class="expiring-badge">⏳ ${label}</div>`;
        return buildCardHtml(n, i, badge);
      }).join('');
    } else {
      secExpiring.style.display = 'none';
    }

    // ── Valid collection ──
    const grid = document.getElementById('grid');
    const existingMore = document.getElementById('loadMoreBtn');
    if (existingMore) existingMore.remove();
    if (!valid.length) {
      const isS = document.getElementById('searchInput').value.trim().length > 0;
      const noItems = !items.length;
      grid.innerHTML = `<div class="empty-state">
        <span class="e-icon">${isS?'⌕':'🧴'}</span>
        <div class="e-title">${isS?'Sem resultados':noItems?'Coleção vazia':'Sem esmaltes válidos'}</div>
        <p>${isS?'Nenhum esmalte com esse nome.':noItems?'Toque no <strong style="color:var(--gold)">＋</strong> para adicionar<br>seu primeiro esmalte.':'Todos os esmaltes estão vencidos ou prestes a vencer.'}</p>
      </div>`;
    } else {
      window._validBatch = valid;
      window._validPage  = 0;
      grid.innerHTML = '';
      renderBatch(grid, valid, 0);
      addLoadMoreBtn(grid, valid, 0);
    }
  };

  let supabase;
  try { supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY); window.supabase=supabase; window._supabase=supabase; }
  catch(e){ setSyncStatus('err','Erro'); window.renderGrid([]); throw e; }

  async function fetchItems(){
    const {data,error}=await supabase.from('esmaltes').select('*').order('date',{ascending:true});
    if(error){ setSyncStatus('err','Erro ao carregar'); window.renderGrid([]); return; }
    window._allItems=Array.isArray(data)?data:[];
    // Rebuild _usedItems from Supabase 'used' column
    window._usedItems={};
    window._allItems.forEach(n=>{ if(n.used) window._usedItems[n.id]=true; });
    localStorage.setItem('usedItems', JSON.stringify(window._usedItems));
    window.applyFilters();
    setSyncStatus('ok','Sincronizado');
  }

  const lt=setTimeout(()=>{ setSyncStatus('err','Tempo esgotado'); window.renderGrid([]); },8000);
  fetchItems().then(()=>clearTimeout(lt)).catch(()=>{ clearTimeout(lt); setSyncStatus('err','Sem conexão'); window.renderGrid([]); });

  try {
    supabase.channel('esmaltes-changes')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'esmaltes'},()=>fetchItems())
      .on('postgres_changes',{event:'DELETE', schema:'public',table:'esmaltes'},()=>fetchItems())
      .on('postgres_changes',{event:'UPDATE', schema:'public',table:'esmaltes'},()=>fetchItems())
      .subscribe(status=>{
        if(status==='SUBSCRIBED'){ setSyncStatus('ok','Ao vivo'); document.getElementById('realtimePill').classList.add('visible'); }
        if(status==='CHANNEL_ERROR'){ setSyncStatus('err','Erro'); document.getElementById('realtimePill').classList.remove('visible'); }
      });
  } catch(e){}

  window.addNail=async function(){
    const name =document.getElementById('nameInput').value.trim();
    const brand=document.getElementById('brandInput').value;
    const date =document.getElementById('dateInput').value;
    const url  =document.getElementById('urlInput').value.trim();
    if(!name){showToast('⚠️ Informe o nome!');return;}
    if(!date){showToast('⚠️ Informe a data!');return;}
    const btn=document.getElementById('btnSubmit');
    btn.disabled=true; btn.textContent='Salvando…';
    try {
      let imgUrl=url||null;
      if(window._imgFile){
        try{
          const ext=(window._imgFile.name.split('.').pop()||'jpg').toLowerCase();
          const path=`esmaltes/${Date.now()}.${ext}`;
          const {error:upErr}=await supabase.storage.from('fotos').upload(path,window._imgFile,{contentType:window._imgFile.type});
          imgUrl=upErr?(window._imgBase64||null):supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl;
        }catch(e){imgUrl=window._imgBase64||null;}
      }
      const {error}=await supabase.from('esmaltes').insert([{name,brand:brand||null,date,img:imgUrl}]);
      if(error)throw error;
      document.getElementById('nameInput').value='';
      document.getElementById('brandInput').value='';
      document.getElementById('dateInput').value=window._today;
      document.getElementById('imgInput').value='';
      document.getElementById('urlInput').value='';
      window.updateBrandDot('brandDotPreview','brandInput');
      clearPreview(); window._imgBase64=null; window._imgFile=null;
      closeSheet(); showToast('✦ Esmalte adicionado!'); window.launchConfetti && window.launchConfetti();
    }catch(e){ showToast('❌ Erro: '+(e.message||'verifique a conexão')); }
    finally{ btn.disabled=false; btn.textContent='Adicionar à Coleção'; }
  };

  window._openEdit=function(id,name,date,img,brand){
    window._editImgBase64=null; window._editImgFile=null;
    document.getElementById('editId').value=id;
    document.getElementById('editOldImg').value=img;
    document.getElementById('editNameInput').value=name;
    document.getElementById('editDateInput').value=date;
    document.getElementById('editBrandInput').value=brand||'';
    document.getElementById('editImgInput').value='';
    document.getElementById('editUrlInput').value='';
    window.updateBrandDot('editBrandDotPreview','editBrandInput');
    if(img){setEditPreview(img);}else{clearEditPreview();}
    openEditSheet();
  };

  window.saveEdit=async function(){
    const id    =document.getElementById('editId').value;
    const name  =document.getElementById('editNameInput').value.trim();
    const brand =document.getElementById('editBrandInput').value;
    const date  =document.getElementById('editDateInput').value;
    const urlVal=document.getElementById('editUrlInput').value.trim();
    const oldImg=document.getElementById('editOldImg').value;
    if(!name){showToast('⚠️ Informe o nome!');return;}
    if(!date){showToast('⚠️ Informe a data!');return;}
    const btn=document.getElementById('btnEditSubmit');
    btn.disabled=true; btn.textContent='Salvando…';
    try{
      let imgUrl=oldImg||null;
      if(urlVal){imgUrl=urlVal;}
      else if(window._editImgFile){
        try{
          const ext=(window._editImgFile.name.split('.').pop()||'jpg').toLowerCase();
          const path=`esmaltes/${Date.now()}.${ext}`;
          const {error:upErr}=await supabase.storage.from('fotos').upload(path,window._editImgFile,{contentType:window._editImgFile.type});
          imgUrl=upErr?(window._editImgBase64||oldImg||null):supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl;
        }catch(e){imgUrl=window._editImgBase64||oldImg||null;}
      }else if(window._editImgBase64){imgUrl=window._editImgBase64;}
      const {error}=await supabase.from('esmaltes').update({name,brand:brand||null,date,img:imgUrl}).eq('id',id);
      if(error)throw error;
      closeEditSheet(); showToast('✦ Atualizado!');
    }catch(e){ showToast('❌ Erro: '+(e.message||'verifique a conexão')); }
    finally{ btn.disabled=false; btn.textContent='Salvar Alterações'; }
  };

  let _delId=null,_delImg=null;
  window._askDelete=function(id,name,img){
    _delId=id; _delImg=img;
    document.getElementById('modalName').textContent=name;
    const wrap=document.getElementById('modalPreviewWrap');
    const pic=document.getElementById('modalPreviewImg');
    const icon=document.getElementById('modalIconFallback');
    if(img){
      pic.src=img;
      pic.onerror=function(){ wrap.style.display='none'; icon.style.display='block'; };
      wrap.style.display='block'; icon.style.display='none';
    } else {
      wrap.style.display='none'; icon.style.display='block';
    }
    document.getElementById('modalOverlay').classList.add('open');
  };
  window.confirmDelete=async function(){
    if(!_delId)return;
    try{
      if(_delImg&&_delImg.includes('supabase')&&_delImg.includes('/fotos/')){
        const part=_delImg.split('/fotos/')[1];
        if(part) await supabase.storage.from('fotos').remove([part]);
      }
      const {error}=await supabase.from('esmaltes').delete().eq('id',_delId);
      if(error)throw error;
      showToast('🗑️ Removido.');
    }catch(e){showToast('❌ Erro ao remover.');}
    _delId=_delImg=null; closeModal();
  };
