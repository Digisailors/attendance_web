"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2 } from "lucide-react"

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
  onAddEmployee: (employee: Employee) => Promise<void>
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

  // Use controlled or internal state for dialog open/close
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = controlledOnOpenChange || setInternalOpen

  const [formData, setFormData] = useState<FormData>({
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

  // Effect to populate form when editing
  useEffect(() => {
    if (isEdit && initialData) {
      const nameParts = initialData.name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      setFormData({
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
    }
  }, [isEdit, initialData])

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const generateEmployeeId = (firstName: string, lastName: string): string => {
    const firstInitial = firstName.charAt(0).toUpperCase()
    const lastInitial = lastName.charAt(0).toUpperCase()
    const randomNum = Math.floor(Math.random() * 999) + 1
    return `${firstInitial}${lastInitial}${randomNum.toString().padStart(3, "0")}`
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      let employeeData: Employee

      if (isEdit && initialData) {
        // Update existing employee
        employeeData = {
          ...initialData,
          name: `${formData.firstName} ${formData.lastName}`,
          designation: formData.designation,
          workMode: formData.workMode,
          phoneNumber: formData.phoneNumber,
          emailAddress: formData.emailAddress,
          address: formData.address,
          dateOfJoining: formData.dateOfJoining,
          experience: formData.experience,
        }
      } else {
        // Create new employee
        const employeeId = generateEmployeeId(formData.firstName, formData.lastName)
        employeeData = {
          id: employeeId,
          name: `${formData.firstName} ${formData.lastName}`,
          designation: formData.designation,
          workMode: formData.workMode,
          totalDays: 28,
          workingDays: 0,
          permissions: 0,
          leaves: 0,
          missedDays: 0,
          status: "Active" as Status,
          phoneNumber: formData.phoneNumber,
          emailAddress: formData.emailAddress,
          address: formData.address,
          dateOfJoining: formData.dateOfJoining,
          experience: formData.experience,
        }
      }

      await onAddEmployee(employeeData)

      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error adding/updating employee:", error)
      setError(error instanceof Error ? error.message : `Failed to ${isEdit ? 'update' : 'add'} employee`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = (): void => {
    setFormData({
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
    setError(null)
  }

  const handleCancel = (): void => {
    setIsOpen(false)
    resetForm()
  }

  // If this is being used as a controlled component (for editing), don't render the trigger
  if (isEdit && controlledOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {isEdit ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
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
        </DialogContent>
      </Dialog>
    )
  }

  // Regular modal with trigger for adding new employees
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-500 hover:bg-blue-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Employee</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Button type="submit" className="bg-blue-500 hover:bg-blue-600" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Employee"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddEmployeeModal