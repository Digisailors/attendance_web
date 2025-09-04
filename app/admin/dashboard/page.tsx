"use client"

import { useState, useEffect, useCallback } from "react"
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
  X,
  Clock,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AddEmployeeModal from "@/components/AddEmployeeModal"
import ProtectedRoute from '@/components/ProtectedRoute'

type WorkMode = "Office" | "WFH" | "Hybrid"
type Status = "Active" | "Warning" | "On Leave"

// Dashboard Employee interface - matches the dashboard needs
interface DashboardEmployee {
  id: string
  name: string
  designation: string
  workMode: WorkMode
  totalDays: number
  workingDays: number
  otHours: number
  missedDays: number
  status: Status
  phoneNumber?: string
  emailAddress?: string
  address?: string
  dateOfJoining?: string
  experience?: string
  // Request counts
  leaveRequestCount?: number
  permissionRequestCount?: number
  // For modal compatibility
  permissions?: number
  leaves?: number
}

// Modal Employee interface - matches AddEmployeeModal requirements
interface ModalEmployee {
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
  employees: DashboardEmployee[]
  pagination: PaginationInfo
  debug?: any
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

// Helper function to convert DashboardEmployee to ModalEmployee
const convertDashboardToModal = (employee: DashboardEmployee): ModalEmployee => {
  return {
    id: employee.id,
    name: employee.name,
    designation: employee.designation,
    workMode: employee.workMode,
    totalDays: employee.totalDays,
    workingDays: employee.workingDays,
    permissions: employee.permissions || employee.permissionRequestCount || 0,
    leaves: employee.leaves || employee.leaveRequestCount || 0,
    missedDays: employee.missedDays,
    status: employee.status,
    phoneNumber: employee.phoneNumber,
    emailAddress: employee.emailAddress,
    address: employee.address,
    dateOfJoining: employee.dateOfJoining,
    experience: employee.experience,
  }
}

// Helper function to convert ModalEmployee to DashboardEmployee
const convertModalToDashboard = (employee: ModalEmployee): DashboardEmployee => {
  return {
    id: employee.id,
    name: employee.name,
    designation: employee.designation,
    workMode: employee.workMode,
    totalDays: employee.totalDays,
    workingDays: employee.workingDays,
    otHours: 0, // Will be fetched separately
    missedDays: employee.missedDays,
    status: employee.status,
    phoneNumber: employee.phoneNumber,
    emailAddress: employee.emailAddress,
    address: employee.address,
    dateOfJoining: employee.dateOfJoining,
    experience: employee.experience,
    leaveRequestCount: employee.leaves,
    permissionRequestCount: employee.permissions,
    permissions: employee.permissions,
    leaves: employee.leaves,
  }
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

// Get current month and year as defaults
const now = new Date()
const defaultMonth = (now.getMonth() + 1).toString()
const defaultYear = now.getFullYear().toString()

export default function AttendanceOverview() {
  const [attendanceData, setAttendanceData] = useState<DashboardEmployee[]>([])
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

  // Month/Year selection - defaults to current month/year
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear)

  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<ModalEmployee | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  
  // New states for total days management
  const [totalDaysDialogOpen, setTotalDaysDialogOpen] = useState(false)
  const [currentMonthTotalDays, setCurrentMonthTotalDays] = useState<number>(28)
  const [newTotalDays, setNewTotalDays] = useState<number>(28)
  const [totalDaysLoading, setTotalDaysLoading] = useState(false)
  
  const [isSearching, setIsSearching] = useState(false)
  const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null)
  
  const router = useRouter()

  // Fetch overtime hours for selected month/year
  const fetchOvertimeHours = async (employees: DashboardEmployee[], totalDaysToUse: number, month: string, year: string) => {
    try {
      console.log(`Fetching overtime hours for ${employees.length} employees for ${month}/${year}`)
      
      const updatedEmployees = await Promise.all(
        employees.map(async (employee) => {
          try {
            // Ensure month is zero-padded
            const paddedMonth = month.padStart(2, '0')
            const apiUrl = `/api/overtime-summary?employeeId=${encodeURIComponent(employee.id)}&month=${paddedMonth}&year=${year}`
            
            console.log(`Fetching OT for ${employee.name}: ${apiUrl}`)
            
            const response = await fetch(apiUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
              cache: "no-store",
            })
            
            if (response.ok) {
              const overtimeData = await response.json()
              console.log(`Overtime response for ${employee.name}:`, overtimeData)
              
              let otHours = 0
              
              // Try multiple possible response structures
              if (typeof overtimeData === 'number') {
                otHours = overtimeData
              } else if (overtimeData.totalHours !== undefined) {
                otHours = overtimeData.totalHours
              } else if (overtimeData.total_hours !== undefined) {
                otHours = overtimeData.total_hours
              } else if (overtimeData.hours !== undefined) {
                otHours = overtimeData.hours
              } else if (overtimeData.otHours !== undefined) {
                otHours = overtimeData.otHours
              } else if (overtimeData.data && overtimeData.data.total_hours !== undefined) {
                otHours = overtimeData.data.total_hours
              } else if (overtimeData.result && overtimeData.result.total_hours !== undefined) {
                otHours = overtimeData.result.total_hours
              }
              
              // Ensure otHours is a valid number
              otHours = isNaN(otHours) ? 0 : Math.max(0, otHours)
              const roundedOtHours = Math.round(otHours * 100) / 100
              
              console.log(`Setting OT hours for ${employee.name}: ${roundedOtHours}h`)
              
              return {
                ...employee,
                otHours: roundedOtHours,
                totalDays: totalDaysToUse
              }
            } else {
              console.warn(`Failed to fetch overtime for ${employee.name}: ${response.status}`)
              return {
                ...employee,
                otHours: 0,
                totalDays: totalDaysToUse
              }
            }
          } catch (err) {
            console.error(`Error fetching overtime for ${employee.name}:`, err)
            return {
              ...employee,
              otHours: 0,
              totalDays: totalDaysToUse
            }
          }
        })
      )

      console.log("Updated employees with overtime hours:", updatedEmployees.map(emp => ({
        name: emp.name,
        id: emp.id,
        otHours: emp.otHours
      })))
      return updatedEmployees
    } catch (err) {
      console.error("Error in fetchOvertimeHours:", err)
      return employees.map(emp => ({
        ...emp,
        otHours: 0,
        totalDays: totalDaysToUse
      }))
    }
  }

  // Process attendance data while preserving backend workingDays
  const fetchAttendanceSummary = async (employees: DashboardEmployee[], totalDaysToUse: number) => {
    try {
      console.log(`Processing attendance data - preserving backend workingDays for ${employees.length} employees`)
      
      const updatedEmployees = await Promise.all(
        employees.map(async (employee) => {
          try {
            // IMPORTANT: Preserve the workingDays from backend, don't recalculate
            console.log(`Preserving backend data for ${employee.name}:`, {
              id: employee.id,
              workingDays: employee.workingDays,
              totalDays: totalDaysToUse
            })
            
            // Calculate missed days based on backend workingDays
            const missedDays = Math.max(0, totalDaysToUse - employee.workingDays)
            
            return {
              ...employee,
              workingDays: employee.workingDays, // PRESERVE backend value
              missedDays,
              totalDays: totalDaysToUse,
            }
          } catch (err) {
            console.error(`Error processing attendance for employee ${employee.name}:`, err)
            return {
              ...employee,
              missedDays: totalDaysToUse - employee.workingDays,
              totalDays: totalDaysToUse,
            }
          }
        })
      )

      console.log("Final attendance data with preserved workingDays:", 
        updatedEmployees.map(emp => ({
          name: emp.name,
          id: emp.id,
          totalDays: emp.totalDays,
          workingDays: emp.workingDays,
          missedDays: emp.missedDays
        }))
      )
      return updatedEmployees
    } catch (err) {
      console.error("Error in fetchAttendanceSummary:", err)
      return employees.map(emp => ({
        ...emp,
        missedDays: totalDaysToUse - emp.workingDays,
        totalDays: totalDaysToUse,
      }))
    }
  }

  // Fetch leave and permission counts for selected month/year
  const fetchRequestCounts = async (employees: DashboardEmployee[], totalDaysToUse: number, month: string, year: string) => {
    try {
      console.log(`Fetching request counts for ${employees.length} employees for ${month}/${year}`)
      
      const updatedEmployees = await Promise.all(
        employees.map(async (employee) => {
          try {
            // Ensure month is zero-padded for API calls
            const paddedMonth = month.padStart(2, '0')
            
            // Fetch leave request count for selected month/year
            const leaveResponse = await fetch(
              `/api/leave-request?employeeId=${encodeURIComponent(employee.id)}&count=true&month=${paddedMonth}&year=${year}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
              }
            )
            
            let leaveCount = 0
            if (leaveResponse.ok) {
              const leaveData = await leaveResponse.json()
              leaveCount = leaveData.count || 0
              console.log(`Leave count for ${employee.name} (${month}/${year}):`, leaveCount)
            } else {
              console.error(`Failed to fetch leave count for ${employee.name}:`, leaveResponse.status)
            }

            // Fetch permission request count for selected month/year
            const permissionResponse = await fetch(
              `/api/permission-request?employeeId=${encodeURIComponent(employee.id)}&count=true&month=${paddedMonth}&year=${year}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
              }
            )
            
            let permissionCount = 0
            if (permissionResponse.ok) {
              const permissionData = await permissionResponse.json()
              permissionCount = permissionData.count || 0
              console.log(`Permission count for ${employee.name} (${month}/${year}):`, permissionCount)
            } else {
              console.error(`Failed to fetch permission count for ${employee.name}:`, permissionResponse.status)
            }

            return {
              ...employee,
              leaveRequestCount: leaveCount,
              permissionRequestCount: permissionCount,
              leaves: leaveCount,
              permissions: permissionCount,
              totalDays: totalDaysToUse,
              // PRESERVE the workingDays from backend
              workingDays: employee.workingDays
            }
          } catch (err) {
            console.error(`Error fetching counts for employee ${employee.name}:`, err)
            return {
              ...employee,
              leaveRequestCount: 0,
              permissionRequestCount: 0,
              leaves: 0,
              permissions: 0,
              totalDays: totalDaysToUse,
              workingDays: employee.workingDays // PRESERVE the workingDays from backend
            }
          }
        })
      )

      console.log("Final employees with counts and preserved workingDays:", 
        updatedEmployees.map(emp => ({
          name: emp.name,
          id: emp.id,
          workingDays: emp.workingDays,
          totalDays: emp.totalDays
        }))
      )
      return updatedEmployees
    } catch (err) {
      console.error("Error in fetchRequestCounts:", err)
      return employees.map(emp => ({
        ...emp,
        leaveRequestCount: 0,
        permissionRequestCount: 0,
        leaves: 0,
        permissions: 0,
        totalDays: totalDaysToUse,
        workingDays: emp.workingDays // PRESERVE the workingDays from backend
      }))
    }
  }

  // Fetch total days setting for the selected month/year
  const fetchMonthTotalDays = async (month: string = selectedMonth, year: string = selectedYear) => {
    try {
      console.log(`Fetching total days for ${month}/${year}`)
      const response = await fetch(`/api/monthly-settings?month=${month}&year=${year}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
      if (response.ok) {
        const data = await response.json()
        const totalDays = data.totalDays || 28
        console.log(`Monthly total days fetched: ${totalDays}`)
        setCurrentMonthTotalDays(totalDays)
        setNewTotalDays(totalDays)
        return totalDays
      } else {
        console.error(`Failed to fetch monthly settings:`, response.status)
        const defaultDays = 28
        setCurrentMonthTotalDays(defaultDays)
        setNewTotalDays(defaultDays)
        return defaultDays
      }
    } catch (err) {
      console.error("Error fetching monthly settings:", err)
      const defaultDays = 28
      setCurrentMonthTotalDays(defaultDays)
      setNewTotalDays(defaultDays)
      return defaultDays
    }
  }

  // Update total days for the selected month/year
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

      console.log(`Updating currentMonthTotalDays from ${currentMonthTotalDays} to ${newTotalDays}`)
      setCurrentMonthTotalDays(newTotalDays)
      setTotalDaysDialogOpen(false)
      
      console.log(`Refreshing employee data with new total days: ${newTotalDays}`)
      await fetchEmployees(currentPage, false, searchTerm, newTotalDays)
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

  // MAIN FUNCTION: Fetch employees for the selected month/year
  const fetchEmployees = async (page = 1, resetPagination = false, searchQuery = searchTerm, totalDaysOverride?: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const totalDaysToUse = totalDaysOverride !== undefined ? totalDaysOverride : currentMonthTotalDays
      console.log(`Using totalDays: ${totalDaysToUse} for ${selectedMonth}/${selectedYear}`)
      
      const finalPage = (searchQuery.trim() || selectedMode !== 'All Modes' || selectedStatus !== 'All Status') ? 1 : (resetPagination ? 1 : page)
      
      console.log(`Fetching employees for ${selectedMonth}/${selectedYear} with search: "${searchQuery}"`)
      
      // Build query parameters with selected month/year
      const params = new URLSearchParams({
        month: selectedMonth,      // Pass selected month
        year: selectedYear,        // Pass selected year
        page: finalPage.toString(),
        limit: '10'
      })

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      if (selectedMode && selectedMode !== 'All Modes') {
        params.append('workMode', selectedMode)
      }
      
      if (selectedStatus && selectedStatus !== 'All Status') {
        params.append('status', selectedStatus)
      }

      const url = `/api/employees?${params.toString()}`
      console.log(`API URL: ${url}`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error:", response.status, errorText)
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
      console.log(`API Response received for ${selectedMonth}/${selectedYear}:`, {
        employeesCount: data.employees?.length || 0,
        totalCount: data.pagination?.totalCount || 0,
        currentPage: data.pagination?.currentPage || 1
      })

      // Process the employee data for the selected month/year
      if (data.employees && Array.isArray(data.employees)) {
        console.log(`RAW BACKEND DATA - Employee Working Days for ${selectedMonth}/${selectedYear}:`)
        data.employees.forEach((emp, idx) => {
          console.log(`  ${idx + 1}. ${emp.name} (${emp.id}): workingDays = ${emp.workingDays}`)
        })
        
        setPagination(data.pagination)
        setCurrentPage(finalPage)
        
        // Process data while preserving backend workingDays
        console.log(`Processing attendance data while preserving backend workingDays for ${selectedMonth}/${selectedYear}...`)
        const employeesWithAttendance = await fetchAttendanceSummary(data.employees, totalDaysToUse)
        
        console.log(`Adding overtime hours for ${selectedMonth}/${selectedYear}...`)
        const employeesWithOT = await fetchOvertimeHours(employeesWithAttendance, totalDaysToUse, selectedMonth, selectedYear)
        
        console.log(`Adding request counts for ${selectedMonth}/${selectedYear}...`)
        const employeesWithCounts = await fetchRequestCounts(employeesWithOT, totalDaysToUse, selectedMonth, selectedYear)
        
        console.log(`FINAL DATA - Employee data after processing for ${selectedMonth}/${selectedYear}:`)
        employeesWithCounts.forEach((emp, idx) => {
          console.log(`  ${idx + 1}. ${emp.name}: workingDays=${emp.workingDays}, totalDays=${emp.totalDays}, otHours=${emp.otHours}`)
        })
        
        setAttendanceData(employeesWithCounts)
      } else {
        console.log("No employees data received")
        setAttendanceData([])
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          limit: 10,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch employees"
      console.error("Error fetching employees:", errorMessage)
      setError(errorMessage)
      setAttendanceData([])
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      })
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }

  // Search functionality
  const performSearch = useCallback(
    (searchValue: string) => {
      console.log(`Performing search: "${searchValue}" for ${selectedMonth}/${selectedYear}`)
      
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId)
        setSearchTimeoutId(null)
      }
      
      if (searchValue.trim() === '') {
        console.log(`Search cleared - immediate fetch`)
        setIsSearching(true)
        setCurrentPage(1)
        fetchEmployees(1, true, searchValue)
      } else {
        console.log(`Search query - delayed fetch: "${searchValue}"`)
        setIsSearching(true)
        
        const timeoutId = setTimeout(() => {
          console.log(`Executing search: "${searchValue}"`)
          fetchEmployees(1, true, searchValue)
        }, 100)
        
        setSearchTimeoutId(timeoutId)
      }
    },
    [selectedMonth, selectedYear, selectedMode, selectedStatus, searchTimeoutId, currentMonthTotalDays]
  )

  const handleSearchChange = (value: string) => {
    console.log(`Search input changed: "${value}"`)
    setSearchTerm(value)
    performSearch(value)
  }

  const handleFilterChange = () => {
    console.log(`Filter changed - Mode: ${selectedMode}, Status: ${selectedStatus}`)
    setCurrentPage(1)
    fetchEmployees(1, true)
  }

  // CRITICAL: This effect triggers when month or year changes
  useEffect(() => {
    console.log("Month/Year changed - fetching total days first, then employees")
    const loadData = async () => {
      const totalDays = await fetchMonthTotalDays(selectedMonth, selectedYear)
      console.log(`Total days loaded: ${totalDays}, now fetching employees for ${selectedMonth}/${selectedYear}`)
      await fetchEmployees(1, true, "", totalDays)
    }
    loadData()
  }, [selectedMonth, selectedYear]) // This dependency array ensures the effect runs when month or year changes

  useEffect(() => {
    if (selectedMode !== "All Modes" || selectedStatus !== "All Status") {
      console.log(`Filter effect triggered - Mode: ${selectedMode}, Status: ${selectedStatus}`)
      handleFilterChange()
    }
  }, [selectedMode, selectedStatus])

  useEffect(() => {
    return () => {
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId)
      }
    }
  }, [searchTimeoutId])

  const handleEmployeeClick = (employeeId: string): void => {
    router.push(`/admin/detail/${employeeId}`)
  }

  const handleAddEmployee = async (newEmployee: ModalEmployee, originalId?: string): Promise<void> => {
    try {
      const dashboardEmployee = convertModalToDashboard(newEmployee)

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dashboardEmployee),
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
      const errorMessage = err instanceof Error ? err.message : "Failed to add employee"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditEmployee = (employee: DashboardEmployee) => {
    const modalEmployee = convertDashboardToModal(employee)
    setSelectedEmployee(modalEmployee)
    setEditModalOpen(true)
  }

  const handleDeleteEmployee = (employee: DashboardEmployee) => {
    const modalEmployee = convertDashboardToModal(employee)
    setSelectedEmployee(modalEmployee)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedEmployee) return

    try {
      setDeleteLoading(true)
      setDeletingEmployeeId(selectedEmployee.id)
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
          } catch (textError) {}
        }
        throw new Error(errorMessage)
      }

      toast({
        title: "Success",
        description: `Employee ${selectedEmployee.name} has been deleted successfully`,
        variant: "default",
      })

      setDeleteDialogOpen(false)
      setSelectedEmployee(null)
      await fetchEmployees(currentPage)
    } catch (err) {
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

  const handleUpdateEmployee = async (updatedEmployee: ModalEmployee, originalEmployeeId?: string): Promise<void> => {
    const employeeIdToUpdate = originalEmployeeId || updatedEmployee.id
    
    if (!employeeIdToUpdate) {
      toast({
        title: "Error",
        description: "Employee ID is missing",
        variant: "destructive",
      })
      return
    }

    try {
      const dashboardEmployee = convertModalToDashboard(updatedEmployee)

      const response = await fetch(`/api/employees/${encodeURIComponent(employeeIdToUpdate)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dashboardEmployee),
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
          } catch (textError) {}
        }
        throw new Error(errorMessage)
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
    if (attendanceData.length === 0) {
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
        "OT Hours",
        "Leave Requests",
        "Permission Requests",
      ],
      ...attendanceData.map((emp) => [
        emp.id,
        emp.name,
        emp.designation,
        emp.workMode,
        emp.totalDays || currentMonthTotalDays,
        emp.workingDays,
        emp.otHours || 0,
        emp.leaveRequestCount || 0,
        emp.permissionRequestCount || 0,
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
      console.log(`Page changed to: ${page}`)
      fetchEmployees(page)
    }
  }

  const clearAllFilters = () => {
    console.log('Clearing all filters')
    setSearchTerm('')
    setSelectedMode('All Modes')
    setSelectedStatus('All Status')
    setCurrentPage(1)
    setIsSearching(true)
    
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId)
      setSearchTimeoutId(null)
    }
    
    fetchEmployees(1, true, '')
  }

  const clearSearch = () => {
    console.log('Clearing search only')
    setSearchTerm('')
    setIsSearching(true)
    
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId)
      setSearchTimeoutId(null)
    }
    
    fetchEmployees(1, true, '')
  }

  useEffect(() => {
    console.log("Current attendance data in state:", attendanceData.map(emp => ({
      id: emp.id,
      name: emp.name,
      workingDays: emp.workingDays,
      totalDays: emp.totalDays,
      otHours: emp.otHours
    })))
  }, [attendanceData])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.userType !== 'admin') {
      router.push('/unauthorized')
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex flex-col md:flex-row h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
{/*                 <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Link> */}
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Month Selection */}
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
                {/* Year Selection */}
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
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
                          {(searchTerm || selectedMode !== "All Modes" || selectedStatus !== "All Status") && (
                            <span className="text-orange-600 font-medium"> (filtered)</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Total Days Settings Dialog */}
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
                              <label htmlFor="totalDays" className="text-right">
                                Total Days
                              </label>
                              <Input
                                id="totalDays"
                                type="number"
                                value={newTotalDays}
                                onChange={(e) => setNewTotalDays(parseInt(e.target.value) || 28)}
                                className="col-span-3"
                                min="1"
                                max="31"
                              />
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
                        placeholder="Search by name, ID, or designation..."
                        className="pl-10 pr-10"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={clearSearch}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {isSearching && (
                        <Loader2 className="absolute right-10 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
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
                          <TableHead className="w-[100px] text-center">ID</TableHead>
                          <TableHead className="w-[180px]">Employee Name</TableHead>
                          <TableHead className="w-[150px]">Designation</TableHead>
                          <TableHead className="w-[120px]">Work Mode</TableHead>
                          <TableHead className="w-[100px] text-center">Total Days</TableHead>
                          <TableHead className="w-[100px] text-center">Working Days</TableHead>
                          <TableHead className="w-[100px] text-center">OT Hours</TableHead>
                          <TableHead className="w-[100px] text-center">Leave Requests</TableHead>
                          <TableHead className="w-[100px] text-center">Permission Requests</TableHead>
                          <TableHead className="w-[80px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                              {loading || isSearching ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span>
                                    {searchTerm ? `Searching for "${searchTerm}"...` : 'Loading employees...'}
                                  </span>
                                </div>
                              ) : searchTerm || selectedMode !== "All Modes" || selectedStatus !== "All Status" ? (
                                <div className="space-y-3">
                                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                                  <div>
                                    <p className="font-medium">No employees found</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {searchTerm && `No results for "${searchTerm}"`}
                                      {(selectedMode !== "All Modes" || selectedStatus !== "All Status") && 
                                        ` with selected filters`
                                      }
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearAllFilters}
                                  >
                                    Clear all filters
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                                  <p>No employees found for this month</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchEmployees(1, true)}
                                  >
                                    Refresh
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          attendanceData.map((employee) => (
                            <TableRow key={employee.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="px-1.5 py-0.5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs leading-tight">
                                  {employee.id}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{employee.name}</span>
                              </TableCell>
                              <TableCell className="text-gray-600">{employee.designation}</TableCell>
                              <TableCell>
                                <Badge className={getWorkModeBadge(employee.workMode)}>{employee.workMode}</Badge>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {employee.totalDays} Days
                              </TableCell>
                              <TableCell className="text-center font-medium text-green-600">
                                <div className="flex items-center justify-center space-x-1">
                                  <span>{employee.workingDays} Days</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium text-purple-600">
                                <div className="flex items-center justify-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{employee.otHours || 0}h</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {employee.leaveRequestCount || 0}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <Badge className="bg-green-100 text-green-800">
                                    {employee.permissionRequestCount || 0}
                                  </Badge>
                                </div>
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
                        {(searchTerm || selectedMode !== "All Modes" || selectedStatus !== "All Status") && (
                          <span className="text-orange-600 font-medium"> (filtered results)</span>
                        )}
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
    </ProtectedRoute>
  )
}
