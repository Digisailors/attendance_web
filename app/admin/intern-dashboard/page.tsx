"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Eye,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AddInternModal from "@/components/AddInternModal";

type InternStatus = "Active" | "Inactive" | "Completed";
type PaidStatus = "Paid" | "Unpaid";

interface Intern {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  college: string;
  year_or_passed_out: string;
  department: string;
  domain_in_office: string;
  paid_or_unpaid: PaidStatus;
  status: InternStatus;
  created_at: string;
  updated_at: string;
  aadhar_path?: string;
  photo_path?: string;
  marksheet_path?: string;
  resume_path?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ApiResponse {
  interns: Intern[];
  pagination: PaginationInfo;
}

const getStatusBadge = (status: InternStatus): string => {
  const colors: Record<InternStatus, string> = {
    Active: "bg-green-100 text-green-800",
    Inactive: "bg-gray-100 text-gray-800",
    Completed: "bg-blue-100 text-blue-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getPaidStatusBadge = (status: PaidStatus): string => {
  const colors: Record<PaidStatus, string> = {
    Paid: "bg-emerald-100 text-emerald-800",
    Unpaid: "bg-amber-100 text-amber-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function InternsOverview() {
  const [internsData, setInternsData] = useState<Intern[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status");
  const [selectedPaidStatus, setSelectedPaidStatus] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedInterns, setSelectedInterns] = useState<Set<string>>(
    new Set()
  );
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [internToEdit, setInternToEdit] = useState<Intern | null>(null);

  const router = useRouter();

  // Fetch interns from API
  const fetchInterns = useCallback(
    async (page = 1, resetSearch = false) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });

        if (searchTerm.trim() && !resetSearch) {
          params.append("search", searchTerm.trim());
        }
        if (selectedStatus && selectedStatus !== "All Status") {
          params.append("status", selectedStatus);
        }
        if (selectedPaidStatus && selectedPaidStatus !== "All") {
          params.append("paid_or_unpaid", selectedPaidStatus);
        }

        const response = await fetch(`/api/interns?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch interns: ${response.status}`);
        }

        const data: ApiResponse = await response.json();
        setInternsData(data.interns || []);
        setPagination(data.pagination);
        setCurrentPage(page);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch interns";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedStatus, selectedPaidStatus]
  );

  // Initial fetch
  useEffect(() => {
    fetchInterns(1);
  }, []);

  // Handle adding intern - refresh the list
  const handleAddIntern = async () => {
    await fetchInterns(1);
  };

  // Handle editing intern
  const handleEditIntern = (intern: Intern) => {
    setInternToEdit(intern);
    setShowEditModal(true);
  };

  // Handle update intern - refresh the list
  const handleUpdateIntern = async () => {
    setShowEditModal(false);
    setInternToEdit(null);
    await fetchInterns(currentPage);
  };

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsSearching(true);

    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId);
    }

    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      setIsSearching(false);
    }, 500);

    setSearchTimeoutId(timeoutId);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    setIsSearching(false);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchInterns(1);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatus("All Status");
    setSelectedPaidStatus("All");
    setCurrentPage(1);
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInterns(new Set(internsData.map((intern) => intern.id)));
      setIsAllSelected(true);
    } else {
      setSelectedInterns(new Set());
      setIsAllSelected(false);
    }
  };

  const handleSelectIntern = (internId: string, checked: boolean) => {
    const newSelected = new Set(selectedInterns);
    if (checked) {
      newSelected.add(internId);
    } else {
      newSelected.delete(internId);
      setIsAllSelected(false);
    }
    setSelectedInterns(newSelected);

    if (newSelected.size === internsData.length) {
      setIsAllSelected(true);
    }
  };

  const handleDeleteIntern = (intern: Intern) => {
    setSelectedIntern(intern);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedIntern) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/interns/${selectedIntern.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete intern: ${response.status}`);
      }

      toast({
        title: "Success",
        description: `Intern ${selectedIntern.name} has been deleted successfully`,
        variant: "default",
      });

      setDeleteDialogOpen(false);
      setSelectedIntern(null);
      await fetchInterns(currentPage);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete intern";
      setError(errorMessage);
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedIntern(null);
    setDeleteLoading(false);
  };

  // Trigger search when search term changes
  useEffect(() => {
    if (
      searchTerm ||
      selectedStatus !== "All Status" ||
      selectedPaidStatus !== "All"
    ) {
      const timer = setTimeout(() => {
        fetchInterns(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, selectedStatus, selectedPaidStatus, fetchInterns]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
      }
    };
  }, [searchTimeoutId]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="admin" />
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Portal
                </h1>
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[90rem] mx-auto">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-600">{error}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInterns(currentPage)}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-xl">
                          Interns Overview
                        </CardTitle>
                        <CardDescription>
                          {pagination.totalCount} total interns
                          {selectedInterns.size > 0 && (
                            <span className="text-green-600 font-medium">
                              {" "}
                              • {selectedInterns.size} selected
                            </span>
                          )}
                          {(searchTerm ||
                            selectedStatus !== "All Status" ||
                            selectedPaidStatus !== "All") && (
                            <span className="text-orange-600 font-medium">
                              {" "}
                              (filtered)
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <AddInternModal onAddIntern={handleAddIntern} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or college..."
                        className="pl-10 pr-10"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={clearSearch}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {isSearching && (
                        <Loader2 className="absolute right-10 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Select
                      value={selectedStatus}
                      onValueChange={setSelectedStatus}
                    >
                      <SelectTrigger className="w-[140px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Status">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedPaidStatus}
                      onValueChange={setSelectedPaidStatus}
                    >
                      <SelectTrigger className="w-[140px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px] text-center">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={(checked) =>
                                handleSelectAll(!!checked)
                              }
                              disabled={internsData.length === 0}
                            />
                          </TableHead>
                          <TableHead className="w-[180px]">Name</TableHead>
                          <TableHead className="w-[200px]">Email</TableHead>
                          <TableHead className="w-[150px]">College</TableHead>
                          <TableHead className="w-[120px]">
                            Department
                          </TableHead>
                          <TableHead className="w-[150px]">Domain</TableHead>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="w-[80px] text-center">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {internsData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={9}
                              className="text-center py-8 text-gray-500"
                            >
                              {loading || isSearching ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span>
                                    {searchTerm
                                      ? `Searching for "${searchTerm}"...`
                                      : "Loading interns..."}
                                  </span>
                                </div>
                              ) : searchTerm ||
                                selectedStatus !== "All Status" ||
                                selectedPaidStatus !== "All" ? (
                                <div className="space-y-3">
                                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                                  <div>
                                    <p className="font-medium">
                                      No interns found
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {searchTerm &&
                                        `No results for "${searchTerm}"`}
                                      {(selectedStatus !== "All Status" ||
                                        selectedPaidStatus !== "All") &&
                                        ` with selected filters`}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearAllFilters}
                                  >
                                    Clear all filters
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                                  <p>No interns found</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchInterns(1, true)}
                                  >
                                    Refresh
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          internsData.map((intern) => (
                            <TableRow
                              key={intern.id}
                              className="hover:bg-gray-50"
                            >
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={selectedInterns.has(intern.id)}
                                  onCheckedChange={(checked) =>
                                    handleSelectIntern(intern.id, !!checked)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {intern.name}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {intern.email}
                              </TableCell>
                              <TableCell className="text-sm">
                                {intern.college}
                              </TableCell>
                              <TableCell className="text-sm">
                                {intern.department}
                              </TableCell>
                              <TableCell className="text-sm">
                                {intern.domain_in_office}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getPaidStatusBadge(
                                    intern.paid_or_unpaid as PaidStatus
                                  )}
                                >
                                  {intern.paid_or_unpaid}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getStatusBadge(
                                    intern.status as InternStatus
                                  )}
                                >
                                  {intern.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        router.push(
                                          `/admin/intern-dashboard/${intern.id}`
                                        )
                                      }
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleEditIntern(intern)}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteIntern(intern)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-gray-600">
                        Page {pagination.currentPage} of {pagination.totalPages}{" "}
                        • {pagination.totalCount} total interns
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            fetchInterns(pagination.currentPage - 1)
                          }
                          disabled={!pagination.hasPreviousPage}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            fetchInterns(pagination.currentPage + 1)
                          }
                          disabled={!pagination.hasNextPage}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        {/* Edit Modal */}
        {showEditModal && internToEdit && (
          <AddInternModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            editMode={true}
            existingIntern={internToEdit}
            onUpdateIntern={handleUpdateIntern}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Intern</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedIntern?.name}? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
