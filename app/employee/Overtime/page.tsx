"use client"

import { useState, useEffect } from "react"
import { Play, Square, Clock, Calendar, CheckCircle, Timer, Upload, X, Image as ImageIcon } from "lucide-react"
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
  uploadedImages: File[]
  date: string
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

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Helper function to get storage key for employee
  const getStorageKey = (employeeId: string) => {
    return `employee_ot_state_${employeeId}_${getTodayDate()}`
  }

  // Save state to localStorage
  const saveStateToStorage = (employeeId: string, state: OTState) => {
    try {
      localStorage.setItem(getStorageKey(employeeId), JSON.stringify({
        ...state,
        uploadedImages: [] // Don't save files in localStorage
      }))
      console.log(`OT State saved for employee ${employeeId}:`, state)
    } catch (error) {
      console.error("Error saving OT state:", error)
    }
  }

  // Load state from localStorage
  const loadStateFromStorage = (employeeId: string): OTState | null => {
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

  // Clean up old states (optional - clean states older than 7 days)
  const cleanupOldStates = (employeeId: string) => {
    try {
      const keys = Object.keys(localStorage).filter(
        key => key.startsWith(`employee_ot_state_${employeeId}_`)
      )
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 7)
      
      keys.forEach(key => {
        const dateStr = key.split('_').pop()
        if (dateStr && new Date(dateStr) < cutoffDate) {
          localStorage.removeItem(key)
        }
      })
      console.log(`Cleaned up old OT states for employee ${employeeId}`)
    } catch (error) {
      console.error("Error cleaning up old OT states:", error)
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

  // Load saved state when employee data is available
  useEffect(() => {
    if (employeeData?.employee_id || user?.email) {
      const employeeId = employeeData?.employee_id || user?.email || "fallback"
      
      // Clean up old states
      cleanupOldStates(employeeId)
      
      // Load today's state
      const savedState = loadStateFromStorage(employeeId)
      if (savedState) {
        setIsOTStarted(savedState.isOTStarted)
        setIsOTEnded(savedState.isOTEnded)
        setOTStartTime(savedState.otStartTime ? new Date(savedState.otStartTime) : null)
        setOTEndTime(savedState.otEndTime ? new Date(savedState.otEndTime) : null)
        setWorkType(savedState.workType)
        setWorkDescription(savedState.workDescription)
        setIsWorkSubmitted(savedState.isWorkSubmitted)
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
        uploadedImages,
        date: getTodayDate()
      }
      
      saveStateToStorage(employeeId, currentState)
    }
  }, [isOTStarted, isOTEnded, otStartTime, otEndTime, workType, workDescription, isWorkSubmitted, uploadedImages, employeeData, user])

  // Get employee ID from employee data or fallback
  const employeeId = employeeData?.employee_id || "SD418"

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleOTStart = () => {
    const startMoment = new Date()
    setIsOTStarted(true)
    setOTStartTime(startMoment)
    setShowOTStartNotification(true)
    setIsOTEnded(false)

    // Hide notification after 3 seconds
    setTimeout(() => {
      setShowOTStartNotification(false)
    }, 3000)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + uploadedImages.length > 2) {
      alert('You can only upload maximum 2 images')
      return
    }

    const newImages = [...uploadedImages, ...files]
    setUploadedImages(newImages)

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPreviewImages(prev => [...prev, ...newPreviews])
  }

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    const newPreviews = previewImages.filter((_, i) => i !== index)
    
    // Cleanup URL
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
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowWorkSubmissionNotification(false)
      }, 3000)
    }
  }

  const handleOTEnd = async () => {
    const endMoment = new Date()
    setOTEndTime(endMoment)
    setIsSubmittingWorkLog(true)

    try {
      console.log("Starting OT end process...")

      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log("OT work log and submission process completed")
      setIsOTEnded(true)
    } catch (error) {
      console.error("Error in OT end process:", error)
      alert(`Failed to save OT work log: ${error instanceof Error ? error.message : "Unknown error"}`)
      setOTEndTime(null)
    } finally {
      setIsSubmittingWorkLog(false)
    }
  }

  const handleStartNewOTSession = () => {
    // Clear today's state
    if (employeeData?.employee_id || user?.email) {
      const empId = employeeData?.employee_id || user?.email || "fallback"
      localStorage.removeItem(getStorageKey(empId))
    }

    // Cleanup preview URLs
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
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const calculateOTHours = () => {
    if (otStartTime && otEndTime) {
      const totalHours = (otEndTime.getTime() - otStartTime.getTime()) / (1000 * 60 * 60);
      return Math.max(0, totalHours); // All OT hours are overtime
    }
    return 0;
  }

 const getCurrentOTHours = () => {
  if (otStartTime && !otEndTime) {
    const now = new Date(); 
    const totalHours = (now.getTime() - otStartTime.getTime()) / (1000 * 60 * 60);
    return Math.max(0, parseFloat(totalHours.toFixed(2))); // Round to 2 decimal places
  }

  // When both start and end times are available
  if (otStartTime && otEndTime) {
    const totalHours = (otEndTime.getTime() - otStartTime.getTime()) / (1000 * 60 * 60);
    return Math.max(0, parseFloat(totalHours.toFixed(2)));
  }

  return 0;
};


  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="flex min-h-screen overflow-auto bg-gray-50">
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
        <Header title="OT Portal" subtitle={`Welcome back, ${displayName}`} userType="employee" />

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
                    {getCurrentOTHours().toFixed(2)} minutes
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

        {/* Success Notification */}
        {showOTStartNotification && (
          <div className="fixed top-20 right-6 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <div>
              <div className="font-medium">OT Started Successfully</div>
              <div className="text-sm opacity-90">
                Started at{" "}
                {otStartTime?.toLocaleTimeString("en-US", {
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
              <div className="font-medium">OT work submitted successfully</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-180px)] px-4">
          <div className="absolute top-[45%] w-full max-w-2xl">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Post-OT End Summary View */}
              {isOTEnded ? (
                <div className="p-6 space-y-6">
                  {/* OT Start Summary */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center">
                      <Play className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-lg font-medium text-gray-900">OT Start</span>
                  </div>
                  <div className="ml-12 mb-6">
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">OT started at {formatTime(otStartTime!)}</span>
                    </div>
                  </div>

                  {/* Work Submission Summary */}
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-lg">📝</span>
                      </div>
                      <span className="text-lg font-medium text-gray-900">OT Work Submission</span>
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
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Uploaded Images</div>
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
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Submitted for team lead review</span>
                      </div>
                    </div>
                  </div>

                  {/* OT End Summary */}
                  <div className="border-t pt-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center">
                        <Square className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-lg font-medium text-gray-900">OT End</span>
                    </div>
                    <div className="ml-12 space-y-2">
                      <div className="flex items-center space-x-2 text-red-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">OT ended at {formatTime(otEndTime!)}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <strong>Total OT Hours:</strong> {calculateOTHours().toFixed(2)} hours
                      </div>
                    </div>
                  </div>

                  {/* Start New OT Session Button */}
                  <div className="border-t pt-6">
                    <button
                      onClick={handleStartNewOTSession}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                    >
                      Start New OT Session
                    </button>
                  </div>
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
                          <div
                            className={`w-4 h-4 rounded-full ${isOTStarted ? "bg-green-500" : "bg-green-500"}`}
                          ></div>
                          <span className="text-lg font-medium text-gray-900">OT Start</span>
                        </div>
                      </div>
                    </div>
                    {!isOTStarted ? (
                      <button
                        onClick={handleOTStart}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Play className="w-4 h-4 text-white" />
                        <span>Start OT</span>
                      </button>
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
                            Current OT Hours: {getCurrentOTHours().toFixed(2)} minutes
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage 2: Work Submission Form */}
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
                          
                          {/* Image Upload Button */}
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

                          {/* Image Previews */}
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
                            disabled={isSubmittingWorkLog}
                            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                          >
                            <Square className="w-4 h-4 text-white" />
                            <span>{isSubmittingWorkLog ? "Saving..." : "End OT"}</span>
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