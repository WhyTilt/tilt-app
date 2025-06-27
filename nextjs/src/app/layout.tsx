import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/app/context'
import { TaskProvider } from '@/app/task/context'
import { TaskRunnerProvider } from '@/app/task-runner/context'
import { PanelPreferencesProvider } from '@/app/panel-preferences/context'

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
      <body>
        <AppProvider>
          <TaskRunnerProvider>
            <TaskProvider>
              <PanelPreferencesProvider>
                {children}
              </PanelPreferencesProvider>
            </TaskProvider>
          </TaskRunnerProvider>
        </AppProvider>
      </body>
    </html>
  )
}