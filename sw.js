const CACHE_NAME = 'tct-mod-tool-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './code1.html',
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

// add first few templates to cache to ensure something loads if offline
const INITIAL_TEMPLATES = [
  './public/1844-Clay.txt',
  './public/1844-Polk.txt',
  './public/1860-Douglas.txt',
  './public/1860-Lincoln.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets');
      return cache.addAll([...ASSETS_TO_CACHE, ...INITIAL_TEMPLATES]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // cache new public data files on the fly
        if (event.request.url.includes('/public/') && fetchResponse.status === 200) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      });
    })
  );
});
