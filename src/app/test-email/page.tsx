'use client';

import { useState } from 'react';
import { verifyEmail } from '@/lib/email-verification';

export default function TestEmailPage() {
  const [email, setEmail] = useState('dsvbenkesbsid@gmail.com');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    abstractApi: process.env.NEXT_PUBLIC_ABSTRACT_API_KEY ? 'Configured' : 'Not configured',
    hunterApi: process.env.NEXT_PUBLIC_HUNTER_API_KEY ? 'Configured' : 'Not configured'
  });

  const handleTest = async () => {
    setLoading(true);
    try {
      console.log('Testing email:', email);
      console.log('API Keys status:', apiStatus);
      
      const results = await verifyEmail(email);
      console.log('Verification results:', results);
      setResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      setResults([{
        service: 'Error',
        isValid: false,
        details: {
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Email Verification Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">API Configuration Status:</h2>
        <div className="space-y-1">
          <p>Abstract API: <span className={apiStatus.abstractApi === 'Configured' ? 'text-green-600' : 'text-red-600'}>{apiStatus.abstractApi}</span></p>
          <p>Hunter.io API: <span className={apiStatus.hunterApi === 'Configured' ? 'text-green-600' : 'text-red-600'}>{apiStatus.hunterApi}</span></p>
        </div>
      </div>
      
      <div className="mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-full max-w-md"
          placeholder="Enter email to test"
        />
      </div>

      <button
        onClick={handleTest}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Email'}
      </button>

      {results && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          {results.map((result: any, index: number) => (
            <div key={index} className="bg-gray-100 p-4 rounded mb-4">
              <h3 className="font-semibold">{result.service}</h3>
              <p className={result.isValid ? 'text-green-600' : 'text-red-600'}>
                Valid: {result.isValid ? 'Yes' : 'No'}
              </p>
              {result.details && (
                <div className="mt-2 text-sm">
                  <p>Status: {result.details.status}</p>
                  <p>Reason: {result.details.reason}</p>
                  {result.details.score !== undefined && (
                    <p>Score: {result.details.score}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 