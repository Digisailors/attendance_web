"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import {
  Search,
  Filter,
  ArrowLeft,
  FileDown,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  UserCheck,
  UserX,
  Download,
  X,
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ProtectedRoute from '@/components/ProtectedRoute'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// Types
type WorkMode = "Office" | "WFH" | "Hybrid"
type AttendanceStatus = "Present" | "Absent" | "Late"

interface DailyAttendanceEmployee {
  id: string
  name: string
  designation: string
  workMode: WorkMode
  attendanceStatus: AttendanceStatus
  checkInTime?: string
  checkOutTime?: string
  phoneNumber?: string
  emailAddress?: string
  totalHours?: number
  overtimeHours?: number
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface DailyReportResponse {
  employees: DailyAttendanceEmployee[]
  pagination: PaginationInfo
  summary: {
    totalEmployees: number
    presentCount: number
    absentCount: number
    lateCount: number
    date: string
  }
}

// Utility functions
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// Transform backend daily data to expected format
const transformBackendData = (backendResponse: any, selectedDate: string): DailyAttendanceEmployee[] => {
  if (!backendResponse?.employees || !Array.isArray(backendResponse.employees)) {
    console.log("No employees array found in backend response")
    return []
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return backendResponse.employees.map((record: any) => {
    let attendanceStatus: AttendanceStatus = "Absent"
  
    const recordDate = new Date(selectedDate).toISOString().split('T')[0]
  
    // First, determine basic attendance status
    if (record.checkInTime && record.checkOutTime) {
      // Both check-in and check-out exist
      attendanceStatus = "Present"
    } 
    else if (record.checkInTime && !record.checkOutTime) {
      // Only check-in exists
      if (recordDate === todayStr) {
        // For today, if there's check-in but no check-out, consider as Present
        attendanceStatus = "Present"
      } else {
        // For past dates, if there's no check-out, consider as Absent
        attendanceStatus = "Absent"
      }
    }
    // If no check-in time, status remains "Absent"

    // Now check for Late status - this overrides Present if check-in is after 9 AM
    if (record.checkInTime) {
      try {
        let checkInDate;
        
        // Handle different time formats
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(record.checkInTime)) {
          // Plain time format (HH:mm or HH:mm:ss)
          const today = new Date(selectedDate);
          const [hours, minutes, seconds = 0] = record.checkInTime.split(':').map(Number);
          checkInDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
        } else {
          // Full datetime format
          checkInDate = new Date(record.checkInTime);
        }
        
        if (!isNaN(checkInDate.getTime())) {
          // Create 9:00 AM for the same date
          const nineAM = new Date(checkInDate);
          nineAM.setHours(9, 0, 0, 0);

          // If employee checked in after 9 AM, mark as Late
          if (checkInDate > nineAM && attendanceStatus !== "Absent") {
            attendanceStatus = "Late";
            console.log(`Employee ${record.name} marked as Late - Check-in: ${record.checkInTime}, Cutoff: 9:00 AM`);
          }
        }
      } catch (error) {
        console.error(`Error parsing check-in time for employee ${record.name}:`, error);
      }
    }

    // Preserve backend "Late" status if explicitly set
    if (record.attendanceStatus === "Late") {
      attendanceStatus = "Late"
    }
  
    return {
      id: record.id,
      name: record.name,
      designation: record.designation || "N/A",
      workMode: (record.workMode || "Office") as WorkMode,
      attendanceStatus,
      checkInTime: record.checkInTime || null,
      checkOutTime: record.checkOutTime || null,
      phoneNumber: record.phoneNumber || null,
      emailAddress: record.emailAddress || null,
      totalHours: record.totalHours || 0,
      overtimeHours: record.overtimeHours || 0,
    }
  })
}

// Validate and normalize pagination data
const normalizePagination = (paginationData: any, dataLength: number): PaginationInfo => {
  const totalCount = paginationData?.totalCount || dataLength
  const limit = paginationData?.limit || 15
  const currentPage = paginationData?.currentPage || 1
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  return {
    currentPage,
    totalPages,
    totalCount,
    limit,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  }
}

// Normalize summary data
const normalizeSummary = (summaryData: any, transformedEmployees: DailyAttendanceEmployee[], selectedDate: string) => {
  // Calculate from transformed data if backend doesn't provide summary
  const presentCount = transformedEmployees.filter(emp => emp.attendanceStatus === 'Present').length
  const absentCount = transformedEmployees.filter(emp => emp.attendanceStatus === 'Absent').length
  const lateCount = transformedEmployees.filter(emp => emp.attendanceStatus === 'Late').length
  const totalEmployees = transformedEmployees.length

  return {
    totalEmployees: summaryData?.totalEmployees || totalEmployees,
    presentCount: summaryData?.presentCount || presentCount,
    absentCount: summaryData?.absentCount || absentCount,
    lateCount: summaryData?.lateCount || lateCount,
    date: summaryData?.date || selectedDate
  }
}

const getAttendanceStatusBadge = (status: AttendanceStatus): string => {
  const colors: Record<AttendanceStatus, string> = {
    Present: "bg-green-100 text-green-800",
    Absent: "bg-red-100 text-red-800",
    Late: "bg-yellow-100 text-yellow-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

const getWorkModeBadge = (mode: WorkMode): string => {
  const colors: Record<WorkMode, string> = {
    Office: "bg-blue-100 text-blue-800",
    WFH: "bg-purple-100 text-purple-800",
    Hybrid: "bg-orange-100 text-orange-800",
  }
  return colors[mode] || "bg-gray-100 text-gray-800"
}

const formatTime = (timeString?: string): string => {
  if (!timeString) return "-"

  // Handle plain HH:mm:ss values from Postgres
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
    const [h, m] = timeString.split(":")
    const hours = parseInt(h, 10)
    const minutes = parseInt(m, 10)

    const ampm = hours >= 12 ? "PM" : "AM"
    const displayHour = hours % 12 || 12
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`
  }

  try {
    const date = new Date(timeString)
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }
    return timeString
  } catch {
    return timeString
  }
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export default function ReportsPage() {
  // State management
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceEmployee[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 15,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    date: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status")
  const [selectedMode, setSelectedMode] = useState<string>("All Modes")
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()))
  const [currentPage, setCurrentPage] = useState(1)
  const [exportLoading, setExportLoading] = useState(false)
  
  // Multi-select state for downloads
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [showMultiSelect, setShowMultiSelect] = useState(false)
  
  const router = useRouter()

  // Main fetch function
  const fetchDailyAttendance = useCallback(async (
    page = 1,
    searchQuery = "",
    statusFilter = "All Status",
    modeFilter = "All Modes"
  ) => {
    try {
      setLoading(true)
      setError(null)
  
      const params = new URLSearchParams({
        date: selectedDate,
        page: page.toString(),
        limit: "15",
      })
  
      if (searchQuery.trim()) params.append("search", searchQuery.trim())
      
      if (statusFilter && statusFilter !== "All Status") params.append("attendanceStatus", statusFilter)
      if (modeFilter && modeFilter !== "All Modes") params.append("workMode", modeFilter)
  
      const url = `/api/daily-attendance?${params.toString()}`
      console.log("Fetching:", url)
  
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
  
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
  
      const backendData = await response.json()
      console.log("Backend response:", backendData)
      
      const transformedEmployees = transformBackendData(backendData, selectedDate)

      const normalizedPagination = normalizePagination(backendData.pagination, transformedEmployees.length)
      const normalizedSummary = normalizeSummary(backendData.summary, transformedEmployees, selectedDate)
  
      setAttendanceData(transformedEmployees)
      setPagination(normalizedPagination)
      setSummary(normalizedSummary)
      setCurrentPage(page)
    } catch (err) {
      console.error("Fetch error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch daily attendance"
      setError(errorMessage)
      setAttendanceData([])
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 15,
        hasNextPage: false,
        hasPreviousPage: false,
      })
      setSummary({
        totalEmployees: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        date: selectedDate,
      })
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Debounced search function - Fixed to use current filter values
  const debouncedSearch = useMemo(
    () => debounce((searchValue: string, statusFilter: string, modeFilter: string) => {
      console.log("Debounced search triggered:", { searchValue, statusFilter, modeFilter })
      fetchDailyAttendance(1, searchValue, statusFilter, modeFilter)
    }, 500),
    [fetchDailyAttendance]
  )

  // Handle search input changes - Fixed to pass current filter states
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    debouncedSearch(value, selectedStatus, selectedMode)
  }

  // Handle status filter changes - Fixed to use current search term
  const handleStatusChange = (status: string) => {
    console.log("Status filter changed to:", status)
    setSelectedStatus(status)
    setCurrentPage(1)
    setSelectedEmployeeIds(new Set()) // Clear selections when filter changes
    setShowMultiSelect(false) // Hide multi-select when filter changes
    fetchDailyAttendance(1, searchTerm, status, selectedMode)
  }

  // Handle work mode filter changes - Fixed to use current search term
  const handleModeChange = (mode: string) => {
    console.log("Mode filter changed to:", mode)
    setSelectedMode(mode)
    setCurrentPage(1)
    setSelectedEmployeeIds(new Set()) // Clear selections when filter changes
    fetchDailyAttendance(1, searchTerm, selectedStatus, mode)
  }

  // Handle date changes
  const handleDateChange = (newDate: string) => {
    console.log("Date changed to:", newDate)
    setSelectedDate(newDate)
    setCurrentPage(1)
    setSelectedEmployeeIds(new Set()) // Clear selections when date changes
    setShowMultiSelect(false)
    // Reset filters when date changes
    setSearchTerm("")
    setSelectedStatus("All Status")
    setSelectedMode("All Modes")
  }

  // Initial data fetch and date changes
  useEffect(() => {
    fetchDailyAttendance(1, "", "All Status", "All Modes")
  }, [selectedDate, fetchDailyAttendance])

  // Pagination - Fixed to use current filter states
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      console.log(`Page changed to: ${page}`)
      fetchDailyAttendance(page, searchTerm, selectedStatus, selectedMode)
    }
  }

  const clearAllFilters = () => {
    console.log("Clearing all filters")
    setSearchTerm("")
    setSelectedStatus("All Status")
    setSelectedMode("All Modes")
    setCurrentPage(1)
    setSelectedEmployeeIds(new Set())
    setShowMultiSelect(false)
    fetchDailyAttendance(1, "", "All Status", "All Modes")
  }
  
  const clearSearch = () => {
    console.log("Clearing search")
    setSearchTerm("")
    setCurrentPage(1)
    fetchDailyAttendance(1, "", selectedStatus, selectedMode)
  }

  // Multi-select functions
  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelected = new Set(selectedEmployeeIds)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployeeIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.size === attendanceData.length) {
      setSelectedEmployeeIds(new Set())
    } else {
      setSelectedEmployeeIds(new Set(attendanceData.map(emp => emp.id)))
    }
  }

  const toggleMultiSelectMode = () => {
    setShowMultiSelect(!showMultiSelect)
    setSelectedEmployeeIds(new Set())
  }

  // Export functions
  const getFilteredDataForExport = (exportType: 'all' | 'present' | 'absent' | 'selected'): DailyAttendanceEmployee[] => {
    switch (exportType) {
      case 'present':
        return attendanceData.filter(emp => emp.attendanceStatus === 'Present' || emp.attendanceStatus === 'Late')
      case 'absent':
        return attendanceData.filter(emp => emp.attendanceStatus === 'Absent')
      case 'selected':
        return attendanceData.filter(emp => selectedEmployeeIds.has(emp.id))
      default:
        return attendanceData
    }
  }

  const exportToPDF = async (exportType: 'all' | 'present' | 'absent' | 'selected') => {
    try {
      setExportLoading(true)
      
      const filteredData = getFilteredDataForExport(exportType)
      
      if (filteredData.length === 0) {
        toast({
          title: "No Data",
          description: `No ${exportType === 'selected' ? 'selected' : exportType === 'all' ? '' : exportType} employees found for export`,
          variant: "destructive",
        })
        return
      }

      const doc = new jsPDF()
      
      doc.setFontSize(18)
      doc.text(`Daily Attendance Report - ${exportType.charAt(0).toUpperCase() + exportType.slice(1)}`, 14, 20)
      
      doc.setFontSize(12)
      const selectedDateFormatted = new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      doc.text(`Date: ${selectedDateFormatted}`, 14, 30)
      
      if (exportType === 'all') {
        doc.text(`Total: ${summary.totalEmployees} | Present: ${summary.presentCount} | Absent: ${summary.absentCount} | Late: ${summary.lateCount}`, 14, 38)
      } else if (exportType === 'present') {
        doc.text(`Present Employees: ${summary.presentCount + summary.lateCount}`, 14, 38)
      } else if (exportType === 'absent') {
        doc.text(`Absent Employees: ${summary.absentCount}`, 14, 38)
      } else {
        doc.text(`Selected Employees: ${filteredData.length}`, 14, 38)
      }

      const tableData = filteredData.map(emp => [
        emp.id,
        emp.name,
        emp.designation,
        emp.workMode,
        emp.attendanceStatus,
        formatTime(emp.checkInTime),
        formatTime(emp.checkOutTime),
        emp.totalHours ? `${emp.totalHours}h` : '-'
      ])

      autoTable(doc, {
        head: [['ID', 'Name', 'Designation', 'Work Mode', 'Status', 'Check In', 'Check Out', 'Hours']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      })

      const fileName = `attendance-report-${exportType}-${selectedDate}.pdf`
      doc.save(fileName)

      toast({
        title: "Export Successful",
        description: `PDF report downloaded: ${fileName}`,
        variant: "default",
      })
    } catch (err) {
      console.error("Error exporting PDF:", err)
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  const exportToExcel = async (exportType: 'all' | 'present' | 'absent' | 'selected') => {
    try {
      setExportLoading(true)
      
      const filteredData = getFilteredDataForExport(exportType)
      
      if (filteredData.length === 0) {
        toast({
          title: "No Data",
          description: `No ${exportType === 'selected' ? 'selected' : exportType === 'all' ? '' : exportType} employees found for export`,
          variant: "destructive",
        })
        return
      }

      const wb = XLSX.utils.book_new()
      
      const excelData = [
        ['Daily Attendance Report - ' + exportType.charAt(0).toUpperCase() + exportType.slice(1)],
        ['Date: ' + new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })],
        exportType === 'all' 
          ? [`Total: ${summary.totalEmployees} | Present: ${summary.presentCount} | Absent: ${summary.absentCount} | Late: ${summary.lateCount}`]
          : exportType === 'present'
          ? [`Present Employees: ${summary.presentCount + summary.lateCount}`]
          : exportType === 'absent'
          ? [`Absent Employees: ${summary.absentCount}`]
          : [`Selected Employees: ${filteredData.length}`],
        [],
        ['Employee ID', 'Name', 'Designation', 'Work Mode', 'Status', 'Check In Time', 'Check Out Time', 'Total Hours', 'Overtime Hours'],
        ...filteredData.map(emp => [
          emp.id,
          emp.name,
          emp.designation,
          emp.workMode,
          emp.attendanceStatus,
          formatTime(emp.checkInTime),
          formatTime(emp.checkOutTime),
          emp.totalHours ? `${emp.totalHours}h` : '-',
          emp.overtimeHours ? `${emp.overtimeHours}h` : '-'
        ])
      ]

      const ws = XLSX.utils.aoa_to_sheet(excelData)
      
      ws['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, 
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Daily Attendance')

      const fileName = `attendance-report-${exportType}-${selectedDate}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Export Successful",
        description: `Excel report downloaded: ${fileName}`,
        variant: "default",
      })
    } catch (err) {
      console.error("Error exporting Excel:", err)
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel report",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate)
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      currentDate.setDate(currentDate.getDate() + 1)
    }
    handleDateChange(formatDate(currentDate))
  }

  const setToday = () => {
    handleDateChange(formatDate(new Date()))
  }

  // Handle summary card clicks for quick filtering
  const handleSummaryCardClick = (filterType: 'all' | 'present' | 'absent' | 'late') => {
    console.log("Summary card clicked:", filterType)
    
    let statusFilter = "All Status"
    if (filterType === 'present') statusFilter = "Present"
    if (filterType === 'absent') statusFilter = "Absent" 
    if (filterType === 'late') statusFilter = "Late"
    
    setSelectedStatus(statusFilter)
    setCurrentPage(1)
    setSearchTerm("") // Clear search when clicking summary cards
    setSelectedEmployeeIds(new Set()) // Clear selections
    setShowMultiSelect(false) // Hide multi-select
    fetchDailyAttendance(1, "", statusFilter, selectedMode)
  }

  // Memoized values for performance
  const summaryCards = useMemo(() => [
    { 
      title: "Total Employees", 
      value: summary.totalEmployees, 
      icon: Users, 
      color: "blue",
      clickable: true,
      onClick: () => handleSummaryCardClick('all')
    },
    { 
      title: "Present", 
      value: summary.presentCount, 
      icon: UserCheck, 
      color: "green",
      clickable: true,
      onClick: () => handleSummaryCardClick('present')
    },
    { 
      title: "Absent", 
      value: summary.absentCount, 
      icon: UserX, 
      color: "red",
      clickable: true,
      onClick: () => handleSummaryCardClick('absent')
    },
    { 
      title: "Late", 
      value: summary.lateCount, 
      icon: Clock, 
      color: "yellow",
      clickable: true,
      onClick: () => handleSummaryCardClick('late')
    }
  ], [summary, selectedMode])

  const memoizedTableRows = useMemo(() => {
    return attendanceData.map((employee) => (
      <TableRow key={employee.id} className="hover:bg-gray-50">
        {showMultiSelect && (
          <TableCell>
            <Checkbox
              checked={selectedEmployeeIds.has(employee.id)}
              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
            />
          </TableCell>
        )}
        <TableCell>
          <div className="px-1.5 py-0.5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs leading-tight">
            {employee.id.slice(-8)}
          </div>
        </TableCell>
        <TableCell>
          <span className="font-medium">{employee.name}</span>
        </TableCell>
        <TableCell className="text-gray-600">{employee.designation}</TableCell>
        <TableCell>
          <Badge className={getWorkModeBadge(employee.workMode)}>{employee.workMode}</Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge className={getAttendanceStatusBadge(employee.attendanceStatus)}>
            {employee.attendanceStatus === 'Present' && <CheckCircle className="w-3 h-3 mr-1" />}
            {employee.attendanceStatus === 'Absent' && <XCircle className="w-3 h-3 mr-1" />}
            {employee.attendanceStatus === 'Late' && <Clock className="w-3 h-3 mr-1" />}
            {employee.attendanceStatus}
          </Badge>
        </TableCell>
        <TableCell className="text-center font-medium">
          {formatTime(employee.checkInTime)}
        </TableCell>
        <TableCell className="text-center font-medium">
          {formatTime(employee.checkOutTime)}
        </TableCell>
        <TableCell className="text-center font-medium text-blue-600">
          {employee.totalHours ? `${employee.totalHours}h` : '-'}
        </TableCell>
        <TableCell className="text-center font-medium text-purple-600">
          <div className="flex items-center justify-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{employee.overtimeHours || 0}h</span>
          </div>
        </TableCell>
      </TableRow>
    ))
  }, [attendanceData, showMultiSelect, selectedEmployeeIds])

  // Check if any filters are active
  const hasActiveFilters = searchTerm || selectedStatus !== "All Status" || selectedMode !== "All Modes"

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex flex-col md:flex-row h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/admin/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={setToday}>
                  Today
                </Button>
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[90rem] mx-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Data Loading Error</h3>
                  </div>
                  <p className="text-red-600 mb-3">{error}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => fetchDailyAttendance(currentPage)}>
                      Retry
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {/* Summary Cards - Made clickable */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {summaryCards.map((card, index) => {
                  const IconComponent = card.icon
                  return (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
                        (card.title === "Total Employees" && selectedStatus === "All Status") ||
                        (card.title === "Present" && selectedStatus === "Present") ||
                        (card.title === "Absent" && selectedStatus === "Absent") ||
                        (card.title === "Late" && selectedStatus === "Late")
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={card.onClick}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`w-5 h-5 text-${card.color}-600`} />
                          <div>
                            <p className="text-sm font-medium text-gray-600">{card.title}</p>
                            <p className={`text-2xl font-bold text-${card.color}-600`}>{card.value}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-xl">Daily Attendance Report</CardTitle>
                        <CardDescription>
                          {new Date(selectedDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          {" • "}
                          {pagination.totalCount} employees
                          {hasActiveFilters && (
                            <span className="text-orange-600 font-medium"> (filtered)</span>
                          )}
                          {showMultiSelect && selectedEmployeeIds.size > 0 && (
                            <span className="text-blue-600 font-medium"> • {selectedEmployeeIds.size} selected</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Bulk Select Toggle Button */}
                      <Button 
                        variant={showMultiSelect ? "default" : "outline"} 
                        size="sm" 
                        onClick={toggleMultiSelectMode}
                      >
                        {showMultiSelect ? (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Exit Select
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Bulk Select
                          </>
                        )}
                      </Button>

                      {/* Export dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          {/* <Button variant="outline" size="sm" disabled={exportLoading}>
                            {exportLoading ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            Export
                          </Button> */}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => exportToPDF('all')}>
                            <FileText className="mr-2 h-4 w-4" />
                            All - PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportToExcel('all')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            All - Excel
                          </DropdownMenuItem>
                          
                          {/* Selected employees export options */}
                          {showMultiSelect && selectedEmployeeIds.size > 0 && (
                            <>
                              <DropdownMenuItem onClick={() => exportToPDF('selected')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Selected ({selectedEmployeeIds.size}) - PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportToExcel('selected')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Selected ({selectedEmployeeIds.size}) - Excel
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {/* Status-based exports */}
                          {selectedStatus !== "All Status" && !showMultiSelect && (
                            <>
                              <DropdownMenuItem onClick={() => exportToPDF(selectedStatus.toLowerCase() as 'present' | 'absent')}>
                                {selectedStatus === "Present" ? (
                                  <UserCheck className="mr-2 h-4 w-4" />
                                ) : (
                                  <UserX className="mr-2 h-4 w-4" />
                                )}
                                {selectedStatus} Only - PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportToExcel(selectedStatus.toLowerCase() as 'present' | 'absent')}>
                                {selectedStatus === "Present" ? (
                                  <UserCheck className="mr-2 h-4 w-4" />
                                ) : (
                                  <UserX className="mr-2 h-4 w-4" />
                                )}
                                {selectedStatus} Only - Excel
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {/* Default present/absent exports when no filter is active */}
                          {selectedStatus === "All Status" && !showMultiSelect && (
                            <>
                              <DropdownMenuItem onClick={() => exportToPDF('present')}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Present Only - PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportToExcel('present')}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Present Only - Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportToPDF('absent')}>
                                <UserX className="mr-2 h-4 w-4" />
                                Absent Only - PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportToExcel('absent')}>
                                <UserX className="mr-2 h-4 w-4" />
                                Absent Only - Excel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    </div>
                    <Select value={selectedStatus} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Status">All Status</SelectItem>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                        <SelectItem value="Late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedMode} onValueChange={handleModeChange}>
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
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearAllFilters}>
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  {/* Multi-select toolbar */}
                  {showMultiSelect && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedEmployeeIds.size === attendanceData.length && attendanceData.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm font-medium">
                            {selectedEmployeeIds.size === attendanceData.length && attendanceData.length > 0 
                              ? "Deselect All" 
                              : "Select All"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {selectedEmployeeIds.size} of {attendanceData.length} employees selected
                        </span>
                      </div>
                      {selectedEmployeeIds.size > 0 && (
                        <div className="flex items-center space-x-2">
                          <Button size="sm" onClick={() => exportToPDF('selected')}>
                            <FileText className="w-4 h-4 mr-1" />
                            Export PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => exportToExcel('selected')}>
                            <FileSpreadsheet className="w-4 h-4 mr-1" />
                            Export Excel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          {showMultiSelect && (
                            <TableHead className="w-[50px] text-center">
                              <Checkbox
                                checked={selectedEmployeeIds.size === attendanceData.length && attendanceData.length > 0}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                          )}
                          <TableHead className="w-[80px] text-center">ID</TableHead>
                          <TableHead className="w-[180px]">Employee Name</TableHead>
                          <TableHead className="w-[150px]">Designation</TableHead>
                          <TableHead className="w-[100px]">Work Mode</TableHead>
                          <TableHead className="w-[100px] text-center">Status</TableHead>
                          <TableHead className="w-[100px] text-center">Check In</TableHead>
                          <TableHead className="w-[100px] text-center">Check Out</TableHead>
                          <TableHead className="w-[100px] text-center">Total Hours</TableHead>
                          <TableHead className="w-[100px] text-center">OT Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={showMultiSelect ? 10 : 9} className="text-center py-12">
                              <div className="flex flex-col items-center space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                <div>
                                  <p className="font-medium text-gray-900">Loading attendance data...</p>
                                  <p className="text-sm text-gray-500">Please wait while we fetch the records</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : attendanceData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={showMultiSelect ? 10 : 9} className="text-center py-8 text-gray-500">
                              {hasActiveFilters ? (
                                <div className="space-y-3">
                                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                                  <div>
                                    <p className="font-medium">No employees found</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {searchTerm && `No results for "${searchTerm}"`}
                                      {(selectedStatus !== "All Status" || selectedMode !== "All Modes") && 
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
                                  <p>No attendance data found for this date</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchDailyAttendance(1)}
                                  >
                                    Refresh
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          memoizedTableRows
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
                        {hasActiveFilters && (
                          <span className="text-orange-600"> (filtered results)</span>
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
      </div>
    </ProtectedRoute>
  )
}
