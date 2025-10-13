"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BriefcaseBusiness,
  Home,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserPlus,
  CheckCircle,
  BarChart3,
  Timer,
  Building2,
  Menu,
  X,
  CalendarDays,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { createPortal } from "react-dom";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface SidebarProps {
  userType: "admin" | "employee" | "team-lead" | "manager";
  className?: string;
}

export function Sidebar({ userType, className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    if (!isMounted) return;

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
        setCollapsed(false);
      } else {
        setCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMounted]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Auto-open reports dropdown if on a reports page
  useEffect(() => {
    if (pathname?.includes("/admin/report")) {
      setReportsDropdownOpen(true);
    }
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (!isMounted) return;

    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen, isMounted]);

  const getMenuItems = () => {
    switch (userType) {
      case "admin":
        return [
          {
            icon: Home,
            label: "Dashboard",
            href: "/admin/dashboard",
            type: "link",
          },
          {
            icon: Calendar,
            label: "Reports",
            type: "dropdown",
            items: [
              {
                icon: CalendarDays,
                label: "Daily Report",
                href: "/admin/daily-report",
              },
              {
                icon: FileBarChart,
                label: "Monthly Report",
                href: "/admin/monthly-report",
              },
            ],
          },
          {
            icon: Home,
            label: "Dashboard",
            href: "/admin/settings",
            type: "link",
          },
        ];
      case "employee":
        return [
          {
            icon: Home,
            label: "Dashboard",
            href: "/employee/dashboard",
            type: "link",
          },
          {
            icon: Calendar,
            label: "Leave Application",
            href: "/employee/leave",
            type: "link",
          },
          {
            icon: FileText,
            label: "Permission Request",
            href: "/employee/permission",
            type: "link",
          },
          {
            icon: Timer,
            label: "Overtime",
            href: "/employee/Overtime",
            type: "link",
          },
          {
            icon: Settings,
            label: "History",
            href: "/employee/history",
            type: "link",
          },
          {
            icon: Timer,
            label: "Profile",
            href: "/employee/profile",
            type: "link",
          },
        ];
      case "team-lead":
        return [
          {
            icon: Home,
            label: "Dashboard",
            href: "/team-lead/dashboard",
            type: "link",
          },
          {
            icon: Users,
            label: "Add Team Members",
            href: "/team-lead/team",
            type: "link",
          },
          {
            icon: BriefcaseBusiness,
            label: "Work Submission",
            href: "/team-lead/work-submission",
            type: "link",
          },
          {
            icon: CheckCircle,
            label: "Leave and Permission",
            href: "/team-lead/lap",
            type: "link",
          },
          {
            icon: Calendar,
            label: "Leave",
            href: "/team-lead/leave",
            type: "link",
          },
          {
            icon: FileText,
            label: "Permission",
            href: "/team-lead/permission",
            type: "link",
          },
          {
            icon: Timer,
            label: "Overtime",
            href: "/team-lead/Overtime",
            type: "link",
          },
          {
            icon: Settings,
            label: "History",
            href: "/team-lead/history",
            type: "link",
          },
          {
            icon: Timer,
            label: "Profile",
            href: "/team-lead/profile",
            type: "link",
          },
        ];
      case "manager":
        return [
          {
            icon: BriefcaseBusiness,
            label: "Final Approvals",
            href: "/manager/finalapprovel",
            type: "link",
          },
          {
            icon: CheckCircle,
            label: "Leave and Permission",
            href: "/manager/lap",
            type: "link",
          },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const getUserTypeDisplay = () => {
    switch (userType) {
      case "admin":
        return { label: "Admin", color: "bg-red-500" };
      case "employee":
        return { label: "Employee", color: "bg-green-500" };
      case "team-lead":
        return { label: "Team Lead", color: "bg-blue-500" };
      case "manager":
        return { label: "Manager", color: "bg-purple-500" };
      default:
        return { label: "User", color: "bg-gray-500" };
    }
  };

  const userTypeInfo = getUserTypeDisplay();

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      console.log("Starting logout process...");

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("employee_")) {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
        } catch (storageError) {
          console.warn("Error clearing storage:", storageError);
        }
      }

      try {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(
              /=.*/,
              "=;expires=" + new Date().toUTCString() + ";path=/"
            );
        });
      } catch (cookieError) {
        console.warn("Error clearing cookies:", cookieError);
      }

      console.log("Redirecting to login...");
      await router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/login");
    } finally {
      setIsLoggingOut(false);
      setLogoutDialogOpen(false);
      setMobileOpen(false);
    }
  };

  const handleDialogClose = () => {
    if (!isLoggingOut) {
      setLogoutDialogOpen(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  const MobileMenuButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setMobileOpen(!mobileOpen)}
      className="md:hidden h-8 w-8 p-0"
    >
      {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
    </Button>
  );

  const renderMenuItem = (item, index) => {
    if (item.type === "dropdown") {
      const isReportsActive = item.items?.some(
        (subItem) => pathname === subItem.href
      );

      return (
        <div key={index} className="space-y-1">
          <Button
            variant={isReportsActive ? "default" : "ghost"}
            onClick={() => setReportsDropdownOpen(!reportsDropdownOpen)}
            className={cn(
              "w-full justify-between",
              collapsed && "md:justify-center md:px-2",
              isReportsActive && "bg-blue-50 text-blue-700 hover:bg-blue-100"
            )}
          >
            <div className="flex items-center">
              <item.icon className="h-4 w-4" />
              {(!collapsed || window.innerWidth < 768) && (
                <span className="ml-2">{item.label}</span>
              )}
            </div>
            {(!collapsed || window.innerWidth < 768) &&
              (reportsDropdownOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              ))}
          </Button>

          {reportsDropdownOpen && (!collapsed || window.innerWidth < 768) && (
            <div className="ml-4 space-y-1">
              {item.items?.map((subItem, subIndex) => (
                <Link key={subIndex} href={subItem.href}>
                  <Button
                    variant={pathname === subItem.href ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start text-sm",
                      pathname === subItem.href &&
                        "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    )}
                  >
                    <subItem.icon className="h-4 w-4" />
                    <span className="ml-2">{subItem.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Regular link item
    return (
      <Link key={index} href={item.href}>
        <Button
          variant={pathname === item.href ? "default" : "ghost"}
          className={cn(
            "w-full justify-start",
            collapsed && "md:justify-center md:px-2",
            pathname === item.href &&
              "bg-blue-50 text-blue-700 hover:bg-blue-100"
          )}
        >
          <item.icon className="h-4 w-4" />
          {(!collapsed || window.innerWidth < 768) && (
            <span className="ml-2 md:ml-2">{item.label}</span>
          )}
        </Button>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex items-center gap-2",
              collapsed && "justify-center md:justify-start"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                userTypeInfo.color
              )}
            >
              <Building2 className="w-4 h-4 text-white" />
            </div>
            {(!collapsed || window.innerWidth < 768) && (
              <div className="md:block">
                <h2 className="font-semibold text-gray-900">EMS</h2>
                <Badge className="text-xs">{userTypeInfo.label}</Badge>
              </div>
            )}
          </div>

          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(false)}
            className="md:hidden h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => renderMenuItem(item, index))}
      </nav>

      {/* Footer with Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          disabled={isLoggingOut}
          onClick={() => {
            console.log("Logout button clicked");
            setLogoutDialogOpen(true);
          }}
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50",
            collapsed && "md:justify-center md:px-2"
          )}
        >
          <LogOut className="h-4 w-4" />
          {(!collapsed ||
            (typeof window !== "undefined" && window.innerWidth < 768)) && (
            <span className="ml-2">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          )}
        </Button>

        {logoutDialogOpen &&
          createPortal(
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw]">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Confirm Logout
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to logout? This will end your current
                    session and redirect you to the login page.
                  </p>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      disabled={isLoggingOut}
                      onClick={() => setLogoutDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <MobileMenuButton />
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-gray-200 transition-all duration-300",
          "hidden md:flex md:flex-col",
          collapsed ? "md:w-16" : "md:w-64",
          "md:relative md:translate-x-0",
          mobileOpen
            ? "fixed inset-y-0 left-0 z-50 w-64 flex flex-col"
            : "md:flex",
          className
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}
