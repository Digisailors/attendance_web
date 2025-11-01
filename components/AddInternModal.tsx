import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Upload, X, Loader2, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InternData {
  name: string;
  college: string;
  yearOrPassedOut: string;
  department: string;
  phoneNumber: string;
  domainInOffice: string;
  email: string;
  paidOrUnpaid: "Paid" | "Pending" | "";
  mentorName?: string;
  documents: {
    aadhar: File | null;
    photo: File | null;
    marksheet: File | null;
    resume: File | null;
  };
}

interface ExistingIntern {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  college: string;
  year_or_passed_out: string;
  department: string;
  domain_in_office: string;
  paid_or_unpaid: string;
  mentor_name?: string;
  aadhar_path?: string;
  photo_path?: string;
  marksheet_path?: string;
  resume_path?: string;
}

interface AddInternModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  existingIntern?: ExistingIntern;
  onAddIntern?: (internData: InternData) => Promise<void>;
  onUpdateIntern?: () => Promise<void>;
}

export default function AddInternModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  editMode = false,
  existingIntern,
  onAddIntern,
  onUpdateIntern,
}: AddInternModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [internData, setInternData] = useState<InternData>({
    name: "",
    college: "",
    yearOrPassedOut: "",
    department: "",
    phoneNumber: "",
    domainInOffice: "",
    email: "",
    paidOrUnpaid: "Pending",
    mentorName: "",
    documents: {
      aadhar: null,
      photo: null,
      marksheet: null,
      resume: null,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine if controlled or uncontrolled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange || (() => {})
    : setInternalOpen;

  // Populate form when editing
  useEffect(() => {
    if (editMode && existingIntern && open) {
      setInternData({
        name: existingIntern.name,
        college: existingIntern.college,
        yearOrPassedOut: existingIntern.year_or_passed_out,
        department: existingIntern.department,
        phoneNumber: existingIntern.phone_number,
        domainInOffice: existingIntern.domain_in_office,
        email: existingIntern.email,
        paidOrUnpaid: existingIntern.paid_or_unpaid as "Pending" | "Paid",
        mentorName: existingIntern.mentor_name || "",
        documents: {
          aadhar: null,
          photo: null,
          marksheet: null,
          resume: null,
        },
      });
    }
  }, [editMode, existingIntern, open]);

  const handleInputChange = (field: keyof InternData, value: string) => {
    setInternData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileChange = (
    documentType: keyof InternData["documents"],
    file: File | null
  ) => {
    setInternData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: file,
      },
    }));
    if (errors[`documents.${documentType}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`documents.${documentType}`];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!internData.name.trim()) newErrors.name = "Name is required";
    if (!internData.college.trim()) newErrors.college = "College is required";
    if (!internData.yearOrPassedOut.trim())
      newErrors.yearOrPassedOut = "Year/Passed Out is required";
    if (!internData.department.trim())
      newErrors.department = "Department is required";
    if (!internData.phoneNumber.trim())
      newErrors.phoneNumber = "Phone number is required";
    if (!internData.domainInOffice.trim())
      newErrors.domainInOffice = "Domain is required";
    if (!internData.email.trim()) newErrors.email = "Email is required";
    if (!internData.paidOrUnpaid)
      newErrors.paidOrUnpaid = "Please select Paid or Unpaid";

    // Phone number validation (10 digits)
    if (internData.phoneNumber && !/^\d{10}$/.test(internData.phoneNumber)) {
      newErrors.phoneNumber = "Phone number must be 10 digits";
    }

    // Email validation
    if (
      internData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(internData.email)
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    // Document validation (only required for new interns)
    if (!editMode) {
      if (!internData.documents.aadhar)
        newErrors["documents.aadhar"] = "Aadhar document is required";
      if (!internData.documents.photo)
        newErrors["documents.photo"] = "Photo is required";
      if (!internData.documents.marksheet)
        newErrors["documents.marksheet"] = "Marksheet is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (editMode && existingIntern) {
        // Update existing intern
        const formData = new FormData();
        formData.append("name", internData.name);
        formData.append("college", internData.college);
        formData.append("yearOrPassedOut", internData.yearOrPassedOut);
        formData.append("department", internData.department);
        formData.append("phoneNumber", internData.phoneNumber);
        formData.append("domainInOffice", internData.domainInOffice);
        formData.append("email", internData.email);
        formData.append("paidOrUnpaid", internData.paidOrUnpaid);
        
        // Append mentor name (can be empty string)
        if (internData.mentorName) {
          formData.append("mentorName", internData.mentorName);
        }

        // Append files only if they are provided
        if (internData.documents.aadhar) {
          formData.append("aadhar", internData.documents.aadhar);
        }
        if (internData.documents.photo) {
          formData.append("photo", internData.documents.photo);
        }
        if (internData.documents.marksheet) {
          formData.append("marksheet", internData.documents.marksheet);
        }
        if (internData.documents.resume) {
          formData.append("resume", internData.documents.resume);
        }

        const response = await fetch(`/api/interns/${existingIntern.id}`, {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update intern");
        }

        toast({
          title: "Success",
          description: `Intern ${internData.name} has been updated successfully`,
          variant: "default",
        });

        if (onUpdateIntern) {
          await onUpdateIntern();
        }
      } else {
        // Create new intern
        const formData = new FormData();
        formData.append("name", internData.name);
        formData.append("college", internData.college);
        formData.append("yearOrPassedOut", internData.yearOrPassedOut);
        formData.append("department", internData.department);
        formData.append("phoneNumber", internData.phoneNumber);
        formData.append("domainInOffice", internData.domainInOffice);
        formData.append("email", internData.email);
        formData.append("paidOrUnpaid", internData.paidOrUnpaid);
        
        // Append mentor name (can be empty string)
        if (internData.mentorName) {
          formData.append("mentorName", internData.mentorName);
        }

        // Append files
        if (internData.documents.aadhar) {
          formData.append("aadhar", internData.documents.aadhar);
        }
        if (internData.documents.photo) {
          formData.append("photo", internData.documents.photo);
        }
        if (internData.documents.marksheet) {
          formData.append("marksheet", internData.documents.marksheet);
        }
        if (internData.documents.resume) {
          formData.append("resume", internData.documents.resume);
        }

        const response = await fetch("/api/interns", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add intern");
        }

        toast({
          title: "Success",
          description: `Intern ${internData.name} has been added successfully`,
          variant: "default",
        });

        if (onAddIntern) {
          await onAddIntern(internData);
        }
      }

      // Reset form and close modal
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Error saving intern:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${
                editMode ? "update" : "add"
              } intern. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInternData({
      name: "",
      college: "",
      yearOrPassedOut: "",
      department: "",
      phoneNumber: "",
      domainInOffice: "",
      email: "",
      paidOrUnpaid: "",
      mentorName: "",
      documents: {
        aadhar: null,
        photo: null,
        marksheet: null,
        resume: null,
      },
    });
    setErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  const FileUploadField = ({
    label,
    documentType,
    required = true,
    accept = ".pdf,.jpg,.jpeg,.png",
  }: {
    label: string;
    documentType: keyof InternData["documents"];
    required?: boolean;
    accept?: string;
  }) => {
    const file = internData.documents[documentType];
    const errorKey = `documents.${documentType}`;
    const hasExistingFile =
      editMode &&
      existingIntern &&
      existingIntern[`${documentType}_path` as keyof ExistingIntern];

    return (
      <div className="space-y-2">
        <Label htmlFor={documentType}>
          {label}{" "}
          {required && !editMode && <span className="text-red-500">*</span>}
          {editMode && !required && (
            <span className="text-gray-500 text-xs"> (Optional)</span>
          )}
        </Label>
        <div className="flex items-center space-x-2">
          <Input
            id={documentType}
            type="file"
            accept={accept}
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null;
              handleFileChange(documentType, selectedFile);
            }}
            className={`flex-1 ${errors[errorKey] ? "border-red-500" : ""}`}
          />
          {file && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFileChange(documentType, null)}
              className="px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        {file && (
          <p className="text-sm text-green-600 flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            {file.name}
          </p>
        )}
        {editMode && hasExistingFile && !file && (
          <p className="text-sm text-blue-600">
            Current file exists (upload new file to replace)
          </p>
        )}
        {errors[errorKey] && (
          <p className="text-sm text-red-500">{errors[errorKey]}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!editMode && (
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Intern
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? "Edit Intern" : "Add New Intern"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update the intern's information. Only upload new documents if you want to replace existing ones."
              : "Fill in the intern's information. Fields marked with * are required."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={internData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={internData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="intern@example.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  value={internData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  placeholder="10-digit phone number"
                  maxLength={10}
                  className={errors.phoneNumber ? "border-red-500" : ""}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-500">{errors.phoneNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Educational Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Educational Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="college">
                  College <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="college"
                  value={internData.college}
                  onChange={(e) => handleInputChange("college", e.target.value)}
                  placeholder="Enter college name"
                  className={errors.college ? "border-red-500" : ""}
                />
                {errors.college && (
                  <p className="text-sm text-red-500">{errors.college}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearOrPassedOut">
                  Year / Passed Out <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="yearOrPassedOut"
                  value={internData.yearOrPassedOut}
                  onChange={(e) =>
                    handleInputChange("yearOrPassedOut", e.target.value)
                  }
                  placeholder="e.g., 2024 or Final Year"
                  className={errors.yearOrPassedOut ? "border-red-500" : ""}
                />
                {errors.yearOrPassedOut && (
                  <p className="text-sm text-red-500">
                    {errors.yearOrPassedOut}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">
                  Department in College <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="department"
                  value={internData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  placeholder="e.g., Computer Science"
                  className={errors.department ? "border-red-500" : ""}
                />
                {errors.department && (
                  <p className="text-sm text-red-500">{errors.department}</p>
                )}
              </div>
            </div>
          </div>

          {/* Office Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Office Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domainInOffice">
                  Domain in Office <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="domainInOffice"
                  value={internData.domainInOffice}
                  onChange={(e) =>
                    handleInputChange("domainInOffice", e.target.value)
                  }
                  placeholder="e.g., Web Development, Data Science"
                  className={errors.domainInOffice ? "border-red-500" : ""}
                />
                {errors.domainInOffice && (
                  <p className="text-sm text-red-500">
                    {errors.domainInOffice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidOrUnpaid">
                  Paid or Unpaid <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={internData.paidOrUnpaid}
                  onValueChange={(value) =>
                    handleInputChange("paidOrUnpaid", value)
                  }
                >
                  <SelectTrigger
                    className={errors.paidOrUnpaid ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                {errors.paidOrUnpaid && (
                  <p className="text-sm text-red-500">{errors.paidOrUnpaid}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mentorName">Mentor Name (Optional)</Label>
                <Input
                  id="mentorName"
                  value={internData.mentorName || ""}
                  onChange={(e) =>
                    handleInputChange("mentorName", e.target.value)
                  }
                  placeholder="Enter mentor's name"
                />
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Document Upload
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploadField
                label="Aadhar Card"
                documentType="aadhar"
                required={!editMode}
              />
              <FileUploadField
                label="Passport-size Photo"
                documentType="photo"
                required={!editMode}
                accept=".jpg,.jpeg,.png"
              />
              <FileUploadField
                label="Marksheet"
                documentType="marksheet"
                required={!editMode}
              />
              <FileUploadField
                label="Resume (Optional)"
                documentType="resume"
                required={false}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editMode ? "Updating..." : "Adding Intern..."}
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                {editMode ? "Update Intern" : "Add Intern"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}