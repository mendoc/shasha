window.addEventListener("DOMContentLoaded", async event => {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register("sw.php");
        window._swRegistration = registration;
    }
});