// hooks/usePushNotifications.ts
import { useEffect, useState } from "react";

export function usePushNotifications(userId: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
      checkExistingSubscription();
    } else {
      console.warn("Push notifications not supported in this browser");
    }
  }, [userId]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("✅ Service Worker registered:", registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log("✅ Service Worker ready");
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
    }
  };

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log("✅ Existing push subscription found");
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      } else {
        console.log("ℹ️ No existing push subscription");
      }
    } catch (error) {
      console.error("❌ Error checking subscription:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      alert("Push notifications are not supported in your browser");
      return false;
    }

    if (!("Notification" in window)) {
      alert("This browser does not support notifications");
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log("📢 Notification permission:", permission);

    if (permission === "granted") {
      console.log("✅ Notification permission granted");
      return true;
    } else if (permission === "denied") {
      alert(
        "Notification permission denied. Please enable it in browser settings."
      );
      return false;
    } else {
      alert("Notification permission dismissed");
      return false;
    }
  };

  const subscribeUser = async () => {
    console.log("🔔 Starting push subscription process...");
    setIsLoading(true);

    try {
      // Request permission first
      const permissionGranted = await requestNotificationPermission();

      if (!permissionGranted) {
        console.log("❌ Permission not granted");
        setIsLoading(false);
        return false;
      }

      // Make sure service worker is registered and ready
      const registration = await navigator.serviceWorker.ready;
      console.log("✅ Service Worker is ready");

      // Get VAPID public key
      console.log("📡 Fetching VAPID public key...");
      const response = await fetch("/api/notifications/vapid-public-key");
      const { publicKey } = await response.json();
      console.log(
        "✅ VAPID key received:",
        publicKey?.substring(0, 20) + "..."
      );

      // Subscribe to push notifications
      console.log("📲 Subscribing to push manager...");
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log("✅ Push subscription created:", pushSubscription.endpoint);

      // Save subscription to database
      console.log("💾 Saving subscription to database...");
      const saveResponse = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subscription: pushSubscription.toJSON(),
        }),
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        throw new Error(error.error || "Failed to save subscription");
      }

      console.log("✅ Subscription saved to database");
      setSubscription(pushSubscription);
      setIsSubscribed(true);
      setIsLoading(false);

      // Show a test notification
      new Notification("🎉 Push Notifications Enabled!", {
        body: "You will now receive check-in/check-out reminders",
        icon: "/favicon.png",
      });

      return true;
    } catch (error) {
      console.error("❌ Error subscribing to push notifications:", error);
      alert("Failed to enable push notifications. Please try again.");
      setIsLoading(false);
      return false;
    }
  };

  const unsubscribeUser = async () => {
    console.log("🔕 Unsubscribing from push notifications...");
    setIsLoading(true);

    try {
      if (subscription) {
        await subscription.unsubscribe();
        console.log("✅ Push subscription cancelled");

        // Remove from database
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        console.log("✅ Subscription removed from database");
      }

      setSubscription(null);
      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("❌ Error unsubscribing:", error);
      setIsLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeUser,
    unsubscribeUser,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
