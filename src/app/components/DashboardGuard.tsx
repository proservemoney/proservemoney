'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth-utils';

/**
 * Guards dashboard routes from unauthenticated access
 * Use as a wrapper for dashboard pages that need authentication
 */
export default function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const authenticated = isAuthenticated();
    console.log('Authentication check result:', authenticated);
    
    if (!authenticated) {
      console.log('User not authenticated, redirecting to login');
      // Redirect to login page with return URL
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      // Use window.location for hard reload to ensure clean state
      window.location.href = `/login?from=${returnUrl}`;
    } else {
      setIsAuthorized(true);
      setIsLoading(false);
    }
  }, [router]);

  // Show loading indicator while checking auth
  if (isLoading && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Verifying your account...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
} 