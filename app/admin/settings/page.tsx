'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Building2, 
  Users, 
  Bell, 
  Shield, 
  Database, 
  Mail, 
  Clock, 
  DollarSign,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function SettingsPage() {
  const [companySettings, setCompanySettings] = useState({
    name: 'TechCorp Solutions',
    email: 'admin@techcorp.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Ave, Tech City, TC 12345',
    website: 'https://techcorp.com',
    timezone: 'America/New_York',
    currency: 'USD',
    fiscalYearStart: 'January'
  })

  const [workSettings, setWorkSettings] = useState({
    workingDaysPerWeek: '5',
    workingHoursPerDay: '8',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: '60',
    overtimeRate: '1.5',
    weekendWork: false,
    flexibleHours: true
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,
    monthlyReports: true,
    systemAlerts: true,
    employeeUpdates: true,
    payrollReminders: true
  })

  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: '8',
    requireSpecialChars: true,
    requireNumbers: true,
    passwordExpiry: '90',
    maxLoginAttempts: '5',
    sessionTimeout: '30',
    twoFactorAuth: false,
    ipWhitelist: false
  })

  const handleSaveSettings = (section: string) => {
    console.log(`Saving ${section} settings...`)
    alert(`${section} settings saved successfully!`)
  }

  const handleBackupData = () => {
    console.log('Creating backup...')
    alert('Data backup created successfully!')
  }

  const handleRestoreData = () => {
    console.log('Restoring data...')
    alert('Data restore completed successfully!')
  }

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      console.log('Resetting settings...')
      alert('Settings reset to default values!')
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType="admin" />
      <div className="flex-1 flex flex-col">
        <Header 
          title="System Settings" 
          subtitle="Configure system preferences and policies" 
          userType="admin"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <Tabs defaultValue="company" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="work">Work Policy</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>

              <TabsContent value="company" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Company Information
                    </CardTitle>
                    <CardDescription>
                      Basic company details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          value={companySettings.name}
                          onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyEmail">Email Address</Label>
                        <Input
                          id="companyEmail"
                          type="email"
                          value={companySettings.email}
                          onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyPhone">Phone Number</Label>
                        <Input
                          id="companyPhone"
                          value={companySettings.phone}
                          onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyWebsite">Website</Label>
                        <Input
                          id="companyWebsite"
                          value={companySettings.website}
                          onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="companyAddress">Address</Label>
                      <Textarea
                        id="companyAddress"
                        value={companySettings.address}
                        onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={companySettings.timezone} onValueChange={(value) => setCompanySettings({...companySettings, timezone: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={companySettings.currency} onValueChange={(value) => setCompanySettings({...companySettings, currency: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
                        <Select value={companySettings.fiscalYearStart} onValueChange={(value) => setCompanySettings({...companySettings, fiscalYearStart: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="January">January</SelectItem>
                            <SelectItem value="April">April</SelectItem>
                            <SelectItem value="July">July</SelectItem>
                            <SelectItem value="October">October</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={() => handleSaveSettings('Company')} className="bg-blue-500 hover:bg-blue-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Company Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="work" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Work Policy Settings
                    </CardTitle>
                    <CardDescription>
                      Configure working hours, overtime, and attendance policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="workingDays">Working Days per Week</Label>
                        <Select value={workSettings.workingDaysPerWeek} onValueChange={(value) => setWorkSettings({...workSettings, workingDaysPerWeek: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 Days</SelectItem>
                            <SelectItem value="6">6 Days</SelectItem>
                            <SelectItem value="7">7 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="workingHours">Working Hours per Day</Label>
                        <Input
                          id="workingHours"
                          type="number"
                          value={workSettings.workingHoursPerDay}
                          onChange={(e) => setWorkSettings({...workSettings, workingHoursPerDay: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={workSettings.startTime}
                          onChange={(e) => setWorkSettings({...workSettings, startTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={workSettings.endTime}
                          onChange={(e) => setWorkSettings({...workSettings, endTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                        <Input
                          id="breakDuration"
                          type="number"
                          value={workSettings.breakDuration}
                          onChange={(e) => setWorkSettings({...workSettings, breakDuration: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="overtimeRate">Overtime Rate Multiplier</Label>
                        <Input
                          id="overtimeRate"
                          type="number"
                          step="0.1"
                          value={workSettings.overtimeRate}
                          onChange={(e) => setWorkSettings({...workSettings, overtimeRate: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Work Policies</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="weekendWork">Allow Weekend Work</Label>
                          <p className="text-sm text-muted-foreground">Enable employees to work on weekends</p>
                        </div>
                        <Switch
                          id="weekendWork"
                          checked={workSettings.weekendWork}
                          onCheckedChange={(checked) => setWorkSettings({...workSettings, weekendWork: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="flexibleHours">Flexible Working Hours</Label>
                          <p className="text-sm text-muted-foreground">Allow flexible start and end times</p>
                        </div>
                        <Switch
                          id="flexibleHours"
                          checked={workSettings.flexibleHours}
                          onCheckedChange={(checked) => setWorkSettings({...workSettings, flexibleHours: checked})}
                        />
                      </div>
                    </div>
                    
                    <Button onClick={() => handleSaveSettings('Work Policy')} className="bg-blue-500 hover:bg-blue-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Work Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Configure system notifications and alerts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Notification Channels</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="emailNotifications">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          id="emailNotifications"
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="smsNotifications">SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                        </div>
                        <Switch
                          id="smsNotifications"
                          checked={notificationSettings.smsNotifications}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsNotifications: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="pushNotifications">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                        </div>
                        <Switch
                          id="pushNotifications"
                          checked={notificationSettings.pushNotifications}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, pushNotifications: checked})}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Report Notifications</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="weeklyReports">Weekly Reports</Label>
                          <p className="text-sm text-muted-foreground">Receive weekly summary reports</p>
                        </div>
                        <Switch
                          id="weeklyReports"
                          checked={notificationSettings.weeklyReports}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, weeklyReports: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="monthlyReports">Monthly Reports</Label>
                          <p className="text-sm text-muted-foreground">Receive monthly analytics reports</p>
                        </div>
                        <Switch
                          id="monthlyReports"
                          checked={notificationSettings.monthlyReports}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, monthlyReports: checked})}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">System Alerts</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="systemAlerts">System Alerts</Label>
                          <p className="text-sm text-muted-foreground">Critical system notifications</p>
                        </div>
                        <Switch
                          id="systemAlerts"
                          checked={notificationSettings.systemAlerts}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemAlerts: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="employeeUpdates">Employee Updates</Label>
                          <p className="text-sm text-muted-foreground">New employee registrations and updates</p>
                        </div>
                        <Switch
                          id="employeeUpdates"
                          checked={notificationSettings.employeeUpdates}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, employeeUpdates: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="payrollReminders">Payroll Reminders</Label>
                          <p className="text-sm text-muted-foreground">Payroll processing reminders</p>
                        </div>
                        <Switch
                          id="payrollReminders"
                          checked={notificationSettings.payrollReminders}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, payrollReminders: checked})}
                        />
                      </div>
                    </div>
                    
                    <Button onClick={() => handleSaveSettings('Notification')} className="bg-blue-500 hover:bg-blue-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Notification Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Configure password policies and security measures
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                        <Input
                          id="passwordMinLength"
                          type="number"
                          value={securitySettings.passwordMinLength}
                          onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                        <Input
                          id="passwordExpiry"
                          type="number"
                          value={securitySettings.passwordExpiry}
                          onChange={(e) => setSecuritySettings({...securitySettings, passwordExpiry: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                        <Input
                          id="maxLoginAttempts"
                          type="number"
                          value={securitySettings.maxLoginAttempts}
                          onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input
                          id="sessionTimeout"
                          type="number"
                          value={securitySettings.sessionTimeout}
                          onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Password Requirements</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="requireSpecialChars">Require Special Characters</Label>
                          <p className="text-sm text-muted-foreground">Passwords must contain special characters</p>
                        </div>
                        <Switch
                          id="requireSpecialChars"
                          checked={securitySettings.requireSpecialChars}
                          onCheckedChange={(checked) => setSecuritySettings({...securitySettings, requireSpecialChars: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="requireNumbers">Require Numbers</Label>
                          <p className="text-sm text-muted-foreground">Passwords must contain numbers</p>
                        </div>
                        <Switch
                          id="requireNumbers"
                          checked={securitySettings.requireNumbers}
                          onCheckedChange={(checked) => setSecuritySettings({...securitySettings, requireNumbers: checked})}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Advanced Security</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                          <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                        </div>
                        <Switch
                          id="twoFactorAuth"
                          checked={securitySettings.twoFactorAuth}
                          onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorAuth: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="ipWhitelist">IP Whitelist</Label>
                          <p className="text-sm text-muted-foreground">Restrict access to specific IP addresses</p>
                        </div>
                        <Switch
                          id="ipWhitelist"
                          checked={securitySettings.ipWhitelist}
                          onCheckedChange={(checked) => setSecuritySettings({...securitySettings, ipWhitelist: checked})}
                        />
                      </div>
                    </div>
                    
                    <Button onClick={() => handleSaveSettings('Security')} className="bg-blue-500 hover:bg-blue-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Security Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Third-Party Integrations
                    </CardTitle>
                    <CardDescription>
                      Configure external service integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Email Service (SMTP)</h4>
                            <p className="text-sm text-muted-foreground">Configure email delivery service</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                          <Button variant="outline" size="sm">Configure</Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Payroll Integration</h4>
                            <p className="text-sm text-muted-foreground">Connect with payroll processing service</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-100 text-gray-800">Not Connected</Badge>
                          <Button variant="outline" size="sm">Setup</Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Time Tracking API</h4>
                            <p className="text-sm text-muted-foreground">External time tracking integration</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          <Button variant="outline" size="sm">Configure</Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Database className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">Backup Service</h4>
                            <p className="text-sm text-muted-foreground">Automated data backup solution</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                          <Button variant="outline" size="sm">Manage</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      System Management
                    </CardTitle>
                    <CardDescription>
                      System maintenance, backup, and data management
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Data Management</h4>
                        <div className="space-y-2">
                          <Button onClick={handleBackupData} className="w-full justify-start" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Create Data Backup
                          </Button>
                          <Button onClick={handleRestoreData} className="w-full justify-start" variant="outline">
                            <Upload className="w-4 h-4 mr-2" />
                            Restore from Backup
                          </Button>
                          <Button className="w-full justify-start" variant="outline">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sync Data
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">System Status</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Database Status</span>
                            <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Server Status</span>
                            <Badge className="bg-green-100 text-green-800">Online</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Last Backup</span>
                            <span className="text-sm text-muted-foreground">2 hours ago</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Storage Used</span>
                            <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Danger Zone
                      </h4>
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-red-900">Reset All Settings</h5>
                            <p className="text-sm text-red-700">This will reset all system settings to their default values. This action cannot be undone.</p>
                          </div>
                          <Button onClick={handleResetSettings} variant="destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Reset Settings
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}