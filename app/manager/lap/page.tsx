
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

interface ManagerUser {
  id: string
  email: string
  userType: string
  name?: string
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
  const [statusFilter, setStatusFilter] = useState("All") // Changed to "All" to show all requests initially
  const [activeTab, setActiveTab] = useState("leave")
  const [error, setError] = useState<string | null>(null)

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

  // Get user data from localStorage and fetch manager details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setError(null)
        // First, try to get user data from localStorage
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          console.log("User data loaded:", parsedUser)
          
          // Try to fetch manager profile
          try {
            const response = await fetch(`/api/employees/profile?email=${parsedUser.email}`)
            if (response.ok) {
              const managerInfo = await response.json()
              setManagerData(managerInfo)
              setManagerId(managerInfo.id)
              console.log("Manager data loaded:", managerInfo)
            } else {
              console.error("Failed to fetch manager profile:", response.status)
              // Use fallback data if API fails
              setManagerData({
                id: parsedUser.id || 'fallback-id',
                name: parsedUser.name || parsedUser.email?.split("@")[0] || 'Manager',
                employee_id: parsedUser.employee_id || 'N/A',
                designation: 'Manager'
              })
              setManagerId(parsedUser.id || 'fallback-id')
            }
          } catch (apiError) {
            console.error("API Error:", apiError)
            // Use fallback data if API fails
            setManagerData({
              id: parsedUser.id || 'fallback-id',
              name: parsedUser.name || parsedUser.email?.split("@")[0] || 'Manager',
              employee_id: parsedUser.employee_id || 'N/A',
              designation: 'Manager'
            })
            setManagerId(parsedUser.id || 'fallback-id')
          }
        } else {
          console.warn("No user data found in localStorage")
          setError("No user data found. Please login again.")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Error loading user data")
      }
    }
    fetchUserData()
  }, [])

  useEffect(() => {
    if (managerId) {
      fetchLeaveRequests()
      fetchPermissionRequests()
    }
  }, [managerId]) // Removed statusFilter dependency to prevent unnecessary refetches

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching leave requests for manager:", managerId)
      
      // Build query parameters
      const params = new URLSearchParams({
        managerId: managerId
      })
      
      // Only add status filter if it's not "All"
      if (statusFilter !== "All") {
        params.append('status', statusFilter)
      }
      
      const response = await fetch(`/api/leave-request?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("Leave requests response:", data)
        
        const requests = data.data || data || []
        setLeaveRequests(requests)
        
        // Calculate stats
        const total = requests.length
        const pending = requests.filter((r: LeaveRequest) => r.status === "Pending Manager Approval").length
        const approved = requests.filter((r: LeaveRequest) => r.status === "Approved").length
        const rejected = requests.filter((r: LeaveRequest) => r.status === "Rejected").length
        
        setLeaveStats({ total, pending, approved, rejected })
        console.log("Leave stats:", { total, pending, approved, rejected })
      } else {
        const errorData = await response.json()
        console.error("Failed to fetch leave requests:", errorData)
        setError(`Failed to fetch leave requests: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error)
      setError(`Error fetching leave requests: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissionRequests = async () => {
    try {
      setError(null)
      console.log("Fetching permission requests for manager:", managerId)
      
      // Build query parameters
      const params = new URLSearchParams({
        managerId: managerId
      })
      
      // Only add status filter if it's not "All"
      if (statusFilter !== "All") {
        params.append('status', statusFilter)
      }
      
      const response = await fetch(`/api/permission-request?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("Permission requests response:", data)
        
        const requests = data.data || data || []
        setPermissionRequests(requests)
        
        // Calculate stats
        const total = requests.length
        const pending = requests.filter((r: PermissionRequest) => r.status === "Pending Manager Approval").length
        const approved = requests.filter((r: PermissionRequest) => r.status === "Approved").length
        const rejected = requests.filter((r: PermissionRequest) => r.status === "Rejected").length
        
        setPermissionStats({ total, pending, approved, rejected })
        console.log("Permission stats:", { total, pending, approved, rejected })
      } else {
        const errorData = await response.json()
        console.error("Failed to fetch permission requests:", errorData)
        setError(`Failed to fetch permission requests: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error("Error fetching permission requests:", error)
      setError(`Error fetching permission requests: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleApproveLeave = async (requestId: string, event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    if (processingId) return
    setProcessingId(requestId)
    try {
      const response = await fetch(`/api/leave-request`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "approve",
          managerId: managerId,
          comments: comments[requestId] || "",
          userType: "manager",
        }),
      })
      if (response.ok) {
        await fetchLeaveRequests()
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }))
        console.log("Leave request approved by manager successfully")
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
      const response = await fetch(`/api/leave-request`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "reject",
          managerId: managerId,
          comments: comments[requestId] || "",
          userType: "manager",
        }),
      })
      if (response.ok) {
        await fetchLeaveRequests()
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }))
        console.log("Leave request rejected by manager successfully")
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
      const response = await fetch(`/api/permission-request`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "approve",
          managerId: managerId,
          comments: comments[requestId] || "",
          userType: "manager",
        }),
      })
      if (response.ok) {
        await fetchPermissionRequests()
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }))
        console.log("Permission request approved by manager successfully")
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
      const response = await fetch(`/api/permission-request`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "reject",
          managerId: managerId,
          comments: comments[requestId] || "",
          userType: "manager",
        }),
      })
      if (response.ok) {
        await fetchPermissionRequests()
        setComments((prev) => ({
          ...prev,
          [requestId]: "",
        }))
        console.log("Permission request rejected by manager successfully")
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
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Team Lead":
        return "bg-blue-100 text-blue-800"
      case "Pending Manager Approval":
        return "bg-yellow-100 text-yellow-800"
      case "Approved":
        return "bg-green-100 text-green-800"
      case "Rejected":
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

  if (loading && !managerId) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="manager" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading manager data...</span>
          </div>
        </div>
      </div>
    )
  }

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
          title="Manager Approvals"
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
                    <CardDescription className="text-purple-700">
                      {managerData?.designation || "Manager"} • ID: {managerData?.employee_id || "N/A"}
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
                                {request.status === "Pending Manager Approval" && (
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
                                    <p className="text-sm text-green-700 font-medium">✓ Fully Approved</p>
                                    {request.manager_comments && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Your comments: {request.manager_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {request.status === "Rejected" && (
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
                                {request.status === "Pending Manager Approval" && (
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
                                    <p className="text-sm text-green-700 font-medium">✓ Fully Approved</p>
                                    {request.manager_comments && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Your comments: {request.manager_comments}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {request.status === "Rejected" && (
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
