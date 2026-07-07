const CACHE_NAME = 'tct-mod-tool-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './code1.html',
  './tct.webmanifest',
  './js/tailwind.js',
  './js/vue3.js',
  './js/db.js',
  './js/engine.js',
  './js/base.js',
  './js/components/editor.js',
  './js/components/pickers.js',
  './js/components/questionAnswer.js',
  './js/components/stateCandidateIssues.js',
  './js/components/cyoa.js',
  './js/components/bannerSettings.js',
  './js/components/endings.js',
  './js/components/mapping.js',
  './js/components/bulk.js',
  './js/vueInit.js',
  './js/code1/base.js',
  './js/code1/preview.css',
  './js/code1/vueInit.js',
  './js/code1/components/editor.js',
  './js/code1/components/pickers.js',
  './js/code1/data/election.json',
  './js/code1/data/candidate.json',
  './js/code1/data/running_mate.json'
];

const INITIAL_TEMPLATES = [
  './public/1844-Clay.txt',
  './public/1844-Polk.txt',
  './public/1860-Douglas.txt',
  './public/1860-Lincoln.txt',
  './public/1896-Bryan.txt',
  './public/1896-McKinley.txt',
  './public/1916-Hughes.txt',
  './public/1916-Wilson.txt',
  './public/1948-Dewey.txt',
  './public/1948-Truman.txt',
  './public/1960-Kennedy.txt',
  './public/1960-Nixon.txt',
  './public/1968-Nixon.txt',
  './public/1968-Humphrey.txt',
  './public/1968-Wallace.txt',
  './public/1976-Ford.txt',
  './public/1976-Carter.txt',
  './public/1988-Bush.txt',
  './public/1988-Dukakis.txt',
  './public/2000-Bush.txt',
  './public/2000-Gore.txt',
  './public/2000-Nader.txt',
  './public/2012-Romney.txt',
  './public/2012-Obama.txt',
  './public/2016-Clinton.txt',
  './public/2016-Trump.txt',
  './public/2020-Biden.txt',
  './public/2020-Trump.txt'
];

const CORE_ASSETS_SET = new Set(
  ASSETS_TO_CACHE.map(asset => new URL(asset, self.registration.scope).href)
);

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Caching core assets...');
      await cache.addAll(ASSETS_TO_CACHE);

      console.log('Caching other template assets...');
      const templatePromises = INITIAL_TEMPLATES.map(async (relativeUrl) => {
        try {
          const absoluteUrl = new URL(relativeUrl, self.registration.scope).href;
          const response = await fetch(absoluteUrl);
          if (response.ok) {
            await cache.put(absoluteUrl, response);
          } else {
            console.warn(`Template failed to cache (${response.status}): ${relativeUrl}`);
          }
        } catch (err) {
          console.warn(`Failed to retrieve optional template during installation: ${relativeUrl}`, err);
        }
      });

      await Promise.allSettled(templatePromises);
    })
  );
});

self.addEventListener('activate', (event) => {
  // take control of active clients
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // handle GET requests and standard HTTP/HTTPS protocols
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const isCoreAsset = CORE_ASSETS_SET.has(request.url);

  if (isCoreAsset) {
    // network first for core assets
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  } else {
    // cache first for templates and external dynamic resources
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
