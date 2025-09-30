"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useState, useEffect } from "react";
import { CalendarDays, CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

export default function LeaveApplicationTeamLead() {
  const { toast } = useToast();

  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate || !reason) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "default",
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Authentication Error",
        description: "User info not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("email_address", user.email)
        .single();

      if (employeeError || !employee) {
        toast({
          title: "Employee Error",
          description: employeeError?.message || "Employee record not found",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("team_lead_id")
        .eq("employee_id", employee.id)
        .eq("is_active", true)
        .single();

      const teamLeadId = teamMember?.team_lead_id || "DEFAULT_LEAD";

      const leaveRequestData = {
        employee_id: employee.id,
        employee_name: employee.name || user.email.split("@")[0],
        employee_email: employee.email_address,
        team_lead_id: teamLeadId,
        leave_type: leaveType,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        reason: reason,
        status: "Pending",
      };

      const { data: leaveRequest, error: insertError } = await supabase
        .from("leave_requests")
        .insert(leaveRequestData)
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

      if (
        teamMember?.team_lead_id &&
        teamMember.team_lead_id !== "DEFAULT_LEAD"
      ) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            recipient_type: "team-lead",
            recipient_id: teamMember.team_lead_id,
            title: "New Leave Request",
            message: `${
              employee.name || user.email.split("@")[0]
            } has submitted a leave request for ${leaveType}`,
            type: "leave_request",
            reference_id: leaveRequest.id,
          });

        if (notificationError) {
          console.error("Notification error:", notificationError);
        }
      }

      toast({
        title: "Success",
        description: "Leave request submitted successfully!",
        variant: "default",
      });

      // Reset form
      setLeaveType("");
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
    } catch (error) {
      toast({
        title: "Unexpected Error",
        description: "Something went wrong submitting your request",
        variant: "destructive",
      });
      console.error("Error submitting leave:", error);
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

          const { data: leadInfo, error } = await supabase
            .from("team_leads")
            .select("*")
            .eq("email_address", parsedUser.email)
            .single();

          if (!error && leadInfo) {
            setLeadData(leadInfo);
          }
        }
      } catch (error) {
        console.error("Error fetching team lead data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const displayName =
    leadData?.name || user?.email?.split("@")[0] || "Team Lead";

  // if (loading) {
  //   return (
  //     <div className="flex h-screen overflow-hidden">
  //       <Sidebar userType="team-lead" />
  //       <div className="flex-1 flex flex-col overflow-auto">
  //         <Header title="Team Lead Portal" subtitle="Loading..." userType="team-lead" />
  //         <div className="flex-1 flex items-center justify-center p-4">
  //           <div className="text-lg">Loading...</div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <ProtectedRoute allowedRoles={["team-lead"]}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userType="team-lead" />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header
            title="Team Lead Portal"
            subtitle={`Welcome, ${displayName}`}
            userType="team-lead"
          />
          <div className="w-full max-w-[900px] mx-auto p-6">
            <h1 className="text-2xl font-bold mb-1">Leave Request</h1>
            <p className="mb-6 text-sm text-gray-500">
              Submit your leave request for approval
            </p>

            {/* Leave Type */}
            <div className="border p-4 rounded mb-6">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-gray-700" />
                Leave Type
              </h2>

              <RadioGroup
                value={leaveType}
                onValueChange={setLeaveType}
                className="grid md:grid-cols-2 gap-3"
              >
                {[
                  ["Sick Leave", "12 days/year"],
                  ["Casual Leave", "12 days/year"],
                  ["Maternity Leave", "24 weeks"],
                  ["Marriage Leave", "5 days"],
                  ["Compensation Leave", "2 days"],
                  ["Half-day Leave", "As needed"],
                ].map(([type, note]) => (
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
                ))}
              </RadioGroup>
            </div>

            {/* Date Range */}
            <div className="border p-4 rounded mb-6">
              <h2 className="font-medium mb-4">Date Range</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm mb-1">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "w-full text-left border rounded px-3 py-2 text-sm flex items-center justify-between",
                          !startDate && "text-gray-500"
                        )}
                      >
                        {startDate
                          ? format(startDate, "MM/dd/yyyy")
                          : "Select date"}
                        <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm mb-1">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "w-full text-left border rounded px-3 py-2 text-sm flex items-center justify-between",
                          !endDate && "text-gray-500"
                        )}
                      >
                        {endDate
                          ? format(endDate, "MM/dd/yyyy")
                          : "Select date"}
                        <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="border p-4 rounded mb-6">
              <h2 className="font-medium mb-2">Details</h2>
              <label className="block text-sm mb-1">Reason for leave</label>
              <Textarea
                placeholder="Please explain why you need this leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
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
    </ProtectedRoute>
  );
}
