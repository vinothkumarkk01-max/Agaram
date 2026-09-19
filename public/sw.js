// Minimal push service worker (Phase 15, V1). Registered by
// NotificationsToggle.tsx only after the member has explicitly turned
// notifications on — this file does nothing on its own until a push
// event actually arrives from the browser's push service.
//
// Kept deliberately tiny: no caching, no offline support, nothing
// that would turn this into a full PWA install prompt. That's a
// bigger decision than "notify me about new messages" and isn't part
// of this feature.

self.addEventListener("push", (event) => {
  let data = { title: "Agaram", body: "You have a new message.", url: "/matches/mutual" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Malformed or missing payload — fall back to the generic text
    // above rather than showing no notification at all.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/matches/mutual";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
