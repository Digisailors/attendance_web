"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  FileText,
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Briefcase,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "@/hooks/use-toast";

interface Intern {
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
  status: string;
  created_at: string;
  updated_at: string;
  aadhar_path?: string;
  photo_path?: string;
  marksheet_path?: string;
  resume_path?: string;
}

interface WorkLog {
  id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  work_type: string | null;
  description: string | null;
  total_hours: number | null;
  department: string | null;
  created_at: string;
}

export default function InternDetailPage() {
  const router = useRouter();
  const params = useParams();
  const internId = params?.id as string;

  const [intern, setIntern] = useState<Intern | null>(null);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [workLogsLoading, setWorkLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (internId) {
      fetchInternDetails();
      fetchWorkLogs();
    }
  }, [internId]);

  const fetchInternDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/interns/${internId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch intern details");
      }

      const data = await response.json();
      setIntern(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch intern details";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkLogs = async () => {
    try {
      setWorkLogsLoading(true);

      const response = await fetch(`/api/interns/${internId}/worklog`);

      if (!response.ok) {
        throw new Error("Failed to fetch work logs");
      }

      const data = await response.json();
      setWorkLogs(data.workLogs || []);
    } catch (err) {
      console.error("Error fetching work logs:", err);
      toast({
        title: "Warning",
        description: "Could not load work logs",
        variant: "destructive",
      });
    } finally {
      setWorkLogsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!intern || newStatus === intern.status) return;

    try {
      setUpdatingStatus(true);

      const response = await fetch(`/api/interns/${internId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setIntern({ ...intern, status: newStatus });

      toast({
        title: "Status Updated",
        description: `Intern status changed to ${newStatus}`,
        variant: "default",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "N/A";
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatHours = (hours: number | null) => {
    if (hours === null) return "N/A";
    return `${hours.toFixed(2)} hrs`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Inactive":
        return <XCircle className="w-4 h-4 text-gray-600" />;
      case "Completed":
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar userType="admin" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
              <p className="mt-4 text-gray-600">Loading intern details...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !intern) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar userType="admin" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <p className="mt-4 text-gray-600">
                {error || "Intern not found"}
              </p>
              <Button
                onClick={() => router.push("/admin/intern-dashboard")}
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Interns
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin/intern-dashboard")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Intern Details
                  </h1>
                  <p className="text-sm text-gray-500">
                    View intern information and work logs
                  </p>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Intern Information Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <CardTitle>Personal Information</CardTitle>
                    </div>

                    {/* Status Dropdown Toggle */}
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 font-medium">
                        Change Status:
                      </span>
                      <Select
                        value={intern.status}
                        onValueChange={handleStatusChange}
                        disabled={updatingStatus}
                      >
                        <SelectTrigger className="w-[160px]">
                          {updatingStatus ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            getStatusIcon(intern.status)
                          )}
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Active</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Inactive">
                            <div className="flex items-center space-x-2">
                              <XCircle className="w-4 h-4 text-gray-600" />
                              <span>Inactive</span>
                            </div>
                          </SelectItem>
                          {/* <SelectItem value="Completed">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                              <span>Completed</span>
                            </div>
                          </SelectItem> */}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <User className="w-4 h-4" />
                        <span>Name</span>
                      </div>
                      <p className="font-medium text-gray-900">{intern.name}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Mail className="w-4 h-4" />
                        <span>Email</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {intern.email}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Phone className="w-4 h-4" />
                        <span>Phone</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {intern.phone_number}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Building2 className="w-4 h-4" />
                        <span>College</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {intern.college}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <GraduationCap className="w-4 h-4" />
                        <span>Department</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {intern.department}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Year/Passed Out</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {intern.year_or_passed_out}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Briefcase className="w-4 h-4" />
                        <span>Domain</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {intern.domain_in_office}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>Mentor</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {intern.mentor_name || "Not Assigned"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <DollarSign className="w-4 h-4" />
                        <span>Type</span>
                      </div>
                      <Badge
                        className={
                          intern.paid_or_unpaid === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {intern.paid_or_unpaid}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <AlertCircle className="w-4 h-4" />
                        <span>Current Status</span>
                      </div>
                      <Badge className={getStatusBadgeClass(intern.status)}>
                        {intern.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Logs Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle>Work Logs</CardTitle>
                        <CardDescription>
                          Daily attendance and work records
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchWorkLogs}
                      disabled={workLogsLoading}
                    >
                      {workLogsLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {workLogsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : workLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No work logs found</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Work logs will appear here once the intern starts
                        checking in
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Date</TableHead>
                            <TableHead>Check In</TableHead>
                            <TableHead>Check Out</TableHead>
                            <TableHead>Work Type</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">
                                {formatDate(log.date)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-green-600" />
                                  <span>{formatTime(log.check_in)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {log.check_out ? (
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-red-600" />
                                    <span>{formatTime(log.check_out)}</span>
                                  </div>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    Not checked out
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {log.work_type ? (
                                  <Badge
                                    className={
                                      log.work_type === "Work from Office"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-purple-100 text-purple-800"
                                    }
                                  >
                                    {log.work_type}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {formatHours(log.total_hours)}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {log.description ? (
                                  <p className="text-sm text-gray-600 truncate">
                                    {log.description}
                                  </p>
                                ) : (
                                  <span className="text-gray-400">
                                    No description
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
