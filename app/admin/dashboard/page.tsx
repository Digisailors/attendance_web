"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  Search,
  Filter,
  Eye,
  Download,
  ArrowLeft,
  BarChart3,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Settings,
  Save,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AddEmployeeModal from "@/components/AddEmployeeModal"

// Define types for better type safety
type WorkMode = "Office" | "WFH" | "Hybrid"
type Status = "Active" | "Warning" | "On Leave"

interface Employee {
  id: string
  name: string
  designation: string
  workMode: WorkMode
  totalDays: number
  workingDays: number
  permissions: number
  leaves: number
  missedDays: number
  status: Status
  phoneNumber?: string
  emailAddress?: string
  address?: string
  dateOfJoining?: string
  experience?: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface ApiResponse {
  employees: Employee[]
  pagination: PaginationInfo
}

interface MonthlySettings {
  month: number
  year: number
  totalDays: number
}

const getWorkModeBadge = (mode: WorkMode): string => {
  const colors: Record<WorkMode, string> = {
    Office: "bg-blue-100 text-blue-800",
    WFH: "bg-purple-100 text-purple-800",
    Hybrid: "bg-orange-100 text-orange-800",
  }
  return colors[mode] || "bg-gray-100 text-gray-800"
}

const getStatusBadge = (status: Status): string => {
  const colors: Record<Status, string> = {
    Active: "bg-green-100 text-green-800",
    Warning: "bg-yellow-100 text-yellow-800",
    "On Leave": "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function AttendanceOverview() {
  const [attendanceData, setAttendanceData] = useState<Employee[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedMode, setSelectedMode] = useState<string>("All Modes")
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status")
  const [selectedMonth, setSelectedMonth] = useState<string>("6")
  const [selectedYear, setSelectedYear] = useState<string>("2025")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  
  // New states for total days management
  const [totalDaysDialogOpen, setTotalDaysDialogOpen] = useState(false)
  const [currentMonthTotalDays, setCurrentMonthTotalDays] = useState<number>(28)
  const [newTotalDays, setNewTotalDays] = useState<number>(28)
  const [totalDaysLoading, setTotalDaysLoading] = useState(false)
  
  const router = useRouter()

  // Fetch current month's total days setting
  const fetchMonthTotalDays = async () => {
    try {
      const response = await fetch(`/api/monthly-settings?month=${selectedMonth}&year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentMonthTotalDays(data.totalDays || 28)
        setNewTotalDays(data.totalDays || 28)
      }
    } catch (err) {
      console.error("Error fetching monthly settings:", err)
    }
  }

  // Update total days for the current month
  const updateMonthTotalDays = async () => {
    if (newTotalDays < 1 || newTotalDays > 31) {
      toast({
        title: "Invalid Days",
        description: "Total days must be between 1 and 31",
        variant: "destructive",
      })
      return
    }

    try {
      setTotalDaysLoading(true)
      
      const response = await fetch(`/api/monthly-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          totalDays: newTotalDays,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update total days")
      }

      toast({
        title: "Success",
        description: `Total days for ${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear} updated to ${newTotalDays} days`,
        variant: "default",
      })

      setCurrentMonthTotalDays(newTotalDays)
      setTotalDaysDialogOpen(false)
      
      // Refresh the employee list to reflect the changes
      await fetchEmployees(currentPage)
      
    } catch (err) {
      console.error("Error updating total days:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to update total days"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setTotalDaysLoading(false)
    }
  }

  // Fetch employees data
  const fetchEmployees = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)

      console.log("Frontend: Fetching employees...")

      const url = `/api/employees?month=${selectedMonth}&year=${selectedYear}&page=${page}&limit=10`
      console.log("Request URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)

        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (e) {
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const data: ApiResponse = await response.json()
      console.log("Received data:", data)

      if (data.employees && Array.isArray(data.employees)) {
        setAttendanceData(data.employees)
        setPagination(data.pagination)
        setCurrentPage(page)
        console.log(`Successfully loaded ${data.employees.length} employees`)
      } else {
        console.error("Invalid data format:", data)
        setAttendanceData([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch employees"
      console.error("Fetch error:", err)
      setError(errorMessage)
      setAttendanceData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees(1)
    fetchMonthTotalDays()
    setCurrentPage(1)
  }, [selectedMonth, selectedYear])

  const handleEmployeeClick = (employeeId: string): void => {
    router.push(`/admin/detail/${employeeId}`)
  }

  const handleAddEmployee = async (newEmployee: Employee): Promise<void> => {
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEmployee),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add employee")
      }

      toast({
        title: "Success",
        description: "Employee added successfully",
        variant: "default",
      })

      await fetchEmployees(currentPage)
    } catch (err) {
      console.error("Error adding employee:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to add employee"
      setError(errorMessage)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setEditModalOpen(true)
  }

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedEmployee) return

    try {
      setDeleteLoading(true)
      setDeletingEmployeeId(selectedEmployee.id)
      
      console.log(`Attempting to delete employee: ${selectedEmployee.name} (ID: ${selectedEmployee.id})`)
      
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorData.details || errorMessage
        } catch (e) {
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.error("Error reading response:", textError)
          }
        }

        throw new Error(errorMessage)
      }

      let responseData = null
      try {
        const responseText = await response.text()
        if (responseText) {
          responseData = JSON.parse(responseText)
        }
      } catch (e) {
        console.log("Empty response body, assuming successful deletion")
      }

      console.log("Delete response:", responseData)

      toast({
        title: "Success",
        description: `Employee ${selectedEmployee.name} has been deleted successfully`,
        variant: "default",
      })

      setDeleteDialogOpen(false)
      setSelectedEmployee(null)

      await fetchEmployees(currentPage)
      
    } catch (err) {
      console.error("Error deleting employee:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to delete employee"
      setError(errorMessage)
      
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setDeletingEmployeeId(null)
    }
  }

  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setSelectedEmployee(null)
    setDeleteLoading(false)
    setDeletingEmployeeId(null)
  }

  // FIXED: Better error handling and debugging for update employee
  const handleUpdateEmployee = async (updatedEmployee: Employee): Promise<void> => {
    if (!updatedEmployee.id) {
      toast({
        title: "Error",
        description: "Employee ID is missing",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("Updating employee:", updatedEmployee.id, updatedEmployee)
      
      const response = await fetch(`/api/employees/${encodeURIComponent(updatedEmployee.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEmployee),
      })

      console.log("Update response status:", response.status)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        
        try {
          const errorData = await response.json()
          console.error("Update error data:", errorData)
          errorMessage = errorData.error || errorData.message || errorData.details || errorMessage
        } catch (e) {
          try {
            const errorText = await response.text()
            console.error("Update error text:", errorText)
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.error("Error reading response:", textError)
          }
        }

        throw new Error(errorMessage)
      }

      // Try to parse response
      let responseData = null
      try {
        const responseText = await response.text()
        if (responseText) {
          responseData = JSON.parse(responseText)
          console.log("Update success response:", responseData)
        }
      } catch (e) {
        console.log("Empty or invalid response body, assuming successful update")
      }

      toast({
        title: "Success",
        description: "Employee updated successfully",
        variant: "default",
      })

      await fetchEmployees(currentPage)
      setEditModalOpen(false)
      setSelectedEmployee(null)
    } catch (err) {
      console.error("Error updating employee:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to update employee"
      setError(errorMessage)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      })
      return
    }

    const csvContent = [
      [
        "Employee ID",
        "Name",
        "Designation",
        "Work Mode",
        "Total Days",
        "Working Days",
        "Permissions",
        "Leaves",
        "Missed Days",
        "Status",
      ],
      ...filteredData.map((emp) => [
        emp.id,
        emp.name,
        emp.designation,
        emp.workMode,
        emp.totalDays,
        emp.workingDays,
        emp.permissions,
        emp.leaves,
        emp.missedDays,
        emp.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-report-${selectedMonth}-${selectedYear}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Successful",
      description: "CSV file has been downloaded",
      variant: "default",
    })
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchEmployees(page)
    }
  }

  const filteredData = attendanceData.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.designation.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMode = selectedMode === "All Modes" || employee.workMode === selectedMode
    const matchesStatus = selectedStatus === "All Status" || employee.status === selectedStatus
    return matchesSearch && matchesMode && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading employees...</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="admin" />
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[90rem] mx-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-600">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchEmployees(currentPage)} className="mt-2">
                  Retry
                </Button>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-xl">Employee Monthly Attendance Overview</CardTitle>
                      <CardDescription>
                        {new Date(Number.parseInt(selectedYear), Number.parseInt(selectedMonth) - 1).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            year: "numeric",
                          },
                        )}
                        {" • "}
                        {pagination.totalCount} total employees
                        {" • "}
                        <span className="text-blue-600 font-medium">{currentMonthTotalDays} total days</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog open={totalDaysDialogOpen} onOpenChange={setTotalDaysDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Set Total Days
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Set Total Days for {monthNames[parseInt(selectedMonth) - 1]} {selectedYear}</DialogTitle>
                          <DialogDescription>
                            Configure the total working days for this month. This will affect all employee attendance calculations.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="total-days" className="text-right text-sm font-medium">
                              Total Days
                            </label>
                            <div className="col-span-3">
                              <Input
                                id="total-days"
                                type="number"
                                min="1"
                                max="31"
                                value={newTotalDays}
                                onChange={(e) => setNewTotalDays(parseInt(e.target.value) || 0)}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            <p>Current setting: <span className="font-medium">{currentMonthTotalDays} days</span></p>
                            <p>Common values: 28 days (February), 30 days (April, June, September, November), 31 days (January, March, May, July, August, October, December)</p>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setTotalDaysDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={updateMonthTotalDays}
                            disabled={totalDaysLoading}
                          >
                            {totalDaysLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Update
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <AddEmployeeModal onAddEmployee={handleAddEmployee} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or designation..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger className="w-[140px]">
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
                    <SelectTrigger className="w-[140px]">
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
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[200px]">👤 Employee Name</TableHead>
                        <TableHead className="w-[150px]">Designation</TableHead>
                        <TableHead className="w-[120px]">Work Mode</TableHead>
                        <TableHead className="w-[100px] text-center"> Total Days</TableHead>
                        <TableHead className="w-[100px] text-center"> Working Days</TableHead>
                        <TableHead className="w-[100px] text-center"> Permissions</TableHead>
                        <TableHead className="w-[100px] text-center"> Leaves</TableHead>
                        <TableHead className="w-[100px] text-center"> Missed Days</TableHead>
                        <TableHead className="w-[100px] text-center">
                           Status</TableHead>
                        <TableHead className="w-[80px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                            {attendanceData.length === 0
                              ? "No employees found"
                              : "No employees match the selected criteria"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((employee) => (
                          <TableRow key={employee.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                                  {employee.id}
                                </div>
                                <span className="font-medium">{employee.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">{employee.designation}</TableCell>
                            <TableCell>
                              <Badge className={getWorkModeBadge(employee.workMode)}>{employee.workMode}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{employee.totalDays} Days</TableCell>
                            <TableCell className="text-center font-medium text-green-600">
                              {employee.workingDays} Days
                            </TableCell>
                            <TableCell className="text-center font-medium">{employee.permissions}</TableCell>
                            <TableCell className="text-center font-medium">{employee.leaves}</TableCell>
                            <TableCell className="text-center font-medium text-red-600">
                              {employee.missedDays}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={getStatusBadge(employee.status)}>{employee.status}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEmployeeClick(employee.id)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteEmployee(employee)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
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
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee{" "}
              <strong>{selectedEmployee?.name}</strong> and remove all their data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Employee Modal */}
      {selectedEmployee && (
        <AddEmployeeModal
          onAddEmployee={handleUpdateEmployee}
          initialData={selectedEmployee}
          isEdit={true}
          isOpen={editModalOpen}
          onOpenChange={setEditModalOpen}
        />
      )}
    </div>
  )
}