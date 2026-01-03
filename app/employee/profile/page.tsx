"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect, useMemo, useCallback } from "react";
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
  User,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface LoggedInUser {
  id: string;
  email: string;
  userType: string;
  fullName?: string;
  department?: string;
}

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

// Function to get logged-in user details
const getLoggedInUser = (): LoggedInUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const userData = localStorage.getItem("user");
    if (userData) {
      return JSON.parse(userData) as LoggedInUser;
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }
  return null;
};

// Function to get employee ID from logged-in user's email using direct Supabase query
const getEmployeeIdFromEmail = async (
  email: string
): Promise<string | null> => {
  try {
    console.log("Fetching employee data for email:", email);

    const { data, error } = await supabase
      .from("employees")
      .select("employee_id, id")
      .eq("email_address", email)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching employee by email:", error);
      return null;
    }

    if (data) {
      console.log("Found employee data:", data);
      return data.employee_id || data.id;
    }

    return null;
  } catch (error) {
    console.error("Error in getEmployeeIdFromEmail:", error);
    return null;
  }
};

// Function to calculate experience from date of joining to current date
const calculateExperience = (dateOfJoining: string): string => {
  if (!dateOfJoining) return "N/A";

  try {
    const joiningDate = new Date(dateOfJoining);
    const currentDate = new Date();

    // Check if joining date is valid
    if (isNaN(joiningDate.getTime())) {
      return "Invalid Date";
    }

    // Calculate difference
    let years = currentDate.getFullYear() - joiningDate.getFullYear();
    let months = currentDate.getMonth() - joiningDate.getMonth();
    let days = currentDate.getDate() - joiningDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        0
      );
      days += lastMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    // Format the experience string
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years > 1 ? "s" : ""}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months > 1 ? "s" : ""}`);
    }
    if (days > 0 && years === 0) {
      // Show days only if less than a year
      parts.push(`${days} day${days > 1 ? "s" : ""}`);
    }

    return parts.length > 0 ? parts.join(", ") : "Just joined";
  } catch (error) {
    console.error("Error calculating experience:", error);
    return "Error calculating";
  }
};

// Function to get experience badge color based on duration
const getExperienceBadgeColor = (experience: string): string => {
  if (
    experience === "N/A" ||
    experience === "Invalid Date" ||
    experience === "Error calculating"
  ) {
    return "bg-gray-100 text-gray-800";
  }

  const yearMatch = experience.match(/(\d+) year/);
  const years = yearMatch ? parseInt(yearMatch[1]) : 0;

  if (years >= 5) return "bg-purple-100 text-purple-800"; // Senior
  if (years >= 2) return "bg-blue-100 text-blue-800"; // Experienced
  if (years >= 1) return "bg-green-100 text-green-800"; // Junior
  return "bg-yellow-100 text-yellow-800"; // Fresher
};

const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Present: "bg-green-100 text-green-800",
    Leave: "bg-blue-100 text-blue-800",
    Permission: "bg-yellow-100 text-yellow-800",
    Absent: "bg-red-100 text-red-800",
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
    Warning: "bg-yellow-100 text-yellow-800",
    "On Leave": "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function EmployeeProfile() {
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

    // Limit to maximum 31 days to prevent memory issues
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
        break; // Stop if date creation fails
      }
    }
    return dates;
  };

  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [dailyWorkLog, setDailyWorkLog] = useState<DailyWorkLog[]>([]);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [totalMonthDays, setTotalMonthDays] = useState<number>(28); // NEW: State for total days from API
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Calculate experience whenever employee data changes
  const calculatedExperience = useMemo(() => {
    if (!employeeData?.dateOfJoining) return "N/A";
    return calculateExperience(employeeData.dateOfJoining);
  }, [employeeData?.dateOfJoining]);

  // Initialize user data and employee ID
  useEffect(() => {
    const initializeUserData = async () => {
      const user = getLoggedInUser();

      if (!user) {
        console.error("No logged-in user found");
        setError("User not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      setLoggedInUser(user);

      console.log("Logged-in user:", user);

      // Get employee ID from user's email using direct Supabase query
      const empId = await getEmployeeIdFromEmail(user.email);

      if (empId) {
        console.log("Found employee ID:", empId);
        setEmployeeId(empId);
      } else {
        console.error("No employee found for email:", user.email);
        setError(
          `No employee profile found for email: ${user.email}. Please contact your administrator.`
        );
        setLoading(false);
        return;
      }
    };

    initializeUserData();
  }, []);

  // NEW: Fetch total days from monthly settings API whenever month/year changes
  useEffect(() => {
    const fetchMonthlySettings = async () => {
      try {
        console.log("📅 Fetching monthly settings for:", {
          selectedMonth,
          selectedYear,
        });

        const response = await fetch(
          `/api/monthly-settings?month=${selectedMonth}&year=${selectedYear}`
        );

        if (response.ok) {
          const data = await response.json();
          const fetchedTotalDays = data.totalDays || 28;
          console.log("✅ Monthly settings fetched:", data);
          console.log("📊 Total days for month:", fetchedTotalDays);
          setTotalMonthDays(fetchedTotalDays);
        } else {
          console.warn(
            "⚠️ Failed to fetch monthly settings, using default 28 days"
          );
          setTotalMonthDays(28);
        }
      } catch (err) {
        console.error("❌ Error fetching monthly settings:", err);
        setTotalMonthDays(28); // Fallback to default
      }
    };

    if (selectedMonth && selectedYear) {
      fetchMonthlySettings();
    }
  }, [selectedMonth, selectedYear]);

  // Memoize total calculated hours to prevent unnecessary recalculations
  const totalCalculatedHours = useMemo(() => {
    return dailyWorkLog.reduce((total, log) => {
      const regularHours = parseFloat(log.hours) || 0;
      const otHours = parseFloat(log.otHours || "0") || 0;
      return total + regularHours + otHours;
    }, 0);
  }, [dailyWorkLog]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const totalWorkDays = dailyWorkLog.filter(
      (log) => log.status === "Present" || log.status === "Permission"
    ).length;

    const averageHours =
      totalWorkDays > 0 ? totalCalculatedHours / totalWorkDays : 0;
    const attendanceRate = employeeData
      ? (employeeData.workingDays / employeeData.totalDays) * 100
      : 0;

    return {
      averageHoursPerDay: averageHours,
      attendanceRate: attendanceRate,
      productiveDays: totalWorkDays,
    };
  }, [dailyWorkLog, employeeData, totalCalculatedHours]);
// FIXED EMPLOYEE DATA FETCHING - Shows Missed Days instead of Permissions
const fetchEmployeeData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    if (!loggedInUser?.email) {
      throw new Error("No logged-in user email found");
    }

    console.log("Fetching employee data for email:", loggedInUser.email);

    // First, get the employee data directly from Supabase
    const { data: employeeRecord, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("email_address", loggedInUser.email)
      .eq("is_active", true)
      .single();

    if (empError || !employeeRecord) {
      console.error("Error fetching employee from Supabase:", empError);
      throw new Error(
        `Employee profile not found for email: ${loggedInUser.email}`
      );
    }

    console.log("Found employee record:", employeeRecord);

    // Map the employee data
    const mappedEmployeeData: EmployeeData = {
      id: employeeRecord.id,
      name: employeeRecord.name,
      designation: employeeRecord.designation,
      workMode: employeeRecord.work_mode,
      status: employeeRecord.status,
      totalDays: totalMonthDays,
      workingDays: 0,
      permissions: 0, // Will be calculated from daily attendance
      leaves: 0,
      missedDays: 0,
      phoneNumber: employeeRecord.phone_number,
      emailAddress: employeeRecord.email_address,
      address: employeeRecord.address,
      dateOfJoining: employeeRecord.date_of_joining,
      experience: employeeRecord.experience,
    };

    const actualEmployeeId = employeeRecord.employee_id || employeeRecord.id;
    console.log("Using employee ID for work log:", actualEmployeeId);

    // Fetch daily work log
    let dailyWorkLogData: DailyWorkLog[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `/api/employees/${actualEmployeeId}?month=${selectedMonth}&year=${selectedYear}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const apiData: ApiResponse = await response.json();
        dailyWorkLogData = apiData.dailyWorkLog || [];
      } else {
        console.warn("API call failed, using empty work log");
      }
    } catch (apiError) {
      console.warn("API not available, using empty work log:", apiError);
    }

    // Generate date range
    const dateRange = generateDateRange(selectedMonth, selectedYear);
    if (dateRange.length === 0) {
      throw new Error("Invalid date range generated");
    }

    const maxLogs = Math.min(dailyWorkLogData.length, 100);
    const limitedWorkLogs = dailyWorkLogData.slice(0, maxLogs);

    // Create work log map
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

    // Create complete work log
    const completeWorkLog: DailyWorkLog[] = dateRange
      .slice(0, 31)
      .map(({ dateKey, displayDate }) => {
        if (workLogMap.has(dateKey)) {
          const log = workLogMap.get(dateKey)!;
          const today = new Date();
          const todayStr =
            today.getFullYear() +
            "-" +
            String(today.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(today.getDate()).padStart(2, "0");

          let finalStatus: string = "Absent";

          if (
            log.checkIn &&
            log.checkIn !== "--" &&
            log.checkIn !== "-" &&
            log.checkOut &&
            log.checkOut !== "--" &&
            log.checkOut !== "-"
          ) {
            finalStatus = "Present";
          } else if (
            log.checkIn &&
            log.checkIn !== "--" &&
            log.checkIn !== "-" &&
            (!log.checkOut || log.checkOut === "--" || log.checkOut === "-")
          ) {
            if (dateKey === todayStr) {
              finalStatus = "Present";
            } else {
              finalStatus = "Absent";
            }
          } else if (log.status === "Leave" || log.status === "Permission") {
            finalStatus = log.status;
          } else {
            finalStatus = "Absent";
          }

          return {
            ...log,
            status: finalStatus,
          };
        } else {
          return {
            date: displayDate,
            checkIn: "--",
            checkOut: "--",
            hours: "0",
            otHours: "0",
            project: "No Work Assigned",
            status: "Absent",
            description: "No work logged for this date",
          };
        }
      });

    // Fetch daily attendance statuses
    const dateKeys = dateRange.slice(0, 31).map((d) => d.dateKey);
    const statusByDate = new Map<string, string>();

    try {
      const statusFetches = dateKeys.map(async (dateKey) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const resp = await fetch(`/api/daily-attendance?date=${dateKey}`, {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!resp.ok) return;

          const json = await resp.json();
          const employeesForDate = json.employees || [];

          const matched = employeesForDate.find(
            (e: any) => String(e.id) === String(actualEmployeeId)
          );

          if (matched && matched.attendanceStatus) {
            statusByDate.set(dateKey, matched.attendanceStatus);
          }
        } catch (e) {
          console.warn("daily-attendance fetch failed for", dateKey, e);
        }
      });

      await Promise.allSettled(statusFetches);
    } catch (e) {
      console.warn("Failed to fetch daily-attendance statuses:", e);
    }

    // Merge API statuses
    const mergedWorkLog = completeWorkLog.map((logObj, idx) => {
      const dateKey = dateKeys[idx];
      const apiStatus = statusByDate.get(dateKey);

      if (apiStatus) {
        return {
          ...logObj,
          status: apiStatus,
        };
      }
      return logObj;
    });

    // ✅ FIXED: Calculate counts correctly
    // WORKING DAYS: Count days with check-in (regardless of check-out status)
    const actualWorkingDays = mergedWorkLog.filter((log) => {
      const hasCheckIn = log.checkIn && log.checkIn !== "--" && log.checkIn !== "-";
      return hasCheckIn;
    }).length;

    const actualLeaveCount = mergedWorkLog.filter(
      (log) => log.status === "Leave"
    ).length;

    const actualPermissionCount = mergedWorkLog.filter(
      (log) => log.status === "Permission"
    ).length;

    // ✅ MISSED DAYS: Only count days where check-in exists but check-out is missing
    const actualMissedDays = mergedWorkLog.filter((log) => {
      const hasCheckIn = log.checkIn && log.checkIn !== "--" && log.checkIn !== "-";
      const hasCheckOut = log.checkOut && log.checkOut !== "--" && log.checkOut !== "-";
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.getFullYear() + "-" + 
                       String(today.getMonth() + 1).padStart(2, "0") + "-" + 
                       String(today.getDate()).padStart(2, "0");
      
      // Get the date key for this log entry
      const dateParts = log.date.split(" ");
      const day = dateParts[dateParts.length - 1];
      const logDateKey = `${selectedYear}-${selectedMonth.padStart(2, "0")}-${day.padStart(2, "0")}`;
      
      // Count as missed if: has check-in, no check-out, and it's NOT today
      return hasCheckIn && !hasCheckOut && logDateKey !== todayStr;
    }).length;

    // Update employee data with correct counts
    const correctedEmployeeData = {
      ...mappedEmployeeData,
      totalDays: totalMonthDays,
      workingDays: actualWorkingDays,
      leaves: actualLeaveCount,
      permissions: actualPermissionCount,
      missedDays: actualMissedDays, // ✅ Only days with check-in but no check-out
    };

    console.log("Final employee data:", correctedEmployeeData);

    setEmployeeData(correctedEmployeeData);
    setDailyWorkLog(mergedWorkLog);

    // Fetch overtime and leave count
    const fetchOvertimeDataLocal = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        console.error("Error fetching overtime data:", err);
        setOvertimeHours(0);
      }
    };

    await fetchOvertimeDataLocal();

  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred";
    setError(errorMessage);
    console.error("Error fetching employee data:", err);
  } finally {
    setLoading(false);
  }
}, [
  loggedInUser?.email,
  employeeId,
  selectedMonth,
  selectedYear,
  totalMonthDays,
]);

  // Trigger data fetch when we have the employeeId and month/year available
  useEffect(() => {
    if (employeeId && selectedMonth && selectedYear && totalMonthDays) {
      fetchEmployeeData();
    }
  }, [
    employeeId,
    selectedMonth,
    selectedYear,
    totalMonthDays,
    fetchEmployeeData,
  ]);

  const handleNavigate = () => {
    router.push("/employee/dashboard");
  };

  // Optimized PDF export with chunking
  const handleExportPDF = () => {
    if (!employeeData || !dailyWorkLog.length) return;

    try {
      const doc = new jsPDF();

      // Title with logged-in user info
      doc.setFontSize(16);
      doc.text(`My Work Log Report`, 14, 15);
      doc.setFontSize(12);
      doc.text(`Name: ${employeeData.name}`, 14, 25);
      doc.text(`Email: ${loggedInUser?.email || "N/A"}`, 14, 32);
      doc.text(`Designation: ${employeeData.designation}`, 14, 39);
      doc.text(`Experience: ${calculatedExperience}`, 14, 46);
      doc.text(`Month: ${getMonthName(selectedMonth)} ${selectedYear}`, 14, 53);
      doc.text(
        `Total Hours (Including OT): ${totalCalculatedHours.toFixed(1)}`,
        14,
        60
      );

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
            log.project.substring(0, 30) +
              (log.project.length > 30 ? "..." : ""), // Truncate long text
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
        startY: 66,
        head: [tableColumn],
        body: chunks,
        styles: { fontSize: 8 }, // Smaller font to fit more content
        headStyles: { fillColor: [52, 152, 219] },
        pageBreak: "auto",
        rowPageBreak: "avoid",
      });

      doc.save(`my-worklog-${selectedMonth}-${selectedYear}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try with a smaller date range.");
    }
  };

  // Optimized Excel export
  const handleExportExcel = () => {
    if (!employeeData || !dailyWorkLog.length) return;

    try {
      const sanitizeDate = (dateStr: string) => {
        const parts = dateStr.split(" ");
        return parts.length > 1 ? parts[1] : dateStr;
      };

      const escapeCsvValue = (value: string) => {
        const truncated = (value || "").substring(0, 100); // Limit cell content length
        return `"${truncated.replace(/"/g, '""')}"`;
      };

      const csvContent = [
        ["Employee:", employeeData.name],
        ["Email:", loggedInUser?.email || "N/A"],
        ["Experience:", calculatedExperience],
        ["Month:", `${getMonthName(selectedMonth)} ${selectedYear}`],
        ["Total Hours (Including OT):", totalCalculatedHours.toFixed(1)],
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
          // Limit to 50 rows to prevent memory issues
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
      a.download = `my-worklog-${selectedMonth}-${selectedYear}.csv`;
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
        <Sidebar userType="employee" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading your profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employeeData) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="employee" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">
                {error || "Profile not found"}
              </p>
              {error?.includes("email:") && (
                <p className="text-sm text-red-500 mt-2">
                  Please ensure your email address matches the one in the
                  employee database.
                </p>
              )}
            </div>
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button onClick={handleNavigate} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["employee"]}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="employee" />
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  My Profile & Attendance
                </h1>
                {loggedInUser && (
                  <p className="text-sm text-gray-600 mt-1">
                    Logged in as: {loggedInUser.fullName || loggedInUser.email}{" "}
                    ({loggedInUser.userType})
                    {loggedInUser.department && ` - ${loggedInUser.department}`}
                  </p>
                )}
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
              {/* Employee Profile Header */}
              <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold">
                          {employeeData.name}
                        </h1>
                        <p className="text-lg opacity-90">
                          {employeeData.designation}
                        </p>
                        {loggedInUser?.email && (
                          <p className="text-sm opacity-75 mt-1">
                            {loggedInUser.email}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge className="bg-white bg-opacity-20 text-white border-white border-opacity-30">
                            {employeeData.workMode} Mode
                          </Badge>
                          <Badge className="bg-white bg-opacity-20 text-white border-white border-opacity-30">
                            {employeeData.status}
                          </Badge>
                          <Badge
                            className={`${getExperienceBadgeColor(
                              calculatedExperience
                            )} border-white border-opacity-30`}
                          >
                            Experience: {calculatedExperience}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-80">Selected Month</div>
                      <div className="text-xl font-semibold">
                        {getMonthName(selectedMonth)} {selectedYear}
                      </div>
                      {loggedInUser && (
                        <div className="text-sm opacity-70 mt-2">
                          User Type: {loggedInUser.userType}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Information */}
              {(employeeData.phoneNumber ||
                employeeData.emailAddress ||
                employeeData.address ||
                employeeData.dateOfJoining) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(employeeData.emailAddress || loggedInUser?.email) && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Email:</span>
                          <span className="text-sm font-medium">
                            {employeeData.emailAddress || loggedInUser?.email}
                          </span>
                        </div>
                      )}
                      {employeeData.phoneNumber && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Phone:</span>
                          <span className="text-sm font-medium">
                            {employeeData.phoneNumber}
                          </span>
                        </div>
                      )}
                      {employeeData.dateOfJoining && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Joined:</span>
                          <span className="text-sm font-medium">
                            {employeeData.dateOfJoining}
                          </span>
                        </div>
                      )}
                      {employeeData.dateOfJoining && (
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Experience:
                          </span>
                          <span className="text-sm font-medium text-blue-600">
                            {calculatedExperience}
                          </span>
                        </div>
                      )}
                    </div>
                    {employeeData.address && (
                      <div className="mt-4 flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <span className="text-sm text-gray-600">
                            Address:
                          </span>
                          <p className="text-sm font-medium mt-1">
                            {employeeData.address}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Card className="bg-blue-500 text-white">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold">
                      {employeeData.totalDays}
                    </div>
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
                <Card className="bg-red-500 text-white">
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
                    <div className="text-3xl font-bold">{overtimeHours}</div>
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

              {/* Daily Work Log */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <CardTitle>
                        My Work Log - {getMonthName(selectedMonth)}{" "}
                        {selectedYear}
                      </CardTitle>
                      <Badge variant="outline" className="ml-2">
                        {dailyWorkLog.length} days shown
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleExportPDF}
                        size="sm"
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>PDF</span>
                      </Button>
                      <Button
                        onClick={handleExportExcel}
                        size="sm"
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Excel</span>
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
                            // Limit display to 31 rows
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
                                <TableCell className="text-gray-600 max-w-md break-words">
                                  {log.description}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Total Hours Summary */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">
                        My Monthly Summary:
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
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
