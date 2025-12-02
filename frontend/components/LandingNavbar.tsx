'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';

const navLinks = [
  { name: 'Features', href: '#features' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'Testimonials', href: '#testimonials' },
  { name: 'FAQ', href: '#faq' },
];

export function LandingNavbar() {
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);

      const sections = navLinks.map(link => link.href.replace('#', ''));
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.getElementById(href.replace('#', ''));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <nav
        className={`fixed z-50 transition-all  duration-500 ${
          isScrolled
            ? 'top-4 left-0 right-0 max-w-[92%] mx-auto rounded-2xl bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl shadow-xl py-2'
            : 'top-0 left-0 right-0 w-full bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl py-4 shadow-none rounded-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">

            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
                <Image
                  src="/logo.svg"
                  alt="BandBooster Logo"
                  width={40}
                  height={40}
                  className={`relative transition-transform duration-300 ${
                    isScrolled ? 'w-9 h-9' : 'w-10 h-10'
                  } group-hover:rotate-12`}
                />
              </div>
              <span
                className={`font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent transition-all ${
                  isScrolled ? 'text-xl' : 'text-2xl'
                }`}
              >
                BandBooster AI
              </span>
            </Link>

            {/* DESKTOP LINKS */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    activeSection === link.href.replace('#', '')
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  {link.name}
                  {activeSection === link.href.replace('#', '') && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-linear-to-r from-blue-600 to-indigo-600 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              {!loading && (
                <div className="hidden md:flex items-center gap-3">
                  {user ? (
                    <Link
                      href="/dashboard"
                      className="group relative px-6 py-2.5 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
                    >
                      <span className="relative z-10">Dashboard</span>
                      <div className="absolute inset-0 bg-linear-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="px-5 py-2.5 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-all duration-300"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        className="group relative px-6 py-2.5 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
                      >
                        <span className="relative z-10">Get Started</span>
                        <div className="absolute inset-0 bg-linear-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* MOBILE MENU BUTTON */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6 text-slate-700 dark:text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          isMobileMenuOpen ? 'visible' : 'invisible'
        }`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>

        <div
          className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">

            {/* HEADER */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Menu
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* MOBILE LINKS */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {navLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeSection === link.href.replace('#', '')
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {link.name}
                  </button>
                ))}
              </div>
            </div>

            {/* AUTH BUTTONS */}
            {!loading && (
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                {user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-6 py-3 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold text-center transition-all hover:shadow-lg"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full px-6 py-3 rounded-full border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-center transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full px-6 py-3 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold text-center transition-all hover:shadow-lg"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
