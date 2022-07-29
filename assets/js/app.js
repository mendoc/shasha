window.addEventListener("DOMContentLoaded", async event => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register("/sw.js");
    }
});