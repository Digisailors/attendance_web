import { supabase } from "./supabaseServer";
import { employeeQueries } from "./queries";

// Auth context helpers
export const authHelpers = {
  // Get current user with employee data
  getCurrentUserWithEmployee: async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, employee: null, error: authError };
    }

    const { data: employee, error: employeeError } =
      await employeeQueries.getEmployeeByEmail(user.email!);

    return { user, employee, error: employeeError };
  },

  // Check if user has specific role
  hasRole: async (requiredRole: string) => {
    const { employee } = await authHelpers.getCurrentUserWithEmployee();
    return employee?.user_type === requiredRole;
  },

  // Check if user can access resource
  canAccessResource: async (
    resourceType: "employee" | "team" | "department",
    resourceId?: string
  ) => {
    const { employee } = await authHelpers.getCurrentUserWithEmployee();

    if (!employee) return false;

    // Admin can access everything
    if (employee.user_type === "admin") return true;

    switch (resourceType) {
      case "employee":
        // Users can access their own data
        return employee.id === resourceId;

      case "team":
        // Team leads can access their team data
        return employee.user_type === "team-lead";

      case "department":
        // Managers can access their department data
        return employee.user_type === "manager";

      default:
        return false;
    }
  },
};
