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
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Clock,
  FileText,
  Bell,
  User,
  Calendar,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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
  employee: {
    name: string;
    employee_id: string;
    department: string;
  };
}

interface User {
  id: string;
  email: string;
  userType: string;
  name?: string;
}

export default function TeamLeadWorkSubmission() {
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamLeadId, setTeamLeadId] = useState<string>("");
  const [teamLeadData, setTeamLeadData] = useState<any>(null);
  const [comments, setComments] = useState<{[key: string]: string}>({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Get user data from localStorage and fetch team lead details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user from localStorage
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Fetch team lead details using email
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
      fetchSubmissions();
    }
  }, [teamLeadId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/team-lead/work-submission?team_lead_id=${teamLeadId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);

        // Calculate stats
        const total = data.submissions?.length || 0;
        const pending =
          data.submissions?.filter(
            (s: WorkSubmission) => s.status === "Pending Team Lead"
          ).length || 0;
        const approved =
          data.submissions?.filter(
            (s: WorkSubmission) => s.status === "Pending Final Approval"
          ).length || 0; // Updated to count submissions sent to manager
        const rejected =
          data.submissions?.filter(
            (s: WorkSubmission) => s.status === "Rejected by Team Lead"
          ).length || 0;

        setStats({ total, pending, approved, rejected });
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (
    submissionId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    event?.preventDefault();

    if (processingId) return; // Prevent multiple clicks

    setProcessingId(submissionId);
    try {
      const response = await fetch(
        `/api/team-lead/work-submission/${submissionId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            team_lead_id: teamLeadId,
            team_lead_name: teamLeadData?.name || user?.email?.split('@')[0] || 'Team Lead',
            comments: comments[submissionId] || '',
          }),
        }
      );

      if (response.ok) {
        await fetchSubmissions();
        
        // Clear the comment for this submission
        setComments(prev => ({
          ...prev,
          [submissionId]: ''
        }));
        
        console.log("Work submission approved and sent to manager for final approval");
      } else {
        console.error("Failed to approve submission");
      }
    } catch (error) {
      console.error("Error approving submission:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (
    submissionId: string,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    event?.preventDefault();

    if (processingId) return; // Prevent multiple clicks

    setProcessingId(submissionId);
    try {
      const response = await fetch(
        `/api/team-lead/work-submission/${submissionId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            team_lead_id: teamLeadId,
            team_lead_name: teamLeadData?.name || user?.email?.split('@')[0] || 'Team Lead',
            comments: comments[submissionId] || '',
          }),
        }
      );

      if (response.ok) {
        await fetchSubmissions();
        
        // Clear the comment for this submission
        setComments(prev => ({
          ...prev,
          [submissionId]: ''
        }));
        
        console.log("Work submission rejected successfully");
      } else {
        console.error("Failed to reject submission");
      }
    } catch (error) {
      console.error("Error rejecting submission:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCommentChange = (submissionId: string, value: string) => {
    setComments(prev => ({
      ...prev,
      [submissionId]: value
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
      case "Pending Team Lead":
        return "bg-blue-100 text-blue-800";
      case "Pending Final Approval":
        return "bg-purple-100 text-purple-800";
      case "Rejected by Team Lead":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && !teamLeadId) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="team-lead" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading team lead data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar userType="team-lead" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="team-lead" />
      <div className="flex-1 flex flex-col">
        <Header
          title="Team Lead Portal"
          subtitle="Review and approve work submissions from your team members"
          userType="team-lead"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Team Lead Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-blue-900">
                      {teamLeadData?.name ||
                        user?.email?.split("@")[0] ||
                        "Team Lead"}
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      {teamLeadData?.designation || "Team Lead"} • ID:{" "}
                      {teamLeadId}
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-600 text-white">Team Lead</Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Submissions
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    From your team
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sent to Manager
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.approved}</div>
                  <p className="text-xs text-muted-foreground">Pending final approval</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Rejected
                  </CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.rejected}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Work Submissions */}
            <Card>
              <CardHeader>
                <CardTitle>Work Submissions from Your Team</CardTitle>
                <CardDescription>
                  Review and approve work submissions from your team members
                  only
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No work submissions found from your team members
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Only submissions from employees you have added to your
                      team will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <Card
                        key={submission.id}
                        className="border-l-4 border-l-blue-500"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <CardTitle className="text-lg">
                                  {submission.work_type}
                                </CardTitle>
                                <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                                  <span className="flex items-center space-x-1">
                                    <User className="h-3 w-3" />
                                    <span>{submission.employee_name}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {formatDate(submission.submitted_date)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                className={getPriorityColor(
                                  submission.priority
                                )}
                              >
                                {submission.priority}
                              </Badge>
                              <Badge
                                className={getStatusColor(submission.status)}
                              >
                                {submission.status}
                              </Badge>
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
                                {submission.work_description}
                              </p>
                            </div>

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
                                    onChange={(e) => handleCommentChange(submission.id, e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={(e) =>
                                      handleApprove(submission.id, e)
                                    }
                                    disabled={processingId !== null}
                                    className="bg-green-500 hover:bg-green-600"
                                    type="button"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    {processingId === submission.id
                                      ? "Sending to Manager..."
                                      : "Approve & Send to Manager"}
                                  </Button>
                                  <Button
                                    onClick={(e) =>
                                      handleReject(submission.id, e)
                                    }
                                    disabled={processingId !== null}
                                    variant="destructive"
                                    type="button"
                                  >
                                    <Clock className="w-4 h-4 mr-2" />
                                    {processingId === submission.id
                                      ? "Rejecting..."
                                      : "Reject"}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {submission.status === "Pending Final Approval" && (
                              <div className="bg-purple-50 p-3 rounded-md">
                                <p className="text-sm text-purple-700 font-medium">
                                  ✓ Approved by you and sent to Manager for final approval
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
          </div>
        </main>
      </div>
    </div>
  );
}