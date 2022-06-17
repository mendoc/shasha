window.addEventListener("DOMContentLoaded", async event => {
    checkRegistration();
});

// Check a service worker registration status
async function checkRegistration() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            log("Service worker was registered on page load")
        } else {
            log("No service worker is currently registered")
            register()
        }
    } else {
        log("Service workers API not available");
    }
}

// Registers a service worker
async function register() {
    if ('serviceWorker' in navigator) {
        try {
            // Change the service worker URL to see what happens when the SW doesn't exist
            const registration = await navigator.serviceWorker.register("sw.js");
            log("Service worker registered");

        } catch (error) {
            log("Error while registering: " + error.message);
        }
    } else {
        log("Service workers API not available");
    }
};

// Unregister a currently registered service worker
async function unregister() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const result = await registration.unregister();
                log(result ? "Service worker unregistered" : "Service worker couldn't be unregistered");
            } else {
                log("There is no service worker to unregister");
            }

        } catch (error) {
            log("Error while unregistering: " + error.message);
        }
    } else {
        log("Service workers API not available");
    }
};

function log(text) {
    console.log(text);
}