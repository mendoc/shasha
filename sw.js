const version = "1.00.05";
const cacheName = "shasha-" + version;
const assets = [
    "/assets/css/animate.min.css",
    "/assets/img/logo.png",
    "/assets/img/logo-maskable.png",
    "/assets/img/screenshot-1-710x1300.png",
    "/assets/img/screenshot-2-710x1300.png",
    "/assets/img/screenshot-3-710x1300.png",
    "/assets/js/app.js",
    "/assets/js/linkify-jquery.min.js",
    "/assets/js/linkify.min.js",
    "/assets/js/main.js",
];

// install event
self.addEventListener("install", evt => {
    evt.waitUntil(
        caches.open(cacheName).then((cache) => {
            console.log("Enregistrement des assets dans le cache");
            cache.addAll(assets);
        })
    );
});

// activate event
self.addEventListener("activate", evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== cacheName)
                .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener("fetch", evt => {
    const url = new URL(evt.request.url);
    if (url.origin == location.origin) {
        switch (url.pathname) {
            case "/version":
                evt.respondWith(new Response(version));
                break;
        }
    } else {
        evt.respondWith(fetch(evt.request));
    }
});