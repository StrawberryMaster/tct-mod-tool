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

// add first few templates to cache to ensure something loads if offline
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
  // check if we should use network first or cache first
  const isCoreAsset = ASSETS_TO_CACHE.some(asset => event.request.url.includes(asset.replace('./', '')));

  if (isCoreAsset) {
    // network first for core assets
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // cache first for everything else
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
  }
});
