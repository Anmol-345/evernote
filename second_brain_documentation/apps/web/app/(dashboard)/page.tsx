import DashboardLayout from '@/app/(dashboard)/layout'

export default function DashboardHome() {
  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center p-8">
        <h1 className="text-4xl font-bold text-foreground">
          Welcome to Second Brain
        </h1>
        <p className="text-lg text-muted-foreground">
          Your personal knowledge workspace
        </p>
        <div className="mt-6">
          <button
            onClick={() => alert('Create new page')}
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
          >
            + Create New Page
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}