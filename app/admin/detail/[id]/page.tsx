"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

interface OvertimeRecord {
  ot_date: string;
  total_hours: number;
  status: string;
}

interface OvertimeData {
  total_hours: number;
  records_count: number;
  records?: OvertimeRecord[];
}

interface MonthlySettingsResponse {
  totalDays: number;
  month: number;
  year: number;
  isDefault?: boolean;
}

// 🆕 Interface for daily attendance API response
interface DailyAttendanceEmployee {
  id: string;
  name: string;
  designation: string;
  workMode: string;
  attendanceStatus: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
  project: string | null;
  description: string | null;
}

const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Present: "bg-green-100 text-green-800",
    Late: "bg-orange-100 text-orange-800",
    Leave: "bg-blue-100 text-blue-800",
    Permission: "bg-yellow-100 text-yellow-800",
    Absent: "bg-red-100 text-red-800",
    Missed: "bg-purple-100 text-purple-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getWorkModeBadge = (mode: string) => {
  const colors: Record<string, string> = {
    Office: "bg-blue-100 text-blue-800",
    WFH: "bg-purple-100 text-purple-800",
    Hybrid: "bg-orange-100 text-orange-800",
  };
  return colors[mode] || "bg-gray-100 text-gray-800";
};

const getEmployeeStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Active: "bg-green-100 text-green-800",
    Inactive: "bg-gray-200 text-gray-700",
    Warning: "bg-yellow-100 text-yellow-800",
    "On Leave": "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function EmployeeAttendanceDetail() {
  const getCurrentMonth = () => {
    const now = new Date();
    return (now.getMonth() + 1).toString();
  };

  const getCurrentYear = () => {
    const now = new Date();
    return now.getFullYear().toString();
  };

  const generateDateRange = (month: string, year: string) => {
    const currentDate = new Date();
    const selectedMonth = parseInt(month);
    const selectedYear = parseInt(year);

    if (
      selectedMonth < 1 ||
      selectedMonth > 12 ||
      selectedYear < 2020 ||
      selectedYear > 2030
    ) {
      console.error("Invalid month or year:", month, year);
      return [];
    }

    const isCurrentMonth =
      selectedMonth === currentDate.getMonth() + 1 &&
      selectedYear === currentDate.getFullYear();
    const endDate = isCurrentMonth
      ? currentDate.getDate()
      : new Date(selectedYear, selectedMonth, 0).getDate();

    const maxDays = Math.min(endDate, 31);

    const dates = [];
    for (let day = 1; day <= maxDays; day++) {
      try {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        const dateString = `${dayName} ${day.toString().padStart(2, "0")}`;
        dates.push({
          dateKey: `${selectedYear}-${selectedMonth
            .toString()
            .padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
          displayDate: dateString,
          fullDate: date,
        });
      } catch (error) {
        console.error(`Error creating date for day ${day}:`, error);
        break;
      }
    }
    return dates;
  };

  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [employeeStatus, setEmployeeStatus] = useState<string>("Active");
  const [savingStatus, setSavingStatus] = useState<boolean>(false);
  const [dailyWorkLog, setDailyWorkLog] = useState<DailyWorkLog[]>([]);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [overtimeByDate, setOvertimeByDate] = useState<Map<string, number>>(
    new Map()
  );
  const [monthlyTotalDays, setMonthlyTotalDays] = useState<number>(28);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const totalCalculatedHours = useMemo(() => {
    return dailyWorkLog.reduce((total, log) => {
      const regularHours = parseFloat(log.hours) || 0;
      const otHours = parseFloat(log.otHours || "0") || 0;
      return total + regularHours + otHours;
    }, 0);
  }, [dailyWorkLog]);

  const fetchMonthlySettings = async () => {
    try {
      console.log("🔍 Fetching monthly settings for:", {
        selectedMonth,
        selectedYear,
      });

      const paddedMonth = selectedMonth.padStart(2, "0");
      const response = await fetch(
        `/api/monthly-settings?month=${paddedMonth}&year=${selectedYear}`
      );

      if (response.ok) {
        const data: MonthlySettingsResponse = await response.json();
        console.log("✅ Monthly settings fetched:", data);
        setMonthlyTotalDays(data.totalDays);
        return data.totalDays;
      } else {
        console.warn("⚠ Failed to fetch monthly settings, using default 28");
        setMonthlyTotalDays(28);
        return 28;
      }
    } catch (err) {
      console.error("❌ Error fetching monthly settings:", err);
      setMonthlyTotalDays(28);
      return 28;
    }
  };

  const fetchOvertimeData = async (): Promise<Map<string, number>> => {
    try {
      console.log("🔍 Fetching overtime for:", {
        employeeId,
        selectedMonth,
        selectedYear,
      });

      const paddedMonth = selectedMonth.padStart(2, "0");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `/api/overtime-summary?employeeId=${employeeId}&month=${paddedMonth}&year=${selectedYear}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: OvertimeData = await response.json();
        console.log("✅ Overtime API Response:", data);

        const totalHours = data.total_hours || 0;
        setOvertimeHours(totalHours);

        const dateMap = new Map<string, number>();
        if (data.records && Array.isArray(data.records)) {
          data.records.forEach((record) => {
            if (record.ot_date && record.status?.toLowerCase() === "approved") {
              dateMap.set(record.ot_date, record.total_hours || 0);
              console.log(
                `📌 Mapped OT: ${record.ot_date} = ${record.total_hours}h`
              );
            }
          });
        }

        setOvertimeByDate(dateMap);
        console.log("📅 OT by date map size:", dateMap.size, "entries");
        console.log(
          `✓ Total OT Hours: ${totalHours}h (${
            data.records_count || 0
          } records)`
        );
        return dateMap;
      } else {
        console.warn("⚠ Failed to fetch overtime:", response.status);
        setOvertimeHours(0);
        return new Map();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error("❌ Overtime request timed out");
      } else {
        console.error("❌ Error fetching overtime:", err);
      }
      setOvertimeHours(0);
      return new Map();
    }
  };

  // 🆕 NEW: Fetch attendance status from daily-attendance API
  const fetchAttendanceStatusForDate = async (
    dateKey: string
  ): Promise<string> => {
    try {
      const response = await fetch(`/api/daily-attendance?date=${dateKey}`);

      if (response.ok) {
        const data = await response.json();
        const employee = data.employees?.find(
          (emp: DailyAttendanceEmployee) => emp.id === employeeId
        );

        if (employee) {
          console.log(
            `✅ Attendance for ${dateKey}: ${employee.attendanceStatus}`
          );
          return employee.attendanceStatus;
        }
      }

      return "Absent"; // Default if not found
    } catch (err) {
      console.error(`❌ Error fetching attendance for ${dateKey}:`, err);
      return "Absent";
    }
  };


 const fetchEmployeeData = async () => {
   try {
     setLoading(true);
     setError(null);

     // Fetch monthly settings first
     const totalDaysFromSettings = await fetchMonthlySettings();

     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 15000);

     const response = await fetch(
       `/api/employees/${employeeId}?month=${selectedMonth}&year=${selectedYear}`,
       { signal: controller.signal }
     );

     clearTimeout(timeoutId);

     if (!response.ok) {
       throw new Error(
         `Failed to fetch employee data: ${response.status} ${response.statusText}`
       );
     }

     const data: ApiResponse = await response.json();

     if (!data.employee || !Array.isArray(data.dailyWorkLog)) {
       throw new Error("Invalid data structure received from API");
     }

     setEmployeeData(data.employee);

     const dateRange = generateDateRange(selectedMonth, selectedYear);

     if (dateRange.length === 0) {
       throw new Error("Invalid date range generated");
     }

     const maxLogs = Math.min(data.dailyWorkLog.length, 100);
     const limitedWorkLogs = data.dailyWorkLog.slice(0, maxLogs);

     const workLogMap = new Map<string, DailyWorkLog>();
     limitedWorkLogs.forEach((log) => {
       try {
         const dateParts = log.date.split(" ");
         const day = dateParts[dateParts.length - 1];
         const dateKey = `${selectedYear}-${selectedMonth.padStart(
           2,
           "0"
         )}-${day.padStart(2, "0")}`;
         workLogMap.set(dateKey, {
           ...log,
           otHours: log.otHours || "0",
         });
       } catch (err) {
         console.error("Error processing work log:", log, err);
       }
     });

     const otDateMap = await fetchOvertimeData();
     console.log("🎯 Using OT map with", otDateMap.size, "entries");

     // Fetch attendance status for all dates
     console.log("🔍 Fetching attendance status for all dates...");
     const attendanceStatusMap = new Map<string, string>();

     const attendancePromises = dateRange
       .slice(0, 31)
       .map(async ({ dateKey }) => {
         const status = await fetchAttendanceStatusForDate(dateKey);
         attendanceStatusMap.set(dateKey, status);
       });

     await Promise.all(attendancePromises);
     console.log("✅ Attendance status fetched for all dates");

     const completeWorkLog: DailyWorkLog[] = dateRange
       .slice(0, 31)
       .map(({ dateKey, displayDate }) => {
         if (workLogMap.has(dateKey)) {
           const log = workLogMap.get(dateKey)!;

           // Use attendance status from daily-attendance API
           const finalStatus = attendanceStatusMap.get(dateKey) || "Absent";

           let otHoursForDate = log.otHours || "0";
           if (otDateMap.has(dateKey)) {
             const otValue = otDateMap.get(dateKey)!;
             otHoursForDate = otValue.toString();
             console.log(
               `✅ Applied OT for ${dateKey}: ${otHoursForDate}h (was: ${log.otHours})`
             );
           }

           return {
             ...log,
             status: finalStatus,
             otHours: otHoursForDate,
           };
         } else {
           // For days without work log, still check attendance status
           const finalStatus = attendanceStatusMap.get(dateKey) || "Absent";

           return {
             date: displayDate,
             checkIn: "--",
             checkOut: "--",
             hours: "0",
             otHours: "0",
             project: "No Work Assigned",
             status: finalStatus,
             description: "No work logged for this date",
           };
         }
       });

     // ✅ FIXED: Calculate counts using the same logic as employee profile
     // WORKING DAYS: Count days with check-in (regardless of check-out status)
     let actualWorkingDays = 0;

     completeWorkLog.forEach((log) => {
       const hasCheckIn =
         log.checkIn && log.checkIn !== "--" && log.checkIn !== "-";
       if (hasCheckIn) {
         actualWorkingDays++;
         console.log(`✓ ${log.date}: checked in at ${log.checkIn}`);
       } else {
         console.log(`✗ ${log.date}: no check-in (status: ${log.status})`);
       }
     });

     console.log(`${data.employee.name}: ${actualWorkingDays} working days`);

     // Count other statuses
     const actualLeaveCount = completeWorkLog.filter(
       (log) => log.status === "Leave"
     ).length;

     const actualPermissionCount = completeWorkLog.filter(
       (log) => log.status === "Permission"
     ).length;

     // ✅ MISSED DAYS: Only count days where check-in exists but check-out is missing
     const actualMissedDays = completeWorkLog.filter((log) => {
       const hasCheckIn =
         log.checkIn && log.checkIn !== "--" && log.checkIn !== "-";
       const hasCheckOut =
         log.checkOut && log.checkOut !== "--" && log.checkOut !== "-";

       // Get today's date in YYYY-MM-DD format
       const today = new Date();
       const todayStr =
         today.getFullYear() +
         "-" +
         String(today.getMonth() + 1).padStart(2, "0") +
         "-" +
         String(today.getDate()).padStart(2, "0");

       // Get the date key for this log entry
       const dateParts = log.date.split(" ");
       const day = dateParts[dateParts.length - 1];
       const logDateKey = `${selectedYear}-${selectedMonth.padStart(
         2,
         "0"
       )}-${day.padStart(2, "0")}`;

       // Count as missed if: has check-in, no check-out, and it's NOT today
       return hasCheckIn && !hasCheckOut && logDateKey !== todayStr;
     }).length;

     // ✅ Update employee data with corrected counts
     const correctedEmployeeData = {
       ...data.employee,
       totalDays: totalDaysFromSettings,
       workingDays: actualWorkingDays, // ✅ Days with check-in
       leaves: actualLeaveCount,
       permissions: actualPermissionCount,
       missedDays: actualMissedDays, // ✅ Days with check-in but no check-out (excluding today)
     };

     console.log("✅ Final counts:", {
       workingDays: actualWorkingDays,
       leaves: actualLeaveCount,
       permissions: actualPermissionCount,
       missedDays: actualMissedDays,
     });

     setEmployeeData(correctedEmployeeData);
     setEmployeeStatus(correctedEmployeeData.status || "Active");
     setDailyWorkLog(completeWorkLog);
   } catch (err) {
     const errorMessage =
       err instanceof Error ? err.message : "An unexpected error occurred";
     setError(errorMessage);
     console.error("Error fetching employee data:", err);
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
    router.push("/admin/dashboard");
  };

  const handleToggleStatus = async (checked: boolean) => {
    if (!employeeData) return;
    const newStatus = checked ? "Active" : "Inactive";
    const prevStatus = employeeStatus;
    try {
      setSavingStatus(true);
      // Optimistic update
      setEmployeeStatus(newStatus);

      const res = await fetch(`/api/employees/${employeeData.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update status: ${res.status}`);
      }
    } catch (e) {
      // Rollback on error
      setEmployeeStatus(prevStatus);
      console.error(e);
      alert("Failed to update status. Please try again.");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleExportPDF = () => {
    if (!employeeData || !dailyWorkLog.length) return;

    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(`Employee Work Log Report`, 14, 15);
      doc.setFontSize(12);
      doc.text(`Name: ${employeeData.name}`, 14, 25);
      doc.text(`Designation: ${employeeData.designation}`, 14, 32);
      doc.text(`Month: ${getMonthName(selectedMonth)} ${selectedYear}`, 14, 39);
      doc.text(
        `Total Hours (Including OT): ${totalCalculatedHours.toFixed(1)}`,
        14,
        46
      );
      doc.text(`Total OT Hours: ${overtimeHours.toFixed(1)}`, 14, 53);

      const chunkSize = 20;
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
            log.project.substring(0, 30) +
              (log.project.length > 30 ? "..." : ""),
            log.status,
            log.description.substring(0, 40) +
              (log.description.length > 40 ? "..." : ""),
          ];
        });
        chunks.push(...chunk);
      }

      const tableColumn = [
        "Date",
        "Check-in",
        "Check-out",
        "Hours",
        "OT Hours",
        "Total Hours",
        "Project",
        "Status",
        "Description",
      ];

      autoTable(doc, {
        startY: 60,
        head: [tableColumn],
        body: chunks,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 152, 219] },
        pageBreak: "auto",
        rowPageBreak: "avoid",
      });

      doc.save(
        `${employeeData.name}-worklog-${selectedMonth}-${selectedYear}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try with a smaller date range.");
    }
  };

  const handleExportExcel = () => {
    if (!employeeData || !dailyWorkLog.length) return;

    try {
      const sanitizeDate = (dateStr: string) => {
        const parts = dateStr.split(" ");
        return parts.length > 1 ? parts[1] : dateStr;
      };

      const escapeCsvValue = (value: string) => {
        const truncated = (value || "").substring(0, 100);
        return `"${truncated.replace(/"/g, '""')}"`;
      };

      const csvContent = [
        ["Employee:", employeeData.name],
        ["Month:", `${getMonthName(selectedMonth)} ${selectedYear}`],
        ["Total Hours (Including OT):", totalCalculatedHours.toFixed(1)],
        ["Total OT Hours:", overtimeHours.toFixed(1)],
        [""],
        [
          "Date",
          "Check-in",
          "Check-out",
          "Hours",
          "OT Hours",
          "Total Hours",
          "Project/Task",
          "Status",
          "Description",
        ],
        ...dailyWorkLog.slice(0, 50).map((log) => {
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
            escapeCsvValue(log.description),
          ];
        }),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${employeeData.name}-worklog-${selectedMonth}-${selectedYear}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating Excel file:", error);
      alert(
        "Error generating Excel file. Please try with a smaller date range."
      );
    }
  };

  const getMonthName = (month: string) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(month) - 1] || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading employee data...</p>
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
            <p className="text-red-600 mb-4">{error || "Employee not found"}</p>
            <Button onClick={handleNavigate}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
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
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {employeeData.name}
                      </h1>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-gray-600">
                          {employeeData.designation}
                        </span>
                        <Badge
                          className={getWorkModeBadge(employeeData.workMode)}
                        >
                          {employeeData.workMode}
                        </Badge>
                        <Badge
                          className={getEmployeeStatusBadge(
                            employeeStatus
                          )}
                        >
                          {employeeStatus}
                        </Badge>
                        <div className="flex items-center gap-2 ml-4">
                          <Label htmlFor="status-toggle" className="text-sm text-gray-600">
                            {savingStatus ? "Saving..." : "Active"}
                          </Label>
                          <Switch
                            id="status-toggle"
                            checked={employeeStatus === "Active"}
                            onCheckedChange={handleToggleStatus}
                            disabled={savingStatus}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Selected Month</div>
                    <div className="text-lg font-semibold">
                      {getMonthName(selectedMonth)} {selectedYear}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Card className="bg-blue-500 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">{monthlyTotalDays}</div>
                    <div className="text-sm opacity-90">Total Days</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-500 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">
                      {employeeData.workingDays}
                    </div>
                    <div className="text-sm opacity-90">Working Days</div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-500 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">
                      {employeeData.missedDays}
                    </div>
                    <div className="text-sm opacity-90">Missed Days</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">
                      {employeeData.leaves}
                    </div>
                    <div className="text-sm opacity-90">Leaves</div>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-500 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">
                      {overtimeHours.toFixed(1)}
                    </div>
                    <div className="text-sm opacity-90">OT Hours</div>
                  </CardContent>
                </Card>
                <Card className="bg-indigo-500 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">
                      {totalCalculatedHours.toFixed(1)}
                    </div>
                    <div className="text-sm opacity-90">Total Hours</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <CardTitle>
                        Daily Work Log - {getMonthName(selectedMonth)}{" "}
                        {selectedYear}
                      </CardTitle>
                      <Badge variant="outline" className="ml-2">
                        {dailyWorkLog.length} days shown
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                      >
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
                          <TableHead className="w-[100px] text-center">
                            Check-in
                          </TableHead>
                          <TableHead className="w-[100px] text-center">
                            Check-out
                          </TableHead>
                          <TableHead className="w-[80px] text-center">
                            Hours
                          </TableHead>
                          <TableHead className="w-[80px] text-center">
                            OT Hours
                          </TableHead>
                          <TableHead className="w-[90px] text-center">
                            Total Hours
                          </TableHead>
                          <TableHead className="w-[200px]">
                            Project/Task
                          </TableHead>
                          <TableHead className="w-[100px] text-center">
                            Status
                          </TableHead>
                          <TableHead>Work Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyWorkLog.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={9}
                              className="text-center py-8 text-gray-500"
                            >
                              No work log entries found for this month
                            </TableCell>
                          </TableRow>
                        ) : (
                          dailyWorkLog.slice(0, 31).map((log, index) => {
                            const regularHours = parseFloat(log.hours) || 0;
                            const otHours = parseFloat(log.otHours || "0") || 0;
                            const totalHours = regularHours + otHours;

                            return (
                              <TableRow
                                key={index}
                                className="hover:bg-gray-50"
                              >
                                <TableCell className="font-medium">
                                  {log.date}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center">
                                    {log.checkIn !== "--" &&
                                      log.checkIn !== "-" && (
                                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                      )}
                                    <span
                                      className={
                                        log.checkIn !== "--" &&
                                        log.checkIn !== "-"
                                          ? "text-green-600"
                                          : "text-gray-400"
                                      }
                                    >
                                      {log.checkIn}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center">
                                    {log.checkOut !== "--" &&
                                      log.checkOut !== "-" && (
                                        <XCircle className="w-4 h-4 text-red-500 mr-1" />
                                      )}
                                    <span
                                      className={
                                        log.checkOut !== "--" &&
                                        log.checkOut !== "-"
                                          ? "text-red-600"
                                          : "text-gray-400"
                                      }
                                    >
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
                                    {log.project.length > 30
                                      ? log.project.substring(0, 30) + "..."
                                      : log.project}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={getStatusBadge(log.status)}>
                                    {log.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {log.description.length > 50
                                    ? log.description.substring(0, 50) + "..."
                                    : log.description}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">
                        Monthly Summary:
                      </span>
                      <div className="flex space-x-6">
                        <span className="text-sm text-gray-600">
                          Regular Hours:{" "}
                          <span className="font-medium text-green-600">
                            {dailyWorkLog
                              .reduce(
                                (sum, log) =>
                                  sum + (parseFloat(log.hours) || 0),
                                0
                              )
                              .toFixed(1)}
                          </span>
                        </span>
                        <span className="text-sm text-gray-600">
                          OT Hours:{" "}
                          <span className="font-medium text-yellow-600">
                            {dailyWorkLog
                              .reduce(
                                (sum, log) =>
                                  sum + (parseFloat(log.otHours || "0") || 0),
                                0
                              )
                              .toFixed(1)}
                          </span>
                        </span>
                        <span className="text-sm text-gray-600">
                          Total Hours:{" "}
                          <span className="font-medium text-indigo-600">
                            {totalCalculatedHours.toFixed(1)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={handleNavigate}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleExportExcel}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
