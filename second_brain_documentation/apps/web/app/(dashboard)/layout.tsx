import Sidebar from '@/app/components/sidebar'
import PageTree from '@/app/components/page-tree'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-auto bg-background p-6">
        <header className="border-b border-border pb-2 mb-4">
          <h1 className="text-2xl font-bold">Second Brain</h1>
        </header>

        <PageTree />

        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </main>
    </div>
  )
}