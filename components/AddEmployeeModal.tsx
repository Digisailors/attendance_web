"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2, RefreshCw } from "lucide-react"

type WorkMode = "Office" | "WFH" | "Hybrid"
type Status = "Active" | "Warning" | "On Leave"

interface Employee {
  id: string
  name: string
  designation: string
  workMode: WorkMode
  totalDays: number
  workingDays: number
  permissions: number
  leaves: number
  missedDays: number
  status: Status
  phoneNumber?: string
  emailAddress?: string
  address?: string
  dateOfJoining?: string
  experience?: string
}

interface FormData {
  employeeId: string
  firstName: string
  lastName: string
  designation: string
  workMode: WorkMode
  phoneNumber: string
  emailAddress: string
  address: string
  dateOfJoining: string
  experience: string
}

interface AddEmployeeModalProps {
  onAddEmployee: (employee: Employee, originalId?: string) => Promise<void>
  initialData?: Employee | null
  isEdit?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ 
  onAddEmployee, 
  initialData = null, 
  isEdit = false,
  isOpen: controlledOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [originalEmployeeId, setOriginalEmployeeId] = useState<string>("")

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = controlledOnOpenChange || setInternalOpen

  const [formData, setFormData] = useState<FormData>({
    employeeId: "",
    firstName: "",
    lastName: "",
    designation: "",
    workMode: "Office",
    phoneNumber: "",
    emailAddress: "",
    address: "",
    dateOfJoining: "",
    experience: "",
  })

 const calculateExperience = (joiningDate: string): string => {
  const startDate = new Date(joiningDate)
  const currentDate = new Date()

  let years = currentDate.getFullYear() - startDate.getFullYear()
  let months = currentDate.getMonth() - startDate.getMonth()
  let days = currentDate.getDate() - startDate.getDate()

  if (days < 0) {
    months -= 1
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
    days += prevMonth.getDate()
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`)
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`)
  parts.push(`${days} day${days > 1 ? "s" : ""}`)

  return parts.join(", ")
}

  useEffect(() => {
    if (isEdit && initialData) {
      const nameParts = initialData.name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      setOriginalEmployeeId(initialData.id)

      setFormData({
        employeeId: initialData.id,
        firstName,
        lastName,
        designation: initialData.designation,
        workMode: initialData.workMode,
        phoneNumber: initialData.phoneNumber || "",
        emailAddress: initialData.emailAddress || "",
        address: initialData.address || "",
        dateOfJoining: initialData.dateOfJoining || "",
        experience: initialData.experience || "",
      })
    } else if (!isEdit) {
      generateNewEmployeeId()
      setOriginalEmployeeId("")
    }
  }, [isEdit, initialData, isOpen])

  useEffect(() => {
    if (!formData.dateOfJoining) return

    const updateExp = () => {
      setFormData(prev => ({
        ...prev,
        experience: calculateExperience(prev.dateOfJoining)
      }))
    }

    updateExp()

    const interval = setInterval(updateExp, 24 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [formData.dateOfJoining])

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      }

      if (field === "dateOfJoining" && value) {
        updated.experience = calculateExperience(value)
      }

      return updated
    })

    if (error) {
      setError(null)
    }
  }

  const generateEmployeeId = (firstName: string, lastName: string): string => {
    const firstInitial = firstName.charAt(0).toUpperCase() || 'A'
    const lastInitial = lastName.charAt(0).toUpperCase() || 'B'
    const randomNum = Math.floor(Math.random() * 999) + 1
    return `${firstInitial}${lastInitial}${randomNum.toString().padStart(3, "0")}`
  }

  const generateNewEmployeeId = (): void => {
    const newId = generateEmployeeId(formData.firstName || 'New', formData.lastName || 'Employee')
    setFormData(prev => ({
      ...prev,
      employeeId: newId
    }))
  }

  const validateEmployeeId = (employeeId: string): boolean => {
    const idRegex = /^[A-Za-z0-9]{2,10}$/
    return idRegex.test(employeeId)
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateForm = (): string | null => {
    if (!formData.employeeId.trim()) return 'Employee ID is required'
    if (!validateEmployeeId(formData.employeeId)) return 'Employee ID should be 2-10 characters long and contain only letters and numbers'
    if (!formData.firstName.trim()) return 'First name is required'
    if (!formData.lastName.trim()) return 'Last name is required'
    if (!formData.designation.trim()) return 'Designation is required'
    if (!formData.phoneNumber.trim()) return 'Phone number is required'
    if (!validatePhone(formData.phoneNumber)) return 'Please enter a valid phone number'
    if (!formData.emailAddress.trim()) return 'Email address is required'
    if (!validateEmail(formData.emailAddress)) return 'Please enter a valid email address'
    if (!formData.address.trim()) return 'Address is required'
    if (!formData.dateOfJoining) return 'Date of joining is required'
    if (!formData.experience.trim()) return 'Experience is required'
    return null
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const validationError = validateForm()
      if (validationError) {
        setError(validationError)
        setIsLoading(false)
        return
      }

      let employeeData: Employee

      if (isEdit && initialData) {
        employeeData = {
          ...initialData,
          id: formData.employeeId.trim(),
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          designation: formData.designation.trim(),
          workMode: formData.workMode,
          phoneNumber: formData.phoneNumber.trim(),
          emailAddress: formData.emailAddress.trim().toLowerCase(),
          address: formData.address.trim(),
          dateOfJoining: formData.dateOfJoining,
          experience: formData.experience.trim(),
        }

        await onAddEmployee(employeeData, originalEmployeeId)
      } else {
        employeeData = {
          id: formData.employeeId.trim(),
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          designation: formData.designation.trim(),
          workMode: formData.workMode,
          totalDays: 28,
          workingDays: 0,
          permissions: 0,
          leaves: 0,
          missedDays: 0,
          status: "Active" as Status,
          phoneNumber: formData.phoneNumber.trim(),
          emailAddress: formData.emailAddress.trim().toLowerCase(),
          address: formData.address.trim(),
          dateOfJoining: formData.dateOfJoining,
          experience: formData.experience.trim(),
        }

        await onAddEmployee(employeeData)
      }

      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error adding/updating employee:", error)

      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          setError(`Employee ID ${formData.employeeId} already exists. Please use a different ID.`)
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError(error.message)
        }
      } else {
        setError(`Failed to ${isEdit ? 'update' : 'add'} employee. Please try again.`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = (): void => {
    setFormData({
      employeeId: "",
      firstName: "",
      lastName: "",
      designation: "",
      workMode: "Office",
      phoneNumber: "",
      emailAddress: "",
      address: "",
      dateOfJoining: "",
      experience: "",
    })
    setOriginalEmployeeId("")
    setError(null)
  }

  const handleCancel = (): void => {
    setIsOpen(false)
    resetForm()
  }

   const modalContent = (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">
          {isEdit ? 'Edit Employee' : 'Add New Employee'}
        </DialogTitle>
        <DialogDescription>
          {isEdit ? 'Update employee information below.' : 'Fill in the employee details to add them to the system.'}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee ID Field */}
        <div className="space-y-2">
          <Label htmlFor="employeeId">Employee ID *</Label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                id="employeeId"
                placeholder="Enter Employee ID (e.g., AB001)"
                value={formData.employeeId}
                onChange={(e) => handleInputChange("employeeId", e.target.value)}
                required
                disabled={isLoading} // Only disable when loading
                aria-describedby="employeeId-help"
              />
            </div>
            {!isEdit && !isLoading && (
              <Button
                type="button"
                variant="outline"
                onClick={generateNewEmployeeId}
                disabled={isLoading}
                className="shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate
              </Button>
            )}
          </div>
         <p id="employeeId-help" className="text-gray-500 text-xs">
  Employee ID should be 2-10 characters long and contain only letters and numbers
</p>

        </div>

        {/* First Row - First Name and Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              placeholder="Enter First name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              placeholder="Enter Last name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Second Row - Designation and Work Mode */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="designation">Designation *</Label>
            <Input
              id="designation"
              placeholder="Enter your Designation"
              value={formData.designation}
              onChange={(e) => handleInputChange("designation", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workMode">Work Mode *</Label>
            <Select
              value={formData.workMode}
              onValueChange={(value: WorkMode) => handleInputChange("workMode", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Work Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="WFH">Work From Home</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Third Row - Phone Number and Email Address */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              placeholder="+1234567890"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              required
              disabled={isLoading}
              type="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailAddress">Email Address *</Label>
            <Input
              id="emailAddress"
              type="email"
              placeholder="Enter Email Address"
              value={formData.emailAddress}
              onChange={(e) => handleInputChange("emailAddress", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Fourth Row - Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <Textarea
            id="address"
            placeholder="Address Details"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            className="min-h-[100px]"
            required
            disabled={isLoading}
          />
        </div>

        {/* Fifth Row - Date of Joining and Experience */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfJoining">Date of Joining *</Label>
            <Input
              id="dateOfJoining"
              type="date"
              value={formData.dateOfJoining}
              onChange={(e) => handleInputChange("dateOfJoining", e.target.value)}
              required
              disabled={isLoading}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Experience *</Label>
            <Input
              id="experience"
              placeholder="e.g., 5 years"
              value={formData.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-blue-500 hover:bg-blue-600" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEdit ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              isEdit ? 'Update Employee' : 'Add Employee'
            )}
          </Button>
        </div>
      </form>
    </>
  )

  if (isEdit && controlledOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {modalContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-500 hover:bg-blue-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {modalContent}
      </DialogContent>
    </Dialog>
  )
}

export default AddEmployeeModal