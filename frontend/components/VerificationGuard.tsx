"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, checkVerificationStatus } from "@/lib/auth";

interface VerificationGuardProps {
  children: React.ReactNode;
}

export default function VerificationGuard({ children }: VerificationGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkVerification = async () => {
      const user = getCurrentUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Paths that don't require verification
      const allowedPaths = ["/dashboard", "/verify-email", "/logout"];
      if (allowedPaths.includes(pathname)) {
        setIsVerified(true);
        setIsLoading(false);
        return;
      }

      try {
        const status = await checkVerificationStatus();
        
        if (!status.email_verified) {
          router.push("/verify-email");
          return;
        }

        setIsVerified(true);
      } catch (error) {
        console.error("Failed to check verification status:", error);
        router.push("/verify-email");
      } finally {
        setIsLoading(false);
      }
    };

    checkVerification();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-slate-600">Checking verification status...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return null;
  }
  
  return <>{children}</>;
}