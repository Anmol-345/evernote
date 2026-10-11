import Sidebar from './sidebar'
import PageTree from './page-tree'

export default function DashboardLayout({
  children,
  title = 'Second Brain',
}: {
  children: React.ReactNode
  title?: string
}) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-auto bg-background p-6">
        <header className="border-b border-border pb-2 mb-4">
          <h1 className="text-2xl font-bold">{title}</h1>
        </header>

        <PageTree />

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </main>
    </div>
  )
}