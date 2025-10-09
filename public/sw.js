self.addEventListener("push", function (event) {
  const data = event.data.json();
  const title = data.title || "Attendance Reminder";
  const options = {
    body: data.body || "Don't forget to mark your attendance!",
    icon: "/icon.png",
    badge: "/icon.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
