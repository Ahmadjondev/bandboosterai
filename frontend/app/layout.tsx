import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SWRProvider } from "@/components/SWRProvider";
import { NotificationProvider } from "@/lib/notification-context";
import { NotificationBanner } from "@/components/NotificationBanner";
import { ServerErrorOverlay } from "@/components/ServerErrorOverlay";
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

const siteUrl = "https://bandbooster.uz";
const siteName = "BandBooster AI";
const siteDescription = "Comprehensive IELTS preparation platform with AI-powered mock tests, instant feedback, and progress tracking. Practice Listening, Reading, Writing, and Speaking to achieve your target band score. Free practice tests available.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BandBooster AI - Master Your IELTS Journey | Free Practice Tests",
    template: "%s | BandBooster AI",
  },
  description: siteDescription,
  keywords: [
    "IELTS",
    "IELTS mock test",
    "IELTS practice test",
    "IELTS preparation",
    "IELTS exam",
    "IELTS online test",
    "IELTS listening practice",
    "IELTS reading practice",
    "IELTS writing practice",
    "IELTS speaking practice",
    "IELTS band score",
    "English test preparation",
    "BandBooster",
    "IELTS Uzbekistan",
    "free IELTS test",
    "AI IELTS preparation",
    "IELTS online course",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo.svg',
    shortcut: '/logo.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['uz_UZ', 'ru_RU'],
    url: siteUrl,
    siteName: siteName,
    title: "BandBooster AI - Master Your IELTS Journey",
    description: siteDescription,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BandBooster AI - IELTS Preparation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "BandBooster AI - Master Your IELTS Journey",
    description: siteDescription,
    images: ['/og-image.png'],
    creator: '@bandbooster',
    site: '@bandbooster',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      'en': siteUrl,
      'uz': `${siteUrl}/uz`,
      'ru': `${siteUrl}/ru`,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Replace with actual verification code
    yandex: 'your-yandex-verification-code', // Replace with actual verification code
  },
  category: 'education',
  classification: 'IELTS Preparation, Language Learning, Education',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': siteName,
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#2563eb',
    'theme-color': '#2563eb',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Sign-In Library */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
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
          <NotificationProvider>
            <SWRProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </SWRProvider>
            <NotificationBanner />
            <ServerErrorOverlay />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
