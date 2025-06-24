import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/app/context'
import { TaskProvider } from '@/app/task/context'
import { TaskRunnerProvider } from '@/app/task-runner/context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AutomagicIT - Automate your desktop and browser based tasks',
  description: 'AI-powered automation for desktop and browser tasks using our intelligent agent.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          <TaskRunnerProvider>
            <TaskProvider>
              {children}
            </TaskProvider>
          </TaskRunnerProvider>
        </AppProvider>
      </body>
    </html>
  )
}