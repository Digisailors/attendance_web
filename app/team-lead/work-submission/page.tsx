"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sidebar } from "@/components/layout/sidebar"
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  Clock,
  FileText,
  Bell,
  User,
  Calendar,
  MessageSquare,
  Loader2,
  Timer,
  Image as ImageIcon,
  Eye,
  X,
  Check,
  Users,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface WorkSubmission {
  id: string;
  title: string;
  employee_name: string;
  work_type: string;
  work_description: string;
  department: string;
  priority: string;
  status: string;
  submitted_date: string;
  created_at: string;
  images?: string[];
  employee: {
    name: string;
    employee_id: string;
    department: string;
  };
}

interface OTSubmission {
  id: string;
  employee_id: string;
  employee_name: string;
  ot_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: 'Pending' | 'approved' | 'rejected';
  image1: string;
  image2: string;
  created_at: string;
  total_hours: string;
  employees?: {
    name: string;
    employee_id: string;
  };
}

interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  title: string;
}

// Image Modal Component
const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNext,
  onPrevious,
  title
}) => {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) onPrevious();
          break;
        case 'ArrowRight':
          if (currentIndex < images.length - 1) onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNext, onPrevious]);

  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-90"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 max-w-6xl max-h-full w-full mx-4">
        {/* Header */}
        <div className="bg-white rounded-t-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">
              Image {currentIndex + 1} of {images.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="px-2 text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            {/* Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = images[currentIndex];
                link.download = `evidence-${currentIndex + 1}.jpg`;
                link.click();
              }}
            >
              <Download className="w-4 h-4" />
            </Button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNext}
                  disabled={currentIndex === images.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div className="bg-white rounded-b-lg p-4 max-h-[80vh] overflow-auto">
          <div className="flex justify-center">
            <img
              src={images[currentIndex]}
              alt={`Evidence ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom})`,
                cursor: zoom > 1 ? 'grab' : 'default'
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* Image Thumbnails */}
        {images.length > 1 && (
          <div className="bg-gray-100 p-4 rounded-b-lg">
            <div className="flex justify-center space-x-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const event = new CustomEvent('imageSelect', { detail: { index } });
                    window.dispatchEvent(event);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TeamLeaderDashboard() {
  const [activeTab, setActiveTab] = useState<'work' | 'ot'>('work');
  const [workSubmissions, setWorkSubmissions] = useState<WorkSubmission[]>([]);
  const [otSubmissions, setOTSubmissions] = useState<OTSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamLeadId, setTeamLeadId] = useState<string>("");
  const [teamLeadData, setTeamLeadData] = useState<any>(null);
  const [comments, setComments] = useState<{[key: string]: string}>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [stats, setStats] = useState({
    work: { total: 0, pending: 0, approved: 0, rejected: 0 },
    ot: { total: 0, pending: 0, approved: 0, rejected: 0 },
  });

  // Image Modal State
  const [imageModal, setImageModal] = useState({
    isOpen: false,
    images: [] as string[],
    currentIndex: 0,
    title: ''
  });

  // Image Modal Functions
  const openImageModal = (images: string[], startIndex: number = 0, title: string) => {
    setImageModal({
      isOpen: true,
      images,
      currentIndex: startIndex,
      title
    });
  };

  const closeImageModal = () => {
    setImageModal(prev => ({ ...prev, isOpen: false }));
  };

  const nextImage = () => {
    setImageModal(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.images.length - 1)
    }));
  };

  const previousImage = () => {
    setImageModal(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0)
    }));
  };

  // Listen for image selection from thumbnails
  useEffect(() => {
    const handleImageSelect = (event: any) => {
      setImageModal(prev => ({
        ...prev,
        currentIndex: event.detail.index
      }));
    };

    window.addEventListener('imageSelect', handleImageSelect);
    return () => window.removeEventListener('imageSelect', handleImageSelect);
  }, []);

  // Get user data from localStorage and fetch team lead details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          const response = await fetch(
            `/api/employees/profile?email=${parsedUser.email}`
          );
          if (response.ok) {
            const teamLeadInfo = await response.json();
            setTeamLeadData(teamLeadInfo);
            setTeamLeadId(teamLeadInfo.employee_id || teamLeadInfo.id);
            console.log("Team lead data loaded:", teamLeadInfo);
          } else {
            console.error("Failed to fetch team lead profile");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (teamLeadId) {
      if (activeTab === 'work') {
        fetchWorkSubmissions();
      } else {
        fetchOTSubmissions();
      }
    }
  }, [teamLeadId, activeTab]);

  const fetchWorkSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/team-lead/work-submission?team_lead_id=${teamLeadId}`
      );
      if (response.ok) {
        const data = await response.json();
        const submissions = data.submissions || [];
        setWorkSubmissions(submissions);

        // Calculate work stats
        const total = submissions.length;
        const pending = submissions.filter((s: WorkSubmission) => s.status === "Pending Team Lead").length;
        const approved = submissions.filter((s: WorkSubmission) => s.status === "Pending Final Approval").length;
        const rejected = submissions.filter((s: WorkSubmission) => s.status === "Rejected by Team Lead").length;

        setStats(prev => ({ ...prev, work: { total, pending, approved, rejected } }));
      }
    } catch (error) {
      console.error("Error fetching work submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOTSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees/Overtime');
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((item: any) => ({
          id: item.id,
          employee_id: item.employee_id,
          employee_name: item.employees?.name || 'Unknown Employee',
          ot_date: item.ot_date,
          start_time: item.start_time,
          end_time: item.end_time,
          reason: item.reason,
          status: item.status || 'pending',
          image1: item.image1,
          image2: item.image2,
          created_at: item.created_at,
          total_hours: calculateOTHours(item.start_time, item.end_time),
          employees: item.employees
        }));
        setOTSubmissions(formattedData);

        // Calculate OT stats
        const total = formattedData.length;
        const pending = formattedData.filter((s: OTSubmission) => s.status === 'Pending').length;
        const approved = formattedData.filter((s: OTSubmission) => s.status === 'approved').length;
        const rejected = formattedData.filter((s: OTSubmission) => s.status === 'rejected').length;

        setStats(prev => ({ ...prev, ot: { total, pending, approved, rejected } }));
      } else {
        console.error('Failed to fetch OT submissions');
      }
    } catch (error) {
      console.error('Error fetching OT submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOTHours = (startTime: string, endTime: string): string => {
    try {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    } catch {
      return '0h 0m';
    }
  };

  const handleWorkApprove = async (submissionId: string) => {
    if (processingId) return;
    setProcessingId(submissionId);
    try {
      const response = await fetch(
        `/api/team-lead/work-submission/${submissionId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_lead_id: teamLeadId,
            team_lead_name: teamLeadData?.name || user?.email?.split('@')[0] || 'Team Lead',
            comments: comments[submissionId] || '',
          }),
        }
      );

      if (response.ok) {
        await fetchWorkSubmissions();
        setComments(prev => ({ ...prev, [submissionId]: '' }));
        console.log("Work submission approved");
      }
    } catch (error) {
      console.error("Error approving work submission:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWorkReject = async (submissionId: string) => {
    if (processingId) return;
    setProcessingId(submissionId);
    try {
      const response = await fetch(
        `/api/team-lead/work-submission/${submissionId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_lead_id: teamLeadId,
            team_lead_name: teamLeadData?.name || user?.email?.split('@')[0] || 'Team Lead',
            comments: comments[submissionId] || '',
          }),
        }
      );

      if (response.ok) {
        await fetchWorkSubmissions();
        setComments(prev => ({ ...prev, [submissionId]: '' }));
        console.log("Work submission rejected");
      }
    } catch (error) {
      console.error("Error rejecting work submission:", error);
    } finally {
      setProcessingId(null);
    }
  };

 const handleOTApprove = async (id: string) => {
  if (processingId) return;
  setProcessingId(id);
  
  try {
    const response = await fetch('/api/employees/Overtime', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        id,
        status: 'Final Approved',
        approved_by: teamLeadData?.id || 'system'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.details || 'Failed to approve');
    }

    const result = await response.json();
    console.log('Success:', result);

    setOTSubmissions(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: 'approved' as const } : item
      )
    );
    await fetchOTSubmissions();
    
  } catch (error) {
    console.error('Error approving OT submission:', error);
    alert('Failed to approve overtime request. Please try again.');
  } finally {
    setProcessingId(null);
  }
};

  const handleOTReject = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      const response = await fetch('/api/employees/Overtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'rejected',
          approved_by: teamLeadData?.name || 'Team Leader'
        }),
      });

      if (response.ok) {
        setOTSubmissions(prev => 
          prev.map(item => 
            item.id === id ? { ...item, status: 'rejected' as const } : item
          )
        );
        await fetchOTSubmissions();
      }
    } catch (error) {
      console.error('Error rejecting OT submission:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchApprove = async () => {
    const selectedArray = Array.from(selectedItems);
    
    if (activeTab === 'work') {
      for (const id of selectedArray) {
        await handleWorkApprove(id);
      }
    } else {
      for (const id of selectedArray) {
        await handleOTApprove(id);
      }
    }
    
    setSelectedItems(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const currentSubmissions = activeTab === 'work' ? filteredWorkSubmissions : filteredOTSubmissions;
    
    if (selectedItems.size === currentSubmissions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentSubmissions.map(item => item.id)));
    }
  };

  const handleCommentChange = (submissionId: string, value: string) => {
    setComments(prev => ({ ...prev, [submissionId]: value }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      'Pending Team Lead': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending Final Approval': 'bg-purple-100 text-purple-800 border-purple-200',
      'Rejected by Team Lead': 'bg-red-100 text-red-800 border-red-200'
    };

    const statusIcons = {
      pending: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <X className="w-3 h-3" />,
      'Pending Team Lead': <Clock className="w-3 h-3" />,
      'Pending Final Approval': <CheckCircle className="w-3 h-3" />,
      'Rejected by Team Lead': <X className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {statusIcons[status as keyof typeof statusIcons] || <Clock className="w-3 h-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Filter submissions based on search and status
  const filteredWorkSubmissions = workSubmissions.filter(item => {
    const matchesSearch = item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.work_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'pending' && item.status === 'Pending Team Lead') ||
                         (statusFilter === 'approved' && item.status === 'Pending Final Approval') ||
                         (statusFilter === 'rejected' && item.status === 'Rejected by Team Lead');
    return matchesSearch && matchesStatus;
  });

  const filteredOTSubmissions = otSubmissions.filter(item => {
    const matchesSearch = item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currentSubmissions = activeTab === 'work' ? filteredWorkSubmissions : filteredOTSubmissions;
  const currentStats = activeTab === 'work' ? stats.work : stats.ot;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="team-lead" />
        <div className="flex-1 flex items-center justify-center ml-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="team-lead" />
      
      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={closeImageModal}
        images={imageModal.images}
        currentIndex={imageModal.currentIndex}
        onNext={nextImage}
        onPrevious={previousImage}
        title={imageModal.title}
      />
      
      {/* Main Content */}
      <div className="flex-1 ml-6 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Team Leader Dashboard</h1>
                <p className="text-gray-600">Manage work submissions and overtime requests from your team</p>
              </div>
              <Badge className="bg-blue-600 text-white">Team Lead</Badge>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Team Lead Info */}
            <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-blue-900">
                      {teamLeadData?.name || "Team Lead"}
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      {teamLeadData?.designation || "Team Lead"} • ID: {teamLeadId}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Tab Navigation & Stats */}
            <div className="bg-white rounded-lg shadow-sm">
              {/* Tab Headers */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => {setActiveTab('work'); setSelectedItems(new Set());}}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === 'work'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Work Submissions</span>
                      {activeTab === 'work' && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          {filteredWorkSubmissions.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => {setActiveTab('ot'); setSelectedItems(new Set());}}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === 'ot'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Timer className="w-5 h-5" />
                      <span>OT Work Submissions</span>
                      {activeTab === 'ot' && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          {filteredOTSubmissions.length}
                        </span>
                      )}
                    </div>
                  </button>
                </nav>
              </div>

              {/* Quick Stats */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total</p>
                        <p className="text-2xl font-bold text-blue-900">{currentStats.total}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-900">{currentStats.pending}</p>
                      </div>
                      <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Approved</p>
                        <p className="text-2xl font-bold text-green-900">{currentStats.approved}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Rejected</p>
                        <p className="text-2xl font-bold text-red-900">{currentStats.rejected}</p>
                      </div>
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters and Actions */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search submissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={selectAll}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {selectedItems.size === currentSubmissions.length ? 'Deselect All' : 'Select All'}
                    </button>

                    {selectedItems.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {selectedItems.size} selected
                        </span>
                        <Button
                          onClick={handleBatchApprove}
                          className="bg-green-500 hover:bg-green-600 text-white"
                          size="sm"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Batch Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {currentSubmissions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {activeTab === 'work' ? (
                        <FileText className="w-8 h-8 text-gray-400" />
                      ) : (
                        <Timer className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {activeTab === 'work' ? 'work' : 'OT'} submissions found
                    </h3>
                    <p className="text-gray-600">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filter criteria.'
                        : `No ${activeTab === 'work' ? 'work' : 'OT'} submissions have been submitted yet.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeTab === 'work' 
                      ? filteredWorkSubmissions.map((submission) => (
                          <WorkSubmissionCard
                            key={submission.id}
                            submission={submission}
                            isSelected={selectedItems.has(submission.id)}
                            onToggleSelection={() => toggleSelection(submission.id)}
                            onApprove={() => handleWorkApprove(submission.id)}
                            onReject={() => handleWorkReject(submission.id)}
                            processingId={processingId}
                            comments={comments}
                            onCommentChange={handleCommentChange}
                            formatDate={formatDate}
                            getPriorityColor={getPriorityColor}
                            getStatusBadge={getStatusBadge}
                            onImageClick={openImageModal}
                          />
                        ))
                      : filteredOTSubmissions.map((submission) => (
                          <OTSubmissionCard
                            key={submission.id}
                            submission={submission}
                            isSelected={selectedItems.has(submission.id)}
                            onToggleSelection={() => toggleSelection(submission.id)}
                            onApprove={() => handleOTApprove(submission.id)}
                            onReject={() => handleOTReject(submission.id)}
                            processingId={processingId}
                            formatDate={formatDate}
                            getStatusBadge={getStatusBadge}
                            onImageClick={openImageModal}
                          />
                        ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Work Submission Card Component
const WorkSubmissionCard: React.FC<{
  submission: WorkSubmission;
  isSelected: boolean;
  onToggleSelection: () => void;
  onApprove: () => void;
  onReject: () => void;
  processingId: string | null;
  comments: {[key: string]: string};
  onCommentChange: (id: string, value: string) => void;
  formatDate: (date: string) => string;
  getPriorityColor: (priority: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  onImageClick: (images: string[], startIndex: number, title: string) => void;
}> = ({ 
  submission, 
  isSelected, 
  onToggleSelection, 
  onApprove, 
  onReject, 
  processingId,
  comments,
  onCommentChange,
  formatDate,
  getPriorityColor,
  getStatusBadge,
  onImageClick
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
            />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{submission.employee_name}</h3>
                <p className="text-xs text-gray-500">ID: {submission.employee?.employee_id}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(submission.priority)}>
              {submission.priority}
            </Badge>
            {getStatusBadge(submission.status)}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(submission.submitted_date)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              {submission.work_type}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Work Description</h4>
          <p className="text-sm text-gray-600 line-clamp-3">{submission.work_description}</p>
        </div>

        {/* Images */}
        {submission.images && submission.images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4" />
              <span>Evidence Images ({submission.images.length})</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {submission.images.map((image, index) => (
                <div key={index} className="relative group cursor-pointer">
                  <img
                    src={image}
                    alt={`Work evidence ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 transition-transform duration-200 group-hover:scale-105"
                    onClick={() => onImageClick(
                      submission.images || [], 
                      index, 
                      `Work Evidence - ${submission.employee_name}`
                    )}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments and Actions */}
        {submission.status === "Pending Team Lead" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor={`comments-${submission.id}`} className="text-sm font-medium">
                Review Comments (optional):
              </Label>
              <Textarea
                id={`comments-${submission.id}`}
                placeholder="Add your comments or feedback..."
                value={comments[submission.id] || ''}
                onChange={(e) => onCommentChange(submission.id, e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={onApprove}
                disabled={processingId !== null}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {processingId === submission.id ? "Approving..." : "Approve"}
              </Button>
              <Button
                onClick={onReject}
                disabled={processingId !== null}
                variant="destructive"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                {processingId === submission.id ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        )}

        {submission.status === "Pending Final Approval" && (
          <div className="bg-purple-50 p-3 rounded-md">
            <p className="text-sm text-purple-700 font-medium">
              ✓ Approved and sent to Manager for final approval
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// OT Submission Card Component
const OTSubmissionCard: React.FC<{
  submission: OTSubmission;
  isSelected: boolean;
  onToggleSelection: () => void;
  onApprove: () => void;
  onReject: () => void;
  processingId: string | null;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  onImageClick: (images: string[], startIndex: number, title: string) => void;
}> = ({ 
  submission, 
  isSelected, 
  onToggleSelection, 
  onApprove, 
  onReject, 
  processingId,
  formatDate,
  getStatusBadge,
  onImageClick
}) => {
  const otImages = [submission.image1, submission.image2].filter(Boolean);
  
  return (
    <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
            />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Timer className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{submission.employee_name}</h3>
                <p className="text-xs text-gray-500">ID: {submission.employee_id}</p>
              </div>
            </div>
          </div>
          {getStatusBadge(submission.status)}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{new Date(submission.ot_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Timer className="w-4 h-4" />
            <span>{submission.total_hours}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Start Time:</span>
            <p className="font-medium text-gray-900">{submission.start_time}</p>
          </div>
          <div>
            <span className="text-gray-500">End Time:</span>
            <p className="font-medium text-gray-900">{submission.end_time}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">OT Reason</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{submission.reason}</p>
        </div>

        {/* Images */}
        {otImages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4" />
              <span>OT Evidence Images ({otImages.length})</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {otImages.map((image, index) => (
                <div key={index} className="relative group cursor-pointer">
                  <img
                    src={image}
                    alt={`OT evidence ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 transition-transform duration-200 group-hover:scale-105"
                    onClick={() => onImageClick(
                      otImages, 
                      index, 
                      `OT Evidence - ${submission.employee_name}`
                    )}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions - Show buttons for pending status */}
      {submission.status === 'pending' && (
        <div className="px-4 pb-4">
          <div className="flex space-x-2">
            <Button
              onClick={onApprove}
              disabled={processingId !== null}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {processingId === submission.id ? "Approving..." : "Approve"}
            </Button>
            <Button
              onClick={onReject}
              disabled={processingId !== null}
              variant="destructive"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              {processingId === submission.id ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};