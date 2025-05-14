import React from "react";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <nav className="mt-6">
          <ul>
            <li>
              <Link href="/admin/dashboard" className="block py-3 px-6 hover:bg-slate-700">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="block py-3 px-6 hover:bg-slate-700">
                Users
              </Link>
            </li>
            <li>
              <Link href="/admin/withdrawals" className="block py-3 px-6 hover:bg-slate-700">
                Withdrawals
              </Link>
            </li>
            <li>
              <Link href="/admin/transactions" className="block py-3 px-6 hover:bg-slate-700">
                Transactions
              </Link>
            </li>
            <li>
              <Link href="/admin/settings" className="block py-3 px-6 hover:bg-slate-700">
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-white shadow">
          <div className="px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-800">Admin Dashboard</h2>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 