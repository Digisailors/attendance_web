"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  Search,
  Filter,
  UserPlus,
  Users,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Star,
  UserCheck,
  Clock,
  Eye,
  UserMinus,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import Link from "next/link"

// Define types
type WorkMode = "Office" | "WFH" | "Hybrid"
type Status = "Active" | "Warning" | "On Leave"

interface Employee {
  id: string
  name: string
  designation: string | null
  workMode: WorkMode | null
  status: Status | null
  phoneNumber?: string | null
  emailAddress?: string | null
  address?: string | null
  dateOfJoining?: string | null
  experience?: string | null
  createdAt?: string
  updatedAt?: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface TeamMember {
  id: string
  employee_id: string
  team_lead_id: string
  added_date: string
  is_active: boolean
  employee: Employee
}

interface TeamLeadInfo {
  id: string
  name: string
  designation: string | null
}

interface User {
  id: string
  email: string
  userType: string
  name?: string
}

const getWorkModeBadge = (mode: WorkMode | null): string => {
  const colors: Record<WorkMode, string> = {
    Office: "bg-blue-100 text-blue-800",
    WFH: "bg-purple-100 text-purple-800",
    Hybrid: "bg-orange-100 text-orange-800",
  }
  return mode ? colors[mode] || "bg-gray-100 text-gray-800" : "bg-gray-100 text-gray-800"
}

const getStatusBadge = (status: Status | null): string => {
  const colors: Record<Status, string> = {
    Active: "bg-green-100 text-green-800",
    Warning: "bg-yellow-100 text-yellow-800",
    "On Leave": "bg-red-100 text-red-800",
  }
  return status ? colors[status] || "bg-gray-100 text-gray-800" : "bg-gray-100 text-gray-800"
}

export default function TeamLeadAddMembers() {
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamLeadInfo, setTeamLeadInfo] = useState<TeamLeadInfo | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [teamLeadData, setTeamLeadData] = useState<any>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [loading, setLoading] = useState(true)
  const [addingMember, setAddingMember] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedMode, setSelectedMode] = useState<string>("All Modes")
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status")
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<"team" | "available">("team")

  // Get team lead ID from logged-in user
  const [teamLeadId, setTeamLeadId] = useState<string>("")

  // Get user data from localStorage and fetch team lead details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user from localStorage
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)

          // Fetch team lead details using email
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
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Fetch available employees (excluding team lead and existing team members)
  const fetchAvailableEmployees = async (page = 1) => {
    if (!teamLeadId) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        team_lead_id: teamLeadId,
        get_available: "true",
        page: page.toString(),
        limit: "10",
      })

      if (searchTerm) params.append("search", searchTerm)
      if (selectedMode !== "All Modes") params.append("work_mode", selectedMode)
      if (selectedStatus !== "All Status") params.append("status", selectedStatus)

      const url = `/api/team-lead?${params.toString()}`
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.employees && Array.isArray(data.employees)) {
        setAvailableEmployees(data.employees)
        setPagination(data.pagination)
        setCurrentPage(page)
      }

      if (data.teamLeadInfo) {
        setTeamLeadInfo(data.teamLeadInfo)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch employees"
      setError(errorMessage)
      setAvailableEmployees([])
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch current team members
  const fetchTeamMembers = async () => {
    if (!teamLeadId) return

    try {
      const response = await fetch(`/api/team-lead?team_lead_id=${teamLeadId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.teamMembers || [])
        
        if (data.teamLeadInfo) {
          setTeamLeadInfo(data.teamLeadInfo)
        }
      }
    } catch (err) {
      console.error("Error fetching team members:", err)
    }
  }

  useEffect(() => {
    if (teamLeadId) {
      fetchAvailableEmployees(1)
      fetchTeamMembers()
    }
  }, [teamLeadId])

  useEffect(() => {
    if (activeTab === "available" && teamLeadId) {
      fetchAvailableEmployees(1)
    }
  }, [searchTerm, selectedMode, selectedStatus, activeTab, teamLeadId])

  // Add member to team
  const handleAddToTeam = async (employeeId: string) => {
    try {
      setAddingMember(employeeId)
      
      const response = await fetch("/api/team-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          team_lead_id: teamLeadId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add team member")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: "Team member added successfully",
        variant: "default",
      })

      // Refresh both lists
      await fetchAvailableEmployees(currentPage)
      await fetchTeamMembers()
      
    } catch (err) {
      console.error("Error adding team member:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to add team member"
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setAddingMember(null)
    }
  }

  // Remove member from team
  const handleRemoveFromTeam = async (teamMemberId: string) => {
    try {
      setRemovingMember(teamMemberId)
      
      const response = await fetch("/api/team-lead", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_member_id: teamMemberId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove team member")
      }

      toast({
        title: "Success",
        description: "Team member removed successfully",
        variant: "default",
      })

      // Refresh both lists
      await fetchAvailableEmployees(currentPage)
      await fetchTeamMembers()
      
    } catch (err) {
      console.error("Error removing team member:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to remove team member"
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setRemovingMember(null)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchAvailableEmployees(page)
    }
  }

  // Get display name from team lead data or fallback to email
  const displayName = teamLeadData?.name || user?.email?.split("@")[0] || "Team Lead"
  const displayDesignation = teamLeadData?.designation || teamLeadInfo?.designation || "Team Lead"

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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="team-lead" />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/team-lead" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                  <p className="text-sm text-gray-600">{displayName} • {displayDesignation}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                Team Lead: {teamLeadId}
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                {teamMembers.filter(m => m.is_active).length} Active Members
              </Badge>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-600">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchAvailableEmployees(currentPage)} className="mt-2">
                  Retry
                </Button>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("team")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "team"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                My Team ({teamMembers.filter(m => m.is_active).length})
              </button>
              <button
                onClick={() => setActiveTab("available")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "available"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Add Members ({pagination.totalCount})
              </button>
            </div>

            {/* Current Team Members Tab */}
            {activeTab === "team" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Current Team Members</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your current team members with comprehensive employee details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {teamMembers.filter(m => m.is_active).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">No Team Members Yet</h3>
                      <p className="text-sm mb-4">Start building your team by adding members</p>
                      <Button onClick={() => setActiveTab("available")} className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Team Members
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {teamMembers.filter(m => m.is_active).map((member) => (
                        <div key={member.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                {member.employee.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{member.employee.name}</h3>
                                <p className="text-sm text-gray-600">{member.employee.designation || 'No designation'}</p>
                                <p className="text-xs text-gray-500 mt-1">ID: {member.employee.id}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromTeam(member.id)}
                              disabled={removingMember === member.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-2 -mr-2"
                            >
                              {removingMember === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserMinus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center space-x-2 mb-4">
                            <Badge className={getWorkModeBadge(member.employee.workMode)}>
                              {member.employee.workMode || 'Not specified'}
                            </Badge>
                            <Badge className={getStatusBadge(member.employee.status)}>
                              {member.employee.status || 'Not specified'}
                            </Badge>
                          </div>

                          {/* Employee Details */}
                          <div className="space-y-3 text-sm">
                            {member.employee.phoneNumber && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700">{member.employee.phoneNumber}</span>
                              </div>
                            )}
                            {member.employee.emailAddress && (
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700 truncate">{member.employee.emailAddress}</span>
                              </div>
                            )}
                            {member.employee.address && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700 truncate">{member.employee.address}</span>
                              </div>
                            )}
                            {member.employee.experience && (
                              <div className="flex items-center space-x-2">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700">{member.employee.experience}</span>
                              </div>
                            )}
                          </div>

                          {/* Joining & Added Info */}
                          <div className="border-t pt-4 mt-4 space-y-2">
                            {member.employee.dateOfJoining && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Joined Company:</span>
                                <span className="text-gray-700 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(member.employee.dateOfJoining).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Added to Team:</span>
                              <span className="text-gray-700 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(member.added_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Available Employees Tab */}
            {activeTab === "available" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <span>Available Employees</span>
                  </CardTitle>
                  <CardDescription>
                    Add employees to your team from the available pool. All employee details from admin are shown here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search employees..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={selectedMode} onValueChange={setSelectedMode}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Modes">All Modes</SelectItem>
                        <SelectItem value="Office">Office</SelectItem>
                        <SelectItem value="WFH">WFH</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Status">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Warning">Warning</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <div></div>
                  </div>

                  {/* Employee Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableEmployees.map((employee) => {
                      const isAdding = addingMember === employee.id
                      
                      return (
                        <div key={employee.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg">
                                {employee.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{employee.name}</h3>
                                <p className="text-sm text-gray-600">{employee.designation || 'No designation'}</p>
                                <p className="text-xs text-gray-500 mt-1">ID: {employee.id}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-500">Available</span>
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center space-x-2 mb-4">
                            <Badge className={getWorkModeBadge(employee.workMode)}>
                              {employee.workMode || 'Not specified'}
                            </Badge>
                            <Badge className={getStatusBadge(employee.status)}>
                              {employee.status || 'Not specified'}
                            </Badge>
                          </div>

                          {/* Employee Details */}
                          <div className="space-y-3 text-sm">
                            {employee.phoneNumber && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700">{employee.phoneNumber}</span>
                              </div>
                            )}
                            {employee.emailAddress && (
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700 truncate">{employee.emailAddress}</span>
                              </div>
                            )}
                            {employee.address && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700 truncate">{employee.address}</span>
                              </div>
                            )}
                            {employee.experience && (
                              <div className="flex items-center space-x-2">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700">{employee.experience}</span>
                              </div>
                            )}
                          </div>

                          {/* Joining Date */}
                          <div className="border-t pt-4 mt-4">
                            {employee.dateOfJoining && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Joined Company:</span>
                                <span className="text-gray-700 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(employee.dateOfJoining).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Add Button */}
                          <Button
                            onClick={() => handleAddToTeam(employee.id)}
                            disabled={isAdding}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                          >
                            {isAdding ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add to Team
                              </>
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>

                  {availableEmployees.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                      <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">No Available Employees</h3>
                      <p className="text-sm">All employees are either already in your team or match your filters</p>
                    </div>
                  )}

                  {/* Pagination */}
                  {activeTab === "available" && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-8">
                      <div className="text-sm text-gray-500">
                        Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{" "}
                        {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{" "}
                        {pagination.totalCount} employees
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPreviousPage}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                              const current = pagination.currentPage
                              return page === 1 || page === pagination.totalPages || Math.abs(page - current) <= 1
                            })
                            .map((page, index, array) => (
                              <div key={page} className="flex items-center">
                                {index > 0 && array[index - 1] !== page - 1 && (
                                  <span className="px-2 text-gray-400">...</span>
                                )}
                                <Button
                                  variant={page === pagination.currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(page)}
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              </div>
                            ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}