// public/sw.js
self.addEventListener("push", function (event) {
  console.log("📬 Push notification received:", event);

  if (!event.data) {
    console.log("No data in push event");
    return;
  }

  try {
    const data = event.data.json();
    console.log("📦 Notification data:", data);

    const options = {
      body: data.body,
      icon: data.icon || "/favicon.png",
      badge: data.badge || "/favicon.png",
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: "open",
          title: "Open App",
        },
        {
          action: "close",
          title: "Dismiss",
        },
      ],
      requireInteraction: true, // Keep notification until user interacts
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Reminder", options)
    );
  } catch (error) {
    console.error("Error showing notification:", error);
  }
});

self.addEventListener("notificationclick", function (event) {
  console.log("🖱️ Notification clicked:", event);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Open the app when notification is clicked
  const urlToOpen = event.notification.data?.url || "/employee/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activated");
  event.waitUntil(clients.claim());
});
