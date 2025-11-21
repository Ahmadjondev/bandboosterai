'use client';

import { HeroSection } from '@/components/HeroSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { StatsSection } from '@/components/StatsSection';
import { PartnersSection } from '@/components/PartnersSection';
import { FAQSection } from '@/components/FAQSection';
import { CallToActionSection } from '@/components/CallToActionSection';
import { Footer } from '@/components/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Partners Section */}
      {/* <PartnersSection />  */}
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* How It Works Section */}
      <HowItWorksSection />
      
      {/* Stats Section */}
      {/* <StatsSection /> */}
      
      {/* Testimonials Section */}
      {/* <TestimonialsSection /> */}
      
      {/* FAQ Section */}
      <FAQSection />
      
      {/* Call to Action Section */}
      <CallToActionSection />
      
      {/* Footer */}
      <Footer />
    </main>
  );
}
