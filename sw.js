// Ce code s'exécute dans son propre worker ou thread
self.addEventListener("install", event => {
    console.log("Service installé");
 });
 self.addEventListener("activate", event => {
    console.log("Service activé");
 });