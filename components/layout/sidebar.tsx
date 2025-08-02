'use client'

import { useState } from 'react'
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
  Award,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

export function Sidebar({ userType,className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

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
          { icon: Settings, label: 'History', href: '/employee/history' },
           { icon: Calendar, label: 'Overtime', href: '/employee/Overtime' },
        ]
      case 'team-lead':
        return [
           { icon: Home, label: 'Dashboard', href: '/team-lead/dashboard' },
          { icon: Users, label: 'Add Team Members', href: '/team-lead/team' },
          { icon: BriefcaseBusiness, label: 'Work Submission', href: '/team-lead/work-submission' },
          { icon: CheckCircle, label: 'Leave and Permission', href: '/team-lead/lap' },
          { icon: BarChart3, label: 'Leave', href: '/team-lead/leave' },
          { icon: Settings, label: 'permission', href: '/team-lead/permission' },
          { icon: Settings, label: 'histroy', href: '/team-lead/history' },
        ]
      case 'manager':
        return [
           { icon: Home, label: 'Dashboard', href: '/manager/dashboard' },
          { icon: Home, label: 'Final Approvals', href: '/manager/finalapprovel' },
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

  const handleLogout = () => {
    localStorage.removeItem('user') // Optional
    window.location.href = '/login'
  }

  return (
    
  <div className={cn(
    "bg-white border-r border-gray-200 transition-all duration-300",
    collapsed ? "w-16" : "w-64",
    className 
  )}>

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-2",
              collapsed && "justify-center"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                userTypeInfo.color
              )}>
                <Building2 className="w-4 h-4 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <h2 className="font-semibold text-gray-900">EMS</h2>
                  <Badge className="text-xs">{userTypeInfo.label}</Badge>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  collapsed && "justify-center px-2",
                  pathname === item.href && "bg-blue-50 text-blue-700 hover:bg-blue-100"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span className="ml-2">{item.label}</span>}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Footer with Logout */}
        <div className="p-6 border-t border-gray-200">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
                  collapsed && "justify-center px-2"
                )}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Logout</span>}
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
