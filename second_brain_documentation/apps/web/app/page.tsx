"use client"

import DashboardLayout from '@/app/components/dashboard-layout'

export default function Home() {
  return (
    <DashboardLayout title="Second Brain">
      <div className="min-h-screen flex items-center justify-center p-8">
        <h1 className="text-4xl font-bold text-foreground">
          Welcome to Second Brain
        </h1>
        <p className="text-lg text-muted-foreground">
          Your personal knowledge workspace
        </p>
        <div className="mt-6">
          <button
            onClick={() => alert('Create first page')}
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
          >
            + Create New Page
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}