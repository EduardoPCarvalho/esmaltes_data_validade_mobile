const CACHE_NAME = 'esmaltes-v1';
const CACHE_NAME_FONTS = 'esmaltes-fonts-v1';

// Arquivos do app que ficam em cache (shell)
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Origens que sempre vão para a rede (Supabase, CDN JS)
const NETWORK_ONLY_ORIGINS = [
  'supabase.co',
  'supabase.io',
];

// Origens de fontes — cache longo
const FONT_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install: pré-cacheia o shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CACHE_NAME_FONTS)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estratégia por tipo de recurso ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase e CDN JS → sempre rede (sem cache)
  if (NETWORK_ONLY_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Sem conexão' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Fontes do Google → cache longo (stale-while-revalidate)
  if (FONT_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(
      caches.open(CACHE_NAME_FONTS).then(async cache => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(res => {
          cache.put(event.request, res.clone());
          return res;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Shell (HTML, CSS, JS, ícones) → cache-first, fallback pra rede
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        // Só cacheia respostas válidas do mesmo origin
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback: retorna o index.html para navegação
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ── Mensagens do app (ex: forçar atualização) ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
