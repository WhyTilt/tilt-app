import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/app/context'
import { TaskProvider } from '@/app/task/context'
import { TaskRunnerProvider } from '@/app/task-runner/context'
import { PanelPreferencesProvider } from '@/app/panel-preferences/context'
import { TestRunnerProvider } from '@/app/v2/test-runner/context'

export const metadata: Metadata = {
  title: 'Intelligent Desktop - Tilt',
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
                <TestRunnerProvider>
                  {children}
                </TestRunnerProvider>
              </PanelPreferencesProvider>
            </TaskProvider>
          </TaskRunnerProvider>
        </AppProvider>
      </body>
    </html>
  )
}