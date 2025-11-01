"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock4, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

export default function PermissionRequestPage() {
  const [permissionType, setPermissionType] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Replace your entire handleSubmit function with this (NO API CALL - Direct insert like leave):

  const handleSubmit = async () => {
    if (!permissionType || !date || !startTime || !endTime || !reason) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "User Error",
        description: "User information not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ Fetch employee data
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("email_address", user.email)
        .single();

      if (employeeError || !employee) {
        console.error("Employee error:", employeeError);
        toast({
          title: "Error",
          description: `Employee record not found: ${
            employeeError?.message || "Unknown error"
          }`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // ✅ Fetch all active team leads for this employee (same as leave)
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("team_lead_id")
        .eq("employee_id", employee.id)
        .eq("is_active", true);

      let teamLeadIds = [];
      if (!teamError && teamMembers && teamMembers.length > 0) {
        teamLeadIds = teamMembers.map((tm) => tm.team_lead_id);
      }

      if (teamLeadIds.length === 0) {
        toast({
          title: "Error",
          description: "No active team leads found. Please contact HR.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // ✅ Use API endpoint instead of direct insert
      const selectedDate = date ? new Date(date) : null;
      const month = selectedDate ? selectedDate.getMonth() + 1 : null;
      const year = selectedDate ? selectedDate.getFullYear() : null;

      const response = await fetch("/api/permission-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employee.id,
          employee_name: employee.name || user.email.split("@")[0],
          employee_email: employee.email_address,
          team_lead_id: null, // Will be set when someone approves
          team_lead_ids: teamLeadIds, // Store all eligible team leads
          manager_id: employee.manager_id,
          permission_type: permissionType,
          date: date ? format(date, "yyyy-MM-dd") : null,
          month: month, // ensure admin dashboard month filter works
          year: year, // ensure admin dashboard year filter works
          start_time: startTime,
          end_time: endTime,
          reason: reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit permission request");
      }

      const responseData = await response.json();
      const permissionRequestId = responseData.id || responseData.data?.id;

      if (!permissionRequestId) {
        throw new Error("Failed to get permission request ID from response");
      }

      // ✅ Send notification to ALL eligible team leads (same as leave)
      const notifications = teamLeadIds.map((teamLeadId) => ({
        recipient_type: "team-lead",
        recipient_id: teamLeadId,
        title: "New Permission Request",
        message: `${
          employee.name || user.email.split("@")[0]
        } has submitted a permission request for ${permissionType}`,
        type: "permission_request",
        reference_id: permissionRequestId,
      }));

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      toast({
        title: "Success",
        description: "Permission request submitted successfully!",
        variant: "default",
      });

      // Reset form
      setPermissionType("");
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setReason("");
    } catch (error: any) {
      console.error("Error submitting permission request:", error);
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while submitting your request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          const { data: employeeInfo, error } = await supabase
            .from("employees")
            .select("*")
            .eq("email_address", parsedUser.email)
            .single();

          if (!error && employeeInfo) {
            setEmployeeData(employeeInfo);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const displayName =
    employeeData?.name || user?.email?.split("@")[0] || "Employee";

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="employee" />
        <div className="flex-1 flex flex-col ml-64">
          <Header
            title="Employee Portal"
            subtitle="Loading..."
            userType="employee"
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["employee", "intern"]}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="employee" />
        <div className="flex-1 flex flex-col">
          <Header
            title="Employee Portal"
            subtitle={`Welcome back, ${displayName}`}
            userType="employee"
          />

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-[900px] mx-auto p-6">
              <h1 className="text-2xl font-bold mb-1">Permission Request</h1>
              <p className="mb-6 text-sm text-gray-500">
                Request short-term permission for urgent matters
              </p>

              {/* Permission Type */}
              <div className="border p-4 rounded mb-6">
                <h2 className="font-medium mb-4 flex items-center gap-2">
                  <Clock4 className="w-5 h-5 text-gray-700" />
                  Permission Type
                </h2>
                <RadioGroup
                  value={permissionType}
                  onValueChange={setPermissionType}
                  className="grid md:grid-cols-2 gap-3"
                >
                  {[["Short Permission", "1 hour / 2 times per month"]].map(
                    ([type, note]) => (
                      <div key={type} className="border p-3 rounded">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={type} id={type} />
                          <label
                            htmlFor={type}
                            className="font-medium cursor-pointer"
                          >
                            {type}
                          </label>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{note}</div>
                      </div>
                    )
                  )}
                </RadioGroup>
              </div>

              {/* Date & Time */}
              <div className="border p-4 rounded mb-6">
                <h2 className="font-medium mb-4">Date and Time</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date Picker */}
                  <div>
                    <label className="block text-sm mb-1">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "w-full text-left border rounded px-3 py-2 text-sm flex items-center justify-between",
                            !date && "text-gray-500"
                          )}
                        >
                          {date ? format(date, "MM/dd/yyyy") : "Select date"}
                          <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm mb-1">Start Time</label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm mb-1">End Time</label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="border p-4 rounded mb-6">
                <h2 className="font-medium mb-2">Details</h2>
                <label className="block text-sm mb-1">
                  Reason for Permission
                </label>
                <Textarea
                  placeholder="Please explain why you need this permission..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pb-6">
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
