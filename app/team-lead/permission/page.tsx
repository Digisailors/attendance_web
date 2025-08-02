"use client";

import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock4 } from "lucide-react";
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

interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

export default function TeamLeadPermissionPage() {
  const [permissionType, setPermissionType] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
     if (!permissionType || !date || !startTime || !endTime || !reason) {
       alert("Please fill in all required fields");
       return;
     }
 
     if (!user?.email) {
       alert("User information not found. Please log in again.");
       return;
     }
 
     setIsSubmitting(true);
 
     try {
       // Get employee data first
       const { data: employee, error: employeeError } = await supabase
         .from('employees')
         .select('*')
         .eq('email_address', user.email)
         .single();
 
       if (employeeError || !employee) {
         console.error('Employee error:', employeeError);
         alert(`Employee record not found: ${employeeError?.message || 'Unknown error'}`);
         setIsSubmitting(false);
         return;
       }
 
       console.log('Employee found:', employee);
 
       // Get team lead for this employee
       const { data: teamMember, error: teamError } = await supabase
         .from('team_members')
         .select('team_lead_id')
         .eq('employee_id', employee.id)
         .eq('is_active', true)
         .single();
 
       if (teamError || !teamMember) {
         console.warn('Team lead not found, using default');
       }
 
       const teamLeadId = teamMember?.team_lead_id || 'DEFAULT_LEAD';
       console.log('Team lead ID:', teamLeadId);
 
       // Prepare the data to insert
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
 
       console.log('Inserting permission request:', permissionRequestData);
 
       // Insert permission request
       const { data: permissionRequest, error: insertError } = await supabase
         .from('permission_requests')
         .insert(permissionRequestData)
         .select()
         .single();
 
       if (insertError) {
         console.error('Error inserting permission request:', insertError);
         alert(`Failed to submit permission request: ${JSON.stringify(insertError)}`);
         setIsSubmitting(false);
         return;
       }
 
       console.log('Permission request inserted successfully:', permissionRequest);
 
       // Create notification for team lead (if team lead exists)
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
           console.error('Error creating notification:', notificationError);
         }
       }
 
       alert("Permission request submitted successfully! Your Manager will review it soon.");
       
       // Reset form
       setPermissionType("");
       setDate(undefined);
       setStartTime("");
       setEndTime("");
       setReason("");
 
     } catch (error) {
       console.error('Error submitting permission request:', error);
       alert(`An error occurred while submitting your request: ${JSON.stringify(error)}`);
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
            .from("employees")
            .select("*")
            .eq("email_address", parsedUser.email)
            .single();

          if (!error && leadInfo) {
            setLeadData(leadInfo);
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

  const displayName = leadData?.name || user?.email?.split("@")[0] || "Team Lead";

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="fixed left-0 top-0 h-full z-10">
          <Sidebar userType="team-lead" />
        </div>
        <div className="flex-1 ml-64 flex flex-col">
          <Header title="Team Lead Portal" subtitle="Loading..." userType="team-lead" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-full z-10">
        <Sidebar userType="team-lead" />
      </div>
      
      {/* Main Content - Scrollable */}
      <div className="flex-1 ml-64 min-h-screen">
        <div className="flex flex-col">
          <Header title="Team Lead Portal" subtitle={`Welcome, ${displayName}`} userType="team-lead" />

          <div className="w-full max-w-[900px] mx-auto p-6">
            <h1 className="text-2xl font-bold mb-1">Permission Request</h1>
            <p className="mb-6 text-sm text-gray-500">Request short-term permission</p>

            {/* Permission Type */}
            <div className="border p-4 rounded mb-6">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <Clock4 className="w-5 h-5 text-gray-700" />
                Permission Type
              </h2>
              <RadioGroup value={permissionType} onValueChange={setPermissionType} className="grid md:grid-cols-2 gap-3">
                {[
                  ["Medical Appointment", "1-4 hours"],
                  ["Personal Emergency", "Flexible"],
                  ["Family Emergency", "As needed"],
                  ["Official Business", "Variable"],
                  ["Educational Purpose", "1-8 hours"],
                  ["Other", "Specify duration"],
                ].map(([type, note]) => (
                  <div key={type} className="border p-3 rounded">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={type} />
                      <label htmlFor={type} className="font-medium cursor-pointer">
                        {type}
                      </label>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{note}</div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Date & Time */}
            <div className="border p-4 rounded mb-6">
              <h2 className="font-medium mb-4">Date and Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm mb-1">Start Time</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm mb-1">End Time</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="border p-4 rounded mb-6">
              <h2 className="font-medium mb-2">Details</h2>
              <label className="block text-sm mb-1">Reason for Permission</label>
              <Textarea
                placeholder="Please explain why you need this permission..."
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
    </div>
  );
}