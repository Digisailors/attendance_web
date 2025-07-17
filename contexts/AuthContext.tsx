"use client";
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { employeeQueries } from '@/lib/queries'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employees']['Row']

interface AuthContextType {
  user: User | null
  employee: Employee | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshEmployee: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadEmployee(session.user.email!)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadEmployee(session.user.email!)
        } else {
          setEmployee(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadEmployee = async (email: string) => {
    try {
      const { data, error } = await employeeQueries.getEmployeeByEmail(email)
      if (error) {
        console.error('Error loading employee:', error)
      } else {
        setEmployee(data)
      }
    } catch (error) {
      console.error('Error loading employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshEmployee = async () => {
    if (user?.email) {
      await loadEmployee(user.email)
    }
  }

  const value = {
    user,
    employee,
    loading,
    signIn,
    signOut,
    refreshEmployee
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};