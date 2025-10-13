"use client";
import { supabase } from "@/lib/supabaseServer";
import { useState, useEffect, useCallback } from "react";
import { Bell, Clock, Users, Save, Check } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/AuthContext";

type AdminNotificationSettingsProps = {
  adminId: string;
};

export default function AdminNotificationSettings({
  adminId,
}: AdminNotificationSettingsProps) {
  const { user } = useAuth();

  // ✅ Use the logged-in user's ID or fallback to passed adminId
  const currentAdminId: string | undefined = user?.id || adminId;

  // ✅ Initialize settings once
  const [settings, setSettings] = useState({
    morningReminder: {
      enabled: true,
      time: "08:50",
      message:
        "Good morning! Your working time is starting soon. Please check in.",
      userTypes: ["employee", "team-lead", "manager", "intern"],
    },
    eveningReminder: {
      enabled: true,
      time: "18:30",
      message:
        "Your working time is over. Please submit your work and check out.",
      userTypes: ["employee", "team-lead", "manager", "intern"],
    },
  });

  const [saveStatus, setSaveStatus] = useState<
    "" | "saving" | "saved" | "error"
  >("");

  const userTypes = [
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "team-lead", label: "Team Lead" },
    { value: "employee", label: "Employee" },
    { value: "intern", label: "Intern" },
  ];

  // ✅ Load settings from API
  const loadSettings = useCallback(async () => {
    if (!currentAdminId) return;

    try {
      const response = await fetch(
        `/api/notifications/notification-settings?adminId=${currentAdminId}`
      );
      const result = await response.json();

      if (result.settings) {
        setSettings({
          morningReminder: {
            enabled: result.settings.morning_enabled ?? true,
            time: result.settings.morning_time ?? "08:50",
            message:
              result.settings.morning_message ??
              "Good morning! Your working time is starting soon. Please check in.",
            userTypes: result.settings.morning_user_types ?? [
              "employee",
              "team-lead",
              "manager",
              "intern",
            ],
          },
          eveningReminder: {
            enabled: result.settings.evening_enabled ?? true,
            time: result.settings.evening_time ?? "18:30",
            message:
              result.settings.evening_message ??
              "Your working time is over. Please submit your work and check out.",
            userTypes: result.settings.evening_user_types ?? [
              "employee",
              "team-lead",
              "manager",
              "intern",
            ],
          },
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, [currentAdminId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ✅ Handlers
  const handleTimeChange = (
    type: "morningReminder" | "eveningReminder",
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      [type]: { ...prev[type], time: value },
    }));
  };

  const handleMessageChange = (
    type: "morningReminder" | "eveningReminder",
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      [type]: { ...prev[type], message: value },
    }));
  };

  const handleUserTypeToggle = (
    reminderType: "morningReminder" | "eveningReminder",
    userType: string
  ) => {
    setSettings((prev) => {
      const current = prev[reminderType].userTypes;
      const updated = current.includes(userType)
        ? current.filter((t) => t !== userType)
        : [...current, userType];

      return {
        ...prev,
        [reminderType]: { ...prev[reminderType], userTypes: updated },
      };
    });
  };

  const handleToggleReminder = (
    type: "morningReminder" | "eveningReminder"
  ) => {
    setSettings((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }));
  };

  const handleSave = async () => {
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/notifications/notification-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId: currentAdminId,
          morningEnabled: settings.morningReminder.enabled,
          morningTime: settings.morningReminder.time,
          morningMessage: settings.morningReminder.message,
          morningUserTypes: settings.morningReminder.userTypes,
          eveningEnabled: settings.eveningReminder.enabled,
          eveningTime: settings.eveningReminder.time,
          eveningMessage: settings.eveningReminder.message,
          eveningUserTypes: settings.eveningReminder.userTypes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings");
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="admin" />
      <div className="flex-1 flex flex-col">
        <Header
          title="Notification Settings"
          subtitle="Configure automatic reminders for check-in and check-out times"
          userType="admin"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Morning Reminder */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="text-orange-500" size={24} />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Morning Check-in Reminder
                  </h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.morningReminder.enabled}
                    onChange={() => handleToggleReminder("morningReminder")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              {settings.morningReminder.enabled && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reminder Time
                    </label>
                    <input
                      type="time"
                      value={settings.morningReminder.time}
                      onChange={(e) =>
                        handleTimeChange("morningReminder", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Message
                    </label>
                    <textarea
                      value={settings.morningReminder.message}
                      onChange={(e) =>
                        handleMessageChange("morningReminder", e.target.value)
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Users className="inline mr-2" size={16} />
                      Send to User Types
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {userTypes.map((type) => (
                        <label
                          key={type.value}
                          className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={settings.morningReminder.userTypes.includes(
                              type.value
                            )}
                            onChange={() =>
                              handleUserTypeToggle(
                                "morningReminder",
                                type.value
                              )
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Evening Reminder */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="text-purple-500" size={24} />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Evening Check-out Reminder
                  </h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.eveningReminder.enabled}
                    onChange={() => handleToggleReminder("eveningReminder")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              {settings.eveningReminder.enabled && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reminder Time
                    </label>
                    <input
                      type="time"
                      value={settings.eveningReminder.time}
                      onChange={(e) =>
                        handleTimeChange("eveningReminder", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Message
                    </label>
                    <textarea
                      value={settings.eveningReminder.message}
                      onChange={(e) =>
                        handleMessageChange("eveningReminder", e.target.value)
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Users className="inline mr-2" size={16} />
                      Send to User Types
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {userTypes.map((type) => (
                        <label
                          key={type.value}
                          className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={settings.eveningReminder.userTypes.includes(
                              type.value
                            )}
                            onChange={() =>
                              handleUserTypeToggle(
                                "eveningReminder",
                                type.value
                              )
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  saveStatus === "saved"
                    ? "bg-green-600 text-white"
                    : saveStatus === "error"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {saveStatus === "saved" ? (
                  <>
                    <Check size={20} />
                    Saved Successfully
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    <Bell size={20} />
                    Error Saving
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {saveStatus === "saving" ? "Saving..." : "Save Settings"}
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
