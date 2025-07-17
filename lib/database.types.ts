export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          designation: string
          designation_type: string
          phone_number: string
          address: string
          date_of_joining: string
          experience: string
          work_mode: 'Office' | 'WFH' | 'Hybrid'
          user_type: 'admin' | 'employee' | 'intern' | 'team-lead' | 'manager'
          status: 'Active' | 'Warning' | 'On Leave' | 'Inactive'
          department: string
          team_lead_id: string | null
          manager_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          designation: string
          designation_type: string
          phone_number: string
          address: string
          date_of_joining: string
          experience: string
          work_mode?: 'Office' | 'WFH' | 'Hybrid'
          user_type?: 'admin' | 'employee' | 'intern' | 'team-lead' | 'manager'
          status?: 'Active' | 'Warning' | 'On Leave' | 'Inactive'
          department: string
          team_lead_id?: string | null
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          designation?: string
          designation_type?: string
          phone_number?: string
          address?: string
          date_of_joining?: string
          experience?: string
          work_mode?: 'Office' | 'WFH' | 'Hybrid'
          user_type?: 'admin' | 'employee' | 'intern' | 'team-lead' | 'manager'
          status?: 'Active' | 'Warning' | 'On Leave' | 'Inactive'
          department?: string
          team_lead_id?: string | null
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          employee_id: string
          date: string
          check_in_time: string | null
          check_out_time: string | null
          work_hours: number | null
          status: 'Present' | 'Leave' | 'Permission' | 'Absent'
          work_type: 'Office' | 'WFH' | 'Hybrid' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          check_in_time?: string | null
          check_out_time?: string | null
          work_hours?: number | null
          status?: 'Present' | 'Leave' | 'Permission' | 'Absent'
          work_type?: 'Office' | 'WFH' | 'Hybrid' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          work_hours?: number | null
          status?: 'Present' | 'Leave' | 'Permission' | 'Absent'
          work_type?: 'Office' | 'WFH' | 'Hybrid' | null
          created_at?: string
          updated_at?: string
        }
      }
      work_submissions: {
        Row: {
          id: string
          employee_id: string
          attendance_id: string
          work_description: string
          project_name: string | null
          submission_date: string
          status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'
          team_lead_approval: boolean
          team_lead_approved_at: string | null
          team_lead_comments: string | null
          manager_approval: boolean
          manager_approved_at: string | null
          manager_comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          attendance_id: string
          work_description: string
          project_name?: string | null
          submission_date: string
          status?: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'
          team_lead_approval?: boolean
          team_lead_approved_at?: string | null
          team_lead_comments?: string | null
          manager_approval?: boolean
          manager_approved_at?: string | null
          manager_comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          attendance_id?: string
          work_description?: string
          project_name?: string | null
          submission_date?: string
          status?: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'
          team_lead_approval?: boolean
          team_lead_approved_at?: string | null
          team_lead_comments?: string | null
          manager_approval?: boolean
          manager_approved_at?: string | null
          manager_comments?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          leave_type: 'Sick Leave' | 'Casual Leave' | 'Annual Leave' | 'Personal Leave'
          start_date: string
          end_date: string
          reason: string
          status: 'Pending' | 'Approved' | 'Rejected'
          approved_by: string | null
          approved_at: string | null
          comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type: 'Sick Leave' | 'Casual Leave' | 'Annual Leave' | 'Personal Leave'
          start_date: string
          end_date: string
          reason: string
          status?: 'Pending' | 'Approved' | 'Rejected'
          approved_by?: string | null
          approved_at?: string | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type?: 'Sick Leave' | 'Casual Leave' | 'Annual Leave' | 'Personal Leave'
          start_date?: string
          end_date?: string
          reason?: string
          status?: 'Pending' | 'Approved' | 'Rejected'
          approved_by?: string | null
          approved_at?: string | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}