'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  UserPlus,
  CheckCircle,
  BarChart3,
 Timer,
  Building2,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'

interface SidebarProps {
  userType: 'admin' | 'employee' | 'team-lead' | 'manager'
  className?: string
}

export function Sidebar({ userType, className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false) // Add this state
  const pathname = usePathname()
  const router = useRouter()

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false)
        setCollapsed(false)
      } else {
        setCollapsed(true)
      }
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to reset overflow when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileOpen])

  const getMenuItems = () => {
    switch (userType) {
      case 'admin':
        return [
          { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
        ]
      case 'employee':
        return [
          { icon: Home, label: 'Dashboard', href: '/employee/dashboard' },
          { icon: Calendar, label: 'Leave Application', href: '/employee/leave' },
          { icon: FileText, label: 'Permission Request', href: '/employee/permission' },
          { icon: Timer, label: 'Overtime', href: '/employee/Overtime' },
          { icon: Settings, label: 'History', href: '/employee/history' },
        ]
      case 'team-lead':
        return [
          { icon: Home, label: 'Dashboard', href: '/team-lead/dashboard' },
          { icon: Users, label: 'Add Team Members', href: '/team-lead/team' },
          { icon: BriefcaseBusiness, label: 'Work Submission', href: '/team-lead/work-submission' },
          { icon: CheckCircle, label: 'Leave and Permission', href: '/team-lead/lap' },
          { icon: Calendar, label: 'Leave', href: '/team-lead/leave' },
          { icon: FileText, label: 'Permission', href: '/team-lead/permission' },
          { icon: Timer, label: 'Overtime', href: '/team-lead/Overtime' },
          { icon: Settings, label: 'History', href: '/team-lead/history' },
        ]
      case 'manager':
        return [
          { icon: Home, label: 'Dashboard', href: '/manager/dashboard' },
          { icon: BriefcaseBusiness, label: 'Final Approvals', href: '/manager/finalapprovel' },
          { icon: CheckCircle, label: 'Leave and Permission', href: '/manager/lap' },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  const getUserTypeDisplay = () => {
    switch (userType) {
      case 'admin':
        return { label: 'Admin', color: 'bg-red-500' }
      case 'employee':
        return { label: 'Employee', color: 'bg-green-500' }
      case 'team-lead':
        return { label: 'Team Lead', color: 'bg-blue-500' }
      case 'manager':
        return { label: 'Manager', color: 'bg-purple-500' }
      default:
        return { label: 'User', color: 'bg-gray-500' }
    }
  }

  const userTypeInfo = getUserTypeDisplay()

  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    
    try {
      console.log('Starting logout process...')

      // Clear any authentication tokens or user data
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          localStorage.removeItem('authToken')
          // Clear all localStorage items that start with 'employee_daily_state_'
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('employee_daily_state_')) {
              localStorage.removeItem(key)
            }
          })
          sessionStorage.clear()
        } catch (storageError) {
          console.warn('Error clearing storage:', storageError)
        }
      }

      // Clear any cookies if needed
      try {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
      } catch (cookieError) {
        console.warn('Error clearing cookies:', cookieError)
      }

      // Close dialogs and mobile sidebar
      setLogoutDialogOpen(false)
      setMobileOpen(false)

      console.log('Redirecting to login...')

      // Use replace instead of push to prevent back navigation
      router.replace('/login')
      
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback to direct navigation
      window.location.replace('/login')
    }
  }

  // Mobile menu toggle button (to be placed in your header/navbar)
  const MobileMenuButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setMobileOpen(!mobileOpen)}
      className="md:hidden h-8 w-8 p-0"
    >
      {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
    </Button>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center md:justify-start"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              userTypeInfo.color
            )}>
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
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                collapsed && "md:justify-center md:px-2",
                pathname === item.href && "bg-blue-50 text-blue-700 hover:bg-blue-100"
              )}
            >
              <item.icon className="h-4 w-4" />
              {(!collapsed || window.innerWidth < 768) && (
                <span className="ml-2 md:ml-2">{item.label}</span>
              )}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Footer with Logout */}
      <div className="p-4 border-t border-gray-200">
        <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              disabled={isLoggingOut}
              className={cn(
                "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50",
                collapsed && "md:justify-center md:px-2"
              )}
            >
              <LogOut className="h-4 w-4" />
              {(!collapsed || window.innerWidth < 768) && (
                <span className="ml-2">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              )}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
              <AlertDialogDescription>
                This will log you out and redirect you to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                disabled={isLoggingOut}
                onClick={() => setLogoutDialogOpen(false)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button - Add this to your header component */}
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
      <div className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300",
        // Desktop styles
        "hidden md:flex md:flex-col",
        collapsed ? "md:w-16" : "md:w-64",
        // Mobile styles
        "md:relative md:translate-x-0",
        mobileOpen ? "fixed inset-y-0 left-0 z-50 w-64 flex flex-col" : "md:flex",
        className 
      )}>
        <SidebarContent />
      </div>
    </>
  )
}