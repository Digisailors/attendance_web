"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft, 
  FileText, 
  Download, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Loader2
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmployeeData {
  id: string;
  name: string;
  designation: string;
  workMode: string;
  status: string;
  totalDays: number;
  workingDays: number;
  permissions: number;
  leaves: number;
  missedDays: number;
  phoneNumber?: string;
  emailAddress?: string;
  address?: string;
  dateOfJoining?: string;
  experience?: string;
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

interface ApiResponse {
  employee: EmployeeData;
  dailyWorkLog: DailyWorkLog[];
}

interface OvertimeData {
  total_hours: number;
  records_count: number;
}

const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Present: "bg-green-100 text-green-800",
    Leave: "bg-blue-100 text-blue-800",
    Permission: "bg-yellow-100 text-yellow-800",
    Absent: "bg-red-100 text-red-800"
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getWorkModeBadge = (mode: string) => {
  const colors: Record<string, string> = {
    Office: "bg-blue-100 text-blue-800",
    WFH: "bg-purple-100 text-purple-800",
    Hybrid: "bg-orange-100 text-orange-800"
  };
  return colors[mode] || "bg-gray-100 text-gray-800";
};

const getEmployeeStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Active: "bg-green-100 text-green-800",
    Warning: "bg-yellow-100 text-yellow-800",
    "On Leave": "bg-red-100 text-red-800"
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function EmployeeAttendanceDetail() {
  // Get current month and year
  const getCurrentMonth = () => {
    const now = new Date();
    return (now.getMonth() + 1).toString();
  };

  const getCurrentYear = () => {
    const now = new Date();
    return now.getFullYear().toString();
  };

  // Optimized date range generation with memory limits
  const generateDateRange = (month: string, year: string) => {
    const currentDate = new Date();
    const selectedMonth = parseInt(month);
    const selectedYear = parseInt(year);
    
    // Safety check for valid dates
    if (selectedMonth < 1 || selectedMonth > 12 || selectedYear < 2020 || selectedYear > 2030) {
      console.error('Invalid month or year:', month, year);
      return [];
    }
    
    const isCurrentMonth = selectedMonth === currentDate.getMonth() + 1 && selectedYear === currentDate.getFullYear();
    const endDate = isCurrentMonth ? currentDate.getDate() : new Date(selectedYear, selectedMonth, 0).getDate();
    
    // Limit to maximum 31 days to prevent memory issues
    const maxDays = Math.min(endDate, 31);
    
    const dates = [];
    for (let day = 1; day <= maxDays; day++) {
      try {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateString = `${dayName} ${day.toString().padStart(2, '0')}`;
        dates.push({
          dateKey: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
          displayDate: dateString,
          fullDate: date
        });
      } catch (error) {
        console.error(`Error creating date for day ${day}:`, error);
        break; // Stop if date creation fails
      }
    }
    return dates;
  };

  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [dailyWorkLog, setDailyWorkLog] = useState<DailyWorkLog[]>([]);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  // Memoize total calculated hours to prevent unnecessary recalculations
  const totalCalculatedHours = useMemo(() => {
    return dailyWorkLog.reduce((total, log) => {
      const regularHours = parseFloat(log.hours) || 0;
      const otHours = parseFloat(log.otHours || "0") || 0;
      return total + regularHours + otHours;
    }, 0);
  }, [dailyWorkLog]);

  // Optimized fetch functions with error handling and timeouts
  const fetchOvertimeData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `/api/overtime-summary?employeeId=${employeeId}&month=${selectedMonth}&year=${selectedYear}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data: OvertimeData = await response.json();
        setOvertimeHours(data.total_hours || 0);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Overtime data request timed out');
      } else {
        console.error('Error fetching overtime data:', err);
      }
      setOvertimeHours(0);
    }
  };

  const fetchLeaveCount = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `/api/leave-request?employeeId=${employeeId}&count=true&month=${selectedMonth.padStart(2, '0')}&year=${selectedYear}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const leaveCount = data.count || 0;
        
        setEmployeeData(prev => prev ? { ...prev, leaves: leaveCount } : null);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Leave count request timed out');
      } else {
        console.error('Error fetching leave count:', err);
      }
    }
  };

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(
        `/api/employees/${employeeId}?month=${selectedMonth}&year=${selectedYear}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employee data: ${response.status} ${response.statusText}`);
      }
      
      const data: ApiResponse = await response.json();
      
      // Validate data structure
      if (!data.employee || !Array.isArray(data.dailyWorkLog)) {
        throw new Error('Invalid data structure received from API');
      }
      
      setEmployeeData(data.employee);
      
      // Generate date range with safety checks
      const dateRange = generateDateRange(selectedMonth, selectedYear);
      
      if (dateRange.length === 0) {
        throw new Error('Invalid date range generated');
      }
      
      // Limit the number of work logs to prevent memory issues
      const maxLogs = Math.min(data.dailyWorkLog.length, 100); // Limit to 100 entries
      const limitedWorkLogs = data.dailyWorkLog.slice(0, maxLogs);
      
      // Create a map of existing work logs by date
      const workLogMap = new Map<string, DailyWorkLog>();
      limitedWorkLogs.forEach(log => {
        try {
          const dateParts = log.date.split(' ');
          const day = dateParts[dateParts.length - 1];
          const dateKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
          workLogMap.set(dateKey, {
            ...log,
            otHours: log.otHours || "0"
          });
        } catch (err) {
          console.error('Error processing work log:', log, err);
        }
      });
      
      // Create complete work log with all dates (limited to prevent memory issues)
      const completeWorkLog: DailyWorkLog[] = dateRange.slice(0, 31).map(({ dateKey, displayDate }) => {
        if (workLogMap.has(dateKey)) {
          return workLogMap.get(dateKey)!;
        } else {
          return {
            date: displayDate,
            checkIn: "--",
            checkOut: "--",
            hours: "0",
            otHours: "0",
            project: "No Work Assigned",
            status: "Leave",
            description: "No work logged for this date"
          };
        }
      });
      
      setDailyWorkLog(completeWorkLog);
      
      // Fetch additional data
      await Promise.allSettled([
        fetchOvertimeData(),
        fetchLeaveCount()
      ]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error fetching employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId && selectedMonth && selectedYear) {
      fetchEmployeeData();
    }
  }, [employeeId, selectedMonth, selectedYear]);

  const handleNavigate = () => {
    router.push('/admin/dashboard');
  };

  // Optimized PDF export with chunking
  const handleExportPDF = () => {
    if (!employeeData || !dailyWorkLog.length) return;

    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text(`Employee Work Log Report`, 14, 15);
      doc.setFontSize(12);
      doc.text(`Name: ${employeeData.name}`, 14, 25);
      doc.text(`Designation: ${employeeData.designation}`, 14, 32);
      doc.text(`Month: ${getMonthName(selectedMonth)} ${selectedYear}`, 14, 39);
      doc.text(`Total Hours (Including OT): ${totalCalculatedHours.toFixed(1)}`, 14, 46);

      // Process table data in chunks to prevent memory issues
      const chunkSize = 20; // Process 20 rows at a time
      const chunks = [];
      
      for (let i = 0; i < dailyWorkLog.length; i += chunkSize) {
        const chunk = dailyWorkLog.slice(i, i + chunkSize).map((log) => {
          const regularHours = parseFloat(log.hours) || 0;
          const otHours = parseFloat(log.otHours || "0") || 0;
          const totalHours = regularHours + otHours;
          
          return [
            log.date,
            log.checkIn,
            log.checkOut,
            log.hours,
            log.otHours || "0",
            totalHours.toFixed(1),
            log.project.substring(0, 30) + (log.project.length > 30 ? '...' : ''), // Truncate long text
            log.status,
            log.description.substring(0, 40) + (log.description.length > 40 ? '...' : '')
          ];
        });
        chunks.push(...chunk);
      }

      const tableColumn = [
        "Date", "Check-in", "Check-out", "Hours", "OT Hours",
        "Total Hours", "Project", "Status", "Description"
      ];

      autoTable(doc, {
        startY: 52,
        head: [tableColumn],
        body: chunks,
        styles: { fontSize: 8 }, // Smaller font to fit more content
        headStyles: { fillColor: [52, 152, 219] },
        pageBreak: 'auto',
        rowPageBreak: 'avoid'
      });

      doc.save(`${employeeData.name}-worklog-${selectedMonth}-${selectedYear}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try with a smaller date range.');
    }
  };

  // Optimized Excel export
  const handleExportExcel = () => {
    if (!employeeData || !dailyWorkLog.length) return;

    try {
      const sanitizeDate = (dateStr: string) => {
        const parts = dateStr.split(' ');
        return parts.length > 1 ? parts[1] : dateStr;
      };

      const escapeCsvValue = (value: string) => {
        const truncated = (value || '').substring(0, 100); // Limit cell content length
        return `"${truncated.replace(/"/g, '""')}"`;
      };

      const csvContent = [
        ['Employee:', employeeData.name],
        ['Month:', `${getMonthName(selectedMonth)} ${selectedYear}`],
        ['Total Hours (Including OT):', totalCalculatedHours.toFixed(1)],
        [''],
        ['Date', 'Check-in', 'Check-out', 'Hours', 'OT Hours', 'Total Hours', 'Project/Task', 'Status', 'Description'],
        ...dailyWorkLog.slice(0, 50).map(log => { // Limit to 50 rows to prevent memory issues
          const regularHours = parseFloat(log.hours) || 0;
          const otHours = parseFloat(log.otHours || "0") || 0;
          const totalHours = regularHours + otHours;
          
          return [
            escapeCsvValue(sanitizeDate(log.date)),
            escapeCsvValue(log.checkIn),
            escapeCsvValue(log.checkOut),
            escapeCsvValue(log.hours),
            escapeCsvValue(log.otHours || "0"),
            escapeCsvValue(totalHours.toFixed(1)),
            escapeCsvValue(log.project),
            escapeCsvValue(log.status),
            escapeCsvValue(log.description)
          ];
        })
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employeeData.name}-worklog-${selectedMonth}-${selectedYear}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. Please try with a smaller date range.');
    }
  };

  const getMonthName = (month: string) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month) - 1] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading employee data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employeeData) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Employee not found'}</p>
            <Button onClick={handleNavigate}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="admin" />
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleNavigate}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
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
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Employee Header */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{employeeData.name}</h1>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-gray-600">{employeeData.designation}</span>
                      <Badge className={getWorkModeBadge(employeeData.workMode)}>
                        {employeeData.workMode}
                      </Badge>
                      <Badge className={getEmployeeStatusBadge(employeeData.status)}>
                        {employeeData.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Selected Month</div>
                  <div className="text-lg font-semibold">{getMonthName(selectedMonth)} {selectedYear}</div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card className="bg-blue-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{employeeData.totalDays}</div>
                  <div className="text-sm opacity-90">Total Days</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{employeeData.workingDays}</div>
                  <div className="text-sm opacity-90">Working Days</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{employeeData.permissions}</div>
                  <div className="text-sm opacity-90">Permissions</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{employeeData.leaves}</div>
                  <div className="text-sm opacity-90">Leaves</div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{overtimeHours}</div>
                  <div className="text-sm opacity-90">OT Hours</div>
                </CardContent>
              </Card>
              <Card className="bg-indigo-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{totalCalculatedHours.toFixed(1)}</div>
                  <div className="text-sm opacity-90">Total Hours</div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Work Log */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <CardTitle>Daily Work Log - {getMonthName(selectedMonth)} {selectedYear}</CardTitle>
                    <Badge variant="outline" className="ml-2">
                      {dailyWorkLog.length} days shown
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={handleExportExcel}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead className="w-[100px] text-center">Check-in</TableHead>
                        <TableHead className="w-[100px] text-center">Check-out</TableHead>
                        <TableHead className="w-[80px] text-center">Hours</TableHead>
                        <TableHead className="w-[80px] text-center">OT Hours</TableHead>
                        <TableHead className="w-[90px] text-center">Total Hours</TableHead>
                        <TableHead className="w-[200px]">Project/Task</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead>Work Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyWorkLog.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            No work log entries found for this month
                          </TableCell>
                        </TableRow>
                      ) : (
                        dailyWorkLog.slice(0, 31).map((log, index) => { // Limit display to 31 rows
                          const regularHours = parseFloat(log.hours) || 0;
                          const otHours = parseFloat(log.otHours || "0") || 0;
                          const totalHours = regularHours + otHours;
                          
                          return (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{log.date}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  {log.checkIn !== "--" && log.checkIn !== "-" && (
                                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                  )}
                                  <span className={log.checkIn !== "--" && log.checkIn !== "-" ? "text-green-600" : "text-gray-400"}>
                                    {log.checkIn}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  {log.checkOut !== "--" && log.checkOut !== "-" && (
                                    <XCircle className="w-4 h-4 text-red-500 mr-1" />
                                  )}
                                  <span className={log.checkOut !== "--" && log.checkOut !== "-" ? "text-red-600" : "text-gray-400"}>
                                    {log.checkOut}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium text-green-600">
                                {log.hours}
                              </TableCell>
                              <TableCell className="text-center font-medium text-yellow-600">
                                <div className="flex items-center justify-center">
                                  <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                                  {log.otHours || "0"}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-indigo-600">
                                {totalHours.toFixed(1)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <FileText className="w-4 h-4 text-blue-500 mr-2" />
                                  {log.project.length > 30 ? log.project.substring(0, 30) + '...' : log.project}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={getStatusBadge(log.status)}>
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {log.description.length > 50 ? log.description.substring(0, 50) + '...' : log.description}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Total Hours Summary */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Monthly Summary:</span>
                    <div className="flex space-x-6">
                      <span className="text-sm text-gray-600">
                       
                        Regular Hours: <span className="font-medium text-green-600">
                          {dailyWorkLog.reduce((sum, log) => sum + (parseFloat(log.hours) || 0), 0).toFixed(1)}
                        </span>
                      </span>
                      <span className="text-sm text-gray-600">
                        OT Hours: <span className="font-medium text-yellow-600">
                          {dailyWorkLog.reduce((sum, log) => sum + (parseFloat(log.otHours || "0") || 0), 0).toFixed(1)}
                        </span>
                      </span>
                      <span className="text-sm text-gray-600">
                        Total Hours: <span className="font-medium text-indigo-600">
                          {totalCalculatedHours.toFixed(1)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={handleNavigate}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}