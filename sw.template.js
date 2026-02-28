importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyC3pt7TQXG32aworFO6Zp4JgrVz1g8jXLQ",
    authDomain: "nomadic-rush-162313.firebaseapp.com",
    databaseURL: "https://nomadic-rush-162313.firebaseio.com",
    projectId: "nomadic-rush-162313",
    storageBucket: "nomadic-rush-162313.appspot.com",
    messagingSenderId: "167801823211",
    appId: "1:167801823211:web:d788e011834f5528a683ae"
});

const messaging = firebase.messaging();

// Gestionnaire centralisé — déclenché quand aucun onglet n'est en premier plan
messaging.onBackgroundMessage(function(payload) {
    const texte = payload.data && payload.data.texte ? payload.data.texte : 'Nouveau post publié';
    const postKey = payload.data && payload.data.postKey ? payload.data.postKey : '';

    console.log('[FCM SW] Message reçu :', payload);

    return self.registration.showNotification('Nouveau post', {
        body: texte.length > 100 ? texte.substring(0, 100) + '…' : texte,
        icon: '/assets/img/logo.png',
        data: { postKey: postKey }
    });
});

// Ouverture / focus de l'app au clic sur la notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const postKey = event.notification.data && event.notification.data.postKey
        ? event.notification.data.postKey
        : '';
    console.log('[FCM SW] Notification cliquée, postKey :', postKey || '(aucun)');
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
