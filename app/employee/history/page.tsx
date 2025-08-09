"use client"
import ProtectedRoute from '@/components/ProtectedRoute'
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Timer, Search, Filter, MessageSquare, Calendar, Phone, Mail, MapPin } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"

interface LeaveRequest {
  id: string
  employee_id: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  created_at: string // Using created_at as applied_date
  team_lead_comments?: string | null
  manager_comments?: string | null
  employee: {
    id: string
    name: string
    email_address: string
    designation?: string | null
    phone_number?: string | null
    address?: string | null
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
  reason: string
  status: string
  created_at: string // Using created_at as applied_date
  team_lead_comments?: string | null
  manager_comments?: string | null
  employee: {
    id: string
    name: string
    email_address: string
    designation?: string | null
    phone_number?: string | null
    address?: string | null
  }
}

interface User {
  id: string
  email: string
  userType: string
  name?: string
}

export default function EmployeeHistoryPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [activeTab, setActiveTab] = useState("leave")

  // Get user data from localStorage and fetch employee details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)

          const { data: employeeInfo, error } = await supabase
            .from("employees")
            .select("employee_id, name, email_address, designation, phone_number, address")
            .eq("email_address", parsedUser.email)
            .single()

          if (!error && employeeInfo) {
            setEmployeeData(employeeInfo)
          } else {
            console.error("Failed to fetch employee profile:", error)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  useEffect(() => {
    if (employeeData?.id) {
      fetchLeaveRequests()
      fetchPermissionRequests()
    }
  }, [employeeData?.id, statusFilter]) // Refetch when employeeId or statusFilter changes

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leave-request?employeeId=${employeeData.id}&status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissionRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/permission-request?employeeId=${employeeData.id}&status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setPermissionRequests(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching permission requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
        request.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "All" || request.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }

  const filterPermissionRequests = (requests: PermissionRequest[]) => {
    return requests.filter((request) => {
      const matchesSearch =
        request.permission_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "All" || request.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }

  const displayName = employeeData?.name || user?.email?.split("@")[0] || "Employee"

  if (loading) {
    return (
      <div className="flex min-h-screen overflow-auto bg-gray-50">
        <Sidebar userType="employee" />
        <div className="flex-1 flex flex-col">
          <Header title="Employee Portal" subtitle="Loading..." userType="employee" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your history...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['employee','intern']}>
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="employee" />
      <div className="flex-1 flex flex-col">
        <Header
          title="My Request History"
          subtitle={`Welcome back, ${displayName}. View your past leave and permission requests.`}
          userType="employee"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Employee Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-blue-900">
                      {employeeData?.name || user?.email?.split("@")[0] || "Employee"}
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      {employeeData?.designation || "Employee"} • ID: {employeeData?.employee_id || "N/A"}

                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-600 text-white">Employee</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-800">
                {employeeData?.phone_number && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{employeeData.phone_number}</span>
                  </div>
                )}
                {employeeData?.email_address && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{employeeData.email_address}</span>
                  </div>
                )}
                {employeeData?.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm truncate">{employeeData.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs for Leave and Permission Requests */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leave" className="flex items-center space-x-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>Leave History</span>
                </TabsTrigger>
                <TabsTrigger value="permission" className="flex items-center space-x-2">
                  <Timer className="w-4 h-4" />
                  <span>Permission History</span>
                </TabsTrigger>
              </TabsList>

              {/* Leave History Tab */}
              <TabsContent value="leave" className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Filter Leave History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by leave type or reason..."
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
                          <SelectItem value="Pending Team Lead">Pending Team Lead</SelectItem>
                          <SelectItem value="Pending Manager Approval">Pending Manager Approval</SelectItem>
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
                    <CardTitle>Your Leave Requests</CardTitle>
                    <CardDescription>
                      Overview of your submitted leave requests and their current status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filterLeaveRequests(leaveRequests).length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No leave requests found</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {leaveRequests.length === 0
                            ? "You haven't submitted any leave requests yet."
                            : "Try adjusting your search or filters."}
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
                                        <span>Applied: {formatDate(request.created_at)}</span>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Start Date</p>
                                    <p className="text-sm text-gray-600">{formatDate(request.start_date)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">End Date</p>
                                    <p className="text-sm text-gray-600">{formatDate(request.end_date)}</p>
                                  </div>
                                </div>

                                {/* Reason */}
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">Reason</span>
                                  </div>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{request.reason}</p>
                                </div>

                                {/* Team Lead Comments */}
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

                                {/* Manager Comments */}
                                {request.manager_comments && (
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <MessageSquare className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-700">Manager Comments</span>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                      {request.manager_comments}
                                    </p>
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

              {/* Permission History Tab */}
              <TabsContent value="permission" className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Filter Permission History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by permission type or reason..."
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
                          <SelectItem value="Pending Team Lead">Pending Team Lead</SelectItem>
                          <SelectItem value="Pending Manager Approval">Pending Manager Approval</SelectItem>
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
                    <CardTitle>Your Permission Requests</CardTitle>
                    <CardDescription>
                      Overview of your submitted permission requests and their current status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filterPermissionRequests(permissionRequests).length === 0 ? (
                      <div className="text-center py-8">
                        <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No permission requests found</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {permissionRequests.length === 0
                            ? "You haven't submitted any permission requests yet."
                            : "Try adjusting your search or filters."}
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
                                        <span>Applied: {formatDate(request.created_at)}</span>
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
                                </div>

                                {/* Reason */}
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">Reason</span>
                                  </div>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{request.reason}</p>
                                </div>

                                {/* Team Lead Comments */}
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

                                {/* Manager Comments */}
                                {request.manager_comments && (
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <MessageSquare className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-700">Manager Comments</span>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                      {request.manager_comments}
                                    </p>
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
    </ProtectedRoute>
  )
}
