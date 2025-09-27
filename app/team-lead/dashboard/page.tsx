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
  Loader2,
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

// Fetch IST time from timeapi.io (for check-in/check-out only)
const fetchISTTime = async () => {
  try {
    const res = await fetch(
      "https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata"
    );
    if (!res.ok) throw new Error("Failed to fetch IST time");
    const data = await res.json();
    return new Date(
      data.year,
      data.month - 1,
      data.day,
      data.hour,
      data.minute,
      data.seconds
    );
  } catch (error) {
    console.error("IST time API error:", error);
    return null;
  }
};

// Get current IST time using last fetched IST and local clock
const getCurrentIST = (baseIST: Date | null, baseLocal: number) => {
  if (!baseIST) return null;
  const now = Date.now();
  const diff = now - baseLocal;
  return new Date(baseIST.getTime() + diff);
};

// Format IST time consistently
const formatISTTime = (date) => {
  // If date is already in IST, format it directly
  if (typeof date === "string") {
    date = new Date(date);
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

// Format IST time with seconds
const formatTimeWithSeconds = (date) => {
  if (typeof date === "string") {
    date = new Date(date);
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

// Convert any date to IST string for storage
const toISTString = (date) => {
  const istTime = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return istTime.toISOString();
};

// Loading Button Component
interface LoadingButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled: boolean;
  className: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  loadingText: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  onClick,
  disabled,
  className,
  children,
  icon: Icon,
  loadingText,
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`${className} ${
      loading || disabled ? "cursor-not-allowed opacity-75" : ""
    } flex items-center space-x-2 transition-all duration-200`}
  >
    {loading ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{loadingText}</span>
      </>
    ) : (
      <>
        {Icon && <Icon className="w-4 h-4" />}
        <span>{children}</span>
      </>
    )}
  </button>
);

// Memoized components to prevent unnecessary re-renders
const MemoizedSidebar = memo(() => <Sidebar userType="team-lead" />);

const MemoizedHeader = memo(({ displayName }: { displayName: string }) => (
  <Header
    title="Team Lead Portal"
    subtitle={`Welcome, ${displayName}`}
    userType="team-lead"
  />
));

export default function TeamLeadDashboard() {
  // For live IST clock
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [baseIST, setBaseIST] = useState<Date | null>(null);
  const [baseLocal, setBaseLocal] = useState<number>(Date.now());
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

  // New loading states for better UX
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Memoized values to prevent recalculation
  const displayName = useMemo(() => {
    return employeeData?.name || user?.email?.split("@")[0] || "Team Lead";
  }, [employeeData?.name, user?.email]);

  const employeeId = useMemo(() => {
    return employeeData?.employee_id || "TL001";
  }, [employeeData?.employee_id]);

  const overtimeHours = useMemo(() => {
    if (checkInTime && checkOutTime) {
      const totalHours =
        (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return totalHours > 8 ? totalHours - 8 : 0;
    }
    return 0;
  }, [checkInTime, checkOutTime]);

  // Stable helper functions
  const getTodayDate = useCallback(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const getStorageKey = useCallback(
    (empId: string) => {
      return `team_lead_daily_state_${empId}_${getTodayDate()}`;
    },
    [getTodayDate]
  );

  const saveStateToStorage = useCallback(
    (empId: string, state: DailyState) => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem(getStorageKey(empId), JSON.stringify(state));
        }
      } catch (error) {
        console.error("Error saving state:", error);
      }
    },
    [getStorageKey]
  );

  const loadStateFromStorage = useCallback(
    (empId: string): DailyState | null => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const data = localStorage.getItem(getStorageKey(empId));
          return data ? JSON.parse(data) : null;
        }
        return null;
      } catch (error) {
        console.error("Error loading state:", error);
        return null;
      }
    },
    [getStorageKey]
  );

  const cleanupOldStates = useCallback((empId: string) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const today = new Date();
        for (let i = 1; i <= 30; i++) {
          const pastDate = new Date(today);
          pastDate.setDate(today.getDate() - i);
          const key = `team_lead_daily_state_${empId}_${
            pastDate.toISOString().split("T")[0]
          }`;
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old states:", error);
    }
  }, []);

  const fetchTodayCheckInStatus = useCallback(async (empId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/employees/${empId}/worklog?date=${today}`);
      if (!res.ok) return null;
      return res.json();
    } catch (error) {
      console.error("Error fetching check-in status:", error);
      return null;
    }
  }, []);

  // Initial data fetch - only runs once
  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const userData = localStorage.getItem("user");
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

  // Sync check-in status - only when employee data changes
  useEffect(() => {
    let isMounted = true;

    const syncCheckInStatus = async () => {
      if (!employeeData?.employee_id && !user?.email) return;

      const empId = employeeData?.employee_id || user?.email || "fallback";
      cleanupOldStates(empId);

      try {
        // First, load from localStorage
        const savedState = loadStateFromStorage(empId);

        const dbStatus = await fetchTodayCheckInStatus(empId);

        if (!isMounted) return;

        if (dbStatus && dbStatus.check_in) {
          // Parse times assuming they're in IST
          const checkInDate = new Date(`${dbStatus.date}T${dbStatus.check_in}`);
          const checkOutDate = dbStatus.check_out
            ? new Date(`${dbStatus.date}T${dbStatus.check_out}`)
            : null;

          // Convert to IST if needed
          const istCheckIn = new Date(
            checkInDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
          );
          const istCheckOut = checkOutDate
            ? new Date(
                checkOutDate.toLocaleString("en-US", {
                  timeZone: "Asia/Kolkata",
                })
              )
            : null;

          // Batch all state updates - preserve work description from localStorage if available and not checked out
          setIsCheckedIn(true);
          setCheckInTime(istCheckIn);
          setIsCheckedOut(!!dbStatus.check_out);
          setCheckOutTime(istCheckOut);
          setWorkType(dbStatus.project || savedState?.workType || "");
          // Preserve work description from localStorage if not checked out, otherwise use DB value
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
            checkInTime: istCheckIn.toISOString(),
            checkOutTime: istCheckOut?.toISOString() || null,
            workType: dbStatus.project || savedState?.workType || "",
            workDescription: dbStatus.check_out
              ? dbStatus.description || ""
              : savedState?.workDescription || dbStatus.description || "",
            isWorkSubmitted:
              !!dbStatus.check_out || savedState?.isWorkSubmitted || false,
            date: dbStatus.date,
          };
          saveStateToStorage(empId, syncedState);
        } else {
          // No DB data, so clear localStorage and reset state
          try {
            if (typeof window !== "undefined" && window.localStorage) {
              localStorage.removeItem(getStorageKey(empId));
            }
          } catch (error) {
            console.error(
              "Error clearing localStorage for deleted worklog:",
              error
            );
          }
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
    getStorageKey,
    cleanupOldStates,
    loadStateFromStorage,
    saveStateToStorage,
    fetchTodayCheckInStatus,
  ]);

  // Debounced state saving
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

  // Live IST clock: increment locally, fetch from API only once on mount
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let cancelled = false;
    const fetchAndStartClock = async () => {
      const ist = await fetchISTTime();
      if (!cancelled && ist) {
        setBaseIST(ist);
        setBaseLocal(Date.now());
        setCurrentTime(ist);
      }
    };
    fetchAndStartClock();
    timer = setInterval(() => {
      setCurrentTime((prev) => getCurrentIST(baseIST, baseLocal));
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseIST, baseLocal]);

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
    if (isCheckedIn || isCheckingIn) {
      console.log("Already checked in or in progress — skipping API call");
      return;
    }

    setIsCheckingIn(true);

    try {
      // Fetch IST time only at check-in
      const checkInMoment = await fetchISTTime();
      if (!checkInMoment) {
        alert("Unable to fetch IST time for check-in. Please try again later.");
        return;
      }

      // Optimistically update UI
      setIsCheckedIn(true);
      setCheckInTime(checkInMoment);
      setShowCheckInNotification(true);
      setIsCheckedOut(false);

      // Update live clock base
      setBaseIST(checkInMoment);
      setBaseLocal(Date.now());
      setCurrentTime(checkInMoment);

      const response = await fetch(`/api/employees/${employeeId}/worklog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInTime: toISTString(checkInMoment),
        }),
      });

      // Check if response is ok BEFORE trying to parse JSON
      if (!response.ok) {
        // Log the raw response for debugging
        const responseText = await response.text();
        console.error(`HTTP ${response.status}: ${response.statusText}`);
        console.error("Response body:", responseText);

        // Rollback state changes
        setIsCheckedIn(false);
        setCheckInTime(null);
        setShowCheckInNotification(false);

        // Show user-friendly error message based on status
        if (response.status === 404) {
          alert("API endpoint not found. Please contact support.");
        } else if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
        } else if (response.status === 500) {
          alert("Server error. Please try again later.");
        } else {
          alert(`Check-in failed (${response.status}). Please try again.`);
        }
        return;
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        console.error("Non-JSON response received:", responseText);

        // Rollback state changes
        setIsCheckedIn(false);
        setCheckInTime(null);
        setShowCheckInNotification(false);

        alert("Unexpected response format. Please contact support.");
        return;
      }

      // Now it's safe to parse JSON
      const data = await response.json();
      console.log("Check-in successful:", data);

      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowCheckInNotification(false);
      }, 3000);
    } catch (error) {
      console.error("Check-in network error:", error);

      // Rollback state changes
      setIsCheckedIn(false);
      setCheckInTime(null);
      setShowCheckInNotification(false);

      // Check if it's a network error or JSON parse error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        alert("Network error. Please check your connection and try again.");
      } else if (
        error instanceof SyntaxError &&
        error.message.includes("JSON")
      ) {
        alert("Server returned invalid data. Please contact support.");
      } else {
        alert("Check-in failed. Please try again.");
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSubmitWork = () => {
    if (workType && workDescription && !isSubmittingWork) {
      setIsSubmittingWork(true);

      // Simulate brief processing time for better UX
      setTimeout(() => {
        setIsWorkSubmitted(true);
        setShowWorkSubmissionNotification(true);
        setIsSubmittingWork(false);
      }, 500);
    }
  };

  const handleCheckOut = async () => {
    if (isCheckingOut) return;

    setIsCheckingOut(true);

    try {
      // Fetch IST time only at check-out
      const checkOutMoment = await fetchISTTime();
      if (!checkOutMoment) {
        alert(
          "Unable to fetch IST time for check-out. Please try again later."
        );
        return;
      }

      setCheckOutTime(checkOutMoment);
      setIsSubmittingWorkLog(true);

      // Update live clock base
      setBaseIST(checkOutMoment);
      setBaseLocal(Date.now());
      setCurrentTime(checkOutMoment);

      console.log("Starting checkout process...");
      const workLogResponse = await fetch(
        `/api/employees/${employeeId}/worklog`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkInTime: checkInTime ? toISTString(checkInTime) : null,
            checkOutTime: toISTString(checkOutMoment),
            workType,
            workDescription,
          }),
        }
      );

      if (!workLogResponse.ok) {
        const errorText = await workLogResponse.text();
        console.error("Work Log API Error Response:", errorText);
        throw new Error("Failed to save work log");
      }

      console.log("Work log saved successfully");

      const submissionPayload = {
        employeeId: employeeId,
        employeeName: displayName,
        workType: workType,
        workDescription: workDescription,
        department: "Team Lead",
        priority: "High",
        submittedDate: toISTString(checkOutMoment),
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
      } else {
        const submissionResult = await submissionResponse.json();
        console.log("Work submission saved successfully:", submissionResult);
      }

      console.log("Work log and submission process completed");
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
      setIsCheckingOut(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "Not Available";
    return formatISTTime(date);
  };

  return (
    <ProtectedRoute allowedRoles={["team-lead"]}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <MemoizedSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MemoizedHeader displayName={displayName} />

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 bg-gradient-to-r ">
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
                        {checkInTime
                          ? formatTime(checkInTime)
                          : "Not Checked In"}
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
                        {checkOutTime
                          ? formatTime(checkOutTime)
                          : "Not Checked Out"}
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
                    Checked in at {checkInTime && formatTime(checkInTime)}
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
                            Checked in at {formatTime(checkInTime!)}
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

                      {/* Check-out Summary */}
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
                              Checked out at{" "}
                              {formatTimeWithSeconds(checkOutTime!)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Stage 1: Check-in */}
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
                          <LoadingButton
                            loading={isCheckingIn}
                            onClick={handleCheckIn}
                            disabled={false}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                            icon={LogIn}
                            loadingText="Checking in..."
                          >
                            Check-in
                          </LoadingButton>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <CircleCheckBig className="w-3 h-3 text-green-600 rounded-full" />
                            </div>
                            <div>
                              <div className="text-sm text-green-600 font-medium">
                                Checked in at{" "}
                                {formatTimeWithSeconds(checkInTime!)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stage 2: Work Submission Form */}
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
                                disabled={isSubmittingWork}
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
                                disabled={isSubmittingWork}
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
                            <LoadingButton
                              loading={isSubmittingWork}
                              onClick={handleSubmitWork}
                              disabled={!workType || !workDescription}
                              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                              loadingText="Submitting..."
                            >
                              Submit Work
                            </LoadingButton>
                          </div>
                        </div>
                      )}

                      {/* Stage 3: Work Submitted & Check-out */}
                      {isCheckedIn && isWorkSubmitted && (
                        <div className="p-6">
                          <div className="space-y-6">
                            {/* Work Submitted Status */}
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

                            {/* Check-out Section */}
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
                              <LoadingButton
                                loading={isCheckingOut || isSubmittingWorkLog}
                                onClick={handleCheckOut}
                                disabled={false}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                                icon={LogOut}
                                loadingText={
                                  isSubmittingWorkLog
                                    ? "Saving..."
                                    : "Checking out..."
                                }
                              >
                                Check-out
                              </LoadingButton>
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
