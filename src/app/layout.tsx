import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: 'modern',
        variables: {
          colorPrimary: '#3B82F6',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#1e293b',
          borderRadius: '0.75rem',
        },
      }}
    >
      <html lang="en" className="h-full">
        <body className={`${inter.className} h-full antialiased`}>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
            {children}
          </div>
          <Toaster 
            richColors 
            position="top-right" 
            toastOptions={{
              style: {
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
