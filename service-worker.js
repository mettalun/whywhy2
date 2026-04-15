const CACHE_NAME = "whywhy-sheet-v29";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./image/icom64.png",
  "./image/icom256.png",
  "./image/icom512.png",
  "./css/common.css",
  "./css/pc.css",
  "./css/mobile.css",
  "./js/main.js",
  "./js/device_detector.js",
  "./js/app_router.js",
  "./js/evaluation.js",
  "./js/presentation_test_data.js",
  "./js/core/tree_model.js",
  "./js/core/file_io.js",
  "./js/core/pdf_exporter.js",
  "./js/core/layout_engine.js",
  "./js/core/renderer_svg.js",
  "./js/pc/pc_app.js",
  "./js/pc/pc_editor.js",
  "./js/pc/pc_interaction.js",
  "./js/mobile/mobile_app.js",
  "./js/mobile/mobile_map_view.js",
  "./js/mobile/mobile_node_editor.js",
  "./js/mobile/mobile_branch_menu.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.match("./index.html");
      })
  );
});
