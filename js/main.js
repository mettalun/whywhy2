import { AppRouter } from "./app_router.js";

const appRoot = document.getElementById("app");
const router = new AppRouter(appRoot);

router.start();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
