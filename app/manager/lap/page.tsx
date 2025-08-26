"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle,
  Clock,
  X,
  Calendar,
  MessageSquare,
  Loader2,
  CalendarDays,
  Search,
  Filter,
  CalendarX,
  Timer,
  Phone,
  Mail,
  MapPin,
  Users,
  AlertCircle,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface LeaveRequest {
  id: string
  employee_id: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: string
  applied_date: string
  created_at: string
  team_lead_comments?: string
  manager_comments?: string
  manager_id?: string
  team_lead_id?: string
  employee: {
    name: string
    employee_id: string
    team_lead: string
    phoneNumber?: string
    emailAddress?: string
    address?: string
  }
}

interface PermissionRequest {
  id: string
  employee_id: string
  employee_name: string
  permission_type: string
  date: string
  start_time: string
  end_time: string
  duration_hours: number
  reason: string
  status: string
  applied_date: string
  created_at: string
  team_lead_comments?: string
  manager_id?: string
  manager_comments?: string
  team_lead_id?: string
  employee: {
    name: string
    employee_id: string
    team_lead: string
    phoneNumber?: string
    emailAddress?: string
    address?: string
  }
}

interface ManagerUser {
  id: string
  email: string
  userType: string
  name?: string
}

// Team Lead Name Cache
interface TeamLeadCache {
  [key: string]: {
    name: string
    loading: boolean
    error: boolean
  }
}

export default function ManagerLeavePermissionRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [user, setUser] = useState<ManagerUser | null>(null)
  const [managerId, setManagerId] = useState<string>("")
  const [managerData, setManagerData] = useState<any>(null)
  const [comments, setComments] = useState<{ [key: string]: string }>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [activeTab, setActiveTab] = useState("leave")
  const [error, setError] = useState<string | null>(null)
 
  // Improved team lead name cache
  const [teamLeadCache, setTeamLeadCache] = useState<TeamLeadCache>({})

  const [leaveStats, setLeaveStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [permissionStats, setPermissionStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  // Debug function to check if request needs manager approval
  const needsManagerApproval = (request: LeaveRequest | PermissionRequest): boolean => {
    const status = request.status?.toLowerCase().trim()
    console.log(`🔍 Checking status for request ${request.id}: "${request.status}" (normalized: "${status}")`)
   
    const pendingStatuses = [
      'pending manager approval',
      'pending manager',
      'manager approval',
      'awaiting manager approval',
      'pending',
      'submitted'
    ]
   
    const needsApproval = pendingStatuses.some(pendingStatus =>
      status.includes(pendingStatus.toLowerCase())
    )
   
    console.log(`🎯 Request ${request.id} needs approval: ${needsApproval}`)
    return needsApproval
  }

  // Improved function to fetch team lead name with better error handling and caching
  const fetchTeamLeadName = async (teamLeadId: string): Promise<string> => {
    if (!teamLeadId) return "No Team Lead Assigned"
   
    // Check if we already have this team lead's data in cache
    if (teamLeadCache[teamLeadId]) {
      if (teamLeadCache[teamLeadId].loading) {
        return "Loading..."
      }
      if (teamLeadCache[teamLeadId].error) {
        return teamLeadId // Return ID if there was an error
      }
      return teamLeadCache[teamLeadId].name
    }

    // Set loading state
    setTeamLeadCache(prev => ({
      ...prev,
      [teamLeadId]: { name: "", loading: true, error: false }
    }))

    try {
      // Try multiple API endpoints to fetch team lead details
      const endpoints = [
        `/api/employees/profile?employee_id=${teamLeadId}`,
        `/api/employees/profile?id=${teamLeadId}`,
        `/api/team-lead/profile?id=${teamLeadId}`
      ]

      let teamLeadData = null
     
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint)
          if (response.ok) {
            teamLeadData = await response.json()
            break
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${endpoint}:`, error)
          continue
        }
      }

      if (teamLeadData) {
        // Try different possible name fields
        const teamLeadName = teamLeadData.name ||
                           teamLeadData.employee_name ||
                           teamLeadData.full_name ||
                           teamLeadData.firstName + " " + teamLeadData.lastName ||
                           teamLeadId

        // Update cache with successful result
        setTeamLeadCache(prev => ({
          ...prev,
          [teamLeadId]: { name: teamLeadName, loading: false, error: false }
        }))
       
        return teamLeadName
      } else {
        // If all endpoints fail, cache the error and return ID
        setTeamLeadCache(prev => ({
          ...prev,
          [teamLeadId]: { name: teamLeadId, loading: false, error: true }
        }))
        return teamLeadId
      }
    } catch (error) {
      console.error("Error fetching team lead name:", error)
      // Cache the error
      setTeamLeadCache(prev => ({
        ...prev,
        [teamLeadId]: { name: teamLeadId, loading: false, error: true }
      }))
      return teamLeadId
    }
  }

  // Improved batch fetching function
  const fetchAllTeamLeadNames = async (requests: (LeaveRequest | PermissionRequest)[]) => {
    const uniqueTeamLeadIds = Array.from(new Set(
      requests
        .map(request => request.team_lead_id)
        .filter(id => id && !teamLeadCache[id])
    ))

    if (uniqueTeamLeadIds.length === 0) return

    console.log("Fetching team lead names for IDs:", uniqueTeamLeadIds)

    // Set loading state for all IDs
    const loadingStates: TeamLeadCache = {}
    uniqueTeamLeadIds.forEach(id => {
  if (typeof id === "string") {
    loadingStates[id] = { name: "", loading: true, error: false }
  }
})

   
    setTeamLeadCache(prev => ({
      ...prev,
      ...loadingStates
    }))

    // Fetch all team lead names in parallel
    const teamLeadPromises = uniqueTeamLeadIds.map(async (teamLeadId) => {
      try {
        // Try multiple endpoints for each team lead
        const endpoints = [
          `/api/employees/profile?employee_id=${teamLeadId}`,
          `/api/employees/profile?id=${teamLeadId}`,
          `/api/team-lead/profile?id=${teamLeadId}`
        ]

        let teamLeadData = null
       
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint)
            if (response.ok) {
              teamLeadData = await response.json()
              break
            }
          } catch (error) {
            console.warn(`Failed to fetch from ${endpoint} for ${teamLeadId}:`, error)
            continue
          }
        }

        if (teamLeadData) {
          const teamLeadName = teamLeadData.name ||
                             teamLeadData.employee_name ||
                             teamLeadData.full_name ||
                             teamLeadData.firstName + " " + teamLeadData.lastName ||
                             teamLeadId
         
          return {
            id: teamLeadId,
            name: teamLeadName,
            loading: false,
            error: false
          }
        } else {
          return {
            id: teamLeadId,
            name: teamLeadId,
            loading: false,
            error: true
          }
        }
      } catch (error) {
        console.error(`Error fetching team lead ${teamLeadId}:`, error)
        return {
          id: teamLeadId,
          name: teamLeadId,
          loading: false,
          error: true
        }
      }
    })

    try {
      const results = await Promise.all(teamLeadPromises)
      const newTeamLeadCache: TeamLeadCache = {}

    results.forEach(result => {
  if (typeof result.id === "string") {
    newTeamLeadCache[result.id] = {
      name: result.name,
      loading: result.loading,
      error: result.error
    }
  }
})


      setTeamLeadCache(prev => ({
        ...prev,
        ...newTeamLeadCache
      }))

      console.log("Team lead names fetched:", newTeamLeadCache)
    } catch (error) {
      console.error("Error fetching team lead names in batch:", error)
     
      // Set error state for all IDs that failed
      const errorStates: TeamLeadCache = {}
     uniqueTeamLeadIds.forEach(id => {
  if (typeof id === "string") {
    errorStates[id] = { name: id, loading: false, error: true }
  }
})

     
      setTeamLeadCache(prev => ({
        ...prev,
        ...errorStates
      }))
    }
  }

  // Improved function to get team lead name for display
  const getTeamLeadName = (request: LeaveRequest | PermissionRequest): string => {
    if (request.team_lead_id) {
      const cached = teamLeadCache[request.team_lead_id]
      if (cached) {
        if (cached.loading) {
          return "Loading..."
        }
        if (cached.error) {
          // If there's an error but we have a fallback name from employee.team_lead, use it
          if (request.employee?.team_lead && request.employee.team_lead !== "No Team Lead Assigned") {
            return request.employee.team_lead
          }
          return request.team_lead_id // Return ID as fallback
        }
        return cached.name
      } else {
        // If not in cache yet, trigger fetch and show loading
        fetchTeamLeadName(request.team_lead_id)
        return "Loading..."
      }
    }
   
    // Fallback to employee.team_lead if available
    if (request.employee?.team_lead && request.employee.team_lead !== "No Team Lead Assigned") {
      return request.employee.team_lead
    }
   
    return "No Team Lead Assigned"
  }

  // Function to calculate total days between two dates
  const calculateTotalDays = (startDate: string, endDate: string): number => {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
     
      // Reset time to avoid timezone issues
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
     
      const timeDifference = end.getTime() - start.getTime()
      const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1 // +1 to include both start and end dates
     
      return daysDifference > 0 ? daysDifference : 1
    } catch (error) {
      console.error("Error calculating total days:", error)
      return 1
    }
  }

  // Function to get applied date (use created_at if applied_date is invalid)
  const getAppliedDate = (request: LeaveRequest | PermissionRequest): string => {
    // Try applied_date first, if invalid or empty, use created_at
    if (request.applied_date && request.applied_date !== 'Invalid Date' && new Date(request.applied_date).toString() !== 'Invalid Date') {
      return request.applied_date
    }
    return request.created_at || request.applied_date || new Date().toISOString()
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Fetch manager details using email
          const response = await fetch(
            `/api/employees/profile?email=${parsedUser.email}`
          );
          if (response.ok) {
            const managerInfo = await response.json();
            setManagerData(managerInfo);
            setManagerId(managerInfo.employee_id || managerInfo.id);
            console.log("Manager data loaded:", managerInfo);
          } else {
            console.error("Failed to fetch manager profile");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (managerId) {
      fetchLeaveRequests()
      fetchPermissionRequests()
    }
  }, [managerId])

  // Refresh team lead names when cache updates
  useEffect(() => {
    // Force re-render when team lead cache updates
  }, [teamLeadCache])

  // Fetch Leave Requests
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Fetching leave requests for manager:", managerId);
     
      // Build query parameters
      const params = new URLSearchParams({
        managerId: managerId
      });
     
      // Only add status filter if it's not "All"
      if (statusFilter !== "All") {
        params.append('status', statusFilter);
      }
     
      const response = await fetch(`/api/team-lead/leave-requests?${params.toString()}`);
     
      if (response.ok) {
        const data = await response.json();
        console.log("📥 Leave requests response:", data);
       
        const requests = data.data || data || [];
        console.log("📋 Total leave requests:", requests.length);
       
        // Debug: Log all request statuses
        requests.forEach((req: LeaveRequest, index: number) => {
          console.log(`📄 Request ${index + 1} (ID: ${req.id}): Status = "${req.status}"`);
        });
       
        setLeaveRequests(requests);
       
        // Fetch team lead names for all requests
        await fetchAllTeamLeadNames(requests);
       
        // Calculate stats with flexible status matching
        const total = requests.length;
        const pending = requests.filter((r: LeaveRequest) => needsManagerApproval(r)).length;
        const approved = requests.filter((r: LeaveRequest) =>
          r.status?.toLowerCase().includes('approved')).length;
        const rejected = requests.filter((r: LeaveRequest) =>
          r.status?.toLowerCase().includes('rejected')).length;
       
        setLeaveStats({ total, pending, approved, rejected });
        console.log("📊 Leave stats:", { total, pending, approved, rejected });
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to fetch leave requests:", errorData);
        setError(`Failed to fetch leave requests: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error fetching leave requests:", error);
      setError(`Error fetching leave requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // Fetch Permission Requests
  const fetchPermissionRequests = async () => {
    try {
      setError(null);
      console.log("🔄 Fetching permission requests for manager:", managerId);
     
      // Build query parameters
      const params = new URLSearchParams({
        managerId: managerId
      });
     
      // Only add status filter if it's not "All"
      if (statusFilter !== "All") {
        params.append('status', statusFilter);
      }
     
      const response = await fetch(`/api/team-lead/permission-requests?${params.toString()}`);
     
      if (response.ok) {
        const data = await response.json();
        console.log("📥 Permission requests response:", data);
       
        const requests = data.data || data || [];
        console.log("📋 Total permission requests:", requests.length);
       
        // Debug: Log all request statuses
        requests.forEach((req: PermissionRequest, index: number) => {
          console.log(`📄 Request ${index + 1} (ID: ${req.id}): Status = "${req.status}"`);
        });
       
        setPermissionRequests(requests);
       
        // Fetch team lead names for all requests
        await fetchAllTeamLeadNames(requests);
       
        // Calculate stats with flexible status matching
        const total = requests.length;
        const pending = requests.filter((r: PermissionRequest) => needsManagerApproval(r)).length;
        const approved = requests.filter((r: PermissionRequest) =>
          r.status?.toLowerCase().includes('approved')).length;
        const rejected = requests.filter((r: PermissionRequest) =>
          r.status?.toLowerCase().includes('rejected')).length;
       
        setPermissionStats({ total, pending, approved, rejected });
        console.log("📊 Permission stats:", { total, pending, approved, rejected });
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to fetch permission requests:", errorData);
        setError(`Failed to fetch permission requests: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error fetching permission requests:", error);
      setError(`Error fetching permission requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle Approve Leave
  const handleApproveLeave = async (requestId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();

    if (processingId) return;
    setProcessingId(requestId);

    if (!managerId) {
      alert("Manager ID is missing. Please login again.");
      setProcessingId(null);
      return;
    }

    try {
      console.log("✅ Approving leave with managerId:", managerId);

      const response = await fetch("/api/manager/final-approvals/leave-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "approve",
          comments: comments[requestId] || "Approved by manager",
          userType: "manager",
          managerId: managerId,
        }),
      });

    if (response.ok) {
  await fetchLeaveRequests();
  setComments((prev) => ({
    ...prev,
    [requestId]: "",
  }));
  console.log("✅ Leave request approved by manager successfully");
} else {
  console.error("❌ Failed to approve leave request");

  let errorMessage = "Unknown error";
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    const errorData = await response.json();
    errorMessage = errorData.error || errorData.message || errorMessage;
  } else {
    const text = await response.text();
    console.warn("⚠️ Received non-JSON error response:", text);
    errorMessage = "Server returned invalid response (not JSON)";
  }

  alert(`Failed to approve leave request: ${errorMessage}`);
}

    } catch (error) {
      console.error("❌ Error approving leave request:", error);
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject Leave
  const handleRejectLeave = async (requestId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (processingId) return;
    setProcessingId(requestId);
    try {
      console.log("❌ Rejecting leave with managerId:", managerId);
     
      const response = await fetch(`/api/manager/leave-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "reject",
          managerId: managerId,
          comments: comments[requestId] || "Rejected by manager",
          userType: "manager",
        }),
      });
      if (response.ok) {
        await fetchLeaveRequests();
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }));
        console.log("❌ Leave request rejected by manager successfully");
      } else {
        console.error("❌ Failed to reject leave request");
        const errorData = await response.json();
        alert(`Failed to reject leave request: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error rejecting leave request:", error);
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessingId(null);
    }
  }

  // Handle Approve Permission
  const handleApprovePermission = async (requestId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (processingId) return;
    setProcessingId(requestId);
    try {
      console.log("✅ Approving permission with managerId:", managerId);
     
      const response = await fetch(`/api/manager/permission-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "approve",
          managerId: managerId,
          comments: comments[requestId] || "Approved by manager",
          userType: "manager",
        }),
      });
      if (response.ok) {
        await fetchPermissionRequests();
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }));
        console.log("✅ Permission request approved by manager successfully");
      } else {
        console.error("❌ Failed to approve permission request");
        const errorData = await response.json();
        alert(`Failed to approve permission request: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error approving permission request:", error);
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessingId(null);
    }
  }

  // Handle Reject Permission
  const handleRejectPermission = async (requestId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (processingId) return;
    setProcessingId(requestId);
    try {
      console.log("❌ Rejecting permission with managerId:", managerId);
     
      const response = await fetch(`/api/manager/permission-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "reject",
          managerId: managerId,
          comments: comments[requestId] || "Rejected by manager",
          userType: "manager",
        }),
      });
      if (response.ok) {
        await fetchPermissionRequests();
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }));
        console.log("❌ Permission request rejected by manager successfully");
      } else {
        console.error("❌ Failed to reject permission request");
        const errorData = await response.json();
        alert(`Failed to reject permission request: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error rejecting permission request:", error);
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessingId(null);
    }
  }

  const handleCommentChange = (requestId: string, value: string) => {
    setComments((prev) => ({
      ...prev,
      [requestId]: value,
    }))
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Invalid Date"
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Error formatting datetime:", error)
      return "Invalid Date"
    }
  }

  const formatTime = (timeString: string) => {
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch (error) {
      console.error("Error formatting time:", error)
      return timeString
    }
  }

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    if (statusLower.includes('pending')) {
      return "bg-yellow-100 text-yellow-800"
    } else if (statusLower.includes('approved')) {
      return "bg-green-100 text-green-800"
    } else if (statusLower.includes('rejected')) {
      return "bg-red-100 text-red-800"
    } else {
      return "bg-gray-100 text-gray-800"
    }
  }

  const getLeaveTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "sick leave":
        return "bg-red-100 text-red-800"
      case "annual leave":
        return "bg-blue-100 text-blue-800"
      case "personal leave":
        return "bg-purple-100 text-purple-800"
      case "maternity leave":
        return "bg-pink-100 text-pink-800"
      case "emergency leave":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPermissionTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "medical appointment":
        return "bg-red-100 text-red-800"
      case "personal emergency":
        return "bg-blue-100 text-blue-800"
      case "official business":
        return "bg-green-100 text-green-800"
      case "family emergency":
        return "bg-purple-100 text-purple-800"
      case "educational purpose":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Filter functions with improved status matching
  const filterLeaveRequests = (requests: LeaveRequest[]) => {
    return requests.filter((request) => {
      const matchesSearch =
        request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.leave_type.toLowerCase().includes(searchTerm.toLowerCase())
     
      let matchesStatus = true
      if (statusFilter !== "All") {
        const statusLower = request.status?.toLowerCase() || ""
        const filterLower = statusFilter.toLowerCase()
       
        if (filterLower.includes('pending')) {
          matchesStatus = needsManagerApproval(request)
        } else if (filterLower.includes('approved')) {
          matchesStatus = statusLower.includes('approved')
        } else if (filterLower.includes('rejected')) {
          matchesStatus = statusLower.includes('rejected')
        } else {
          matchesStatus = statusLower.includes(filterLower)
        }
      }
     
      return matchesSearch && matchesStatus
    })
  }

  const filterPermissionRequests = (requests: PermissionRequest[]) => {
    return requests.filter((request) => {
      const matchesSearch =
        request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.permission_type.toLowerCase().includes(searchTerm.toLowerCase())
     
      let matchesStatus = true
      if (statusFilter !== "All") {
        const statusLower = request.status?.toLowerCase() || ""
        const filterLower = statusFilter.toLowerCase()
       
        if (filterLower.includes('pending')) {
          matchesStatus = needsManagerApproval(request)
        } else if (filterLower.includes('approved')) {
          matchesStatus = statusLower.includes('approved')
        } else if (filterLower.includes('rejected')) {
          matchesStatus = statusLower.includes('rejected')
        } else {
          matchesStatus = statusLower.includes(filterLower)
        }
      }
     
      return matchesSearch && matchesStatus
    })
  }

  // Handle status filter change
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    // Refetch data with new filter
    if (managerId) {
      if (activeTab === "leave") {
        fetchLeaveRequests()
      } else {
        fetchPermissionRequests()
      }
    }
  }

  // if (loading && !managerId) {
  //   return (
  //     <div className="flex h-screen bg-gray-50">
  //       <Sidebar userType="manager" />
  //       <div className="flex-1 flex items-center justify-center">
  //         <div className="flex items-center space-x-2">
  //           <Loader2 className="w-6 h-6 animate-spin" />
  //           <span>Loading manager data...</span>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="manager" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <X className="h-12 w-12 mx-auto mb-2" />
              <p className="text-lg font-medium">Error Loading Data</p>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-600">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="manager" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
   
      <div className="flex h-screen bg-gray-50">
      <Sidebar userType="manager" />
      <div className="flex-1 flex flex-col">
        <Header
          title="Manager Portal"
          subtitle="Review and provide final approval for leave and permission requests"
          userType="manager"
        />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Manager Info */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-purple-900">
                      {managerData?.name || user?.email?.split("@")[0] || "Manager"}
                    </CardTitle>
                    <CardDescription className="text-purple-700 flex items-center space-x-4">
                      <span>Manager • ID: {managerData?.employee_id || "N/A"}</span>
                      {managerData?.team_lead && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>Team Lead: {managerData?.team_lead}</span>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-600 text-white">Manager</Badge>
                </div>
              </CardHeader>
            </Card>

       

            {/* Tabs for Leave and Permission Requests */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leave" className="flex items-center space-x-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>Leave Requests</span>
                </TabsTrigger>
                <TabsTrigger value="permission" className="flex items-center space-x-2">
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
                      <CardTitle className="text-sm font-medium">Total Leave Requests</CardTitle>
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{leaveStats.total}</div>
                      <p className="text-xs text-muted-foreground">Awaiting your action</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Your Approval</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{leaveStats.pending}</div>
                      <p className="text-xs text-muted-foreground">Ready for review</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Approved by You</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{leaveStats.approved}</div>
                      <p className="text-xs text-muted-foreground">Fully approved</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rejected by You</CardTitle>
                      <CalendarX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{leaveStats.rejected}</div>
                      <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Filter Leave Requests</CardTitle>
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
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending Manager Approval">Pending Your Approval</SelectItem>
                          <SelectItem value="Approved">Approved by You</SelectItem>
                          <SelectItem value="Rejected">Rejected by You</SelectItem>
                          <SelectItem value="All">All Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Requests List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Requests for Your Approval</CardTitle>
                    <CardDescription>Review and provide final approval for leave requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filterLeaveRequests(leaveRequests).length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No leave requests found</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {leaveRequests.length === 0
                            ? "No leave requests pending your approval"
                            : "Try adjusting your search or filters"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filterLeaveRequests(leaveRequests).map((request) => (
                          <Card key={request.id} className="border-l-4 border-l-purple-500">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                    {request.employee_name.charAt(0)}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{request.employee_name}</CardTitle>
                                    <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                                      <div className="flex items-center space-x-1">
                                        <Users className="h-3 w-3" />
                                        <span>Team Lead</span>
                                      </div>
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Applied: {formatDate(getAppliedDate(request))}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getLeaveTypeColor(request.leave_type)}>{request.leave_type}</Badge>
                                  <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* Debug Status Info */}
                                {/* <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                                  <strong>Debug:</strong> Status = "{request.status}" | Needs Approval = {needsManagerApproval(request) ? "Yes" : "No"}
                                </div> */}

                                {/* Leave Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Start Date</p>
                                    <p className="text-sm text-gray-600">{formatDate(request.start_date)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">End Date</p>
                                    <p className="text-sm text-gray-600">{formatDate(request.end_date)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Total Days</p>
                                    <p className="text-sm text-gray-600">
                                      {calculateTotalDays(request.start_date, request.end_date)} days
                                    </p>
                                  </div>
                                </div>

                                {/* Employee Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
                                  {request.employee?.phoneNumber && (
                                    <div className="flex items-center space-x-2">
                                      <Phone className="w-4 h-4 text-purple-600" />
                                      <span className="text-sm text-purple-800">
                                        {request.employee?.phoneNumber || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                  {request.employee?.emailAddress && (
                                    <div className="flex items-center space-x-2">
                                      <Mail className="w-4 h-4 text-purple-600" />
                                      <span className="text-sm text-purple-800">
                                        {request.employee?.emailAddress || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                  {request.employee?.address && (
                                    <div className="flex items-center space-x-2">
                                      <MapPin className="w-4 h-4 text-purple-600" />
                                      <span className="text-sm text-purple-800 truncate">
                                        {request.employee?.address || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Reason */}
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">Reason</span>
                                  </div>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{request.reason}</p>
                                </div>

                                {/* Team Lead Comments (if any) */}
                                {request.team_lead_comments && (
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <MessageSquare className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-700">Team Lead Comments</span>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                      {request.team_lead_comments}
                                    </p>
                                  </div>
                                )}

                                {/* Actions for Pending Manager Approval Requests */}
                                {needsManagerApproval(request) && (
                                  <div className="space-y-4 border-t pt-4">
                                    <div>
                                      <Label htmlFor={`leave-comments-${request.id}`} className="text-sm font-medium">
                                        Review Comments (optional):
                                      </Label>
                                      <Textarea
                                        id={`leave-comments-${request.id}`}
                                        placeholder="Add your comments or feedback..."
                                        value={comments[request.id] || ""}
                                        onChange={(e) => handleCommentChange(request.id, e.target.value)}
                                        className="mt-2"
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        onClick={(e) => handleApproveLeave(request.id, e)}
                                        disabled={processingId === request.id || !managerId}
                                        className="bg-green-500 hover:bg-green-600"
                                        type="button"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        {processingId === request.id ? "Approving..." : "Approve"}
                                      </Button>
                                      <Button
                                        onClick={(e) => handleRejectLeave(request.id, e)}
                                        disabled={processingId !== null}
                                        variant="destructive"
                                        type="button"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        {processingId === request.id ? "Rejecting..." : "Reject"}
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Status Messages */}
                                {request.status?.toLowerCase().includes('approved') && (
                                  <div className="bg-green-50 p-3 rounded-md">
                                    <p className="text-sm text-green-700 font-medium">✓ Fully Approved</p>
                                    {request.manager_comments && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Your comments: {request.manager_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {request.status?.toLowerCase().includes('rejected') && (
                                  <div className="bg-red-50 p-3 rounded-md">
                                    <p className="text-sm text-red-700 font-medium">✗ Rejected</p>
                                    {request.manager_comments && (
                                      <p className="text-sm text-red-600 mt-1">
                                        Your comments: {request.manager_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
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
                      <CardTitle className="text-sm font-medium">Total Permission Requests</CardTitle>
                      <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{permissionStats.total}</div>
                      <p className="text-xs text-muted-foreground">Awaiting your action</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Your Approval</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{permissionStats.pending}</div>
                      <p className="text-xs text-muted-foreground">Ready for review</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Approved by You</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{permissionStats.approved}</div>
                      <p className="text-xs text-muted-foreground">Fully approved</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rejected by You</CardTitle>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{permissionStats.rejected}</div>
                      <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Permission Filters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Filter Permission Requests</CardTitle>
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
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending Manager Approval">Pending Your Approval</SelectItem>
                          <SelectItem value="Approved">Approved by You</SelectItem>
                          <SelectItem value="Rejected">Rejected by You</SelectItem>
                          <SelectItem value="All">All Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Permission Requests List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Permission Requests for Your Approval</CardTitle>
                    <CardDescription>Review and provide final approval for permission requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filterPermissionRequests(permissionRequests).length === 0 ? (
                      <div className="text-center py-8">
                        <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No permission requests found</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {permissionRequests.length === 0
                            ? "No permission requests pending your approval"
                            : "Try adjusting your search or filters"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filterPermissionRequests(permissionRequests).map((request) => (
                          <Card key={request.id} className="border-l-4 border-l-green-500">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                    {request.employee_name.charAt(0)}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{request.employee_name}</CardTitle>
                                    <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                                      <div className="flex items-center space-x-1">
                                        <Users className="h-3 w-3" />
                                        <span>Team Lead</span>
                                      </div>
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Applied: {formatDate(getAppliedDate(request))}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getPermissionTypeColor(request.permission_type)}>
                                    {request.permission_type}
                                  </Badge>
                                  <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                             

                                {/* Permission Details */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Date</p>
                                    <p className="text-sm text-gray-600">{formatDate(request.date)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">From Time</p>
                                    <p className="text-sm text-gray-600">{formatTime(request.start_time)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">To Time</p>
                                    <p className="text-sm text-gray-600">{formatTime(request.end_time)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Duration</p>
                                    <p className="text-sm text-gray-600">{request.duration_hours} hours</p>
                                  </div>
                                </div>

                                {/* Employee Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                                  {request.employee?.phoneNumber && (
                                    <div className="flex items-center space-x-2">
                                      <Phone className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-800">
                                        {request.employee?.phoneNumber || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                  {request.employee?.emailAddress && (
                                    <div className="flex items-center space-x-2">
                                      <Mail className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-800">
                                        {request.employee?.emailAddress || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                  {request.employee?.address && (
                                    <div className="flex items-center space-x-2">
                                      <MapPin className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-800 truncate">
                                        {request.employee?.address || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Reason */}
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">Reason</span>
                                  </div>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{request.reason}</p>
                                </div>

                                {/* Team Lead Comments (if any) */}
                                {request.team_lead_comments && (
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <MessageSquare className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-700">Team Lead Comments</span>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                      {request.team_lead_comments}
                                    </p>
                                  </div>
                                )}

                                {/* Actions for Pending Manager Approval Requests */}
                                {needsManagerApproval(request) && (
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
                                        onChange={(e) => handleCommentChange(request.id, e.target.value)}
                                        className="mt-2"
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        onClick={(e) => handleApprovePermission(request.id, e)}
                                        disabled={processingId !== null}
                                        className="bg-green-500 hover:bg-green-600"
                                        type="button"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        {processingId === request.id ? "Approving..." : "Approve"}
                                      </Button>
                                      <Button
                                        onClick={(e) => handleRejectPermission(request.id, e)}
                                        disabled={processingId !== null}
                                        variant="destructive"
                                        type="button"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        {processingId === request.id ? "Rejecting..." : "Reject"}
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Status Messages */}
                                {request.status?.toLowerCase().includes('approved') && (
                                  <div className="bg-green-50 p-3 rounded-md">
                                    <p className="text-sm text-green-700 font-medium">✓ Fully Approved</p>
                                    {request.manager_comments && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Your comments: {request.manager_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {request.status?.toLowerCase().includes('rejected') && (
                                  <div className="bg-red-50 p-3 rounded-md">
                                    <p className="text-sm text-red-700 font-medium">✗ Rejected</p>
                                    {request.manager_comments && (
                                      <p className="text-sm text-red-600 mt-1">
                                        Your comments: {request.manager_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}