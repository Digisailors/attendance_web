"use client"

import { useState, useEffect } from "react"
import { Play, Square, Clock, Calendar, CheckCircle, Timer, Upload, X, Image as ImageIcon, Menu, User, LogOut, Home, Clock as ClockIcon, FileText, Settings } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface User {
  id: string
  email: string
  userType: string
  name?: string
}

interface OTState {
  isOTStarted: boolean
  isOTEnded: boolean
  otStartTime: string | null
  otEndTime: string | null
  workType: string
  workDescription: string
  isWorkSubmitted: boolean
  date: string
  // Don't store File objects in localStorage
  imageCount: number
}

export default function OTDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOTStarted, setIsOTStarted] = useState(false)
  const [isOTEnded, setIsOTEnded] = useState(false)
  const [otStartTime, setOTStartTime] = useState<Date | null>(null)
  const [otEndTime, setOTEndTime] = useState<Date | null>(null)
  const [showOTStartNotification, setShowOTStartNotification] = useState(false)
  const [workType, setWorkType] = useState("")
  const [workDescription, setWorkDescription] = useState("")
  const [isWorkSubmitted, setIsWorkSubmitted] = useState(false)
  const [showWorkSubmissionNotification, setShowWorkSubmissionNotification] = useState(false)
  const [isSubmittingWorkLog, setIsSubmittingWorkLog] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [isSubmittingOT, setIsSubmittingOT] = useState(false)
  
  // Updated state for check-in AND check-out validation
  const [hasCheckedInAndOut, setHasCheckedInAndOut] = useState<boolean>(false)
  const [checkInValidationLoading, setCheckInValidationLoading] = useState(true)
  const [todayCheckInData, setTodayCheckInData] = useState<any>(null)

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Helper function to get storage key for employee
  const getStorageKey = (employeeId: string) => {
    return `employee_ot_state_${employeeId}_${getTodayDate()}`
  }

  // Save state to localStorage (excluding File objects)
  const saveStateToMemory = (employeeId: string, state: OTState) => {
    try {
      localStorage.setItem(getStorageKey(employeeId), JSON.stringify(state))
    } catch (error) {
      console.error("Error saving OT state:", error)
    }
  }

  // Load state from localStorage
  const loadStateFromMemory = (employeeId: string): OTState | null => {
    try {
      const saved = localStorage.getItem(getStorageKey(employeeId))
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Error loading OT state:", error)
    }
    return null
  }

  // UPDATED FUNCTION: Check if employee has checked in AND checked out today
  const checkTodayCheckInStatus = async (empId: string) => {
    try {
      setCheckInValidationLoading(true)
      const today = getTodayDate()
      const response = await fetch(`/api/employees/${empId}/worklog?date=${today}`)
      
      if (!response.ok) {
        console.error("Failed to fetch check-in status")
        return null
      }
      
      const data = await response.json()
      
      // Check if employee has BOTH checked in AND checked out today
      const hasCheckedIn = !!(data && data.check_in)
      const hasCheckedOut = !!(data && data.check_out)
      const canStartOT = hasCheckedIn && hasCheckedOut
      
      console.log("Today's check-in/out status:", { 
        hasCheckedIn, 
        hasCheckedOut, 
        canStartOT, 
        checkInTime: data?.check_in,
        checkOutTime: data?.check_out 
      })
      
      setHasCheckedInAndOut(canStartOT)
      setTodayCheckInData(data)
      
      return data
    } catch (error) {
      console.error("Error checking today's check-in status:", error)
      return null
    } finally {
      setCheckInValidationLoading(false)
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Fetch employee details using email
          const response = await fetch(`/api/employees/profile?email=${parsedUser.email}`);
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
  }, [])

  // Check today's check-in AND check-out status when employee data loads
  useEffect(() => {
    if (employeeData?.employee_id || user?.email) {
      const empId = employeeData?.employee_id || user?.email || "fallback"
      checkTodayCheckInStatus(empId)
    }
  }, [employeeData?.employee_id, user?.email])

  // Load saved state when employee data is available
  useEffect(() => {
    if (employeeData?.employee_id || user?.email) {
      const employeeId = employeeData?.employee_id || user?.email || "fallback"
      const savedState = loadStateFromMemory(employeeId)
      if (savedState) {
        setIsOTStarted(savedState.isOTStarted)
        setIsOTEnded(savedState.isOTEnded)
        setOTStartTime(savedState.otStartTime ? new Date(savedState.otStartTime) : null)
        setOTEndTime(savedState.otEndTime ? new Date(savedState.otEndTime) : null)
        setWorkType(savedState.workType)
        setWorkDescription(savedState.workDescription)
        setIsWorkSubmitted(savedState.isWorkSubmitted)
        // Note: Images are not restored from localStorage and need to be re-uploaded
      }
    }
  }, [employeeData, user])

  // Save state whenever it changes
  useEffect(() => {
    if (employeeData?.employee_id || user?.email) {
      const employeeId = employeeData?.employee_id || user?.email || "fallback"
      
      const currentState: OTState = {
        isOTStarted,
        isOTEnded,
        otStartTime: otStartTime?.toISOString() || null,
        otEndTime: otEndTime?.toISOString() || null,
        workType,
        workDescription,
        isWorkSubmitted,
        imageCount: uploadedImages.length,
        date: getTodayDate()
      }
      
      saveStateToMemory(employeeId, currentState)
    }
  }, [isOTStarted, isOTEnded, otStartTime, otEndTime, workType, workDescription, isWorkSubmitted, uploadedImages.length, employeeData, user])

  const employeeId = employeeData?.employee_id || "SD418"

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // UPDATED FUNCTION: Check if user has checked in AND checked out before starting OT
  const handleOTStart = () => {
    // Check if user has completed their regular day (check-in AND check-out)
    if (!hasCheckedInAndOut) {
      alert("You must complete your regular work day (check-in and check-out) before starting OT. Please go to the main dashboard to check out first.")
      return
    }

    const startMoment = new Date()
    setIsOTStarted(true)
    setOTStartTime(startMoment)
    setShowOTStartNotification(true)
    setIsOTEnded(false)

    setTimeout(() => {
      setShowOTStartNotification(false)
    }, 3000)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Calculate how many more images we can add
    const remainingSlots = 2 - uploadedImages.length
    
    if (files.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more image(s). Currently uploaded: ${uploadedImages.length}/2`)
      return
    }

    const newImages = [...uploadedImages, ...files]
    setUploadedImages(newImages)

    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPreviewImages(prev => [...prev, ...newPreviews])
    
    console.log('Images uploaded:', newImages.length, 'files')
    console.log('Preview URLs created:', newPreviews.length, 'previews')
    
    // Reset the input value so the same files can be selected again if needed
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    const newPreviews = previewImages.filter((_, i) => i !== index)
    
    if (previewImages[index]) {
      URL.revokeObjectURL(previewImages[index])
    }
    
    setUploadedImages(newImages)
    setPreviewImages(newPreviews)
  }

  const handleSubmitWork = () => {
    if (workType && workDescription && uploadedImages.length === 2) {
      setIsWorkSubmitted(true)
      setShowWorkSubmissionNotification(true)
      console.log('Work submitted with images:', uploadedImages.length)
      setTimeout(() => {
        setShowWorkSubmissionNotification(false)
      }, 3000)
    }
  }

  // Enhanced API Integration for OT End - Submit both images to backend
const handleOTEnd = async () => {
  // ✅ Check if work is submitted
  if (!isWorkSubmitted) {
    alert('Please submit your work details first before ending OT.');
    return;
  }

  // ✅ Check if exactly 2 images are uploaded
  if (uploadedImages.length !== 2) {
    alert('Please upload exactly 2 images before ending OT. Current images: ' + uploadedImages.length);
    return;
  }

  const endMoment = new Date();
  setOTEndTime(endMoment);
  setIsSubmittingWorkLog(true);

  try {
    console.log("Starting OT end process...");

    // ✅ Step 1: Get employee UUID from employeeData
    const employeeUUID = employeeData.id;

    // ✅ Step 1.1: Validate UUID format (safe check)
    const isValidUUID = (uuid: string): boolean =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

    if (!isValidUUID(employeeUUID)) {
      alert("Invalid employee UUID detected.");
      return;
    }

    console.log("Employee UUID being sent:", employeeUUID);

    // ✅ Step 2: Prepare FormData
    const formData = new FormData();
    formData.append('employee_id', employeeUUID); // Use UUID
    formData.append('ot_date', getTodayDate());
    formData.append('start_time', otStartTime?.toISOString() || '');
    formData.append('end_time', endMoment.toISOString());
    formData.append('reason', `${workType}: ${workDescription}`);

    // ✅ Step 3: Attach both images
    uploadedImages.forEach((image, index) => {
      formData.append(`image${index + 1}`, image);
      console.log(`Image ${index + 1} attached:`, image.name, image.size, 'bytes');
    });

    // ✅ Optional: Log form data for debug (updated part)
    console.log('FormData contents:');
    formData.forEach((value, key) => {
      if (value instanceof File) {
        console.log(`${key}: File - ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });

    // ✅ Step 4: Send to backend
    const response = await fetch('/api/employees/Overtime', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit OT request');
    }

    const result = await response.json();
    console.log("OT request submitted successfully:", result);

    setIsOTEnded(true);
  } catch (error) {
    console.error("Error in OT end process:", error);
    alert(`Failed to submit OT request: ${error instanceof Error ? error.message : "Unknown error"}`);
    setOTEndTime(null);
  } finally {
    setIsSubmittingWorkLog(false);
  }
};

  const handleStartNewOTSession = () => {
    // Clean up preview URLs
    previewImages.forEach(url => URL.revokeObjectURL(url))

    // Reset all states
    setIsOTStarted(false)
    setIsOTEnded(false)
    setOTStartTime(null)
    setOTEndTime(null)
    setWorkType("")
    setWorkDescription("")
    setIsWorkSubmitted(false)
    setUploadedImages([])
    setPreviewImages([])
    
    // Clear localStorage for this employee
    if (employeeData?.employee_id || user?.email) {
      const employeeId = employeeData?.employee_id || user?.email || "fallback"
      localStorage.removeItem(getStorageKey(employeeId))
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

 const calculateOTHours = (): string => {
  if (otStartTime && otEndTime) {
    const diffMs = otEndTime.getTime() - otStartTime.getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  }
  return '0h 0m';
};

  const getCurrentOTHours = () => {
    if (otStartTime && !otEndTime) {
      const now = new Date()
      const totalHours = (now.getTime() - otStartTime.getTime()) / (1000 * 60 * 60)
      return Math.max(0, parseFloat(totalHours.toFixed(2)))
    }

    if (otStartTime && otEndTime) {
      const totalHours = (otEndTime.getTime() - otStartTime.getTime()) / (1000 * 60 * 60)
      return Math.max(0, parseFloat(totalHours.toFixed(2)))
    }

    return 0
  }

  if (loading || checkInValidationLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  const displayName = employeeData?.name || user?.email?.split("@")[0] || "Employee"

  return (
   <div className="flex h-screen overflow-hidden">
       <Sidebar userType="team-lead" />
       <div className="flex-1 flex flex-col overflow-auto">
         <Header
           title="Team Lead Portal"
           subtitle={`Welcome, ${displayName}`}
           userType="team-lead"
         />

        {/* UPDATED: Check-in AND Check-out Warning Banner */}
        {!hasCheckedInAndOut && !isOTStarted && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="text-red-800 font-medium">Regular Work Day Completion Required</div>
                <div className="text-red-700 text-sm">
                  {todayCheckInData?.check_in && !todayCheckInData?.check_out ? (
                    "You have checked in but haven't checked out yet. Please complete your regular work day (check-out) before starting OT."
                  ) : !todayCheckInData?.check_in ? (
                    "You haven't checked in for today yet. Please check in and complete your regular work day before starting OT."
                  ) : (
                    "You must complete your regular work day (check-in and check-out) before starting OT."
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display current check-in/out status */}
        {todayCheckInData && hasCheckedInAndOut && (
          <div className="mx-6 mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-green-800 font-medium">Regular Work Day Completed</div>
                <div className="text-green-700 text-sm">
                  Checked in at {todayCheckInData.check_in} and checked out at {todayCheckInData.check_out}. You can start OT now.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display partial completion status */}
        {todayCheckInData?.check_in && !todayCheckInData?.check_out && !hasCheckedInAndOut && (
          <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-amber-800 font-medium">Work Day In Progress</div>
                <div className="text-amber-700 text-sm">
                  Checked in at {todayCheckInData.check_in}. Please check out first to complete your regular work day before starting OT.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Header Cards */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* OT Start Time Card */}
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Play className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">OT Start Time</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {otStartTime ? formatTime(otStartTime) : "Not Started"}
                  </p>
                  {otStartTime && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                      ✓ OT started successfully
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* OT End Time Card */}
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-rose-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <Square className="w-5 h-5 text-rose-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">OT End Time</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {otEndTime ? formatTime(otEndTime) : "Not Ended"}
                  </p>
                  {otEndTime && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">
                      ✓ OT ended successfully
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
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">OT Status</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {isOTEnded ? "Completed" : isOTStarted ? "In Progress" : "Not Started"}
                  </p>
                  <div className="flex items-center mt-2">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      isOTEnded ? 'bg-red-500' : isOTStarted ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <p className={`text-xs font-medium ${
                      isOTEnded ? 'text-red-600' : isOTStarted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {isOTEnded ? 'OT session completed' : isOTStarted ? 'Currently working OT' : 'Ready to start OT'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* OT Hours Card */}
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Timer className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">OT Hours</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {getCurrentOTHours().toFixed(2)} hours
                  </p>
                  <p className={`text-xs mt-1 font-medium ${
                    getCurrentOTHours() > 0 ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    {isOTStarted && !isOTEnded ? 'Live counting...' : getCurrentOTHours() > 0 ? `Total OT hours` : 'No OT hours yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Notifications */}
        {showOTStartNotification && (
          <div className="fixed top-20 right-6 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div>
              <div className="font-medium">OT Started Successfully</div>
              <div className="text-sm opacity-90">
                Started at {otStartTime?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </div>
            </div>
          </div>
        )}

        {showWorkSubmissionNotification && (
          <div className="fixed top-20 right-6 z-50 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div>
              <div className="font-medium">OT work submitted successfully</div>
            </div>
          </div>
        )}

        {/* WARNING: Only show if work is submitted but images are missing (after refresh) */}
        {isOTStarted && !isOTEnded && isWorkSubmitted && uploadedImages.length === 0 && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-red-800 text-sm font-medium">
                ⚠️ Images missing! Please re-upload your 2 work evidence images to end OT.
              </p>
            </div>
          </div>
        )}

        {/* WARNING: Only show if work is submitted but less than 2 images */}
        {isOTStarted && !isOTEnded && isWorkSubmitted && uploadedImages.length > 0 && uploadedImages.length < 2 && (
          <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <p className="text-amber-800 text-sm font-medium">
                Upload {2 - uploadedImages.length} more image(s) to complete your OT submission.
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
         <div className="flex-1 px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Post-OT End Summary View */}
              {isOTEnded ? (
                <div className="p-6 space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">OT Session Completed</h2>
                    <p className="text-gray-600">Your overtime request has been submitted successfully</p>
                  </div>

                  {/* OT Summary */}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-600">Start Time</div>
                        <div className="text-lg font-semibold text-gray-900">{formatTime(otStartTime!)}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">End Time</div>
                        <div className="text-lg font-semibold text-gray-900">{formatTime(otEndTime!)}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Total Hours</div>
                        <div className="text-lg font-semibold text-gray-900">{calculateOTHours()}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Status</div>
                        <div className="text-lg font-semibold text-amber-600">Pending Approval</div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="text-sm font-medium text-gray-600 mb-2">Work Details</div>
                      <div className="text-gray-900 mb-2"><strong>Type:</strong> {workType}</div>
                      <div className="text-gray-900 mb-3"><strong>Description:</strong> {workDescription}</div>
                      
                      {previewImages.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-600 mb-2">Uploaded Evidence</div>
                          <div className="flex space-x-2">
                            {previewImages.map((preview, index) => (
                              <img 
                                key={index}
                                src={preview} 
                                alt={`Work evidence ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-md border"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleStartNewOTSession}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                  >
                    Start New OT Session
                  </button>
                </div>
              ) : (
                <>
                  {/* Stage 1: OT Start */}
                  <div className="p-6 border-b">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full bg-green-500"></div>
                          <span className="text-lg font-medium text-gray-900">OT Start</span>
                        </div>
                      </div>
                    </div>
                    {!isOTStarted ? (
                      <div>
                        <button
                          onClick={handleOTStart}
                          disabled={!hasCheckedInAndOut}
                          className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                            hasCheckedInAndOut 
                              ? 'bg-green-500 hover:bg-green-600 text-white' 
                              : 'bg-gray-400 cursor-not-allowed text-white'
                          }`}
                        >
                          <Play className="w-4 h-4 text-white" />
                          <span>Start OT</span>
                        </button>
                        {!hasCheckedInAndOut && (
                          <p className="text-sm text-red-600 mt-2">
                            You must complete your regular work day (check-in and check-out) before starting OT.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-green-600 rounded-full" />
                        </div>
                        <div>
                          <div className="text-sm text-green-600 font-medium">
                            OT started at {formatTime(otStartTime!)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Current OT Hours: {getCurrentOTHours().toFixed(2)} hours
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage 2: Work Submission Form - Only show if OT started but work not submitted */}
                  {isOTStarted && !isWorkSubmitted && (
                    <div className="p-6 border-b">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-lg">📝</span>
                        </div>
                        <span className="text-lg font-medium text-gray-900">OT Work Submission Form</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Work Description</label>
                          <textarea
                            value={workDescription}
                            onChange={(e) => setWorkDescription(e.target.value)}
                            placeholder="Describe your OT work in detail..."
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
                            <option value="Work from office">Work from office</option>
                            <option value="Work from home">Work from home</option>
                          </select>
                        </div>
                        
                        {/* Image Upload Section */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Work Evidence (Required: 2 images)
                          </label>
                          
                          <div className="flex items-center space-x-4 mb-4">
                            <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <span className="text-sm text-gray-500">Upload Image</span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={uploadedImages.length >= 2}
                              />
                            </label>
                            
                            <div className="text-sm text-gray-600">
                              <p>• Upload exactly 2 images</p>
                              <p>• Max file size: 5MB each</p>
                              <p>• Accepted formats: JPG, PNG, GIF</p>
                              <p className="font-medium text-blue-600">
                                Uploaded: {uploadedImages.length}/2
                              </p>
                            </div>
                          </div>

                          {previewImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                              {previewImages.map((preview, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border"
                                  />
                                  <button
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                    Image {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleSubmitWork}
                          disabled={!workType || !workDescription || uploadedImages.length !== 2}
                          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Submit OT Work</span>
                        </button>
                        
                        {uploadedImages.length < 2 && (
                          <p className="text-sm text-red-600">Please upload exactly 2 images to submit your work.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stage 3: Work Submitted & OT End */}
                  {isOTStarted && isWorkSubmitted && (
                    <div className="p-6">
                      <div className="space-y-6">
                        {/* Work Submitted Status */}
                        <div>
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-sm">📝</span>
                            </div>
                            <span className="text-lg font-medium text-gray-900">OT Work Submission Form</span>
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
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-2">Uploaded Evidence</div>
                              <div className="flex space-x-2">
                                {previewImages.map((preview, index) => (
                                  <img 
                                    key={index}
                                    src={preview} 
                                    alt={`Work evidence ${index + 1}`}
                                    className="w-16 h-16 object-cover rounded-md border"
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-green-600">
                              <CheckCircle className="w-4 h-4 rounded-full flex items-center justify-center" />
                              <span className="text-sm font-medium">OT work submitted successfully</span>
                            </div>
                          </div>
                        </div>

                        {/* Re-upload Images Section - Only show if work submitted but no images */}
                        {uploadedImages.length === 0 && (
                          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-red-800 mb-3">
                              <strong>⚠️ Images Missing!</strong> Please re-upload your work evidence images.
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Re-upload Work Evidence (Required: 2 images)
                              </label>
                              
                              <div className="flex items-center space-x-4 mb-4">
                                <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-red-300 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                                  <div className="text-center">
                                    <Upload className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                    <span className="text-sm text-red-500">Re-upload Images</span>
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploadedImages.length >= 2}
                                  />
                                </label>
                                
                                <div className="text-sm text-red-600">
                                  <p>• Upload exactly 2 images</p>
                                  <p>• Max file size: 5MB each</p>
                                  <p>• Same images you uploaded before</p>
                                  <p className="font-medium text-red-700">
                                    Uploaded: {uploadedImages.length}/2
                                  </p>
                                </div>
                              </div>

                              {previewImages.length > 0 && (
                                <div className="grid grid-cols-2 gap-4">
                                  {previewImages.map((preview, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={preview}
                                        alt={`Re-uploaded ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg border border-green-300"
                                      />
                                      <button
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                        ✓ Image {index + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Additional image upload if less than 2 images */}
                        {uploadedImages.length > 0 && uploadedImages.length < 2 && (
                          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="text-amber-800 mb-3">
                              <strong>Upload {2 - uploadedImages.length} more image(s)</strong> to complete your submission.
                            </div>
                            
                            <div className="flex items-center space-x-4 mb-4">
                              <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                                <div className="text-center">
                                  <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                  <span className="text-sm text-amber-500">Add More Images</span>
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageUpload}
                                  className="hidden"
                                  disabled={uploadedImages.length >= 2}
                                />
                              </label>
                              
                              <div className="text-sm text-amber-600">
                                <p>• Need {2 - uploadedImages.length} more image(s)</p>
                                <p>• Max file size: 5MB each</p>
                                <p className="font-medium text-amber-700">
                                  Uploaded: {uploadedImages.length}/2
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* OT End Section */}
                        <div className="border-t pt-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center">
                              <Square className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full bg-red-500"></div>
                              <span className="text-lg font-medium text-gray-900">OT End</span>
                            </div>
                          </div>
                          <div className="mb-4">
                            <div className="text-sm text-gray-700">
                              <strong>Current OT Hours:</strong> {getCurrentOTHours().toFixed(2)} hours
                            </div>
                          </div>
                          <button
                            onClick={handleOTEnd}
                            disabled={isSubmittingWorkLog || uploadedImages.length !== 2}
                            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                          >
                            <Square className="w-4 h-4 text-white" />
                            <span>{isSubmittingWorkLog ? "Submitting to Team lead..." : "End OT"}</span>
                          </button>
                          {uploadedImages.length !== 2 && (
                            <p className="text-sm text-red-600 mt-2">Please upload exactly 2 images before ending OT.</p>
                          )}
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
