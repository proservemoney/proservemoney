'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export default function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Detect dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('dashboard-theme');
    const initialDarkMode = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    setDarkMode(initialDarkMode);
  }, []);
  
  // Handle dark mode toggle
  const handleDarkModeChange = (isDarkMode: boolean) => {
    setDarkMode(isDarkMode);
  };
  
  const calculateCommissions = async () => {
    try {
      setIsCalculating(true);
      setCalculationResult(null);
      setError(null);
      
      const response = await fetch('/api/commission/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCalculationResult(data.message);
      } else {
        setError(`Error: ${data.error} - ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      setError(`Failed to calculate commissions: ${error}`);
      console.error('Error calculating commissions:', error);
    } finally {
      setIsCalculating(false);
    }
  };
  
  return (
    <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Commission Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Calculate and distribute commissions for all referred users based on the commission structure.
            </p>
            
            <Button 
              onClick={calculateCommissions} 
              disabled={isCalculating}
            >
              {isCalculating ? 'Calculating...' : 'Calculate Commissions'}
            </Button>
            
            {calculationResult && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200 rounded">
                {calculationResult}
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200 rounded">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="font-bold mb-2">₹2500 Package</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-1">Level</th>
                    <th className="text-left py-1">Commission (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td>12%</td></tr>
                  <tr><td>2</td><td>2%</td></tr>
                  <tr><td>3</td><td>3%</td></tr>
                  <tr><td>4</td><td>4%</td></tr>
                  <tr><td>5</td><td>5%</td></tr>
                  <tr><td>6</td><td>6%</td></tr>
                  <tr><td>7</td><td>7%</td></tr>
                  <tr><td>8</td><td>8%</td></tr>
                  <tr><td>9</td><td>9%</td></tr>
                  <tr><td>10</td><td>10%</td></tr>
                </tbody>
              </table>
            </div>
            
            <div>
              <h3 className="font-bold mb-2">₹800 Package</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-1">Level</th>
                    <th className="text-left py-1">Commission (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td>15%</td></tr>
                  <tr><td>2</td><td>2%</td></tr>
                  <tr><td>3</td><td>3%</td></tr>
                  <tr><td>4</td><td>4%</td></tr>
                  <tr><td>5</td><td>5%</td></tr>
                  <tr><td>6</td><td>6%</td></tr>
                  <tr><td>7</td><td>7%</td></tr>
                  <tr><td>8</td><td>8%</td></tr>
                  <tr><td>9</td><td>9%</td></tr>
                  <tr><td>10</td><td>10%</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 