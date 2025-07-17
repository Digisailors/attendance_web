"use client"

import { useState, useEffect } from "react"
import { LogIn, CircleCheckBig, LogOut } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface User {
  id: string
  email: string
  userType: string
  name?: string
}

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

  // Get user data from localStorage and fetch employee details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user from localStorage
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)

          // Fetch employee details using email
          const response = await fetch(`/api/employees/profile?email=${parsedUser.email}`)
          if (response.ok) {
            const employeeInfo = await response.json()
            setEmployeeData(employeeInfo)
            console.log("Employee data loaded:", employeeInfo)
          } else {
            console.error("Failed to fetch employee profile")
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Get employee ID from employee data or fallback
  const employeeId = employeeData?.employee_id || "SD418" // Default fallback

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleCheckIn = () => {
    const checkInMoment = new Date()
    setIsCheckedIn(true)
    setCheckInTime(checkInMoment)
    setShowCheckInNotification(true)
    setIsCheckedOut(false)

    // Hide notification after 3 seconds
    setTimeout(() => {
      setShowCheckInNotification(false)
    }, 3000)
  }

  const handleSubmitWork = () => {
    if (workType && workDescription) {
      setIsWorkSubmitted(true)
      setShowWorkSubmissionNotification(true)
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowWorkSubmissionNotification(false)
      }, 3000)
    }
  }

  const handleCheckOut = async () => {
    const checkOutMoment = new Date()
    setCheckOutTime(checkOutMoment)
    setIsSubmittingWorkLog(true)

    try {
      console.log("Starting checkout process...")

      // Save work log to database
      const workLogResponse = await fetch(`/api/employees/${employeeId}/worklog`, {
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
      })

      if (!workLogResponse.ok) {
        const errorText = await workLogResponse.text()
        console.error("Work Log API Error Response:", errorText)
        throw new Error("Failed to save work log")
      }

      console.log("Work log saved successfully")

      // Create work submission for team lead review
      const submissionPayload = {
        employeeId: employeeId,
        employeeName: employeeData?.name || user?.email?.split("@")[0] || "Employee",
        workType: workType,
        workDescription: workDescription,
        department: "General", // You can get this from employeeData if available
        priority: "Medium",
        submittedDate: checkOutMoment.toISOString(),
      }

      console.log("Sending work submission:", submissionPayload)

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
        console.error("Work submission failed, but work log was saved")
        // Don't throw error here as work log was already saved
      } else {
        const submissionResult = await submissionResponse.json()
        console.log("Work submission saved successfully:", submissionResult)
      }

      console.log("Work log and submission process completed")
      setIsCheckedOut(true)
    } catch (error) {
      console.error("Error in checkout process:", error)
      alert(`Failed to save work log: ${error instanceof Error ? error.message : "Unknown error"}`)
      // Reset checkout state so user can try again
      setCheckOutTime(null)
    } finally {
      setIsSubmittingWorkLog(false)
    }
  }

  const handleStartNewDay = () => {
    setIsCheckedIn(false)
    setIsCheckedOut(false)
    setCheckInTime(null)
    setCheckOutTime(null)
    setWorkType("")
    setWorkDescription("")
    setIsWorkSubmitted(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="employee" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Get display name from employee data or fallback to email
  const displayName = employeeData?.name || user?.email?.split("@")[0] || "Employee"

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="employee" />
      <div className="flex-1 flex flex-col">
        <Header title="Employee Portal" subtitle={`Welcome back, ${displayName}`} userType="employee" />

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
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="absolute top-[25%] w-full max-w-2xl">
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
                    <span className="text-lg font-medium text-gray-900">Check-in</span>
                  </div>
                  <div className="ml-12 mb-6">
                    <div className="flex items-center space-x-2 text-green-600">
                      <CircleCheckBig className="w-4 h-4" />
                      <span className="text-sm font-medium">Checked in at {formatTime(checkInTime!)}</span>
                    </div>
                  </div>

                  {/* Work Submission Summary */}
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

                  {/* Check-out Summary */}
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

                  {/* Stage 2: Work Submission Form */}
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

                  {/* Stage 3: Work Submitted & Check-out */}
                  {isCheckedIn && isWorkSubmitted && (
                    <div className="p-6">
                      <div className="space-y-6">
                        {/* Work Submitted Status */}
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

                        {/* Check-out Section */}
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
  )
}
