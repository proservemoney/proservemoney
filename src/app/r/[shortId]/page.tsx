'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ReferralRedirect({ params }: { params: { shortId: string } }) {
  const router = useRouter();
  const { shortId } = params;

  useEffect(() => {
    // Redirect to the tracking API endpoint
    if (shortId) {
      // The API will handle tracking and redirect to signup
      router.push(`/api/track-referral/${shortId}`);
    } else {
      // Fallback to signup if no shortId
      router.push('/signup');
    }
  }, [shortId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Loader2 className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Redirecting...</h1>
      <p className="text-gray-600 dark:text-gray-300">Please wait while we redirect you.</p>
    </div>
  );
} 