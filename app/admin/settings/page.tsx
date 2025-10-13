"use client";

import AdminNotificationSettings from "@/components/AdminNotificationSettings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseServer";

interface StoredUser {
  id: string;
  email: string;
  userType: string;
  fullName?: string;
  department?: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // Only load employee data for non-admin users
      if (parsedUser.userType !== "admin") {
        const { data: employeeData, error } = await supabase
          .from("employees")
          .select("*")
          .eq("email_address", parsedUser.email)
          .eq("is_active", true)
          .maybeSingle();

        if (!error && employeeData) {
          setEmployee(employeeData);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add debug logging
  useEffect(() => {
    if (mounted && !loading) {
      console.log("=== AUTH DEBUG ===");
      console.log("user:", user);
      console.log("employee:", employee);
      console.log("user?.userType:", user?.userType);
      console.log("employee?.user_type:", employee?.user_type);
      console.log("==================");
    }
  }, [mounted, loading, user, employee]);

  // Show loading state
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please log in to access this page
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user is admin (from localStorage userType)
  const isAdmin = user.userType === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">Only admins can access this page</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Go Home
          </button>
          <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
            <p className="font-bold mb-2">Debug Info:</p>
            <p>user.userType: {user.userType}</p>
            <p>user.email: {user.email}</p>
            <p>employee exists: {employee ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    );
  }

  console.log("Rendering AdminNotificationSettings with user:", user);

  // Pass the user id to AdminNotificationSettings
  return <AdminNotificationSettings adminId={user.id} />;
}
