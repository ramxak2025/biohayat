/* Service Worker сайта ХАЯТ: приём Web Push и открытие нужной страницы по клику. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ХАЯТ", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ХАЯТ";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Уже открытая вкладка сайта — фокусируем и переводим на нужный адрес.
        if ("focus" in client) {
          if (client.url.includes(url)) return client.focus();
          if ("navigate" in client) return client.navigate(url).then((c) => (c ? c.focus() : undefined));
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
