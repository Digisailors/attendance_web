'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Building2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Simple hash function for demo purposes - in production, use proper server-side hashing
const simpleHash = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function LoginPage() {
  const [userType, setUserType] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('Supabase configuration is missing. Please check your environment variables.')
      setIsLoading(false)
      return
    }

    try {
      if (isSignup) {
        // Sign up new user
        const hashedPassword = await simpleHash(password)
        
        const { data, error } = await supabase
          .from('users')
          .insert([
            {
              email,
              password: hashedPassword,
              user_type: userType
            }
          ])
          .select()

        if (error) {
          console.error('Supabase error:', error)
          if (error.code === '23505') {
            setError('Email already exists')
          } else {
            setError(`Failed to create account: ${error.message}`)
          }
          return
        }

        alert('Account created successfully! Please sign in.')
        setIsSignup(false)
        setPassword('')
      } else {
        // Sign in existing user
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single()

        if (error || !data) {
          setError('Invalid email or password')
          return
        }

        // Verify password
        const hashedInputPassword = await simpleHash(password)
        if (hashedInputPassword !== data.password) {
          setError('Invalid email or password')
          return
        }

        // Store user data in localStorage or context
        localStorage.setItem('user', JSON.stringify({
          id: data.id,
          email: data.email,
          userType: data.user_type
        }))

        // Route based on user type
        switch (data.user_type) {
          case 'admin':
            router.push('/admin/dashboard')
            break
          case 'employee':
            router.push('/employee/dashboard')
            break
          case 'intern':
            router.push('/employee/dashboard')
            break
          case 'team-lead':
            router.push('/team-lead/team')
            break
          case 'manager':
            router.push('/manager/dashboard')
            break
          default:
            router.push('/employee/dashboard')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Auth error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Employee Management System
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isSignup ? 'Create your account' : 'Sign in to access your dashboard'}
            </CardDescription>
          </div>
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
                  <SelectItem value="intern">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Intern
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

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isLoading}
            >
              {isLoading 
                ? (isSignup ? 'Creating Account...' : 'Signing In...') 
                : (isSignup ? 'Create Account' : 'Sign In')
              }
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup)
                  setError('')
                  setPassword('')
                }}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                {isSignup 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}