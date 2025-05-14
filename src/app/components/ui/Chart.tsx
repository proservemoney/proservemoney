'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ChartData, ChartOptions } from 'chart.js';

interface ChartComponentProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: ChartData;
  options?: ChartOptions;
  darkMode?: boolean;
}

export default function ChartComponent({
  type,
  data,
  options = {},
  darkMode = false,
}: ChartComponentProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Apply dark mode styles to the chart
    const textColor = darkMode ? '#e5e7eb' : '#374151';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)';
    const axisLabelColor = darkMode ? '#9ca3af' : '#4b5563';

    const defaultOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: textColor,
            font: {
              weight: darkMode ? '400' : '500'
            },
            padding: 15
          },
        },
        tooltip: {
          backgroundColor: darkMode ? '#374151' : '#fff',
          titleColor: darkMode ? '#e5e7eb' : '#111827',
          bodyColor: darkMode ? '#e5e7eb' : '#1f2937',
          borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          boxShadow: darkMode ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
      },
      scales: type !== 'pie' && type !== 'doughnut' ? {
        x: {
          grid: {
            color: gridColor,
            drawBorder: true,
            borderDash: darkMode ? [] : [5, 5],
          },
          ticks: {
            color: textColor,
            font: {
              size: 11,
              weight: darkMode ? '400' : '500'
            },
            padding: 8
          },
          title: {
            display: true,
            color: axisLabelColor,
            padding: {top: 10, bottom: 0}
          }
        },
        y: {
          grid: {
            color: gridColor,
            drawBorder: true,
            borderDash: darkMode ? [] : [5, 5],
          },
          ticks: {
            color: textColor,
            font: {
              size: 11,
              weight: darkMode ? '400' : '500'
            },
            padding: 8
          },
          beginAtZero: true,
          title: {
            display: true,
            color: axisLabelColor,
            padding: {top: 0, bottom: 10}
          }
        },
      } : undefined,
    };

    // Create chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      // Destroy existing chart instance to prevent memory leaks
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      chartInstance.current = new Chart(ctx, {
        type,
        data,
        options: { ...defaultOptions, ...options },
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [type, data, options, darkMode]);

  return <canvas ref={chartRef} />;
} 