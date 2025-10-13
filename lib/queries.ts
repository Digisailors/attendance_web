import { supabase } from "./supabaseServer";
import { Database } from "./database.types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
type WorkSubmission = Database["public"]["Tables"]["work_submissions"]["Row"];
type LeaveRequest = Database["public"]["Tables"]["leave_requests"]["Row"];

// Employee Queries
export const employeeQueries = {
  // Get all employees (for admin)
  getAllEmployees: async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get employee by email
  getEmployeeByEmail: async (email: string) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", email)
      .single();

    return { data, error };
  },

  // Get employee by ID
  getEmployeeById: async (id: string) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single();

    return { data, error };
  },

  // Create new employee
  createEmployee: async (
    employeeData: Database["public"]["Tables"]["employees"]["Insert"]
  ) => {
    const { data, error } = await supabase
      .from("employees")
      .insert(employeeData)
      .select()
      .single();

    return { data, error };
  },

  // Update employee
  updateEmployee: async (
    id: string,
    updates: Database["public"]["Tables"]["employees"]["Update"]
  ) => {
    const { data, error } = await supabase
      .from("employees")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  },

  // Get team members (for team lead)
  getTeamMembers: async (teamLeadId: string) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("team_lead_id", teamLeadId);

    return { data, error };
  },

  // Get department employees (for manager)
  getDepartmentEmployees: async (managerId: string) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("manager_id", managerId);

    return { data, error };
  },
};

// Attendance Queries
export const attendanceQueries = {
  // Get employee attendance for a month
  getEmployeeMonthlyAttendance: async (
    employeeId: string,
    year: number,
    month: number
  ) => {
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    const endDate = `${year}-${month.toString().padStart(2, "0")}-31`;

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    return { data, error };
  },

  // Get today's attendance for employee
  getTodayAttendance: async (employeeId: string) => {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .single();

    return { data, error };
  },

  // Check in
  checkIn: async (
    employeeId: string,
    workType: "Office" | "WFH" | "Hybrid"
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("attendance")
      .upsert({
        employee_id: employeeId,
        date: today,
        check_in_time: now,
        work_type: workType,
        status: "Present",
      })
      .select()
      .single();

    return { data, error };
  },

  // Check out
  checkOut: async (attendanceId: string) => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("attendance")
      .update({
        check_out_time: now,
      })
      .eq("id", attendanceId)
      .select()
      .single();

    return { data, error };
  },

  // Get all attendance (for admin/reports)
  getAllAttendance: async (startDate?: string, endDate?: string) => {
    let query = supabase.from("attendance").select(`
        *,
        employees (
          first_name,
          last_name,
          designation,
          department
        )
      `);

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query.order("date", { ascending: false });

    return { data, error };
  },
};

// Work Submission Queries
export const workSubmissionQueries = {
  // Create work submission
  createWorkSubmission: async (
    submissionData: Database["public"]["Tables"]["work_submissions"]["Insert"]
  ) => {
    const { data, error } = await supabase
      .from("work_submissions")
      .insert(submissionData)
      .select()
      .single();

    return { data, error };
  },

  // Get employee work submissions
  getEmployeeSubmissions: async (employeeId: string) => {
    const { data, error } = await supabase
      .from("work_submissions")
      .select(
        `
        *,
        attendance (
          date,
          check_in_time,
          check_out_time,
          work_hours
        )
      `
      )
      .eq("employee_id", employeeId)
      .order("submission_date", { ascending: false });

    return { data, error };
  },

  // Get submissions pending team lead approval
  getPendingTeamLeadApprovals: async (teamLeadId: string) => {
    const { data, error } = await supabase
      .from("work_submissions")
      .select(
        `
        *,
        employees (
          first_name,
          last_name,
          designation,
          department
        ),
        attendance (
          date,
          check_in_time,
          check_out_time,
          work_hours
        )
      `
      )
      .eq("employees.team_lead_id", teamLeadId)
      .eq("team_lead_approval", false)
      .eq("status", "Submitted");

    return { data, error };
  },

  // Team lead approval
  approveByTeamLead: async (submissionId: string, comments?: string) => {
    const { data, error } = await supabase
      .from("work_submissions")
      .update({
        team_lead_approval: true,
        team_lead_approved_at: new Date().toISOString(),
        team_lead_comments: comments,
        status: "Under Review",
      })
      .eq("id", submissionId)
      .select()
      .single();

    return { data, error };
  },

  // Get submissions pending manager approval
  getPendingManagerApprovals: async (managerId: string) => {
    const { data, error } = await supabase
      .from("work_submissions")
      .select(
        `
        *,
        employees (
          first_name,
          last_name,
          designation,
          department
        ),
        attendance (
          date,
          check_in_time,
          check_out_time,
          work_hours
        )
      `
      )
      .eq("employees.manager_id", managerId)
      .eq("team_lead_approval", true)
      .eq("manager_approval", false)
      .eq("status", "Under Review");

    return { data, error };
  },

  // Manager final approval
  approveByManager: async (submissionId: string, comments?: string) => {
    const { data, error } = await supabase
      .from("work_submissions")
      .update({
        manager_approval: true,
        manager_approved_at: new Date().toISOString(),
        manager_comments: comments,
        status: "Approved",
      })
      .eq("id", submissionId)
      .select()
      .single();

    return { data, error };
  },

  // Reject submission
  rejectSubmission: async (
    submissionId: string,
    comments: string,
    rejectedBy: "team_lead" | "manager"
  ) => {
    const updates = {
      status: "Rejected" as const,
      ...(rejectedBy === "team_lead"
        ? { team_lead_comments: comments }
        : { manager_comments: comments }),
    };

    const { data, error } = await supabase
      .from("work_submissions")
      .update(updates)
      .eq("id", submissionId)
      .select()
      .single();

    return { data, error };
  },
};

// Leave Request Queries
export const leaveRequestQueries = {
  // Create leave request
  createLeaveRequest: async (
    leaveData: Database["public"]["Tables"]["leave_requests"]["Insert"]
  ) => {
    const { data, error } = await supabase
      .from("leave_requests")
      .insert(leaveData)
      .select()
      .single();

    return { data, error };
  },

  // Get employee leave requests
  getEmployeeLeaveRequests: async (employeeId: string) => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get pending leave requests for approval
  getPendingLeaveRequests: async (approverId: string) => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select(
        `
        *,
        employees (
          first_name,
          last_name,
          designation,
          department
        )
      `
      )
      .or(
        `employees.team_lead_id.eq.${approverId},employees.manager_id.eq.${approverId}`
      )
      .eq("status", "Pending")
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Approve/Reject leave request
  updateLeaveRequestStatus: async (
    requestId: string,
    status: "Approved" | "Rejected",
    approvedBy: string,
    comments?: string
  ) => {
    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        comments,
      })
      .eq("id", requestId)
      .select()
      .single();

    return { data, error };
  },
};

// Analytics/Dashboard Queries
export const dashboardQueries = {
  // Get employee monthly stats
  getEmployeeMonthlyStats: async (
    employeeId: string,
    year: number,
    month: number
  ) => {
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    const endDate = `${year}-${month.toString().padStart(2, "0")}-31`;

    const { data: attendance, error } = await supabase
      .from("attendance")
      .select("status")
      .eq("employee_id", employeeId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) return { data: null, error };

    const stats = {
      totalDays: attendance.length,
      workingDays: attendance.filter((a) => a.status === "Present").length,
      permissions: attendance.filter((a) => a.status === "Permission").length,
      leaves: attendance.filter((a) => a.status === "Leave").length,
      missedDays: attendance.filter((a) => a.status === "Absent").length,
    };

    return { data: stats, error: null };
  },

  // Get team performance (for team leads)
  getTeamPerformance: async (
    teamLeadId: string,
    month?: number,
    year?: number
  ) => {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const { data: teamMembers, error: teamError } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("team_lead_id", teamLeadId);

    if (teamError) return { data: null, error: teamError };

    // Get attendance stats for each team member
    const teamStats = await Promise.all(
      teamMembers.map(async (member) => {
        const { data: stats } = await dashboardQueries.getEmployeeMonthlyStats(
          member.id,
          targetYear,
          targetMonth
        );
        return {
          ...member,
          ...stats,
        };
      })
    );

    return { data: teamStats, error: null };
  },
};
