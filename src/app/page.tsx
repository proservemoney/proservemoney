'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const testimonials = [
    {
      name: "Rahul Sharma",
      role: "Small Business Owner",
      content: "ProServeMoney transformed how I manage my business finances. The dashboard gives me a clear picture of my financial health at a glance.",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      name: "Priya Patel",
      role: "Freelance Designer",
      content: "The referral system is amazing! I've earned back my subscription fee just by recommending friends who also needed better financial management.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      name: "Aditya Verma",
      role: "E-commerce Entrepreneur",
      content: "What I love most is how simple everything is. Complex financial tasks are made easy with ProServeMoney's intuitive interface.",
      avatar: "https://randomuser.me/api/portraits/men/67.jpg"
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-900">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-900 mix-blend-multiply" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-blue-900 mix-blend-multiply" />
        </div>
        
        {/* Header */}
        <header className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <span className="text-2xl font-bold text-white">ProServeMoney</span>
                  </div>
                </div>
              </div>
              
              {/* Desktop navigation */}
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6">
                  <Link href="/login" className="px-4 py-2 text-sm font-medium text-white hover:text-blue-200 transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 transition-colors">
                    Sign up
                  </Link>
                </div>
              </div>
              
              {/* Mobile menu button */}
              <div className="md:hidden">
                <button 
                  type="button"
                  className="text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-blue-800 shadow-lg">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link 
                  href="/login" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
                <Link 
                  href="#features" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Features
                </Link>
                <Link 
                  href="#how-it-works" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  How It Works
                </Link>
              </div>
            </div>
          )}
        </header>
        
        {/* Hero Content */}
        <main className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 lg:pt-24">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left lg:flex lg:flex-col lg:justify-center">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white sm:text-5xl xl:text-6xl">
                  <span className="block">Simplify Your</span>
                  <span className="block text-blue-200">Financial Management</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-blue-100 max-w-3xl">
                  ProServeMoney helps you track, manage, and grow your finances with powerful tools designed for individuals and businesses alike.
                </p>
                <div className="mt-10 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link href="/signup" className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10 active:bg-blue-100 active:transform active:scale-95 transition-all">
                      Get Started
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link href="#features" className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-800 bg-opacity-60 hover:bg-opacity-70 md:py-4 md:text-lg md:px-10 active:bg-opacity-80 active:transform active:scale-95 transition-all">
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mt-16 sm:mt-24 lg:mt-0 lg:col-span-6">
                <div className="bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden shadow-2xl">
                  <div className="px-4 py-8 sm:px-10">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Financial Dashboard Preview</span>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <div className="rounded-md bg-blue-50 p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Financial Snapshot</h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>Balance: ₹12,450</p>
                              <p>Monthly Growth: +8.2%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">Payment Processed</p>
                              <p className="text-xs text-gray-500">Today, 09:15 AM</p>
                            </div>
                          </div>
                          <span className="text-green-600 font-medium">+₹2,500</span>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">Referral Bonus</p>
                              <p className="text-xs text-gray-500">Yesterday, 2:45 PM</p>
                            </div>
                          </div>
                          <span className="text-green-600 font-medium">+₹500</span>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <Link href="/signup" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          Experience the full dashboard
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Benefits Section */}
      <div id="features" className="py-16 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Benefits</h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Why Choose ProServeMoney?
            </p>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
              Our platform offers unique advantages to help you achieve financial success.
            </p>
          </div>

          <div className="mt-16">
            <div className="space-y-12 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 lg:gap-x-8">
              {/* Benefit 1 */}
              <div className="relative">
                <div className="relative pb-10">
                  <div className="absolute top-0 p-3 inline-block bg-blue-50 rounded-xl">
                    <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 pl-16">
                    <h3 className="text-xl font-medium text-gray-900">Secure & Reliable</h3>
                    <p className="mt-3 text-base text-gray-500">
                      Your financial data is protected with enterprise-grade security. We use 256-bit encryption to ensure your information stays private.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="relative">
                <div className="relative pb-10">
                  <div className="absolute top-0 p-3 inline-block bg-blue-50 rounded-xl">
                    <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 pl-16">
                    <h3 className="text-xl font-medium text-gray-900">Real-time Analytics</h3>
                    <p className="mt-3 text-base text-gray-500">
                      Track your financial growth with intuitive dashboards that provide insights into your spending, savings, and investments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="relative">
                <div className="relative pb-10">
                  <div className="absolute top-0 p-3 inline-block bg-blue-50 rounded-xl">
                    <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 pl-16">
                    <h3 className="text-xl font-medium text-gray-900">Referral Program</h3>
                    <p className="mt-3 text-base text-gray-500">
                      Earn rewards by referring friends and family. Our generous referral program lets you earn while helping others improve their finances.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="relative">
                <div className="relative pb-10">
                  <div className="absolute top-0 p-3 inline-block bg-blue-50 rounded-xl">
                    <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 pl-16">
                    <h3 className="text-xl font-medium text-gray-900">Time-Saving Automation</h3>
                    <p className="mt-3 text-base text-gray-500">
                      Automate routine financial tasks and save hours each week. Let our system handle the repetitive work while you focus on growth.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefit 5 */}
              <div className="relative">
                <div className="relative pb-10">
                  <div className="absolute top-0 p-3 inline-block bg-blue-50 rounded-xl">
                    <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 pl-16">
                    <h3 className="text-xl font-medium text-gray-900">Simple Payment Process</h3>
                    <p className="mt-3 text-base text-gray-500">
                      Our payment system is straightforward and secure. Process transactions with confidence and keep track of all your financial movements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefit 6 */}
              <div className="relative">
                <div className="relative pb-10">
                  <div className="absolute top-0 p-3 inline-block bg-blue-50 rounded-xl">
                    <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 pl-16">
                    <h3 className="text-xl font-medium text-gray-900">24/7 Support</h3>
                    <p className="mt-3 text-base text-gray-500">
                      Get help whenever you need it. Our dedicated support team is available around the clock to assist with any questions or concerns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Process</h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              How It Works
            </p>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
              Get started with ProServeMoney in just a few simple steps.
            </p>
          </div>

          <div className="mt-16">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-lg font-medium text-gray-900">
                  Simple 4-Step Process
                </span>
              </div>
            </div>

            <div className="mt-8 max-w-lg mx-auto grid gap-5 lg:grid-cols-4 lg:max-w-none">
              {/* Step 1 */}
              <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xl font-bold">1</span>
                      </div>
                      <h3 className="ml-3 text-xl font-semibold text-gray-900">Sign Up</h3>
                    </div>
                    <p className="mt-3 text-base text-gray-500">
                      Create your account in less than 2 minutes. All you need is your email and basic information to get started.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xl font-bold">2</span>
                      </div>
                      <h3 className="ml-3 text-xl font-semibold text-gray-900">Complete Your Profile</h3>
                    </div>
                    <p className="mt-3 text-base text-gray-500">
                      Fill in your address details and select a plan that meets your financial management needs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xl font-bold">3</span>
                      </div>
                      <h3 className="ml-3 text-xl font-semibold text-gray-900">Make Payment</h3>
                    </div>
                    <p className="mt-3 text-base text-gray-500">
                      Securely pay for your chosen plan using credit/debit cards, UPI, or net banking with our encrypted payment gateway.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xl font-bold">4</span>
                      </div>
                      <h3 className="ml-3 text-xl font-semibold text-gray-900">Access Your Dashboard</h3>
                    </div>
                    <p className="mt-3 text-base text-gray-500">
                      Start using your personalized dashboard immediately. Track finances, manage referrals, and explore all available features.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section - Enhanced for mobile */}
      <div className="bg-gray-50 py-16 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Testimonials</h2>
            <p className="mt-1 text-3xl md:text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Trusted by Thousands
            </p>
            <p className="max-w-xl mt-5 mx-auto text-lg md:text-xl text-gray-500">
              Here's what our users have to say about their experience.
            </p>
          </div>

          <div className="mt-12">
            <div className="max-w-xl mx-auto">
              <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8">
                <div className="flow-root">
                  <div className="-m-2 relative">
                    <div className="p-2">
                      <div className="testimonial-content">
                        <div className="h-32 md:h-36 overflow-hidden">
                          <p className="text-base md:text-lg text-gray-600 italic">"{testimonials[activeTestimonial].content}"</p>
                        </div>
                        <div className="mt-6 flex items-center">
                          <div className="flex-shrink-0">
                            <img 
                              className="h-10 w-10 md:h-12 md:w-12 rounded-full" 
                              src={testimonials[activeTestimonial].avatar} 
                              alt={`${testimonials[activeTestimonial].name} avatar`}
                              loading="lazy"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm md:text-base font-medium text-gray-900">{testimonials[activeTestimonial].name}</div>
                            <div className="text-sm md:text-base font-medium text-blue-600">{testimonials[activeTestimonial].role}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile swipe instructions */}
                <div className="mt-4 text-xs text-center text-gray-500 md:hidden">
                  <p>Swipe or tap dots to navigate</p>
                </div>
                
                {/* Touch-friendly navigation buttons */}
                <div className="mt-4 md:mt-8 flex justify-center space-x-4">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      className={`w-4 h-4 rounded-full ${
                        activeTestimonial === index ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      onClick={() => setActiveTestimonial(index)}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Mobile swipe functionality using touch events */}
                <div 
                  className="mt-4 flex justify-between md:hidden"
                  onTouchStart={(e) => {
                    const touchDown = e.touches[0].clientX;
                    document.getElementById('testimonials-container')?.setAttribute('data-touchstart', touchDown.toString());
                  }}
                  onTouchMove={(e) => {
                    const touchStart = document.getElementById('testimonials-container')?.getAttribute('data-touchstart');
                    if (!touchStart) return;
                    
                    const currentTouch = e.touches[0].clientX;
                    const diff = parseInt(touchStart) - currentTouch;
                    
                    // Swipe left (next)
                    if (diff > 50) {
                      setActiveTestimonial(prev => (prev === testimonials.length - 1 ? 0 : prev + 1));
                      document.getElementById('testimonials-container')?.removeAttribute('data-touchstart');
                    }
                    
                    // Swipe right (previous) 
                    if (diff < -50) {
                      setActiveTestimonial(prev => (prev === 0 ? testimonials.length - 1 : prev - 1));
                      document.getElementById('testimonials-container')?.removeAttribute('data-touchstart');
                    }
                  }}
                  id="testimonials-container"
                >
                  <button 
                    className="w-10 h-10 flex items-center justify-center text-blue-600" 
                    onClick={() => setActiveTestimonial(prev => (prev === 0 ? testimonials.length - 1 : prev - 1))}
                    aria-label="Previous testimonial"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    className="w-10 h-10 flex items-center justify-center text-blue-600" 
                    onClick={() => setActiveTestimonial(prev => (prev === testimonials.length - 1 ? 0 : prev + 1))}
                    aria-label="Next testimonial"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Mobile responsive */}
      <div className="bg-blue-700">
        <div className="max-w-7xl mx-auto py-10 md:py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to take control of your finances?</span>
            <span className="block text-blue-200">Start your journey today.</span>
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link href="/signup" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 active:bg-blue-100 active:transform active:scale-95 transition-all w-full sm:w-auto">
                Get started
              </Link>
            </div>
            <div className="inline-flex rounded-md shadow">
              <Link href="/login" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:transform active:scale-95 transition-all w-full sm:w-auto">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Mobile responsive */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-8 md:py-12 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">ProServeMoney</span>
              </div>
            </div>
            <div className="mt-8 flex justify-center md:mt-0">
              <div className="flex flex-wrap justify-center gap-3 md:gap-6">
                <a href="#" className="text-gray-400 hover:text-gray-500 active:text-gray-600 transition-colors">
                  <span className="sr-only">Privacy Policy</span>
                  <span className="text-sm text-gray-500 hover:text-gray-900">Privacy Policy</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-500 active:text-gray-600 transition-colors">
                  <span className="sr-only">Terms of Service</span>
                  <span className="text-sm text-gray-500 hover:text-gray-900">Terms of Service</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-500 active:text-gray-600 transition-colors">
                  <span className="sr-only">Contact</span>
                  <span className="text-sm text-gray-500 hover:text-gray-900">Contact</span>
                </a>
              </div>
            </div>
          </div>
          <div className=" mt-8 border-t border-gray-200 pt-8 md:flex md:items-center md:justify-between">
            <div className="text-center justify-center space-x-6 md:order-2">
              <p className="text-center text-base text-gray-400">
                &copy; Copyright Proservemoney. All Rights Reserved 2024 |
                <a href="https://wetechnologies.in/" className="text-gray-400 active:text-gray-600 transition-colors"> Designed & Developed with 💙 by
                  <span className="text-sm text-grey-500 hover:text-custom-pink hover:text-[#ee4266]"> WeTechnologies</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
