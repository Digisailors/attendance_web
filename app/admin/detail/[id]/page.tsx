"use client";

import { useState, useEffect } from "react";
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
  project: string;
  status: string;
  description: string;
}

interface ApiResponse {
  employee: EmployeeData;
  dailyWorkLog: DailyWorkLog[];
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
    return (now.getMonth() + 1).toString(); // getMonth() returns 0-11, so add 1
  };

  const getCurrentYear = () => {
    const now = new Date();
    return now.getFullYear().toString();
  };

  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [dailyWorkLog, setDailyWorkLog] = useState<DailyWorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth()); // Set current month as default
  const [selectedYear, setSelectedYear] = useState(getCurrentYear()); // Set current year as default
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/${employeeId}?month=${selectedMonth}&year=${selectedYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch employee data');
      }
      
      const data: ApiResponse = await response.json();
      setEmployeeData(data.employee);
      setDailyWorkLog(data.dailyWorkLog);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId, selectedMonth, selectedYear]);

  const handleNavigate = () => {
    router.push('/admin/dashboard');
  };

  const handleExportPDF = () => {
    // Implement PDF export functionality
    console.log('Export PDF functionality to be implemented');
  };

  const handleExportExcel = () => {
    if (!employeeData || !dailyWorkLog.length) return;

    const csvContent = [
      ['Date', 'Check-in', 'Check-out', 'Hours', 'Project/Task', 'Status', 'Description'],
      ...dailyWorkLog.map(log => [
        log.date,
        log.checkIn,
        log.checkOut,
        log.hours,
        log.project,
        log.status,
        log.description
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${employeeData.name}-worklog-${selectedMonth}-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getMonthName = (month: string) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month) - 1];
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
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <Card className="bg-red-500 text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold">{employeeData.missedDays}</div>
                  <div className="text-sm opacity-90">Missed</div>
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
                        <TableHead className="w-[200px]">Project/Task</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead>Work Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyWorkLog.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No work log entries found for this month
                          </TableCell>
                        </TableRow>
                      ) : (
                        dailyWorkLog.map((log, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{log.date}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                {log.checkIn !== "-" && (
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                )}
                                <span className={log.checkIn !== "-" ? "text-green-600" : "text-gray-400"}>
                                  {log.checkIn}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                {log.checkOut !== "-" && (
                                  <XCircle className="w-4 h-4 text-red-500 mr-1" />
                                )}
                                <span className={log.checkOut !== "-" ? "text-red-600" : "text-gray-400"}>
                                  {log.checkOut}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-green-600">
                              {log.hours}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-blue-500 mr-2" />
                                {log.project}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={getStatusBadge(log.status)}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {log.description}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={handleNavigate}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
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