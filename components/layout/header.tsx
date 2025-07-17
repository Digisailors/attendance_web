'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Search, 
  User, 
  Settings,
  ChevronDown 
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NotificationPanel } from '@/components/ui/notification-panel'

interface HeaderProps {
  title: string
  subtitle?: string
  userType: 'admin' | 'employee' | 'team-lead' | 'manager'
}

export function Header({ title, subtitle, userType }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)

  const getUserName = () => {
    switch (userType) {
      case 'admin':
        return 'Admin User'
      case 'employee':
        return 'John Doe'
      case 'team-lead':
        return 'Team Lead'
      case 'manager':
        return 'Manager'
      default:
        return 'User'
    }
  }

  const getNotificationCount = () => {
    switch (userType) {
      case 'team-lead':
        return 2
      case 'manager':
        return 1
      default:
        return 0
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          {/* <div className="relative hidden md:block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64"
            />
          </div> */}

          {/* Notifications
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-4 w-4" />
              {getNotificationCount() > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {getNotificationCount()}
                </Badge>
              )}
            </Button>
            
            {showNotifications && (
              <NotificationPanel 
                userType={userType}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div> */}

          {/* User Menu */}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden md:block">{getUserName()}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => window.location.href = '/login'}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
    </header>
  )
}