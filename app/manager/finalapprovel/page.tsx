'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, Clock, TrendingUp, Award, User, FileText, Bell, MessageSquare, Loader2, Calendar, Timer, Building,X } from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import ProtectedRoute from '@/components/ProtectedRoute'

interface FinalApproval {
  id: string;
  title: string;
  employee_name: string;
  team_lead_name: string;
  team_lead_id: string;
  department: string;
  work_type: string;
  work_description: string;
  priority: string;
  status: string;
  submitted_date: string;
  approved_by_team_lead_date: string;
  team_lead_comments?: string;
  manager_comments?: string;
  notification_id?: string;
  designation: string;
}

interface OTRequest {
  id: string;
  employee_id: string;
  ot_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  reason: string;
  status: string;
  supervisor_approved_at: string;
  supervisor_remarks?: string;
  manager_remarks?: string;
  employees: {
    name: string;
    employee_id: string;
    department: string;
    designation: string;
  };
}

interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<'final-approval' | 'ot-final-approval'>('final-approval');
  const [finalApprovals, setFinalApprovals] = useState<FinalApproval[]>([]);
  const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [managerId, setManagerId] = useState<string>("");
  const [managerData, setManagerData] = useState<any>(null);
  const [comments, setComments] = useState<{[key: string]: string}>({});
  const [stats, setStats] = useState({
    pendingFinalApproval: 0,
    approvedToday: 0,
    totalSubmissions: 0,
    rejectedToday: 0,
  });
  const [otStats, setOtStats] = useState({
    pendingFinalApproval: 0,
    approvedToday: 0,
    totalSubmissions: 0,
    rejectedToday: 0,
  });

  // Get user data from localStorage and fetch manager details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Fetch manager details using email
          const response = await fetch(
            `/api/employees/profile?email=${parsedUser.email}`
          );
          if (response.ok) {
            const managerInfo = await response.json();
            setManagerData(managerInfo);
            setManagerId(managerInfo.employee_id || managerInfo.id);
            console.log("Manager data loaded:", managerInfo);
          } else {
            console.error("Failed to fetch manager profile");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (managerId) {
      if (activeTab === 'final-approval') {
        fetchFinalApprovals();
      } else {
        fetchOTRequests();
      }
    }
  }, [managerId, activeTab]);

  const fetchFinalApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/manager/final-approvals?manager_id=${managerId}`
      );
      if (response.ok) {
        const data = await response.json();
        setFinalApprovals(data.approvals || []);

        // Calculate stats
        const today = new Date().toDateString();
        const pendingFinalApproval = data.approvals?.filter(
          (a: FinalApproval) => a.status === "Pending Final Approval"
        ).length || 0;
        
        const approvedToday = data.approvals?.filter(
          (a: FinalApproval) => 
            a.status === "Final Approved" && 
            new Date(a.approved_by_team_lead_date).toDateString() === today
        ).length || 0;
        
        const rejectedToday = data.approvals?.filter(
          (a: FinalApproval) => 
            a.status === "Final Rejected" && 
            new Date(a.approved_by_team_lead_date).toDateString() === today
        ).length || 0;

        setStats({
          pendingFinalApproval,
          approvedToday,
          totalSubmissions: data.approvals?.length || 0,
          rejectedToday,
        });
      }
    } catch (error) {
      console.error("Error fetching final approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOTRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/manager/final-approvals/Overtime`);
      if (response.ok) {
        const data = await response.json();
        setOtRequests(data.data || []);

        // Calculate OT stats
        const today = new Date().toDateString();
        const pendingFinalApproval = data.data?.filter(
          (ot: OTRequest) => ot.status === "final-approval"
        ).length || 0;
        
        const approvedToday = data.data?.filter(
  (ot: OTRequest) =>
    (ot.status === "approved" || ot.status === "final-approval") && 
    new Date(ot.supervisor_approved_at).toDateString() === today
).length || 0;

        
        const rejectedToday = data.data?.filter(
          (ot: OTRequest) => 
            ot.status === "rejected" && 
            new Date(ot.supervisor_approved_at).toDateString() === today
        ).length || 0;

        setOtStats({
          pendingFinalApproval,
          approvedToday,
          totalSubmissions: data.data?.length || 0,
          rejectedToday,
        });
      }
    } catch (error) {
      console.error("Error fetching OT requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalApproval = async (approvalId: string) => {
    if (processingId) return;

    setProcessingId(approvalId);
    try {
      const url = `/api/manager/final-approvals/${approvalId}/approve`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manager_id: managerId,
          manager_name: managerData?.name || user?.email?.split('@')[0] || 'Manager',
          comments: comments[approvalId] || '',
        }),
      });

      if (response.ok) {
        await fetchFinalApprovals();
        setComments(prev => ({
          ...prev,
          [approvalId]: ''
        }));
        console.log("Final approval granted successfully");
      } else {
        const errorData = await response.text();
        console.error("Failed to grant final approval:", errorData);
      }
    } catch (error) {
      console.error("Error granting final approval:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    if (processingId) return;

    setProcessingId(approvalId);
    try {
      const url = `/api/manager/final-approvals/${approvalId}/reject`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manager_id: managerId,
          manager_name: managerData?.name || user?.email?.split('@')[0] || 'Manager',
          comments: comments[approvalId] || '',
        }),
      });

      if (response.ok) {
        await fetchFinalApprovals();
        setComments(prev => ({
          ...prev,
          [approvalId]: ''
        }));
        console.log("Final rejection processed successfully");
      } else {
        const errorData = await response.text();
        console.error("Failed to reject:", errorData);
      }
    } catch (error) {
      console.error("Error rejecting:", error);
    } finally {
      setProcessingId(null);
    }
  }


const handleOTApproval = async (id: string) => {
  if (processingId) return;
  setProcessingId(id);

  // Get the actual UUID from managerData instead of managerId
  const actualManagerUUID = managerData?.id || managerData?.user_id;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!actualManagerUUID || !uuidRegex.test(actualManagerUUID)) {
    alert("Invalid Manager UUID format");
    setProcessingId(null);
    return;
  }

  try {
    const response = await fetch('/api/manager/final-approvals/Overtime', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        action: "approve",
        approved_by: actualManagerUUID,
        manager_remarks: comments[id] || ""
      }),
    });

    if (response.ok) {
      console.log("OT approved successfully");
      await fetchOTRequests(); // Refresh the data
      setComments(prev => ({
        ...prev,
        [id]: ''
      }));
    } else {
      const data = await response.json();
      console.error(data);
      alert("Failed to approve OT");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong while approving OT.");
  } finally {
    setProcessingId(null);
  }
};





 const handleOTReject = async (otId: string) => {
  if (processingId) return;

  setProcessingId(otId);
  
  // Get the actual UUID from managerData
  const actualManagerUUID = managerData?.id || managerData?.user_id;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!actualManagerUUID || !uuidRegex.test(actualManagerUUID)) {
    console.error("Manager UUID is invalid:", actualManagerUUID);
    alert("Invalid Manager UUID format. Please contact support.");
    setProcessingId(null);
    return;
  }

  try {
    const response = await fetch('/api/manager/final-approvals/Overtime', {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: otId,
        action: 'reject',
        approved_by: actualManagerUUID, // ✅ Using UUID instead of managerId
        manager_remarks: comments[otId] || 'Rejected by manager',
      }),
    });

    if (response.ok) {
      await fetchOTRequests();
      setComments(prev => ({
        ...prev,
        [otId]: ''
      }));
      console.log("OT request rejected successfully");
    } else {
      const errorData = await response.json();
      console.error("Failed to reject OT request:", errorData);
      alert(`Failed to reject OT: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Error rejecting OT request:", error);
    alert("Something went wrong while rejecting OT.");
  } finally {
    setProcessingId(null);
  }
};


  const handleCommentChange = (id: string, value: string) => {
    setComments(prev => ({
      ...prev,
      [id]: value
    }));
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

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Final Approval":
      case "final-approval":
        return "bg-purple-100 text-purple-800";
      case "Final Approved":
      case "approved":
        return "bg-green-100 text-green-800";
      case "Final Rejected":
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && !managerId) {
    return (
      <div className="flex min-h-screen overflow-auto bg-gray-50">
        <Sidebar userType="manager" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading manager data...</span>
          </div>
        </div>
      </div>
    );
  }

  const currentStats = activeTab === 'final-approval' ? stats : otStats;

  return (
     <ProtectedRoute allowedRoles={['manager']}>
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="manager" />
      <div className="flex-1 flex flex-col">
        <Header 
          title="Manager Portal" 
          subtitle="Final approval dashboard" 
          userType="manager"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Manager Info */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-purple-900">
                      {managerData?.name || user?.email?.split("@")[0] || "Manager"}
                    </CardTitle>
                    <CardDescription className="text-purple-700">
                      {managerData?.designation || "Manager"} • ID: {managerId}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-600 text-white">Manager</Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Tab Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={() => setActiveTab('final-approval')}
                variant={activeTab === 'final-approval' ? 'default' : 'outline'}
                className={activeTab === 'final-approval' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <FileText className="w-4 h-4 mr-2" />
                Final Approval
              </Button>
              <Button
                onClick={() => setActiveTab('ot-final-approval')}
                variant={activeTab === 'ot-final-approval' ? 'default' : 'outline'}
                className={activeTab === 'ot-final-approval' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                <Timer className="w-4 h-4 mr-2" />
                OT Final Approval
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Final Approval</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.pendingFinalApproval}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting your approval
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.approvedToday}</div>
                  <p className="text-xs text-muted-foreground">
                    Final approvals today
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.totalSubmissions}</div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected Today</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.rejectedToday}</div>
                  <p className="text-xs text-muted-foreground">
                    Final rejections today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'final-approval' ? (
              /* Final Approvals */
              <Card>
                <CardHeader>
                  <CardTitle>Final Approvals</CardTitle>
                  <CardDescription>
                    Review work that has been approved by Team Lead and provide final approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading final approvals...</p>
                    </div>
                  ) : finalApprovals.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No work submissions pending final approval
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Team Lead approved submissions will appear here for your final review
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {finalApprovals.map((approval) => (
                        <Card key={approval.id} className="border-l-4 border-l-purple-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-lg">{approval.work_type}</CardTitle>
                                <Badge className={getStatusColor(approval.status)}>
                                  {approval.status}
                                </Badge>
                              </div>
                              <Badge className={getPriorityColor(approval.priority)}>
                                {approval.priority}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center space-x-1">
                                  <User className="h-3 w-3" />
                                  <span>Employee: {approval.employee_name}</span>
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                {/* <span>Department: {approval.designation}</span> */}
                                <span className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Submitted: {formatDate(approval.submitted_date)}</span>
                                </span>
                                {approval.approved_by_team_lead_date && (
                                  <span className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>Team Lead Approved: {formatDate(approval.approved_by_team_lead_date)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <MessageSquare className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-700">
                                    Work Description
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                  {approval.work_description}
                                </p>
                              </div>

                              {approval.team_lead_comments && (
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-700">
                                      Team Lead Comments
                                    </span>
                                  </div>
                                  <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                                    {approval.team_lead_comments}
                                  </p>
                                </div>
                              )}
                              
                              {approval.status === "Pending Final Approval" && (
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor={`manager-comments-${approval.id}`} className="text-sm font-medium">
                                      Final Review Comments (optional):
                                    </Label>
                                    <Textarea
                                      id={`manager-comments-${approval.id}`}
                                      placeholder="Add any final comments or feedback..."
                                      value={comments[approval.id] || ''}
                                      onChange={(e) => handleCommentChange(approval.id, e.target.value)}
                                      className="mt-2"
                                    />
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    <Button 
                                      onClick={() => handleFinalApproval(approval.id)}
                                      disabled={processingId !== null}
                                      className="bg-green-500 hover:bg-green-600"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      {processingId === approval.id ? "Approving..." : "Give Final Approval"}
                                    </Button>
                                    <Button 
                                      onClick={() => handleReject(approval.id)}
                                      disabled={processingId !== null}
                                      variant="destructive"
                                    >
                                      <Clock className="w-4 h-4 mr-2" />
                                      {processingId === approval.id ? "Rejecting..." : "Reject"}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {approval.manager_comments && (
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-purple-400" />
                                    <span className="text-sm font-medium text-purple-700">
                                      Manager Comments
                                    </span>
                                  </div>
                                  <p className="text-sm text-purple-600 bg-purple-50 p-3 rounded-md">
                                    {approval.manager_comments}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* OT Final Approvals */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Timer className="h-5 w-5 text-orange-600" />
                    <span>OT Final Approvals</span>
                  </CardTitle>
                  <CardDescription>
                    Review overtime requests that have been approved by supervisors and provide final approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading OT requests...</p>
                    </div>
                  ) : otRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <Timer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        No overtime requests pending final approval
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Supervisor approved OT requests will appear here for your final review
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {otRequests.map((otRequest) => (
                        <Card key={otRequest.id} className="border-l-4 border-l-orange-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-lg flex items-center space-x-2">
                                  <Timer className="h-5 w-5 text-orange-600" />
                                  <span>Overtime Request</span>
                                </CardTitle>
                                <Badge className={getStatusColor(otRequest.status)}>
                                  {otRequest.status === 'final-approval' ? 'Pending Final Approval' : otRequest.status}
                                </Badge>
                              </div>
                              <Badge className="bg-orange-100 text-orange-800">
                                {otRequest.total_hours}h
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center space-x-1">
                                  <User className="h-3 w-3" />
                                  <span>Employee: {otRequest.employees.name}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Building className="h-3 w-3" />
                                  <span>Designation: {otRequest.employees.designation}</span>
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>OT Date: {new Date(otRequest.ot_date).toLocaleDateString()}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Time: {formatTime(otRequest.start_time)} - {formatTime(otRequest.end_time)}</span>
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <MessageSquare className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-700">
                                    Reason for Overtime
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                  {otRequest.reason}
                                </p>
                              </div>

                              {otRequest.supervisor_remarks && (
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-700">
                                      Supervisor Comments
                                    </span>
                                  </div>
                                  <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                                    {otRequest.supervisor_remarks}
                                  </p>
                                </div>
                              )}
                              
                             {/* Update the condition for showing action buttons */}
{(otRequest.status === "final-approval" || otRequest.status === "Final Approved") && (
  <div className="space-y-4">
    <div>
      <Label htmlFor={`ot-manager-comments-${otRequest.id}`} className="text-sm font-medium">
        Manager Comments (optional):
      </Label>
      <Textarea
        id={`ot-manager-comments-${otRequest.id}`}
        placeholder="Add any comments or feedback..."
        value={comments[otRequest.id] || ''}
        onChange={(e) => handleCommentChange(otRequest.id, e.target.value)}
        className="mt-2"
      />
    </div>
    
    <div className="flex space-x-2">
      <Button 
        onClick={() => handleOTApproval(otRequest.id)}
        disabled={processingId !== null || !managerData?.id}
        className="bg-green-500 hover:bg-green-600"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        {processingId === otRequest.id ? "Approving..." : "Approve OT Request"}
      </Button>

      <Button 
        onClick={() => handleOTReject(otRequest.id)}
        disabled={processingId !== null}
        variant="destructive"
      >
        <Clock className="w-4 h-4 mr-2" />
        {processingId === otRequest.id ? "Rejecting..." : "Reject"}
      </Button>
    </div>
  </div>
)}

{/* Show rejection message for rejected requests */}
{otRequest.status === "rejected" && (
  <div className="bg-red-50 border border-red-200 rounded-md p-3">
    <div className="flex items-center space-x-2">
      <X className="h-4 w-4 text-red-500" />
      <span className="text-sm font-medium text-red-700">Request Rejected</span>
    </div>
    <p className="text-sm text-red-600 mt-1">
      This overtime request has been rejected by the manager.
    </p>
  </div>
)}

{/* Show approval message for approved requests */}
{otRequest.status === "approved" && (
  <div className="bg-green-50 border border-green-200 rounded-md p-3">
    <div className="flex items-center space-x-2">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <span className="text-sm font-medium text-green-700">Request Approved</span>
    </div>
    <p className="text-sm text-green-600 mt-1">
      This overtime request has been approved and processed.
    </p>
  </div>
)}

                              {otRequest.manager_remarks && (
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-orange-400" />
                                    <span className="text-sm font-medium text-orange-700">
                                      Manager Comments
                                    </span>
                                  </div>
                                  <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
                                    {otRequest.manager_remarks}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
      </ProtectedRoute>
  )
}
