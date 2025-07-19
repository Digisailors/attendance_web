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
  team_lead_comments?: string
  manager_comments?: string
  employee: {
    name: string
    employee_id: string
    designation: string
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
  from_time: string
  to_time: string
  duration_hours: number
  reason: string
  status: string
  applied_date: string
  team_lead_comments?: string
  manager_comments?: string
  employee: {
    name: string
    employee_id: string
    designation: string
    phoneNumber?: string
    emailAddress?: string
    address?: string
  }
}

interface TeamLeadUser {
  id: string
  email: string
  userType: string
  name?: string
}

export default function TeamLeadLeavePermissionRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [user, setUser] = useState<TeamLeadUser | null>(null)
  const [teamLeadId, setTeamLeadId] = useState<string>("")
  const [teamLeadData, setTeamLeadData] = useState<any>(null)
  const [comments, setComments] = useState<{ [key: string]: string }>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [activeTab, setActiveTab] = useState("leave")

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

  // Get user data from localStorage and fetch team lead details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          const response = await fetch(`/api/employees/profile?email=${parsedUser.email}`)
          if (response.ok) {
            const teamLeadInfo = await response.json()
            setTeamLeadData(teamLeadInfo)
            setTeamLeadId(teamLeadInfo.employee_id || teamLeadInfo.id)
            console.log("Team lead data loaded:", teamLeadInfo)
          } else {
            console.error("Failed to fetch team lead profile")
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }
    fetchUserData()
  }, [])

  useEffect(() => {
    if (teamLeadId) {
      fetchLeaveRequests()
      fetchPermissionRequests()
    }
  }, [teamLeadId])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      // Corrected API endpoint for fetching leave requests
      const response = await fetch(`/api/leave-request?teamLeadId=${teamLeadId}`)
      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(data.data || []) // Assuming the API returns { data: [...] }
        // Calculate stats
        const total = data.data?.length || 0
        const pending = data.data?.filter((r: LeaveRequest) => r.status === "Pending").length || 0
        const approved = data.data?.filter((r: LeaveRequest) => r.status === "Approved").length || 0
        const rejected = data.data?.filter((r: LeaveRequest) => r.status === "Rejected").length || 0
        setLeaveStats({ total, pending, approved, rejected })
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissionRequests = async () => {
    try {
      // Corrected API endpoint for fetching permission requests
      const response = await fetch(`/api/permission-request?teamLeadId=${teamLeadId}`)
      if (response.ok) {
        const data = await response.json()
        setPermissionRequests(data.data || []) // Assuming the API returns { data: [...] }
        // Calculate stats
        const total = data.data?.length || 0
        const pending = data.data?.filter((r: PermissionRequest) => r.status === "Pending").length || 0
        const approved = data.data?.filter((r: PermissionRequest) => r.status === "Approved").length || 0
        const rejected = data.data?.filter((r: PermissionRequest) => r.status === "Rejected").length || 0
        setPermissionStats({ total, pending, approved, rejected })
      }
    } catch (error) {
      console.error("Error fetching permission requests:", error)
    }
  }

const handleApproveLeave = async (requestId: string, event?: React.MouseEvent) => {
  event?.stopPropagation()
  event?.preventDefault()
  if (processingId) return
  setProcessingId(requestId)
  try {
    const response = await fetch(`/api/team-lead/leave-requests`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: requestId,
        action: "approve",
        userType: "team-lead", // Add the missing userType field
        teamLeadId: teamLeadId,
        comments: comments[requestId] || "",
      }),
    })
    if (response.ok) {
      await fetchLeaveRequests()
      setComments((prev) => ({
        ...prev,
        [requestId]: "",
      }))
      console.log("Leave request approved successfully")
    } else {
      console.error("Failed to approve leave request")
      const errorData = await response.json()
      alert(`Failed to approve leave request: ${errorData.error || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Error approving leave request:", error)
    alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    setProcessingId(null)
  }
}

const handleRejectLeave = async (requestId: string, event?: React.MouseEvent) => {
  event?.stopPropagation()
  event?.preventDefault()
  if (processingId) return
  setProcessingId(requestId)
  try {
    const response = await fetch(`/api/team-lead/leave-requests`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: requestId,
        action: "reject",
        userType: "team-lead", // Add the missing userType field
        teamLeadId: teamLeadId,
        comments: comments[requestId] || "",
      }),
    })
    if (response.ok) {
      await fetchLeaveRequests()
      setComments((prev) => ({
        ...prev,
        [requestId]: "",
      }))
      console.log("Leave request rejected successfully")
    } else {
      console.error("Failed to reject leave request")
      const errorData = await response.json()
      alert(`Failed to reject leave request: ${errorData.error || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Error rejecting leave request:", error)
    alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    setProcessingId(null)
  }
}

  const handleApprovePermission = async (requestId: string, event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    if (processingId) return
    setProcessingId(requestId)
    try {
      // Corrected API endpoint and method for approving permission requests
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
      })
      if (response.ok) {
        await fetchPermissionRequests()
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }))
        console.log("Permission request approved successfully")
      } else {
        console.error("Failed to approve permission request")
        const errorData = await response.json()
        alert(`Failed to approve permission request: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error approving permission request:", error)
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectPermission = async (requestId: string, event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    if (processingId) return
    setProcessingId(requestId)
    try {
      // Corrected API endpoint and method for rejecting permission requests
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
      })
      if (response.ok) {
        await fetchPermissionRequests()
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }))
        console.log("Permission request rejected successfully")
      } else {
        console.error("Failed to reject permission request")
        const errorData = await response.json()
        alert(`Failed to reject permission request: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error rejecting permission request:", error)
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleCommentChange = (requestId: string, value: string) => {
    setComments((prev) => ({
      ...prev,
      [requestId]: value,
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTime = (timeString: string) => {
    // Ensure timeString is in a valid format for Date constructor, e.g., "HH:MM"
    // Prepend a dummy date to parse time correctly
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": // Changed from "Pending Team Lead" to "Pending" based on API
        return "bg-blue-100 text-blue-800"
      case "Approved": // Changed from "Pending Final Approval" to "Approved"
        return "bg-green-100 text-green-800"
      case "Rejected": // Changed from "Rejected by Team Lead" to "Rejected"
        return "bg-red-100 text-red-800"
      default:
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

  // Filter functions
  const filterLeaveRequests = (requests: LeaveRequest[]) => {
    return requests.filter((request) => {
      const matchesSearch =
        request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.leave_type.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "All" || request.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }

  const filterPermissionRequests = (requests: PermissionRequest[]) => {
    return requests.filter((request) => {
      const matchesSearch =
        request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.permission_type.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "All" || request.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }

  if (loading && !teamLeadId) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="team-lead" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading team lead data...</span>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="team-lead" />
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
      <Sidebar userType="team-lead" />
      <div className="flex-1 flex flex-col">
        <Header
          title="Leave & Permission Requests"
          subtitle="Review and manage leave and permission requests from your team members"
          userType="team-lead"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Team Lead Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-blue-900">
                      {teamLeadData?.name || user?.email?.split("@")[0] || "Team Lead"}
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      {teamLeadData?.designation || "Team Lead"} • ID: {teamLeadId}
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-600 text-white">Team Lead</Badge>
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
                      <p className="text-xs text-muted-foreground">From your team</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{leaveStats.pending}</div>
                      <p className="text-xs text-muted-foreground">Awaiting review</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Approved</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{leaveStats.approved}</div>
                      <p className="text-xs text-muted-foreground">By you or manager</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rejected</CardTitle>
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
                          <SelectItem value="All">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Requests List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Requests from Your Team</CardTitle>
                    <CardDescription>Review and approve leave requests from your team members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filterLeaveRequests(leaveRequests).length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No leave requests found</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {leaveRequests.length === 0
                            ? "No leave requests from your team members"
                            : "Try adjusting your search or filters"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filterLeaveRequests(leaveRequests).map((request) => (
                          <Card key={request.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                    {request.employee_name.charAt(0)}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{request.employee_name}</CardTitle>
                                    <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                                      <span>{request.employee?.designation || "N/A"}</span>
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Applied: {formatDate(request.applied_date)}</span>
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
                                    <p className="text-sm text-gray-600">{request.total_days} days</p>
                                  </div>
                                </div>

                                {/* Employee Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                                  {request.employee?.phoneNumber && (
                                    <div className="flex items-center space-x-2">
                                      <Phone className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm text-blue-800">
                                        {request.employee?.phoneNumber || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                  {request.employee?.emailAddress && (
                                    <div className="flex items-center space-x-2">
                                      <Mail className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm text-blue-800">
                                        {request.employee?.emailAddress || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                  {request.employee?.address && (
                                    <div className="flex items-center space-x-2">
                                      <MapPin className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm text-blue-800 truncate">
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

                                {/* Actions for Pending Requests */}
                                {request.status === "Pending" && (
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
                                        disabled={processingId !== null}
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
                                {request.status === "Approved" && (
                                  <div className="bg-green-50 p-3 rounded-md">
                                    <p className="text-sm text-green-700 font-medium">✓ Approved by Team Lead</p>
                                    {request.team_lead_comments && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Comments: {request.team_lead_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {request.status === "Rejected" && (
                                  <div className="bg-red-50 p-3 rounded-md">
                                    <p className="text-sm text-red-700 font-medium">✗ Rejected by you</p>
                                    {request.team_lead_comments && (
                                      <p className="text-sm text-red-600 mt-1">
                                        Comments: {request.team_lead_comments}
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
                      <p className="text-xs text-muted-foreground">From your team</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{permissionStats.pending}</div>
                      <p className="text-xs text-muted-foreground">Awaiting review</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Approved</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{permissionStats.approved}</div>
                      <p className="text-xs text-muted-foreground">By you or manager</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rejected</CardTitle>
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
                          <SelectItem value="All">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Permission Requests List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Permission Requests from Your Team</CardTitle>
                    <CardDescription>Review and approve permission requests from your team members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filterPermissionRequests(permissionRequests).length === 0 ? (
                      <div className="text-center py-8">
                        <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No permission requests found</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {permissionRequests.length === 0
                            ? "No permission requests from your team members"
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
                                      <span>{request.employee?.designation || "N/A"}</span>
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Applied: {formatDate(request.applied_date)}</span>
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
                                    <p className="text-sm text-gray-600">{formatTime(request.from_time)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">To Time</p>
                                    <p className="text-sm text-gray-600">{formatTime(request.to_time)}</p>
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
                                {request.status === "Approved" && (
                                  <div className="bg-green-50 p-3 rounded-md">
                                    <p className="text-sm text-green-700 font-medium">✓ Approved by you</p>
                                    {request.team_lead_comments && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Your comments: {request.team_lead_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {request.status === "Rejected" && (
                                  <div className="bg-red-50 p-3 rounded-md">
                                    <p className="text-sm text-red-700 font-medium">✗ Rejected by you</p>
                                    {request.team_lead_comments && (
                                      <p className="text-sm text-red-600 mt-1">
                                        Comments: {request.team_lead_comments}
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
