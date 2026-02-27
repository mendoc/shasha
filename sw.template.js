importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyC3pt7TQXG32aworFO6Zp4JgrVz1g8jXLQ",
    authDomain: "nomadic-rush-162313.firebaseapp.com",
    databaseURL: "https://nomadic-rush-162313.firebaseio.com",
    projectId: "nomadic-rush-162313",
    storageBucket: "nomadic-rush-162313.appspot.com",
    messagingSenderId: "167801823211",
    appId: "FIREBASE_APP_ID_HERE"
});

const messaging = firebase.messaging();

// Gestionnaire de messages en arrière-plan (app fermée)
messaging.setBackgroundMessageHandler(function(payload) {
    const texte = payload.data && payload.data.texte ? payload.data.texte : 'Nouveau post publié';
    const postKey = payload.data && payload.data.postKey ? payload.data.postKey : '';

    return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // Si un onglet est ouvert, Firebase DB en temps réel gère la notification
        if (clientList.length > 0) return;

        return self.registration.showNotification('Nouveau post', {
            body: texte.length > 100 ? texte.substring(0, 100) + '…' : texte,
            icon: '/assets/img/logo.png',
            data: { postKey: postKey }
        });
    });
});

// Ouverture / focus de l'app au clic sur la notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const postKey = event.notification.data && event.notification.data.postKey
        ? event.notification.data.postKey
        : '';
    const url = postKey ? '/?notif_post=' + postKey : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    if (postKey) client.postMessage({ type: 'SHOW_POST', postKey: postKey });
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});

const version = "__VERSION__";
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
