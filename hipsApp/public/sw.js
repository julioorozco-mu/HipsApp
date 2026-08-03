self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Deliberadamente no cachea peticiones: alumnos y asistencias deben ser actuales.
self.addEventListener("fetch", () => {});
