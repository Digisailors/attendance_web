"use client";

import { useState, useEffect } from "react";
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

// Utility function to get accurate server time
const getAccurateTime = async () => {
  try {
    // Method 1: Try to get time from a reliable time API
    const response = await fetch(
      "https://worldtimeapi.org/api/timezone/Asia/Kolkata"
    );
    if (response.ok) {
      const data = await response.json();
      return new Date(data.datetime);
    }
  } catch (error) {
    console.log("Time API failed, trying alternative method...");
  }

  try {
    // Method 2: Use server time if you have an API endpoint
    // Uncomment this if you create a server time endpoint
    // const response = await fetch('/api/server-time');
    // if (response.ok) {
    //   const data = await response.json();
    //   return new Date(data.currentTime);
    // }
  } catch (error) {
    console.log("Server time API failed");
  }

  // Method 3: Fallback to system time (what you currently have)
  return new Date();
};

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

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Helper function to get storage key for employee
  const getStorageKey = (employeeId: string) => {
    return `employee_daily_state_${employeeId}_${getTodayDate()}`;
  };

  // Save state to localStorage
  const saveStateToStorage = (employeeId: string, state: DailyState) => {
    try {
      localStorage.setItem(getStorageKey(employeeId), JSON.stringify(state));
    } catch (error) {
      console.error("Error saving state:", error);
    }
  };

  // Load state from localStorage
  const loadStateFromStorage = (employeeId: string): DailyState | null => {
    try {
      const data = localStorage.getItem(getStorageKey(employeeId));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading state:", error);
      return null;
    }
  };

  // Clean up old states (optional - clean states older than 30 days)
  const cleanupOldStates = (employeeId: string) => {
    try {
      // Remove states older than 30 days
      const today = new Date();
      for (let i = 1; i <= 30; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        const key = `employee_daily_state_${employeeId}_${
          pastDate.toISOString().split("T")[0]
        }`;
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Error cleaning up old states:", error);
    }
  };

  // Utility to fetch today's check-in status
  const fetchTodayCheckInStatus = async (employeeId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `/api/employees/${employeeId}/worklog?date=${today}`
      );
      if (!res.ok) return null;
      return res.json();
    } catch (error) {
      console.error("Error fetching check-in status:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Fetch employee details using email
          const response = await fetch(
            `/api/employees/profile?email=${parsedUser.email}`
          );
          if (response.ok) {
            const employeeInfo = await response.json();
            setEmployeeData(employeeInfo);
            console.log("Employee data loaded:", employeeInfo);
          } else {
            console.error("Failed to fetch employee profile");
          }
        }

        console.log("User data fetching disabled in demo mode");
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Load saved state when employee data is available
  useEffect(() => {
    const syncCheckInStatus = async () => {
      if (employeeData?.employee_id || user?.email) {
        const employeeId =
          employeeData?.employee_id || user?.email || "fallback";
        // Clean up old states
        cleanupOldStates(employeeId);

        // First, load from localStorage
        const savedState = loadStateFromStorage(employeeId);

        // Fetch today's status from backend
        const dbStatus = await fetchTodayCheckInStatus(employeeId);

        if (dbStatus && dbStatus.check_in) {
          setIsCheckedIn(true);
          setCheckInTime(new Date(`${dbStatus.date}T${dbStatus.check_in}`));
          setIsCheckedOut(!!dbStatus.check_out);
          setCheckOutTime(
            dbStatus.check_out
              ? new Date(`${dbStatus.date}T${dbStatus.check_out}`)
              : null
          );
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

          // Save synced state to localStorage
          const syncedState: DailyState = {
            isCheckedIn: true,
            isCheckedOut: !!dbStatus.check_out,
            checkInTime: new Date(
              `${dbStatus.date}T${dbStatus.check_in}`
            ).toISOString(),
            checkOutTime: dbStatus.check_out
              ? new Date(`${dbStatus.date}T${dbStatus.check_out}`).toISOString()
              : null,
            workType: dbStatus.project || savedState?.workType || "",
            workDescription: dbStatus.check_out
              ? dbStatus.description || ""
              : savedState?.workDescription || dbStatus.description || "",
            isWorkSubmitted:
              !!dbStatus.check_out || savedState?.isWorkSubmitted || false,
            date: dbStatus.date,
          };
          saveStateToStorage(employeeId, syncedState);
        } else {
          // No check-in today in DB, but check if we have saved state from localStorage
          if (savedState) {
            setIsCheckedIn(savedState.isCheckedIn);
            setCheckInTime(
              savedState.checkInTime ? new Date(savedState.checkInTime) : null
            );
            setIsCheckedOut(savedState.isCheckedOut);
            setCheckOutTime(
              savedState.checkOutTime ? new Date(savedState.checkOutTime) : null
            );
            setWorkType(savedState.workType);
            setWorkDescription(savedState.workDescription); // Preserve work description from localStorage
            setIsWorkSubmitted(savedState.isWorkSubmitted);
          } else {
            // Reset states only if no saved state
            setIsCheckedIn(false);
            setCheckInTime(null);
            setIsCheckedOut(false);
            setCheckOutTime(null);
            setWorkType("");
            setWorkDescription("");
            setIsWorkSubmitted(false);
          }
        }
      }
    };
    syncCheckInStatus();
  }, [employeeData, user]);

  // Save state whenever it changes
  useEffect(() => {
    if (employeeData?.employee_id || user?.email) {
      const employeeId = employeeData?.employee_id || user?.email || "fallback";

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

      saveStateToStorage(employeeId, currentState);
    }
  }, [
    isCheckedIn,
    isCheckedOut,
    checkInTime,
    checkOutTime,
    workType,
    workDescription,
    isWorkSubmitted,
    employeeData,
    user,
  ]);

  // Get employee ID from employee data or fallback
  const employeeId = employeeData?.employee_id || "SD418"; // Default fallback

  useEffect(() => {
    const updateCurrentTime = async () => {
      const accurateTime = await getAccurateTime();
      setCurrentTime(accurateTime);
    };

    // Update immediately
    updateCurrentTime();

    // Then update every minute (not every second to avoid too many API calls)
    const timer = setInterval(updateCurrentTime, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    if (isCheckedIn) {
      console.log("Already checked in — skipping API call");
      return;
    }

    // Get accurate time instead of using local system time
    const checkInMoment = await getAccurateTime();

    setIsCheckedIn(true);
    setCheckInTime(checkInMoment);
    setShowCheckInNotification(true);
    setIsCheckedOut(false);

    try {
      const response = await fetch(`/api/employees/${employeeId}/worklog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ checkInTime: checkInMoment }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Check-in failed:", data?.error || data);
        // Optionally: Revert state changes if API call failed
        setIsCheckedIn(false);
        setCheckInTime(null);
      } else {
        console.log("Check-in successful:", data);
      }
    } catch (error) {
      console.error("Check-in error:", error);
      setIsCheckedIn(false);
      setCheckInTime(null);
    }

    setTimeout(() => {
      setShowCheckInNotification(false);
    }, 3000);
  };

  const handleSubmitWork = () => {
    if (workType && workDescription) {
      setIsWorkSubmitted(true);
      setShowWorkSubmissionNotification(true);
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowWorkSubmissionNotification(false);
      }, 3000);
    }
  };

  const handleCheckOut = async () => {
    // Get accurate time instead of using local system time
    const checkOutMoment = await getAccurateTime();

    setCheckOutTime(checkOutMoment);
    setIsSubmittingWorkLog(true);

    try {
      console.log("Starting checkout process...");

      // Save work log to database
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

      console.log("Work log saved successfully");

      const submissionPayload = {
        employeeId: employeeId,
        employeeName:
          employeeData?.name || user?.email?.split("@")[0] || "Employee",
        workType: workType,
        workDescription: workDescription,
        department: "General",
        priority: "Medium",
        submittedDate: checkOutMoment.toISOString(),
      };

      console.log("Sending work submission:", submissionPayload);

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
    }
  };

  const handleStartNewDay = () => {
    // Clear today's state from localStorage
    if (employeeData?.employee_id || user?.email) {
      const empId = employeeData?.employee_id || user?.email || "fallback";
      try {
        localStorage.removeItem(getStorageKey(empId));
      } catch (error) {
        console.error("Error clearing localStorage:", error);
      }
      console.log(`Cleared state for new day: ${empId}`);
    }

    // Reset all states
    setIsCheckedIn(false);
    setIsCheckedOut(false);
    setCheckInTime(null);
    setCheckOutTime(null);
    setWorkType("");
    setWorkDescription("");
    setIsWorkSubmitted(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const calculateOvertime = () => {
    if (checkInTime && checkOutTime) {
      const totalHours =
        (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return totalHours > 8 ? totalHours - 8 : 0; // Assuming 8 hours is the standard workday
    }
    return 0;
  };

  // Get display name from employee data or fallback to email
  const displayName =
    employeeData?.name || user?.email?.split("@")[0] || "Employee";

  return (
    <ProtectedRoute allowedRoles={["team-lead"]}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userType="team-lead" />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header
            title="Team Lead Portal"
            subtitle={`Welcome, ${displayName}`}
            userType="team-lead"
          />

          {/* Enhanced Header Cards */}
          <div className="p-6 bg-gradient-to-r ">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Check-in Time Card */}
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
                      {checkInTime ? formatTime(checkInTime) : "Not Checked In"}
                    </p>
                    {checkInTime && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        ✓ Checked in successfully
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Check-out Time Card */}
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

              {/* Status Card */}
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

              {/* Overtime Hours Card */}
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
                      {calculateOvertime().toFixed(2)} hrs
                    </p>
                    <p
                      className={`text-xs mt-1 font-medium ${
                        calculateOvertime() > 0
                          ? "text-amber-600"
                          : "text-gray-500"
                      }`}
                    >
                      {calculateOvertime() > 0
                        ? `+${calculateOvertime().toFixed(1)} extra hours`
                        : "Standard hours"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Notification */}
          {showCheckInNotification && (
            <div className="fixed top-20 right-6 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div>
                <div className="font-medium">Checked In Successfully</div>
                <div className="text-sm opacity-90">
                  Checked in at{" "}
                  {checkInTime?.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
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

          {/* Main Content */}
          <div className="flex items-center justify-center min-h-[calc(100vh-180px)] px-4">
            <div className="absolute top-[45%] w-full max-w-2xl">
              <div className="bg-white rounded-lg shadow-sm border">
                {/* Post-Checkout Summary View */}
                {isCheckedOut ? (
                  <div className="p-6 space-y-6">
                    {/* Check-in Summary */}
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

                    {/* Work Submission Summary */}
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
                            Checked out at {formatTime(checkOutTime!)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Start New Day Button */}
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
                              Checked in at {formatTime(checkInTime!)}
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
    </ProtectedRoute>
  );
}
