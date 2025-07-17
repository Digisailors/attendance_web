'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface NotificationPanelProps {
  userType: 'admin' | 'employee' | 'team-lead' | 'manager'
  onClose: () => void
}

export function NotificationPanel({ userType, onClose }: NotificationPanelProps) {
  const getNotifications = () => {
    switch (userType) {
      case 'team-lead':
        return [
          {
            id: 1,
            title: 'Team Lead Dashboard',
            message: 'Review and approve employee submissions',
            time: '5 min ago',
            type: 'info',
            unread: true
          },
          {
            id: 2,
            title: 'New Submission',
            message: 'Q4 Sales Report needs review',
            time: '1 hour ago',
            type: 'warning',
            unread: true
          }
        ]
      case 'manager':
        return [
          {
            id: 1,
            title: 'Manager Overview',
            message: 'Monitor team progress and provide final approvals',
            time: '2 hours ago',
            type: 'info',
            unread: true
          }
        ]
      default:
        return []
    }
  }

  const notifications = getNotifications()

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <Card className="absolute right-0 top-12 w-80 shadow-lg z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Notifications</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No new notifications
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  notification.unread ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                {getIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    {notification.unread && (
                      <Badge className="bg-red-500 text-white text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {notification.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}