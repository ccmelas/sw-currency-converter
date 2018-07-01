importScripts('js/cache-polyfill.js');

const CACHE_VERSION = 'sw-currency-converter-v28';
const CACHE_FILES = [
    '/',
    'js/main.js',
    'js/converter.js',
    'css/main.css',
    'https://fonts.googleapis.com/css?family=Pacifico',
    'https://fonts.gstatic.com/s/lato/v14/S6uyw4BMUTPHjx4wXiWtFCc.woff2',
    'https://fonts.gstatic.com/s/pacifico/v12/FwZY7-Qmy14u9lezJ-6H6MmBp0u-.woff2',
    'https://fonts.googleapis.com/css?family=Lato',
    'https://code.jquery.com/jquery-3.3.1.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(CACHE_FILES);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter(cacheName => cacheName.startsWith('sw-currency-converter-'))
                        .map(cacheName => caches.delete(cacheName))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((res) => res || requestServer(event))
    );
});

const requestServer = (event) => {
    const url = event.request.clone();
    return fetch(url).then((res) => {
        //if not a valid response send the error
        if(!res || res.status !== 200 || res.type !== 'basic'){
            return res;
        }

        const response = res.clone();

        caches.open(CACHE_VERSION).then((cache) =>
            cache.put(event.request, response)
        );

        return res;
    })
};