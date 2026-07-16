'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/logo'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 p-4">
      <Card className="w-full max-w-md rounded-2xl border border-white/80 bg-white/80 p-8 text-center shadow-xl shadow-slate-900/5 backdrop-blur-md">
        <div className="flex justify-center mb-4">
          <Logo size="md" showText={false} href={null} />
        </div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Arth-Mitra hit an unexpected error. Please try again - if the problem persists, refresh the page.
        </p>
        <Button onClick={reset} className="w-full">
          Try again
        </Button>
      </Card>
    </div>
  )
}
