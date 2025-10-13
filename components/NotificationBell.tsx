"use client";
import React, { useState, useEffect } from "react";
import { Bell, X, Clock, BellOff, BellRing } from "lucide-react";
import { createServerClient } from "@/lib/supabaseServer";

const supabase = createServerClient();
interface NotificationBellProps {
  userId: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
  read_at?: string;
}
export default function NotificationBell({ userId }: { userId: string }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  // Push notification states
  const [localUserId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Check push support on mount
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsPushSupported(true);
      initializePushNotifications();
    }
  }, [userId]);

  // Initialize push notifications
  const initializePushNotifications = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("✅ Service Worker registered:", registration.scope);

      // Wait for it to be ready
      await navigator.serviceWorker.ready;
      console.log("✅ Service Worker ready");

      // Check if already subscribed
      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("✅ Already subscribed to push notifications");
        setIsPushSubscribed(true);
      } else {
        console.log("ℹ️ Not subscribed to push notifications yet");
        // Show prompt after 5 seconds
        setTimeout(() => {
          if (Notification.permission === "default") {
            setShowPermissionPrompt(true);
          }
        }, 5000);
      }
    } catch (error) {
      console.error("❌ Error initializing push notifications:", error);
    }
  };

  // Get authenticated user's UUID
  useEffect(() => {
    const getAuthUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Error getting user:", error);
          return;
        }

        if (user) {
          setUserId(user.id); // This is the UUID
          console.log("Authenticated User ID:", user.id);
        } else {
          console.warn("No authenticated user found");
        }
      } catch (error) {
        console.error("Error in getAuthUser:", error);
      } finally {
        setLoading(false);
      }
    };

    getAuthUser();
  }, []);

  // Fetch notifications when userId is available
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Update unread count
  useEffect(() => {
    const count = notifications.filter((n) => !n.is_read).length;
    setUnreadCount(count);
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!userId) {
      console.log("Cannot fetch notifications: No user ID");
      return;
    }

    try {
      // Use userType parameter instead of username
      const response = await fetch(`/api/notifications?userType=employee`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        return;
      }

      const data = await response.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    for (const id of unreadIds) {
      await markAsRead(id);
    }
  };

  // Subscribe to push notifications
 const subscribeToPush = async () => {
    console.log("🔔 Starting push subscription...");
    setIsSubscribing(true);

    try {
      // ✅ Get user from session storage (where your app stores it after login)
      const userDataStr =
        localStorage.getItem("user") || sessionStorage.getItem("user");

      if (!userDataStr) {
        alert("Please sign in first to enable notifications");
        setIsSubscribing(false);
        return;
      }

      const userData = JSON.parse(userDataStr);
      const userId = userData.id;

      console.log("👤 User ID:", userId);

      // Request permission
      const permission = await Notification.requestPermission();
      console.log("📢 Permission result:", permission);

      if (permission !== "granted") {
        alert("Please enable notifications in your browser settings");
        setIsSubscribing(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      console.log("✅ Service Worker ready");

      // Get VAPID public key
      const vapidResponse = await fetch("/api/notifications/vapid-public-key");
      const { publicKey } = await vapidResponse.json();
      console.log("✅ VAPID key received");

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log("✅ Push subscription created");

      // Save to database
      const saveResponse = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId, // Send userId from client
          subscription: subscription.toJSON(),
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(
          errorData.details || errorData.error || "Failed to save subscription"
        );
      }

      const result = await saveResponse.json();
      console.log("✅ Subscription saved to database:", result);

      setIsPushSubscribed(true);
      setShowPermissionPrompt(false);

      // Show confirmation
      new Notification("🎉 Push Notifications Enabled!", {
        body: "You will now receive check-in/check-out reminders",
        icon: "/favicon.png",
      });
    } catch (error) {
      console.error("❌ Error subscribing to push:", error);
      alert(
        `Failed to enable push notifications: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    console.log("🔕 Unsubscribing from push...");
    setIsSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        console.log("✅ Unsubscribed from push");
      }

      // Remove from database
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      console.log("✅ Subscription removed from database");
      setIsPushSubscribed(false);
    } catch (error) {
      console.error("❌ Error unsubscribing:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const past = new Date(date).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type: any) => {
    switch (type) {
      case "morning":
        return "🌅";
      case "evening":
        return "🌆";
      default:
        return "📢";
    }
  };

  return (
    <>
      {/* Permission Prompt Banner */}
      {showPermissionPrompt && isPushSupported && !isPushSubscribed && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={24} />
              <div>
                <p className="font-medium">Enable Push Notifications</p>
                <p className="text-sm text-blue-100">
                  Get notified about check-in/check-out reminders even when the
                  app is closed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={subscribeToPush}
                disabled={isSubscribing}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50"
              >
                {isSubscribing ? "Enabling..." : "Enable"}
              </button>
              <button
                onClick={() => setShowPermissionPrompt(false)}
                className="px-4 py-2 text-white hover:bg-blue-700 rounded-lg"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell size={24} className="text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {isPushSubscribed && (
            <span className="absolute -bottom-1 -right-1 bg-green-500 rounded-full h-3 w-3 border-2 border-white" />
          )}
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />

            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Push Notification Toggle */}
              {isPushSupported && (
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={
                      isPushSubscribed ? unsubscribeFromPush : subscribeToPush
                    }
                    disabled={isSubscribing}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      {isPushSubscribed ? (
                        <BellRing size={16} className="text-green-600" />
                      ) : (
                        <BellOff size={16} className="text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {isPushSubscribed
                          ? "Push Notifications Enabled"
                          : "Enable Push Notifications"}
                      </span>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full transition-colors ${
                        isPushSubscribed ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                          isPushSubscribed ? "ml-5" : "ml-1"
                        }`}
                      />
                    </div>
                  </button>
                </div>
              )}

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.is_read ? "bg-blue-50" : ""
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center text-xs text-gray-400">
                              <Clock size={12} className="mr-1" />
                              {getTimeAgo(notification.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 text-center">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
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
