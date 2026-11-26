if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {
      // PWA offline enhancement is optional; keep the app usable if registration is blocked.
    });
  }, { once: true });
}
