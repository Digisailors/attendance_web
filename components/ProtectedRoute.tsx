'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProtectedRoute({
  allowedRoles,
  children
}: {
  allowedRoles: string[],
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/login')
      return
    }

    const { email } = JSON.parse(storedUser)

    // Call backend to get true role based on email
    fetch('/api/validate-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized')
        return res.json()
      })
      .then(data => {
        if (allowedRoles.includes(data.role)) {
          setIsAuthorized(true)
        } else {
          router.push('/unauthorized')
        }
      })
      .catch(() => {
        router.push('/unauthorized')
      })
  }, [])

  if (!isAuthorized) return null

  return <>{children}</>
}
