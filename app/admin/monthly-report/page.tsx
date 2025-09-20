"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Types
interface Employee {
  id: string;
  name: string;
  designation: string;
  workMode: string;
  status: string;
  phoneNumber?: string;
  emailAddress?: string;
}

interface DailyWorkLog {
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  otHours?: string;
  project: string;
  status: string;
  description: string;
}

interface EmployeeMonthlyData {
  employee: Employee;
  dailyWorkLog: DailyWorkLog[];
  summary: {
    totalDays: number;
    workingDays: number;
    permissions: number;
    leaves: number;
    missedDays: number;
    totalHours: number;
    overtimeHours: number;
  };
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Utility functions
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const getWorkModeBadge = (mode: string): string => {
  const colors: Record<string, string> = {
    Office: "bg-blue-100 text-blue-800",
    WFH: "bg-purple-100 text-purple-800",
    Hybrid: "bg-orange-100 text-orange-800",
  };
  return colors[mode] || "bg-gray-100 text-gray-800";
};

const getEmployeeStatusBadge = (status: string): string => {
  const colors: Record<string, string> = {
    Active: "bg-green-100 text-green-800",
    Warning: "bg-yellow-100 text-yellow-800",
    "On Leave": "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getCurrentMonth = () => {
  const now = new Date();
  return (now.getMonth() + 1).toString();
};

const getCurrentYear = () => {
  const now = new Date();
  return now.getFullYear().toString();
};

const getMonthName = (month: string) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[parseInt(month) - 1] || 'Unknown';
};

export default function MonthlyReports() {
  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState<"all" | "few">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState<string>(getCurrentYear());
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>("All Modes");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 15,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch employees list
  const fetchEmployees = useCallback(
    async (page = 1, searchQuery = "", workModeFilter = "All Modes", statusFilter = "All Status") => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "15",
        });

        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        if (workModeFilter && workModeFilter !== "All Modes")
          params.append("workMode", workModeFilter);
        if (statusFilter && statusFilter !== "All Status")
          params.append("status", statusFilter);

        const url = `/api/employees?${params.toString()}`;
        console.log("Fetching employees:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        console.log("Employees response:", data);

        setEmployees(data.employees || []);
        setPagination({
          currentPage: data.pagination?.currentPage || 1,
          totalPages: data.pagination?.totalPages || 1,
          totalCount: data.pagination?.totalCount || 0,
          limit: data.pagination?.limit || 15,
          hasNextPage: data.pagination?.hasNextPage || false,
          hasPreviousPage: data.pagination?.hasPreviousPage || false,
        });
        setCurrentPage(page);
      } catch (err) {
        console.error("Fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch employees";
        setError(errorMessage);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue: string, workModeFilter: string, statusFilter: string) => {
        fetchEmployees(1, searchValue, workModeFilter, statusFilter);
      }, 500),
    [fetchEmployees]
  );

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    debouncedSearch(value, selectedWorkMode, selectedStatus);
  };

  // Handle filter changes
  const handleWorkModeChange = (mode: string) => {
    setSelectedWorkMode(mode);
    setCurrentPage(1);
    fetchEmployees(1, searchTerm, mode, selectedStatus);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    fetchEmployees(1, searchTerm, selectedWorkMode, status);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchEmployees(page, searchTerm, selectedWorkMode, selectedStatus);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchEmployees(1, "", "All Modes", "All Status");
  }, [fetchEmployees]);

  // Employee selection functions
  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelected = new Set(selectedEmployeeIds);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployeeIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.size === employees.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(employees.map((emp) => emp.id)));
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedWorkMode("All Modes");
    setSelectedStatus("All Status");
    setCurrentPage(1);
    fetchEmployees(1, "", "All Modes", "All Status");
  };

  // Get employee IDs for export based on selection mode
  const getEmployeeIdsForExport = (): string[] => {
    if (selectionMode === "all") {
      return employees.map(emp => emp.id);
    } else {
      return Array.from(selectedEmployeeIds);
    }
  };

  // Fetch monthly data for selected employees
  const fetchMonthlyData = async (employeeIds: string[]): Promise<EmployeeMonthlyData[]> => {
    const results: EmployeeMonthlyData[] = [];
    
    for (const employeeId of employeeIds) {
      try {
        const response = await fetch(
          `/api/employees/${employeeId}?month=${selectedMonth}&year=${selectedYear}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Calculate totals from daily work log
          const totalHours = data.dailyWorkLog.reduce((sum: number, log: DailyWorkLog) => {
            return sum + (parseFloat(log.hours) || 0) + (parseFloat(log.otHours || "0") || 0);
          }, 0);
          
          const overtimeHours = data.dailyWorkLog.reduce((sum: number, log: DailyWorkLog) => {
            return sum + (parseFloat(log.otHours || "0") || 0);
          }, 0);

          const workingDays = data.dailyWorkLog.filter((log: DailyWorkLog) => log.status === "Present").length;
          const permissions = data.dailyWorkLog.filter((log: DailyWorkLog) => log.status === "Permission").length;
          const leaves = data.dailyWorkLog.filter((log: DailyWorkLog) => log.status === "Leave").length;
          const missedDays = data.dailyWorkLog.filter((log: DailyWorkLog) => log.status === "Absent").length;

          results.push({
            employee: data.employee,
            dailyWorkLog: data.dailyWorkLog || [],
            summary: {
              totalDays: data.dailyWorkLog?.length || 0,
              workingDays,
              permissions,
              leaves,
              missedDays,
              totalHours,
              overtimeHours
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching data for employee ${employeeId}:`, error);
      }
    }
    
    return results;
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      setExportLoading(true);
      const employeeIds = getEmployeeIdsForExport();
      
      if (employeeIds.length === 0) {
        alert("Please select at least one employee");
        return;
      }

      const monthlyData = await fetchMonthlyData(employeeIds);
      
      if (monthlyData.length === 0) {
        alert("No data found for selected employees");
        return;
      }

      const doc = new jsPDF();
      let yPosition = 20;

      // Title page
      doc.setFontSize(18);
      doc.text("Monthly Employee Work Log Report", 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.text(`Month: ${getMonthName(selectedMonth)} ${selectedYear}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Number of Employees: ${monthlyData.length}`, 14, yPosition);
      yPosition += 15;

      // Summary table
      const summaryData = monthlyData.map(data => [
        data.employee.name,
        data.employee.designation,
        data.summary.workingDays.toString(),
        data.summary.totalHours.toFixed(1),
        data.summary.overtimeHours.toFixed(1),
        data.summary.leaves.toString(),
        data.summary.permissions.toString()
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Employee', 'Designation', 'Working Days', 'Total Hours', 'OT Hours', 'Leaves', 'Permissions']],
        body: summaryData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Add new page for detailed logs
      doc.addPage();
      yPosition = 20;

      // Detailed work logs for each employee
      for (let i = 0; i < monthlyData.length; i++) {
        const employeeData = monthlyData[i];
        
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`${employeeData.employee.name} - ${employeeData.employee.designation}`, 14, yPosition);
        yPosition += 8;

        const workLogData = employeeData.dailyWorkLog.map(log => [
          log.date,
          log.checkIn,
          log.checkOut,
          log.hours,
          log.otHours || "0",
          ((parseFloat(log.hours) || 0) + (parseFloat(log.otHours || "0") || 0)).toFixed(1),
          log.status,
          log.project.substring(0, 30) + (log.project.length > 30 ? '...' : ''),
          log.description.substring(0, 40) + (log.description.length > 40 ? '...' : '')
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Date', 'Check-in', 'Check-out', 'Hours', 'OT', 'Total', 'Status', 'Project', 'Description']],
          body: workLogData,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [34, 197, 94] },
          margin: { left: 14, right: 14 },
          pageBreak: 'auto',
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      const fileName = `monthly-report-${getMonthName(selectedMonth)}-${selectedYear}-${employeeIds.length}employees.pdf`;
      doc.save(fileName);

      alert(`PDF report generated: ${fileName}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report');
    } finally {
      setExportLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const employeeIds = getEmployeeIdsForExport();
      
      if (employeeIds.length === 0) {
        alert("Please select at least one employee");
        return;
      }

      const monthlyData = await fetchMonthlyData(employeeIds);
      
      if (monthlyData.length === 0) {
        alert("No data found for selected employees");
        return;
      }

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Monthly Employee Report Summary'],
        [`Month: ${getMonthName(selectedMonth)} ${selectedYear}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [''],
        ['Employee Name', 'Designation', 'Work Mode', 'Working Days', 'Total Hours', 'OT Hours', 'Leaves', 'Permissions', 'Missed Days'],
        ...monthlyData.map(data => [
          data.employee.name,
          data.employee.designation,
          data.employee.workMode,
          data.summary.workingDays,
          data.summary.totalHours.toFixed(1),
          data.summary.overtimeHours.toFixed(1),
          data.summary.leaves,
          data.summary.permissions,
          data.summary.missedDays
        ])
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Individual employee sheets
      monthlyData.forEach(employeeData => {
        const employeeSheet = [
          [`${employeeData.employee.name} - Work Log`],
          [`Month: ${getMonthName(selectedMonth)} ${selectedYear}`],
          [`Designation: ${employeeData.employee.designation}`],
          [''],
          ['Date', 'Check-in', 'Check-out', 'Regular Hours', 'OT Hours', 'Total Hours', 'Status', 'Project/Task', 'Work Description'],
          ...employeeData.dailyWorkLog.map(log => [
            log.date,
            log.checkIn,
            log.checkOut,
            log.hours,
            log.otHours || "0",
            ((parseFloat(log.hours) || 0) + (parseFloat(log.otHours || "0") || 0)).toFixed(1),
            log.status,
            log.project,
            log.description
          ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(employeeSheet);
        const sheetName = employeeData.employee.name.substring(0, 30); // Limit sheet name length
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const fileName = `monthly-report-${getMonthName(selectedMonth)}-${selectedYear}-${employeeIds.length}employees.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`Excel report generated: ${fileName}`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error generating Excel report');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex flex-col md:flex-row h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/admin/dashboard"
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    Monthly Reports
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-3">
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
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[90rem] mx-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Error</h3>
                  </div>
                  <p className="text-red-600 mb-3">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEmployees(currentPage)}
                  >
                    Retry
                  </Button>
                </div>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-xl">
                          Monthly Employee Report - {getMonthName(selectedMonth)} {selectedYear}
                        </CardTitle>
                        <CardDescription>
                          Select employees to generate comprehensive monthly work logs
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={exportToPDF}
                        disabled={exportLoading || (selectionMode === "few" && selectedEmployeeIds.size === 0)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {exportLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 mr-2" />
                        )}
                        Export PDF
                      </Button>
                      <Button
                        onClick={exportToExcel}
                        disabled={exportLoading || (selectionMode === "few" && selectedEmployeeIds.size === 0)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {exportLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                        )}
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Employee Selection Options */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3">Employee Selection</h3>
                    <RadioGroup
                      value={selectionMode}
                      onValueChange={(value: "all" | "few") => setSelectionMode(value)}
                      className="flex space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all">All Employees</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="few" id="few" />
                        <Label htmlFor="few">Few Employees</Label>
                      </div>
                    </RadioGroup>
                    {selectionMode === "few" && (
                      <p className="text-sm text-blue-600 mt-2">
                        {selectedEmployeeIds.size > 0
                          ? `${selectedEmployeeIds.size} employees selected`
                          : "Select employees from the list below"}
                      </p>
                    )}
                  </div>

                  {/* Search and Filters */}
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search employees by name, ID, or designation..."
                        className="pl-10 pr-10"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={() => handleSearchChange("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Select value={selectedWorkMode} onValueChange={handleWorkModeChange}>
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
                    <Select value={selectedStatus} onValueChange={handleStatusChange}>
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
                    {(searchTerm || selectedWorkMode !== "All Modes" || selectedStatus !== "All Status") && (
                      <Button variant="outline" size="sm" onClick={clearAllFilters}>
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  {/* Bulk Selection Controls for Few Employees Mode */}
                  {selectionMode === "few" && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedEmployeeIds.size === employees.length && employees.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm font-medium">
                            {selectedEmployeeIds.size === employees.length && employees.length > 0
                              ? "Deselect All"
                              : "Select All"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {selectedEmployeeIds.size} of {employees.length} employees selected
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Employees Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          {selectionMode === "few" && (
                            <TableHead className="w-[50px] text-center">
                              <Checkbox
                                checked={selectedEmployeeIds.size === employees.length && employees.length > 0}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                          )}
                          <TableHead className="w-[80px] text-center">ID</TableHead>
                          <TableHead className="w-[200px]">Employee Name</TableHead>
                          <TableHead className="w-[150px]">Designation</TableHead>
                          <TableHead className="w-[100px]">Work Mode</TableHead>
                          <TableHead className="w-[100px] text-center">Status</TableHead>
                          <TableHead className="w-[150px]">Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={selectionMode === "few" ? 7 : 6}
                              className="text-center py-12"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                <p className="font-medium text-gray-900">Loading employees...</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : employees.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={selectionMode === "few" ? 7 : 6}
                              className="text-center py-8 text-gray-500"
                            >
                              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p>No employees found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          employees.map((employee) => (
                            <TableRow key={employee.id} className="hover:bg-gray-50">
                              {selectionMode === "few" && (
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
                                <Badge className={getWorkModeBadge(employee.workMode)}>
                                  {employee.workMode}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={getEmployeeStatusBadge(employee.status)}>
                                  {employee.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-600 text-sm">
                                <div>{employee.phoneNumber || "N/A"}</div>
                                <div className="text-xs">{employee.emailAddress || "N/A"}</div>
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
                              const current = pagination.currentPage;
                              return (
                                page === 1 ||
                                page === pagination.totalPages ||
                                Math.abs(page - current) <= 1
                              );
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
  );
}