"use client"
import ProtectedRoute from '@/components/ProtectedRoute'
import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock4, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email_address', user.email)
        .single();

      if (employeeError || !employee) {
        toast({
          title: "Employee Not Found",
          description: employeeError?.message || "No record found.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('team_lead_id')
        .eq('employee_id', employee.id)
        .eq('is_active', true)
        .single();

      const teamLeadId = teamMember?.team_lead_id || 'DEFAULT_LEAD';

      const permissionRequestData = {
        employee_id: employee.id,
        employee_name: employee.name || user.email.split('@')[0],
        employee_email: employee.email_address,
        team_lead_id: teamLeadId,
        permission_type: permissionType,
        date: date.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        reason: reason,
        status: 'Pending'
      };

      const { data: permissionRequest, error: insertError } = await supabase
        .from('permission_requests')
        .insert(permissionRequestData)
        .select()
        .single();

      if (insertError) {
        toast({
          title: "Submission Failed",
          description: insertError.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (teamMember?.team_lead_id && teamMember.team_lead_id !== 'DEFAULT_LEAD') {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            recipient_type: 'team-lead',
            recipient_id: teamMember.team_lead_id,
            title: 'New Permission Request',
            message: `${employee.name || user.email.split('@')[0]} has submitted a permission request for ${permissionType}`,
            type: 'permission_request',
            reference_id: permissionRequest.id
          });

        if (notificationError) {
          console.error('Notification error:', notificationError);
        }
      }

      toast({
        title: "Request Submitted",
        description: "Permission request submitted successfully!",
      });

      setPermissionType("");
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setReason("");

    } catch (error: any) {
      toast({
        title: "Unexpected Error",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          const { data: employeeInfo, error } = await supabase
            .from('employees')
            .select('*')
            .eq('email_address', parsedUser.email)
            .single();

          if (!error && employeeInfo) {
            setEmployeeData(employeeInfo);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const displayName = employeeData?.name || user?.email?.split('@')[0] || "Employee";

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="employee" />
        <div className="flex-1 flex flex-col ml-64">
          <Header title="Employee Portal" subtitle="Loading..." userType="employee" />
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
