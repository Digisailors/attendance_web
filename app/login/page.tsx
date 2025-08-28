'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Building2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from '@/hooks/use-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const simpleHash = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function LoginPage() {
  const router = useRouter()
  const [userType, setUserType] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignup, setIsSignup] = useState(false)

  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  // Function to validate if employee exists in employee database
  const validateEmployeeExists = async (email: string, userType: string) => {
    try {
     const { data, error } = await supabase
  .from("employees") // table name correct ah iruku
  .select("*")
  .eq("email_address", email) // <-- column name update

  .eq("is_active", true);

      console.log('Employee validation result:', { data, error, email, userType })

      // If no data found or error occurred
      if (error && error.code === 'PGRST116') {
        // No rows found
        return { exists: false, employeeData: null }
      }
      
      if (error || !data || data.length === 0) {
        return { exists: false, employeeData: null }
      }

      return { exists: true, employeeData: data[0] }
    } catch (err) {
      console.log('Employee validation error:', err)
      return { exists: false, employeeData: null }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isSignup) {
        // Validate required fields
        if (!email || !password || !userType) {
          setError('All fields are required')
          toast({
            title: 'Error',
            description: 'All fields are required',
            variant: 'destructive'
          })
          return
        }

        // First, validate if the employee exists in the employee database
        const { exists, employeeData } = await validateEmployeeExists(email, userType)
        
        console.log('Employee validation:', { exists, email, userType })
        
        if (!exists) {
          setError('You are not authorized to create an account.')
          toast({
            title: 'Access Denied',
            description: 'You are not authorized to create an account.',
            variant: 'destructive'
          })
          setIsLoading(false)
          return
        }

        // Check if user already has an account
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)

        if (existingUser && existingUser.length > 0) {
          setError('Account already exists for this email. Please sign in instead.')
          toast({
            title: 'Account Exists',
            description: 'Account already exists for this email. Please sign in instead.',
            variant: 'destructive'
          })
          setIsLoading(false)
          return
        }

        // Create user account with employee data
        const hashedPassword = await simpleHash(password)
        const { error } = await supabase
          .from('users')
          .insert([{ 
            email, 
            password: hashedPassword, 
            user_type: userType,
       
          
          
          }])

        if (error) {
          console.log('User creation error:', error)
          setError(error.code === '23505' ? 'Email already exists' : error.message)
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive'
          })
          return
        }

        toast({
          title: 'Account Created Successfully',
          description: 'Your account has been created. Please sign in.',
          variant: 'default'
        })
        setIsSignup(false)
        setPassword('')
        setEmail('')
        setUserType('')
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single()

        if (error || !data) {
          setError('Invalid email or password')
          toast({
            title: 'Login Failed',
            description: 'Invalid email or password',
            variant: 'destructive'
          })
          return
        }

        const hashedInputPassword = await simpleHash(password)
        if (hashedInputPassword !== data.password) {
          setError('Invalid email or password')
          toast({
            title: 'Login Failed',
            description: 'Invalid email or password',
            variant: 'destructive'
          })
          return
        }

        localStorage.setItem('user', JSON.stringify({
          id: data.id,
          email: data.email,
          userType: data.user_type,
          fullName: data.full_name,
          department: data.department
        }))

        toast({
          title: 'Login Successful',
          description: `Welcome back, ${data.full_name || data.user_type}!`,
          variant: 'default'
        })

        switch (data.user_type) {
          case 'admin':
            router.push('/admin/dashboard'); break
          case 'employee':
          case 'intern':
            router.push('/employee/dashboard'); break
          case 'team-lead':
            router.push('/team-lead/dashboard'); break
          case 'manager':
            router.push('/manager/finalapprovel'); break
          default:
            router.push('/')
        }
      }
    } catch (err) {
      setError('Something went wrong')
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setForgotError('')
    setForgotSuccess('')

    if (!forgotEmail || !newPassword || !confirmPassword) {
      setForgotError('All fields are required')
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive'
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match')
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return
    }

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        newPassword,
        action: 'reset'
      })
    })

    const result = await res.json()
    if (!res.ok) {
      setForgotError(result.error || 'Reset failed')
      toast({
        title: 'Reset Failed',
        description: result.error || 'Reset failed',
        variant: 'destructive'
      })
    } else {
      setForgotSuccess('Password updated!')
      toast({
        title: 'Success',
        description: 'Password updated successfully',
        variant: 'default'
      })
      setTimeout(() => setShowForgotPassword(false), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Employee Management System</CardTitle>
          <CardDescription className="text-gray-600">
            {isSignup ? 'Create your account' : 'Sign in to access your dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
              <Label htmlFor="userType">User Type*</Label>
              <Select value={userType} onValueChange={setUserType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Admin/Accounts Department
                    </div>
                  </SelectItem>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Employee
                    </div>
                  </SelectItem>
               
                  <SelectItem value="team-lead">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Team Lead
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Manager
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isSignup && (
                <div className="text-right mt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <Button type="submit" className="w-full bg-blue-600 text-white" disabled={isLoading}>
              {isLoading ? (isSignup ? 'Creating...' : 'Signing in...') : (isSignup ? 'Sign Up' : 'Sign In')}
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-blue-500 hover:underline text-sm"
                onClick={() => {
                  setIsSignup(!isSignup)
                  setError('')
                  setPassword('')
                }}
              >
                {isSignup ? 'Already have an account? Sign in' : 'No account? Sign Up'}
              </button>
            </div>
          </form>

          {/* Information note for signup */}
          {isSignup && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Only authorized employees can create accounts. 
                If you encounter issues, please contact your administrator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
     {showForgotPassword && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-md relative">
      <button
        onClick={() => setShowForgotPassword(false)}
        className="absolute top-2 right-3 text-gray-500 text-xl"
      >
        ×
      </button>
      <h2 className="text-lg font-semibold text-center mb-4">Reset Password</h2>

      <Input
        type="email"
        value={forgotEmail}
        onChange={e => setForgotEmail(e.target.value)}
        placeholder="Enter your email"
      />

      <div className="relative mt-3">
        <Input
          type={showNewPass ? 'text' : 'password'}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Create a new password (min 6 characters)"
        />
        <button
          type="button"
          onClick={() => setShowNewPass(!showNewPass)}
          className="absolute top-1/2 right-3 transform -translate-y-1/2"
        >
          {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="relative mt-3">
        <Input
          type={showConfirmPass ? 'text' : 'password'}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Confirm your new password"
        />
        <button
          type="button"
          onClick={() => setShowConfirmPass(!showConfirmPass)}
          className="absolute top-1/2 right-3 transform -translate-y-1/2"
        >
          {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {forgotError && <p className="text-red-500 text-sm mt-2">{forgotError}</p>}
      {forgotSuccess && <p className="text-green-600 text-sm mt-2">{forgotSuccess}</p>}

      <Button onClick={handleResetPassword} className="w-full mt-4 bg-blue-600 text-white">
        Reset Password
      </Button>
    </div>
  </div>
)}

    </div>
  )
}
