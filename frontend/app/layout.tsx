import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

/**
 * Root Layout Component
 * 
 * Implements dark mode following best practices from:
 * - LogRocket: Proper SSR handling with suppressHydrationWarning
 * - Material UI: ThemeProvider wrapping for consistent theming
 * 
 * Key Features:
 * - suppressHydrationWarning prevents hydration mismatch errors
 * - Theme persists across sessions via localStorage
 * - Smooth transitions between light/dark modes
 * - System preference detection (can be enabled via enableSystem prop)
 * 
 * @see https://blog.logrocket.com/dark-mode-react-in-depth-guide/
 */
export const metadata: Metadata = {
  title: "BandBooster - Master Your IELTS Journey",
  description: "Comprehensive IELTS preparation platform with authentic mock tests, instant feedback, and progress tracking. Practice Listening, Reading, Writing, and Speaking to achieve your target score.",
  keywords: ["IELTS", "mock test", "exam preparation", "English test", "IELTS practice", "BandBooster"],
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline CSS to prevent flash - applied immediately */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Prevent flash of light mode on dark theme */
              html.dark {
                color-scheme: dark;
                background: #111827;
              }
              html:not(.dark) {
                color-scheme: light;
                background: #ffffff;
              }
              /* Prevent layout shift during theme load */
              body {
                margin: 0;
                min-height: 100vh;
              }
            `,
          }}
        />
        {/* Blocking script to prevent theme flash - runs before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storageKey = 'app-theme';
                  const theme = localStorage.getItem(storageKey);
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  // Apply saved theme or system preference
                  if (theme === 'dark' || (!theme && systemPrefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.error('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      {/* 
        suppressHydrationWarning is required to prevent hydration errors
        when next-themes injects the theme class on initial load
        @see https://github.com/pacocoursey/next-themes#with-app
      */}
      <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ThemeProvider 
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          storageKey="app-theme"
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
