'use client';

import { HeroSection } from '@/components/HeroSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { FAQSection } from '@/components/FAQSection';
import { CallToActionSection } from '@/components/CallToActionSection';
import { Footer } from '@/components/Footer';

export function LandingPageContent() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* How It Works Section */}
      <HowItWorksSection />
      
      {/* FAQ Section */}
      <FAQSection />
      
      {/* Call to Action Section */}
      <CallToActionSection />
      
      {/* Footer */}
      <Footer />
    </main>
  );
}
