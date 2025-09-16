"use client";
import { useState, useEffect } from "react";
import type React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  Clock,
  X,
  Calendar,
  MessageSquare,
  CalendarDays,
  Search,
  Filter,
  CalendarX,
  Timer,
  Phone,
  Mail,
  MapPin,
  Calculator,
  TrendingUp,
  Users,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days?: number;
  reason: string;
  status: string;
  applied_date?: string;
  created_at?: string;
  team_lead_comments?: string;
  manager_comments?: string;
  employee: {
    name: string;
    employee_id: string;
    designation: string;
    phoneNumber?: string;
    emailAddress?: string;
    address?: string;
  };
}

interface PermissionRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  permission_type: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  reason: string;
  status: string;
  applied_date?: string;
  created_at?: string;
  team_lead_comments?: string;
  manager_comments?: string;
  employee: {
    name: string;
    employee_id: string;
    designation: string;
    phoneNumber?: string;
    emailAddress?: string;
    address?: string;
  };
}

interface TeamMember {
  id: string;
  employee_id: string;
  team_lead_id: string;
  added_date: string;
  is_active: boolean;
  employee: {
    id: string;
    name: string;
    designation: string | null;
    workMode: string | null;
    status: string | null;
    phoneNumber?: string | null;
    emailAddress?: string | null;
    address?: string | null;
    dateOfJoining?: string | null;
  };
}

interface TeamLeadUser {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

export default function TeamLeadLeavePermissionRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<
    PermissionRequest[]
  >([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [user, setUser] = useState<TeamLeadUser | null>(null);
  const [teamLeadId, setTeamLeadId] = useState<string>("");
  const [teamLeadData, setTeamLeadData] = useState<any>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("leave");
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [showDurationStats, setShowDurationStats] = useState(false);

  const [leaveStats, setLeaveStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [permissionStats, setPermissionStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Enhanced duration calculation functions
  const calculateTotalDays = (
    startDate: string,
    endDate: string,
    excludeWeekends: boolean = false
  ): number => {
    if (!startDate || !endDate) return 0;

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      if (start > end) return 0;

      if (!excludeWeekends) {
        const timeDifference = end.getTime() - start.getTime();
        const dayDifference =
          Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
        return dayDifference > 0 ? dayDifference : 0;
      } else {
        let workingDays = 0;
        const currentDate = new Date(start);

        while (currentDate <= end) {
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return workingDays;
      }
    } catch (error) {
      console.error("Error calculating total days:", error);
      return 0;
    }
  };

  const calculateDurationHours = (
    startTime: string,
    endTime: string,
    date?: string
  ): number => {
    if (!startTime || !endTime) return 0;

    try {
      const baseDate = date || new Date().toISOString().split("T")[0];
      const startDateTime = new Date(`${baseDate}T${startTime}`);
      const endDateTime = new Date(`${baseDate}T${endTime}`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()))
        return 0;

      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const timeDifference = endDateTime.getTime() - startDateTime.getTime();
      const hours = timeDifference / (1000 * 60 * 60);

      return Math.round(hours * 100) / 100;
    } catch (error) {
      console.error("Error calculating duration hours:", error);
      return 0;
    }
  };

  const formatDuration = (hours: number): string => {
    if (hours === 0) return "0 hours";

    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (wholeHours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${wholeHours} hour${wholeHours !== 1 ? "s" : ""}`;
    } else {
      return `${wholeHours} hour${
        wholeHours !== 1 ? "s" : ""
      } ${minutes} minutes`;
    }
  };

  const getDurationStatistics = (
    requests: (LeaveRequest | PermissionRequest)[]
  ): {
    totalDays?: number;
    totalHours?: number;
    averageDuration?: number;
    longestDuration?: number;
    shortestDuration?: number;
  } => {
    if (requests.length === 0) return {};

    const isLeaveRequests = "start_date" in requests[0];

    if (isLeaveRequests) {
      const leaveRequests = requests as LeaveRequest[];
      const durations = leaveRequests
        .map((req) => getTotalDays(req))
        .filter((d) => d > 0);

      if (durations.length === 0) return {};

      const totalDays = durations.reduce((sum, days) => sum + days, 0);
      const averageDuration = totalDays / durations.length;
      const longestDuration = Math.max(...durations);
      const shortestDuration = Math.min(...durations);

      return { totalDays, averageDuration, longestDuration, shortestDuration };
    } else {
      const permissionRequests = requests as PermissionRequest[];
      const durations = permissionRequests
        .map(
          (req) =>
            req.duration_hours ||
            calculateDurationHours(req.start_time, req.end_time, req.date)
        )
        .filter((d) => d > 0);

      if (durations.length === 0) return {};

      const totalHours = durations.reduce((sum, hours) => sum + hours, 0);
      const averageDuration = totalHours / durations.length;
      const longestDuration = Math.max(...durations);
      const shortestDuration = Math.min(...durations);

      return { totalHours, averageDuration, longestDuration, shortestDuration };
    }
  };

  // Function to get applied date (use created_at if applied_date is not available)
  const getAppliedDate = (
    request: LeaveRequest | PermissionRequest
  ): string => {
    return request.applied_date || request.created_at || "";
  };

  // Function to get total days for leave request
  const getTotalDays = (request: LeaveRequest): number => {
    if (request.total_days && request.total_days > 0) {
      return request.total_days;
    }
    return calculateTotalDays(
      request.start_date,
      request.end_date,
      excludeWeekends
    );
  };

  // Function to get calculated duration for permission request
  const getCalculatedDuration = (request: PermissionRequest): number => {
    if (request.duration_hours && request.duration_hours > 0) {
      return request.duration_hours;
    }
    return calculateDurationHours(
      request.start_time,
      request.end_time,
      request.date
    );
  };

  // Get user data from localStorage and fetch team lead details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          const response = await fetch(
            `/api/employees/profile?email=${parsedUser.email}`
          );
          if (response.ok) {
            const teamLeadInfo = await response.json();
            setTeamLeadData(teamLeadInfo);
            setTeamLeadId(teamLeadInfo.employee_id || teamLeadInfo.id);
            console.log("Team lead data loaded:", teamLeadInfo);
          } else {
            console.error("Failed to fetch team lead profile");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  // Fetch team members first, then fetch requests
  useEffect(() => {
    if (teamLeadId) {
      fetchTeamMembers();
    }
  }, [teamLeadId]);

  // Fetch requests after team members are loaded
  useEffect(() => {
    if (teamMembers.length > 0) {
      fetchLeaveRequests();
      fetchPermissionRequests();
    }
  }, [teamMembers]);

  // Fetch team members function
  const fetchTeamMembers = async () => {
    if (!teamLeadId) return;

    try {
      const response = await fetch(
        `/api/team-lead?team_lead_id=${teamLeadId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const activeTeamMembers = (data.teamMembers || []).filter(
          (member: TeamMember) => member.is_active
        );
        setTeamMembers(activeTeamMembers);
        console.log("Active team members loaded:", activeTeamMembers);
      } else {
        console.error("Failed to fetch team members");
        setTeamMembers([]);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      setTeamMembers([]);
    }
  };

  // Filter requests to only show those from team members
  const getTeamMemberIds = (): string[] => {
    return teamMembers.map((member) => member.employee_id);
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const response = await fetch(
        `/api/leave-request?teamLeadId=${teamLeadId}&month=${currentMonth}&year=${currentYear}`
      );

      if (response.ok) {
        const data = await response.json();
        const requestsData = data.data || [];

        // Filter: Only show requests from actual team members
        const teamMemberIds = getTeamMemberIds();
        const filteredRequests = requestsData.filter((request: LeaveRequest) =>
          teamMemberIds.includes(request.employee_id)
        );

        const processedRequests = filteredRequests.map(
          (request: LeaveRequest) => ({
            ...request,
            applied_date: getAppliedDate(request),
            total_days: getTotalDays(request),
          })
        );

        setLeaveRequests(processedRequests);

        const total = processedRequests.length;
        const pending = processedRequests.filter(
          (r: LeaveRequest) => r.status === "Pending Team Lead"
        ).length;
        const approved = processedRequests.filter(
          (r: LeaveRequest) => r.status === "Approved"
        ).length;
        const rejected = processedRequests.filter(
          (r: LeaveRequest) => r.status === "Rejected"
        ).length;

        setLeaveStats({ total, pending, approved, rejected });

        console.log(
          `Filtered leave requests: ${processedRequests.length} from team members out of ${requestsData.length} total`
        );
      } else {
        console.error("Server responded with:", await response.json());
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionRequests = async () => {
    try {
      const response = await fetch(
        `/api/permission-request?teamLeadId=${teamLeadId}`
      );
      if (response.ok) {
        const data = await response.json();
        const requestsData = data.data || [];

        // Filter: Only show requests from actual team members
        const teamMemberIds = getTeamMemberIds();
        const filteredRequests = requestsData.filter(
          (request: PermissionRequest) =>
            teamMemberIds.includes(request.employee_id)
        );

        const processedRequests = filteredRequests.map(
          (request: PermissionRequest) => ({
            ...request,
            applied_date: getAppliedDate(request),
            duration_hours: getCalculatedDuration(request),
          })
        );

        setPermissionRequests(processedRequests);

        const total = processedRequests.length;
        const pending = processedRequests.filter(
          (r: PermissionRequest) => r.status === "Pending"
        ).length;
        const approved = processedRequests.filter(
          (r: PermissionRequest) => r.status === "Approved"
        ).length;
        const rejected = processedRequests.filter(
          (r: PermissionRequest) => r.status === "Rejected"
        ).length;
        setPermissionStats({ total, pending, approved, rejected });

        console.log(
          `Filtered permission requests: ${processedRequests.length} from team members out of ${requestsData.length} total`
        );
      }
    } catch (error) {
      console.error("Error fetching permission requests:", error);
    }
  };

  const handleApproveLeave = async (
    requestId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (processingId) return;
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/team-lead/leave-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "approve",
          userType: "team-lead",
          teamLeadId: teamLeadId,
          comments: comments[requestId] || "",
        }),
      });
      if (response.ok) {
        await fetchLeaveRequests();
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }));
        console.log("Leave request approved successfully");
      } else {
        console.error("Failed to approve leave request");
        const errorData = await response.json();
        alert(
          `Failed to approve leave request: ${
            errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error approving leave request:", error);
      alert(
        `An error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectLeave = async (
    requestId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (processingId) return;
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/team-lead/leave-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "reject",
          userType: "team-lead",
          teamLeadId: teamLeadId,
          comments: comments[requestId] || "",
        }),
      });
      if (response.ok) {
        await fetchLeaveRequests();
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }));
        console.log("Leave request rejected successfully");
      } else {
        console.error("Failed to reject leave request");
        const errorData = await response.json();
        alert(
          `Failed to reject leave request: ${
            errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      alert(
        `An error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprovePermission = async (
    requestId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (processingId) return;
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/team-lead/permission-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "approve",
          userType: "team-lead",
          teamLeadId: teamLeadId,
          comments: comments[requestId] || "",
        }),
      });
      if (response.ok) {
        await fetchPermissionRequests();
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }));
        console.log("Permission request approved successfully");
      } else {
        console.error("Failed to approve permission request");
        const errorData = await response.json();
        alert(
          `Failed to approve permission request: ${
            errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error approving permission request:", error);
      alert(
        `An error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPermission = async (
    requestId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (processingId) return;
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/team-lead/permission-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "reject",
          teamLeadId: teamLeadId,
          userType: "team-lead",
          comments: comments[requestId] || "",
        }),
      });
      if (response.ok) {
        await fetchPermissionRequests();
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }));
        console.log("Permission request rejected successfully");
      } else {
        console.error("Failed to reject permission request");
        const errorData = await response.json();
        alert(
          `Failed to reject permission request: ${
            errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error rejecting permission request:", error);
      alert(
        `An error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCommentChange = (requestId: string, value: string) => {
    setComments((prev) => ({
      ...prev,
      [requestId]: value,
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    try {
      let time = timeString;
      if (timeString.includes(":")) {
        const parts = timeString.split(":");
        if (parts.length === 2) {
          time = `${timeString}:00`;
        }
      }

      const date = new Date(`2000-01-01T${time}`);
      if (isNaN(date.getTime())) return timeString;

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-blue-100 text-blue-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "sick leave":
        return "bg-red-100 text-red-800";
      case "annual leave":
        return "bg-blue-100 text-blue-800";
      case "personal leave":
        return "bg-purple-100 text-purple-800";
      case "maternity leave":
        return "bg-pink-100 text-pink-800";
      case "emergency leave":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPermissionTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "medical appointment":
        return "bg-red-100 text-red-800";
      case "personal emergency":
        return "bg-blue-100 text-blue-800";
      case "official business":
        return "bg-green-100 text-green-800";
      case "family emergency":
        return "bg-purple-100 text-purple-800";
      case "educational purpose":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filterLeaveRequests = (requests: LeaveRequest[]) => {
    return requests.filter((request) => {
      const matchesSearch =
        request.employee_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.leave_type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filterPermissionRequests = (requests: PermissionRequest[]) => {
    return requests.filter((request) => {
      const matchesSearch =
        request.employee_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.permission_type
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  // Get duration statistics for current filtered requests
  const currentLeaveStats = getDurationStatistics(
    filterLeaveRequests(leaveRequests)
  );
  const currentPermissionStats = getDurationStatistics(
    filterPermissionRequests(permissionRequests)
  );

  return (
    <ProtectedRoute allowedRoles={["team-lead"]}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userType="team-lead" />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header
            title="Leave & Permission Requests"
            subtitle="Review and manage leave and permission requests from your team members"
            userType="team-lead"
          />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Team Lead Info with Team Member Count */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-blue-900">
                        {teamLeadData?.name ||
                          user?.email?.split("@")[0] ||
                          "Team Lead"}
                      </CardTitle>
                      <CardDescription className="text-blue-700">
                        {teamLeadData?.designation || "Team Lead"} • ID:{" "}
                        {teamLeadId}
                      </CardDescription>
                      <div className="flex items-center mt-2 text-sm text-blue-600">
                        <Users className="w-4 h-4 mr-1" />
                        <span>Active Team Members: {teamMembers.length}</span>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white">Team Lead</Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Show message if no team members */}
              {teamMembers.length === 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-yellow-800 mb-2">
                        No Team Members Added
                      </h3>
                      <p className="text-yellow-700 mb-4">
                        You haven't added any team members yet. Add team members
                        first to see their leave and permission requests.
                      </p>
                      <Button
                        onClick={() =>
                          (window.location.href = "/team-lead/team")
                        }
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Team Members
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs for Leave and Permission Requests */}
              {teamMembers.length > 0 && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="leave"
                      className="flex items-center space-x-2"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Leave Requests</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="permission"
                      className="flex items-center space-x-2"
                    >
                      <Timer className="w-4 h-4" />
                      <span>Permission Requests</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Leave Requests Tab */}
                  <TabsContent value="leave" className="space-y-6">
                    {/* Leave Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Total Leave Requests
                          </CardTitle>
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {leaveStats.total}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            From your team
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Pending
                          </CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {leaveStats.pending}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Awaiting review
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Approved
                          </CardTitle>
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {leaveStats.approved}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            By you or manager
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Rejected
                          </CardTitle>
                          <CalendarX className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {leaveStats.rejected}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            This month
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Duration Statistics for Leave */}
                    {showDurationStats && currentLeaveStats.totalDays && (
                      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <TrendingUp className="w-5 h-5 text-blue-600" />
                              <span>Duration Analytics</span>
                            </CardTitle>
                            <Calculator className="w-5 h-5 text-blue-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-700">
                                {currentLeaveStats.totalDays}
                              </div>
                              <p className="text-sm text-blue-600">
                                Total Days
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-700">
                                {Math.round(
                                  (currentLeaveStats.averageDuration || 0) * 10
                                ) / 10}
                              </div>
                              <p className="text-sm text-green-600">Avg Days</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-700">
                                {currentLeaveStats.longestDuration}
                              </div>
                              <p className="text-sm text-orange-600">Longest</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-700">
                                {currentLeaveStats.shortestDuration}
                              </div>
                              <p className="text-sm text-purple-600">
                                Shortest
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Filters */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          Filter Leave Requests
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by employee name or leave type..."
                              className="pl-10"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                          <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger>
                              <Filter className="w-4 h-4 mr-2" />
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All">All Status</SelectItem>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          {/* <div className="flex items-center space-x-2">
                            <Switch
                              id="show-leave-stats"
                              checked={showDurationStats}
                              onCheckedChange={setShowDurationStats}
                            />
                            <Label
                              htmlFor="show-leave-stats"
                              className="text-sm"
                            >
                              Show Analytics
                            </Label>
                          </div> */}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Leave Requests List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Leave Requests from Your Team</CardTitle>
                        <CardDescription>
                          Review and approve leave requests from your team
                          members
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {filterLeaveRequests(leaveRequests).length === 0 ? (
                          <div className="text-center py-8">
                            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">
                              No leave requests found
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                              {leaveRequests.length === 0
                                ? "No leave requests from your team members"
                                : "Try adjusting your search or filters"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filterLeaveRequests(leaveRequests).map(
                              (request) => (
                                <Card
                                  key={request.id}
                                  className="border-l-4 border-l-blue-500"
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                          {request.employee_name
                                            ?.charAt(0)
                                            ?.toUpperCase() || "N"}
                                        </div>
                                        <div>
                                          <CardTitle className="text-lg">
                                            {request.employee_name || "N/A"}
                                          </CardTitle>
                                          <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                                            {/* <span>
                                              {request.employee?.designation ||
                                                "N/A"}
                                            </span> */}
                                            <span className="flex items-center space-x-1">
                                              <Calendar className="h-3 w-3" />
                                              <span>
                                                Applied:{" "}
                                                {formatDate(
                                                  getAppliedDate(request)
                                                )}
                                              </span>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge
                                          className={getLeaveTypeColor(
                                            request.leave_type
                                          )}
                                        >
                                          {request.leave_type || "N/A"}
                                        </Badge>
                                        <Badge
                                          className={getStatusColor(
                                            request.status
                                          )}
                                        >
                                          {request.status || "N/A"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-4">
                                      {/* Leave Details */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            Start Date
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {formatDate(request.start_date)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            End Date
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {formatDate(request.end_date)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            Total Days
                                          </p>
                                          <p className="text-sm text-gray-600 font-semibold">
                                            {calculateTotalDays(
                                              request.start_date,
                                              request.end_date,
                                              excludeWeekends
                                            )}{" "}
                                            days
                                          </p>
                                        </div>
                                      </div>

                                      {/* Employee Contact Info */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                                        {request.employee?.phoneNumber && (
                                          <div className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm text-blue-800">
                                              {request.employee.phoneNumber}
                                            </span>
                                          </div>
                                        )}
                                        {request.employee?.emailAddress && (
                                          <div className="flex items-center space-x-2">
                                            <Mail className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm text-blue-800">
                                              {request.employee.emailAddress}
                                            </span>
                                          </div>
                                        )}
                                        {request.employee?.address && (
                                          <div className="flex items-center space-x-2">
                                            <MapPin className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm text-blue-800 truncate">
                                              {request.employee.address}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Reason */}
                                      <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                          <MessageSquare className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm font-medium text-gray-700">
                                            Reason
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                          {request.reason ||
                                            "No reason provided"}
                                        </p>
                                      </div>

                                      {/* Actions for Pending Requests */}
                                      {request.status ===
                                        "Pending Team Lead" && (
                                        <div className="space-y-4 border-t pt-4">
                                          <div>
                                            <Label
                                              htmlFor={`leave-comments-${request.id}`}
                                              className="text-sm font-medium"
                                            >
                                              Review Comments (optional):
                                            </Label>
                                            <Textarea
                                              id={`leave-comments-${request.id}`}
                                              placeholder="Add your comments or feedback..."
                                              value={comments[request.id] || ""}
                                              onChange={(e) =>
                                                handleCommentChange(
                                                  request.id,
                                                  e.target.value
                                                )
                                              }
                                              className="mt-2"
                                            />
                                          </div>
                                          <div className="flex space-x-2">
                                            <Button
                                              onClick={(e) =>
                                                handleApproveLeave(
                                                  request.id,
                                                  e
                                                )
                                              }
                                              disabled={processingId !== null}
                                              className="bg-green-500 hover:bg-green-600"
                                              type="button"
                                            >
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              {processingId === request.id
                                                ? "Approving..."
                                                : "Approve"}
                                            </Button>
                                            <Button
                                              onClick={(e) =>
                                                handleRejectLeave(request.id, e)
                                              }
                                              disabled={processingId !== null}
                                              variant="destructive"
                                              type="button"
                                            >
                                              <X className="w-4 h-4 mr-2" />
                                              {processingId === request.id
                                                ? "Rejecting..."
                                                : "Reject"}
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Status Messages */}
                                      {request.status === "Approved" && (
                                        <div className="bg-green-50 p-3 rounded-md">
                                          <p className="text-sm text-green-700 font-medium">
                                            ✓ Approved by Team Lead
                                          </p>
                                          {request.team_lead_comments && (
                                            <p className="text-sm text-green-600 mt-1">
                                              Comments:{" "}
                                              {request.team_lead_comments}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {request.status === "Rejected" && (
                                        <div className="bg-red-50 p-3 rounded-md">
                                          <p className="text-sm text-red-700 font-medium">
                                            ✗ Rejected by you
                                          </p>
                                          {request.team_lead_comments && (
                                            <p className="text-sm text-red-600 mt-1">
                                              Comments:{" "}
                                              {request.team_lead_comments}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Permission Requests Tab */}
                  <TabsContent value="permission" className="space-y-6">
                    {/* Permission Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Total Permission Requests
                          </CardTitle>
                          <Timer className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {permissionStats.total}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            From your team
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Pending
                          </CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {permissionStats.pending}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Awaiting review
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Approved
                          </CardTitle>
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {permissionStats.approved}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            By you or manager
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Rejected
                          </CardTitle>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {permissionStats.rejected}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            This month
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Duration Statistics for Permissions */}
                    {showDurationStats && currentPermissionStats.totalHours && (
                      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <TrendingUp className="w-5 h-5 text-green-600" />
                              <span>Duration Analytics</span>
                            </CardTitle>
                            <Calculator className="w-5 h-5 text-green-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-700">
                                {Math.round(
                                  (currentPermissionStats.totalHours || 0) * 10
                                ) / 10}
                              </div>
                              <p className="text-sm text-green-600">
                                Total Hours
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-700">
                                {Math.round(
                                  (currentPermissionStats.averageDuration ||
                                    0) * 10
                                ) / 10}
                              </div>
                              <p className="text-sm text-blue-600">Avg Hours</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-700">
                                {Math.round(
                                  (currentPermissionStats.longestDuration ||
                                    0) * 10
                                ) / 10}
                              </div>
                              <p className="text-sm text-orange-600">Longest</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-700">
                                {Math.round(
                                  (currentPermissionStats.shortestDuration ||
                                    0) * 10
                                ) / 10}
                              </div>
                              <p className="text-sm text-purple-600">
                                Shortest
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Permission Filters */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          Filter Permission Requests
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by employee name or permission type..."
                              className="pl-10"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                          <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger>
                              <Filter className="w-4 h-4 mr-2" />
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All">All Status</SelectItem>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          {/* <div className="flex items-center space-x-2">
                            <Switch
                              id="show-permission-stats"
                              checked={showDurationStats}
                              onCheckedChange={setShowDurationStats}
                            />
                            <Label
                              htmlFor="show-permission-stats"
                              className="text-sm"
                            >
                              Show Analytics
                            </Label>
                          </div> */}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Permission Requests List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Permission Requests from Your Team
                        </CardTitle>
                        <CardDescription>
                          Review and approve permission requests from your team
                          members
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {filterPermissionRequests(permissionRequests).length ===
                        0 ? (
                          <div className="text-center py-8">
                            <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">
                              No permission requests found
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                              {permissionRequests.length === 0
                                ? "No permission requests from your team members"
                                : "Try adjusting your search or filters"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filterPermissionRequests(permissionRequests).map(
                              (request) => (
                                <Card
                                  key={request.id}
                                  className="border-l-4 border-l-green-500"
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                          {request.employee_name
                                            ?.charAt(0)
                                            ?.toUpperCase() || "N"}
                                        </div>
                                        <div>
                                          <CardTitle className="text-lg">
                                            {request.employee_name}
                                          </CardTitle>
                                          <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                                            {/* <span>
                                              {request.employee?.designation ||
                                                "N/A"}
                                            </span> */}
                                            <span className="flex items-center space-x-1">
                                              <Calendar className="h-3 w-3" />
                                              <span>
                                                Applied:{" "}
                                                {formatDate(
                                                  getAppliedDate(request)
                                                )}
                                              </span>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge
                                          className={getPermissionTypeColor(
                                            request.permission_type
                                          )}
                                        >
                                          {request.permission_type}
                                        </Badge>
                                        <Badge
                                          className={getStatusColor(
                                            request.status
                                          )}
                                        >
                                          {request.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-4">
                                      {/* Permission Details */}
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            Date
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {formatDate(request.date)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            From Time
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {formatTime(request.start_time)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            To Time
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {formatTime(request.end_time)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            Duration
                                          </p>
                                          <p className="text-sm text-gray-600 font-semibold">
                                            {formatDuration(
                                              getCalculatedDuration(request)
                                            )}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Employee Contact Info */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                                        {request.employee?.phoneNumber && (
                                          <div className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 text-green-600" />
                                            <span className="text-sm text-green-800">
                                              {request.employee.phoneNumber}
                                            </span>
                                          </div>
                                        )}
                                        {request.employee?.emailAddress && (
                                          <div className="flex items-center space-x-2">
                                            <Mail className="w-4 h-4 text-green-600" />
                                            <span className="text-sm text-green-800">
                                              {request.employee.emailAddress}
                                            </span>
                                          </div>
                                        )}
                                        {request.employee?.address && (
                                          <div className="flex items-center space-x-2">
                                            <MapPin className="w-4 h-4 text-green-600" />
                                            <span className="text-sm text-green-800 truncate">
                                              {request.employee.address}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Reason */}
                                      <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                          <MessageSquare className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm font-medium text-gray-700">
                                            Reason
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                          {request.reason}
                                        </p>
                                      </div>

                                      {/* Actions for Pending Requests */}
                                      {request.status === "Pending" && (
                                        <div className="space-y-4 border-t pt-4">
                                          <div>
                                            <Label
                                              htmlFor={`permission-comments-${request.id}`}
                                              className="text-sm font-medium"
                                            >
                                              Review Comments (optional):
                                            </Label>
                                            <Textarea
                                              id={`permission-comments-${request.id}`}
                                              placeholder="Add your comments or feedback..."
                                              value={comments[request.id] || ""}
                                              onChange={(e) =>
                                                handleCommentChange(
                                                  request.id,
                                                  e.target.value
                                                )
                                              }
                                              className="mt-2"
                                            />
                                          </div>
                                          <div className="flex space-x-2">
                                            <Button
                                              onClick={(e) =>
                                                handleApprovePermission(
                                                  request.id,
                                                  e
                                                )
                                              }
                                              disabled={processingId !== null}
                                              className="bg-green-500 hover:bg-green-600"
                                              type="button"
                                            >
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              {processingId === request.id
                                                ? "Approving..."
                                                : "Approve"}
                                            </Button>
                                            <Button
                                              onClick={(e) =>
                                                handleRejectPermission(
                                                  request.id,
                                                  e
                                                )
                                              }
                                              disabled={processingId !== null}
                                              variant="destructive"
                                              type="button"
                                            >
                                              <X className="w-4 h-4 mr-2" />
                                              {processingId === request.id
                                                ? "Rejecting..."
                                                : "Reject"}
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Status Messages */}
                                      {request.status === "Approved" && (
                                        <div className="bg-green-50 p-3 rounded-md">
                                          <p className="text-sm text-green-700 font-medium">
                                            ✓ Approved by you
                                          </p>
                                          {request.team_lead_comments && (
                                            <p className="text-sm text-green-600 mt-1">
                                              Your comments:{" "}
                                              {request.team_lead_comments}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {request.status === "Rejected" && (
                                        <div className="bg-red-50 p-3 rounded-md">
                                          <p className="text-sm text-red-700 font-medium">
                                            ✗ Rejected by you
                                          </p>
                                          {request.team_lead_comments && (
                                            <p className="text-sm text-red-600 mt-1">
                                              Comments:{" "}
                                              {request.team_lead_comments}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
