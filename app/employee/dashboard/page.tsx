"use client";

import { useState, useEffect, useMemo, memo, useCallback } from "react";
import {
  LogIn,
  CircleCheckBig,
  LogOut,
  Clock,
  Calendar,
  CheckCircle,
  Timer,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import ProtectedRoute from "@/components/ProtectedRoute";

interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

interface DailyState {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  workType: string;
  workDescription: string;
  isWorkSubmitted: boolean;
  date: string;
}

// Parse timestamp from database (already in UTC, convert to IST Date object)
const parseDBTimestamp = (timestamp: string | null): Date | null => {
  if (!timestamp) return null;

  try {
    // Database stores timestamptz which comes as ISO string
    const date = new Date(timestamp);

    // Verify it's a valid date
    if (isNaN(date.getTime())) {
      console.error("Invalid date from database:", timestamp);
      return null;
    }

    return date;
  } catch (error) {
    console.error("Error parsing timestamp:", timestamp, error);
    return null;
  }
};

// Format date to IST time string for display
const formatISTTime = (date: Date | null) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "Not Available";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

// Get current IST date string (YYYY-MM-DD)
const getISTDate = () => {
  const now = new Date();
  const istDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const day = String(istDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Fetch IST time from server
const getServerISTTime = async (): Promise<Date> => {
  try {
    const response = await fetch("/api/server-time");
    if (!response.ok) throw new Error("Failed to fetch server time");

    const data = await response.json();
    // data.time format: "YYYY-MM-DD HH:mm:ss"
    const [datePart, timePart] = data.time.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, second);
  } catch (error) {
    console.error("Error fetching server time:", error);
    // Fallback to client calculation
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  }
};

// Memoized components
const MemoizedSidebar = memo(() => <Sidebar userType="employee" />);
const MemoizedHeader = memo(({ displayName }: { displayName: string }) => (
  <Header
    title="Employee Portal"
    subtitle={`Welcome back, ${displayName}`}
    userType="employee"
    userId={displayName}
  />
));

export default function EmployeeDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [showCheckInNotification, setShowCheckInNotification] = useState(false);
  const [workType, setWorkType] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [isWorkSubmitted, setIsWorkSubmitted] = useState(false);
  const [showWorkSubmissionNotification, setShowWorkSubmissionNotification] =
    useState(false);
  const [isSubmittingWorkLog, setIsSubmittingWorkLog] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const displayName = useMemo(() => {
    return employeeData?.name || user?.email?.split("@")[0] || "Employee";
  }, [employeeData?.name, user?.email]);

  const employeeId = useMemo(() => {
    return employeeData?.employee_id || "SD418";
  }, [employeeData?.employee_id]);

  const overtimeHours = useMemo(() => {
    if (checkInTime && checkOutTime) {
      const totalHours =
        (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return totalHours > 8 ? totalHours - 8 : 0;
    }
    return 0;
  }, [checkInTime, checkOutTime]);

  const getTodayDate = useCallback(() => {
    return getISTDate();
  }, []);

  const getStorageKey = useCallback(
    (empId: string) => {
      return `employee_daily_state_${empId}_${getTodayDate()}`;
    },
    [getTodayDate]
  );

  const saveStateToStorage = useCallback(
    (empId: string, state: DailyState) => {
      try {
        const storageData = {
          ...state,
          // Store as ISO strings for consistency
          checkInTime: state.checkInTime,
          checkOutTime: state.checkOutTime,
        };
        sessionStorage.setItem(
          getStorageKey(empId),
          JSON.stringify(storageData)
        );
      } catch (error) {
        console.error("Error saving state:", error);
      }
    },
    [getStorageKey]
  );

  const loadStateFromStorage = useCallback(
    (empId: string): DailyState | null => {
      try {
        const data = sessionStorage.getItem(getStorageKey(empId));
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error("Error loading state:", error);
        return null;
      }
    },
    [getStorageKey]
  );

  const cleanupOldStates = useCallback((empId: string) => {
    try {
      const today = new Date();
      for (let i = 1; i <= 30; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        const year = pastDate.getFullYear();
        const month = String(pastDate.getMonth() + 1).padStart(2, "0");
        const day = String(pastDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const key = `employee_daily_state_${empId}_${dateStr}`;
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Error cleaning up old states:", error);
    }
  }, []);

  const fetchTodayCheckInStatus = useCallback(async (empId: string) => {
    try {
      const today = getISTDate();
      const res = await fetch(`/api/employees/${empId}/worklog?date=${today}`);
      if (!res.ok) return null;
      return res.json();
    } catch (error) {
      console.error("Error fetching check-in status:", error);
      return null;
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        const userData = sessionStorage.getItem("user");
        if (userData && isMounted) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          try {
            const response = await fetch(
              `/api/employees/profile?email=${parsedUser.email}`
            );
            if (response.ok && isMounted) {
              const employeeInfo = await response.json();
              setEmployeeData(employeeInfo);
            }
          } catch (apiError) {
            console.error("API call failed:", apiError);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync check-in status
  useEffect(() => {
    let isMounted = true;

    const syncCheckInStatus = async () => {
      if (!employeeData?.employee_id && !user?.email) return;

      const empId = employeeData?.employee_id || user?.email || "fallback";
      cleanupOldStates(empId);

      try {
        const savedState = loadStateFromStorage(empId);
        const dbStatus = await fetchTodayCheckInStatus(empId);

        if (!isMounted) return;

        if (dbStatus && dbStatus.check_in) {
          // Parse timestamps from database
          const checkInDate = parseDBTimestamp(dbStatus.check_in);
          const checkOutDate = parseDBTimestamp(dbStatus.check_out);

          console.log("Loaded from DB:", {
            checkIn: checkInDate,
            checkOut: checkOutDate,
            raw: { checkIn: dbStatus.check_in, checkOut: dbStatus.check_out },
          });

          setIsCheckedIn(true);
          setCheckInTime(checkInDate);
          setIsCheckedOut(!!dbStatus.check_out);
          setCheckOutTime(checkOutDate);
          setWorkType(dbStatus.project || savedState?.workType || "");
          setWorkDescription(
            dbStatus.check_out
              ? dbStatus.description || ""
              : savedState?.workDescription || dbStatus.description || ""
          );
          setIsWorkSubmitted(
            !!dbStatus.check_out || savedState?.isWorkSubmitted || false
          );

          const syncedState: DailyState = {
            isCheckedIn: true,
            isCheckedOut: !!dbStatus.check_out,
            checkInTime: checkInDate?.toISOString() || null,
            checkOutTime: checkOutDate?.toISOString() || null,
            workType: dbStatus.project || savedState?.workType || "",
            workDescription: dbStatus.check_out
              ? dbStatus.description || ""
              : savedState?.workDescription || dbStatus.description || "",
            isWorkSubmitted:
              !!dbStatus.check_out || savedState?.isWorkSubmitted || false,
            date: dbStatus.date,
          };
          saveStateToStorage(empId, syncedState);
        } else if (savedState) {
          // Load from session storage
          const checkInDate = savedState.checkInTime
            ? new Date(savedState.checkInTime)
            : null;
          const checkOutDate = savedState.checkOutTime
            ? new Date(savedState.checkOutTime)
            : null;

          setIsCheckedIn(savedState.isCheckedIn);
          setCheckInTime(checkInDate);
          setIsCheckedOut(savedState.isCheckedOut);
          setCheckOutTime(checkOutDate);
          setWorkType(savedState.workType);
          setWorkDescription(savedState.workDescription);
          setIsWorkSubmitted(savedState.isWorkSubmitted);
        } else {
          // Reset state
          setIsCheckedIn(false);
          setCheckInTime(null);
          setIsCheckedOut(false);
          setCheckOutTime(null);
          setWorkType("");
          setWorkDescription("");
          setIsWorkSubmitted(false);
        }
      } catch (error) {
        console.error("Error syncing check-in status:", error);
      }
    };

    syncCheckInStatus();

    return () => {
      isMounted = false;
    };
  }, [
    employeeData?.employee_id,
    user?.email,
    cleanupOldStates,
    loadStateFromStorage,
    fetchTodayCheckInStatus,
    saveStateToStorage,
  ]);

  // Save state to storage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (employeeData?.employee_id || user?.email) {
        const empId = employeeData?.employee_id || user?.email || "fallback";

        const currentState: DailyState = {
          isCheckedIn,
          isCheckedOut,
          checkInTime: checkInTime?.toISOString() || null,
          checkOutTime: checkOutTime?.toISOString() || null,
          workType,
          workDescription,
          isWorkSubmitted,
          date: getTodayDate(),
        };

        saveStateToStorage(empId, currentState);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    isCheckedIn,
    isCheckedOut,
    checkInTime,
    checkOutTime,
    workType,
    workDescription,
    isWorkSubmitted,
    employeeData?.employee_id,
    user?.email,
    saveStateToStorage,
    getTodayDate,
  ]);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Notification timers
  useEffect(() => {
    if (showCheckInNotification) {
      const timer = setTimeout(() => {
        setShowCheckInNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showCheckInNotification]);

  useEffect(() => {
    if (showWorkSubmissionNotification) {
      const timer = setTimeout(() => {
        setShowWorkSubmissionNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showWorkSubmissionNotification]);

  const handleCheckIn = async () => {
    if (isCheckedIn) return;

    const checkInMoment = await getServerISTTime();
    setIsCheckedIn(true);
    setCheckInTime(checkInMoment);
    setShowCheckInNotification(true);

    try {
      const response = await fetch(`/api/employees/${employeeId}/worklog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInTime: checkInMoment.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Check-in failed:", data);
        setIsCheckedIn(false);
        setCheckInTime(null);
      }
    } catch (error) {
      console.error("Check-in error:", error);
      setIsCheckedIn(false);
      setCheckInTime(null);
    }
  };

  const handleSubmitWork = () => {
    if (workType && workDescription) {
      setIsWorkSubmitted(true);
      setShowWorkSubmissionNotification(true);
    }
  };

  const handleCheckOut = async () => {
    const checkOutMoment = await getServerISTTime();
    setCheckOutTime(checkOutMoment);
    setIsSubmittingWorkLog(true);

    try {
      const workLogResponse = await fetch(
        `/api/employees/${employeeId}/worklog`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkInTime: checkInTime?.toISOString(),
            checkOutTime: checkOutMoment.toISOString(),
            workType: workType,
            workDescription: workDescription,
          }),
        }
      );

      if (!workLogResponse.ok) {
        const errorText = await workLogResponse.text();
        console.error("Work Log API Error Response:", errorText);
        throw new Error("Failed to save work log");
      }

      const submissionPayload = {
        employeeId: employeeId,
        employeeName: displayName,
        workType: workType,
        workDescription: workDescription,
        department: "General",
        priority: "Medium",
        submittedDate: checkOutMoment.toISOString(),
      };

      const submissionResponse = await fetch("/api/team-lead/work-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      });

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text();
        console.error("Work submission API Error:", errorText);
      }

      setIsCheckedOut(true);
    } catch (error) {
      console.error("Error in checkout process:", error);
      alert(
        `Failed to save work log: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setCheckOutTime(null);
    } finally {
      setIsSubmittingWorkLog(false);
    }
  };

  const handleStartNewDay = () => {
    if (employeeData?.employee_id || user?.email) {
      const empId = employeeData?.employee_id || user?.email || "fallback";
      try {
        sessionStorage.removeItem(getStorageKey(empId));
      } catch (error) {
        console.error("Error clearing sessionStorage:", error);
      }
    }

    setIsCheckedIn(false);
    setIsCheckedOut(false);
    setCheckInTime(null);
    setCheckOutTime(null);
    setWorkType("");
    setWorkDescription("");
    setIsWorkSubmitted(false);
  };

  return (
    <ProtectedRoute allowedRoles={["employee", "intern"]}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <MemoizedSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MemoizedHeader displayName={displayName} />

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 bg-gradient-to-r">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-emerald-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Clock className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Check-in Time
                        </h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatISTTime(checkInTime)}
                      </p>
                      {checkInTime && (
                        <p className="text-xs text-emerald-600 mt-1 font-medium">
                          ✓ Checked in successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-rose-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-rose-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-rose-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Check-out Time
                        </h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatISTTime(checkOutTime)}
                      </p>
                      {checkOutTime && (
                        <p className="text-xs text-rose-600 mt-1 font-medium">
                          ✓ Checked out successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Current Status
                        </h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {isCheckedOut
                          ? "Checked Out"
                          : isCheckedIn
                          ? "Checked In"
                          : "Not Checked In"}
                      </p>
                      <div className="flex items-center mt-2">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            isCheckedOut
                              ? "bg-red-500"
                              : isCheckedIn
                              ? "bg-green-500 animate-pulse"
                              : "bg-gray-400"
                          }`}
                        ></div>
                        <p
                          className={`text-xs font-medium ${
                            isCheckedOut
                              ? "text-red-600"
                              : isCheckedIn
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {isCheckedOut
                            ? "Day completed"
                            : isCheckedIn
                            ? "Currently active"
                            : "Waiting to start"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-amber-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Timer className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Overtime Hours
                        </h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {overtimeHours.toFixed(2)} hrs
                      </p>
                      <p
                        className={`text-xs mt-1 font-medium ${
                          overtimeHours > 0 ? "text-amber-600" : "text-gray-500"
                        }`}
                      >
                        {overtimeHours > 0
                          ? `+${overtimeHours.toFixed(1)} extra hours`
                          : "Standard hours"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showCheckInNotification && (
              <div className="fixed top-20 right-6 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div>
                  <div className="font-medium">Checked In Successfully</div>
                  <div className="text-sm opacity-90">
                    Checked in at {formatISTTime(checkInTime)}
                  </div>
                </div>
              </div>
            )}

            {showWorkSubmissionNotification && (
              <div className="fixed top-20 right-6 z-50 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div>
                  <div className="font-medium">Work submitted successfully</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center min-h-[calc(100vh-280px)] px-4 py-8">
              <div className="w-full max-w-2xl">
                <div className="bg-white rounded-lg shadow-sm border">
                  {isCheckedOut ? (
                    <div className="p-6 space-y-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center">
                          <LogIn className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-lg font-medium text-gray-900">
                          Check-in
                        </span>
                      </div>
                      <div className="ml-12 mb-6">
                        <div className="flex items-center space-x-2 text-green-600">
                          <CircleCheckBig className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Checked in at {formatISTTime(checkInTime)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-lg">📝</span>
                          </div>
                          <span className="text-lg font-medium text-gray-900">
                            Work Submission
                          </span>
                        </div>
                        <div className="ml-12 space-y-4">
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              Work Description
                            </div>
                            <div className="text-gray-900 bg-gray-50 p-3 rounded-md">
                              {workDescription}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              Work Type
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-blue-500 rounded"></div>
                              <span className="text-gray-900">{workType}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-green-600">
                            <CircleCheckBig className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Submitted for team lead review
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="w-4 h-4 rounded-full bg-red-500"></div>
                          <span className="text-lg font-medium text-gray-900">
                            Check-out
                          </span>
                        </div>
                        <div className="ml-12">
                          <div className="flex items-center space-x-2 text-red-600">
                            <CircleCheckBig className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Checked out at {formatISTTime(checkOutTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <button
                          onClick={handleStartNewDay}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                        >
                          Start New Day
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-6 border-b">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center">
                              <LogIn className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-4 h-4 rounded-full ${
                                  isCheckedIn ? "bg-green-500" : "bg-green-500"
                                }`}
                              ></div>
                              <span className="text-lg font-medium text-gray-900">
                                Check-in
                              </span>
                            </div>
                          </div>
                        </div>
                        {!isCheckedIn ? (
                          <button
                            onClick={handleCheckIn}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                          >
                            <LogIn className="w-4 h-4 text-white" />
                            <span>Check-in</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <CircleCheckBig className="w-3 h-3 text-green-600 rounded-full" />
                            </div>
                            <div>
                              <div className="text-sm text-green-600 font-medium">
                                Checked in at {formatISTTime(checkInTime)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {isCheckedIn && !isWorkSubmitted && (
                        <div className="p-6 border-b">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-lg">📝</span>
                            </div>
                            <span className="text-lg font-medium text-gray-900">
                              Work Submission Form
                            </span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Work Description
                              </label>
                              <textarea
                                value={workDescription}
                                onChange={(e) =>
                                  setWorkDescription(e.target.value)
                                }
                                placeholder="Describe today's work..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Work Type
                              </label>
                              <select
                                value={workType}
                                onChange={(e) => setWorkType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select work type</option>
                                <option value="Work from Office">
                                  Work from Office
                                </option>
                                <option value="Work from Home">
                                  Work from Home
                                </option>
                              </select>
                            </div>
                            <button
                              onClick={handleSubmitWork}
                              disabled={!workType || !workDescription}
                              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                            >
                              Submit Work
                            </button>
                          </div>
                        </div>
                      )}

                      {isCheckedIn && isWorkSubmitted && (
                        <div className="p-6">
                          <div className="space-y-6">
                            <div>
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-sm">
                                    📝
                                  </span>
                                </div>
                                <span className="text-lg font-medium text-gray-900">
                                  Work Submission Form
                                </span>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-700">
                                    Work Description
                                  </div>
                                  <div className="text-gray-900 mt-1">
                                    {workDescription}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">
                                    Work Type
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-gray-900">
                                      {workType}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 text-green-600">
                                  <CircleCheckBig className="w-4 h-4 rounded-full flex items-center justify-center" />
                                  <span className="text-sm font-medium">
                                    Work submitted successfully
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-6">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                  <LogOut className="w-4 h-4 text-red-600" />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                  <span className="text-lg font-medium text-gray-900">
                                    Check-out
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={handleCheckOut}
                                disabled={isSubmittingWorkLog}
                                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                              >
                                <LogOut className="w-4 h-4 text-white" />
                                <span>
                                  {isSubmittingWorkLog
                                    ? "Saving..."
                                    : "Check-out"}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
