export const metadata = {
  title: "Second Brain",
  description: "A personal, Notion-inspired knowledge base",
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}