"use client"

import { useState, useEffect, useMemo, memo, useCallback } from "react"
import { LogIn, CircleCheckBig, LogOut, Clock, Calendar, CheckCircle, Timer } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import ProtectedRoute from '@/components/ProtectedRoute'

interface User {
  id: string
  email: string
  userType: string
  name?: string
}

interface DailyState {
  isCheckedIn: boolean
  isCheckedOut: boolean
  checkInTime: string | null
  checkOutTime: string | null
  workType: string
  workDescription: string
  isWorkSubmitted: boolean
  date: string
}

// IST Time utilities
const getISTTime = () => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + istOffset);
  return istTime;
};

// Format IST time consistently
const formatISTTime = (date) => {
  // If date is already in IST, format it directly
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

// Convert any date to IST string for storage
const toISTString = (date) => {
  const istTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  return istTime.toISOString();
};

// Memoized components to prevent unnecessary re-renders
const MemoizedSidebar = memo(() => <Sidebar userType="employee" />)

const MemoizedHeader = memo(({ displayName }: { displayName: string }) => (
  <Header 
    title="Employee Portal" 
    subtitle={`Welcome back, ${displayName}`} 
    userType="employee" 
  />
))

export default function EmployeeDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isCheckedOut, setIsCheckedOut] = useState(false)
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null)
  const [showCheckInNotification, setShowCheckInNotification] = useState(false)
  const [workType, setWorkType] = useState("")
  const [workDescription, setWorkDescription] = useState("")
  const [isWorkSubmitted, setIsWorkSubmitted] = useState(false)
  const [showWorkSubmissionNotification, setShowWorkSubmissionNotification] = useState(false)
  const [isSubmittingWorkLog, setIsSubmittingWorkLog] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Memoized values to prevent recalculation
  const displayName = useMemo(() => {
    return employeeData?.name || user?.email?.split("@")[0] || "Employee"
  }, [employeeData?.name, user?.email])

  const employeeId = useMemo(() => {
    return employeeData?.employee_id || "SD418"
  }, [employeeData?.employee_id])

  const overtimeHours = useMemo(() => {
    if (checkInTime && checkOutTime) {
      const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
      return totalHours > 8 ? totalHours - 8 : 0
    }
    return 0
  }, [checkInTime, checkOutTime])

  // Stable helper functions
  const getTodayDate = useCallback(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const getStorageKey = useCallback((empId: string) => {
    return `employee_daily_state_${empId}_${getTodayDate()}`
  }, [getTodayDate])

  const saveStateToStorage = useCallback((empId: string, state: DailyState) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(getStorageKey(empId), JSON.stringify(state))
      }
    } catch (error) {
      console.error("Error saving state:", error)
    }
  }, [getStorageKey])

  const loadStateFromStorage = useCallback((empId: string): DailyState | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(getStorageKey(empId))
        return data ? JSON.parse(data) : null
      }
      return null
    } catch (error) {
      console.error("Error loading state:", error)
      return null
    }
  }, [getStorageKey])

  const cleanupOldStates = useCallback((empId: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const today = new Date()
        for (let i = 1; i <= 30; i++) {
          const pastDate = new Date(today)
          pastDate.setDate(today.getDate() - i)
          const key = `employee_daily_state_${empId}_${pastDate.toISOString().split('T')[0]}`
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.error("Error cleaning up old states:", error)
    }
  }, [])

  const fetchTodayCheckInStatus = useCallback(async (empId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/employees/${empId}/worklog?date=${today}`)
      if (!res.ok) return null
      return res.json()
    } catch (error) {
      console.error("Error fetching check-in status:", error)
      return null
    }
  }, [])

  // Initial data fetch - only runs once
  useEffect(() => {
    let isMounted = true
    
    const fetchUserData = async () => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const userData = localStorage.getItem("user")
          if (userData && isMounted) {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)

            try {
              const response = await fetch(`/api/employees/profile?email=${parsedUser.email}`)
              if (response.ok && isMounted) {
                const employeeInfo = await response.json()
                setEmployeeData(employeeInfo)
              }
            } catch (apiError) {
              console.error("API call failed:", apiError)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchUserData()
    
    return () => {
      isMounted = false
    }
  }, [])

  // Sync check-in status - only when employee data changes
  useEffect(() => {
    let isMounted = true
    
    const syncCheckInStatus = async () => {
      if (!employeeData?.employee_id && !user?.email) return
      
      const empId = employeeData?.employee_id || user?.email || "fallback"
      cleanupOldStates(empId)
      
      try {
        const dbStatus = await fetchTodayCheckInStatus(empId)
        
        if (!isMounted) return
        
        if (dbStatus && dbStatus.check_in) {
          // Parse times assuming they're in IST
          const checkInDate = new Date(`${dbStatus.date}T${dbStatus.check_in}`)
          const checkOutDate = dbStatus.check_out ? new Date(`${dbStatus.date}T${dbStatus.check_out}`) : null
          
          // Convert to IST if needed
          const istCheckIn = new Date(checkInDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
          const istCheckOut = checkOutDate ? new Date(checkOutDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"})) : null
          
          // Batch all state updates
          setIsCheckedIn(true)
          setCheckInTime(istCheckIn)
          setIsCheckedOut(!!dbStatus.check_out)
          setCheckOutTime(istCheckOut)
          setWorkType(dbStatus.project || "")
          setWorkDescription(dbStatus.description || "")
          setIsWorkSubmitted(!!dbStatus.check_out)
          
          const syncedState: DailyState = {
            isCheckedIn: true,
            isCheckedOut: !!dbStatus.check_out,
            checkInTime: istCheckIn.toISOString(),
            checkOutTime: istCheckOut?.toISOString() || null,
            workType: dbStatus.project || "",
            workDescription: dbStatus.description || "",
            isWorkSubmitted: !!dbStatus.check_out,
            date: dbStatus.date
          }
          saveStateToStorage(empId, syncedState)
        } else {
          // Reset states
          setIsCheckedIn(false)
          setCheckInTime(null)
          setIsCheckedOut(false)
          setCheckOutTime(null)
          setWorkType("")
          setWorkDescription("")
          setIsWorkSubmitted(false)
        }
      } catch (error) {
        console.error("Error syncing check-in status:", error)
      }
    }
    
    syncCheckInStatus()
    
    return () => {
      isMounted = false
    }
  }, [employeeData?.employee_id, user?.email])

  // Debounced state saving
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (employeeData?.employee_id || user?.email) {
        const empId = employeeData?.employee_id || user?.email || "fallback"
        
        const currentState: DailyState = {
          isCheckedIn,
          isCheckedOut,
          checkInTime: checkInTime?.toISOString() || null,
          checkOutTime: checkOutTime?.toISOString() || null,
          workType,
          workDescription,
          isWorkSubmitted,
          date: getTodayDate()
        }
        
        saveStateToStorage(empId, currentState)
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [isCheckedIn, isCheckedOut, checkInTime, checkOutTime, workType, workDescription, isWorkSubmitted, employeeData?.employee_id, user?.email, saveStateToStorage, getTodayDate])

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Notification timers
  useEffect(() => {
    if (showCheckInNotification) {
      const timer = setTimeout(() => {
        setShowCheckInNotification(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showCheckInNotification])

  useEffect(() => {
    if (showWorkSubmissionNotification) {
      const timer = setTimeout(() => {
        setShowWorkSubmissionNotification(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showWorkSubmissionNotification])

  const handleCheckIn = async () => {
    if (isCheckedIn) {
      console.log("Already checked in — skipping API call")
      return
    }

    // Use IST time consistently
    const checkInMoment = getISTTime()
    setIsCheckedIn(true)
    setCheckInTime(checkInMoment)
    setShowCheckInNotification(true)
    setIsCheckedOut(false)

    try {
      const response = await fetch(`/api/employees/${employeeId}/worklog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          checkInTime: toISTString(checkInMoment) // Send IST time to server
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Check-in failed:", data?.error || data)
        setIsCheckedIn(false)
        setCheckInTime(null)
      } else {
        console.log("Check-in successful:", data)
      }
    } catch (error) {
      console.error("Check-in error:", error)
      setIsCheckedIn(false)
      setCheckInTime(null)
    }
  }

  const handleSubmitWork = () => {
    if (workType && workDescription) {
      setIsWorkSubmitted(true)
      setShowWorkSubmissionNotification(true)
    }
  }

  const handleCheckOut = async () => {
    const checkOutMoment = getISTTime() // Use IST time
    setCheckOutTime(checkOutMoment)
    setIsSubmittingWorkLog(true)

    try {
      console.log("Starting checkout process...")

      const workLogResponse = await fetch(`/api/employees/${employeeId}/worklog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInTime: toISTString(checkInTime), // Convert to IST string
          checkOutTime: toISTString(checkOutMoment), // Convert to IST string
          workType: workType,
          workDescription: workDescription,
        }),
      })

      if (!workLogResponse.ok) {
        const errorText = await workLogResponse.text()
        console.error("Work Log API Error Response:", errorText)
        throw new Error("Failed to save work log")
      }

      console.log("Work log saved successfully")

      const submissionPayload = {
        employeeId: employeeId,
        employeeName: displayName,
        workType: workType,
        workDescription: workDescription,
        department: "General",
        priority: "Medium",
        submittedDate: toISTString(checkOutMoment), // Use IST time
      }

      const submissionResponse = await fetch("/api/team-lead/work-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      })

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text()
        console.error("Work submission API Error:", errorText)
      } else {
        const submissionResult = await submissionResponse.json()
        console.log("Work submission saved successfully:", submissionResult)
      }

      console.log("Work log and submission process completed")
      setIsCheckedOut(true)
    } catch (error) {
      console.error("Error in checkout process:", error)
      alert(`Failed to save work log: ${error instanceof Error ? error.message : "Unknown error"}`)
      setCheckOutTime(null)
    } finally {
      setIsSubmittingWorkLog(false)
    }
  }

  const handleStartNewDay = () => {
    if (employeeData?.employee_id || user?.email) {
      const empId = employeeData?.employee_id || user?.email || "fallback"
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(getStorageKey(empId))
        }
      } catch (error) {
        console.error("Error clearing localStorage:", error)
      }
    }

    setIsCheckedIn(false)
    setIsCheckedOut(false)
    setCheckInTime(null)
    setCheckOutTime(null)
    setWorkType("")
    setWorkDescription("")
    setIsWorkSubmitted(false)
  }

  const formatTime = (date: Date) => {
    if (!date) return "Not Available";
    return formatISTTime(date);
  }

  // if (loading) {
  //   return (
  //     <div className="flex h-screen bg-gray-50">
  //       <MemoizedSidebar />
  //       <div className="flex-1 flex items-center justify-center">
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
  //           <p className="mt-4 text-gray-600">Loading...</p>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <ProtectedRoute allowedRoles={['employee', 'intern']}>
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
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Check-in Time</h3>
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

                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-rose-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-rose-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-rose-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Check-out Time</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {checkOutTime ? formatTime(checkOutTime) : "Not Checked Out"}
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
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Current Status</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {isCheckedOut ? "Checked Out" : isCheckedIn ? "Checked In" : "Not Checked In"}
                      </p>
                      <div className="flex items-center mt-2">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          isCheckedOut ? 'bg-red-500' : isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}></div>
                        <p className={`text-xs font-medium ${
                          isCheckedOut ? 'text-red-600' : isCheckedIn ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {isCheckedOut ? 'Day completed' : isCheckedIn ? 'Currently active' : 'Waiting to start'}
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
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Overtime Hours</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {overtimeHours.toFixed(2)} hrs
                      </p>
                      <p className={`text-xs mt-1 font-medium ${
                        overtimeHours > 0 ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {overtimeHours > 0 ? `+${overtimeHours.toFixed(1)} extra hours` : 'Standard hours'}
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
                        <span className="text-lg font-medium text-gray-900">Check-in</span>
                      </div>
                      <div className="ml-12 mb-6">
                        <div className="flex items-center space-x-2 text-green-600">
                          <CircleCheckBig className="w-4 h-4" />
                          <span className="text-sm font-medium">Checked in at {formatTime(checkInTime!)}</span>
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-lg">📝</span>
                          </div>
                          <span className="text-lg font-medium text-gray-900">Work Submission</span>
                        </div>
                        <div className="ml-12 space-y-4">
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Work Description</div>
                            <div className="text-gray-900 bg-gray-50 p-3 rounded-md">{workDescription}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Work Type</div>
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-blue-500 rounded"></div>
                              <span className="text-gray-900">{workType}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-green-600">
                            <CircleCheckBig className="w-4 h-4" />
                            <span className="text-sm font-medium">Submitted for team lead review</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="w-4 h-4 rounded-full bg-red-500"></div>
                          <span className="text-lg font-medium text-gray-900">Check-out</span>
                        </div>
                        <div className="ml-12">
                          <div className="flex items-center space-x-2 text-red-600">
                            <CircleCheckBig className="w-4 h-4" />
                            <span className="text-sm font-medium">Checked out at {formatTime(checkOutTime!)}</span>
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
                                className={`w-4 h-4 rounded-full ${isCheckedIn ? "bg-green-500" : "bg-green-500"}`}
                              ></div>
                              <span className="text-lg font-medium text-gray-900">Check-in</span>
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

                      {isCheckedIn && !isWorkSubmitted && (
                        <div className="p-6 border-b">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-lg">📝</span>
                            </div>
                            <span className="text-lg font-medium text-gray-900">Work Submission Form</span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Work Description</label>
                              <textarea
                                value={workDescription}
                                onChange={(e) => setWorkDescription(e.target.value)}
                                placeholder="Describe today's work..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
                              <select
                                value={workType}
                                onChange={(e) => setWorkType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select work type</option>
                                <option value="Work from Office">Work from Office</option>
                                <option value="Work from Home">Work from Home</option>
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
                                  <span className="text-blue-600 text-sm">📝</span>
                                </div>
                                <span className="text-lg font-medium text-gray-900">Work Submission Form</span>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Work Description</div>
                                  <div className="text-gray-900 mt-1">{workDescription}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Work Type</div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-gray-900">{workType}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 text-green-600">
                                  <CircleCheckBig className="w-4 h-4 rounded-full flex items-center justify-center" />
                                  <span className="text-sm font-medium">Work submitted successfully</span>
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
                                  <span className="text-lg font-medium text-gray-900">Check-out</span>
                                </div>
                              </div>
                              <button
                                onClick={handleCheckOut}
                                disabled={isSubmittingWorkLog}
                                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                              >
                                <LogOut className="w-4 h-4 text-white" />
                                <span>{isSubmittingWorkLog ? "Saving..." : "Check-out"}</span>
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
  )
}
