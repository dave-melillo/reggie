"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type DashboardStats = {
  guests: {
    total: number;
    confirmed: number;
    declined: number;
    pending: number;
  };
  vendors: {
    total: number;
    contracted: number;
    paid: number;
    totalAmount: number;
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  };
  financial: {
    budget: number;
    actual: number;
    paid: number;
  };
  timeline: {
    total: number;
  };
  venue: {
    total: number;
  };
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [guestsRes, vendorsRes, tasksRes, financialRes, timelineRes, venueRes] = await Promise.all([
          fetch('/api/guests'),
          fetch('/api/vendors'),
          fetch('/api/tasks'),
          fetch('/api/financial'),
          fetch('/api/timeline'),
          fetch('/api/venue'),
        ]);

        const guests = await guestsRes.json();
        const vendors = await vendorsRes.json();
        const tasks = await tasksRes.json();
        const financial = await financialRes.json();
        const timeline = await timelineRes.json();
        const venue = await venueRes.json();

        setStats({
          guests: {
            total: guests.length,
            confirmed: guests.filter((g: any) => g.rsvpStatus === 'CONFIRMED').length,
            declined: guests.filter((g: any) => g.rsvpStatus === 'DECLINED').length,
            pending: guests.filter((g: any) => g.rsvpStatus === 'PENDING').length,
          },
          vendors: {
            total: vendors.length,
            contracted: vendors.reduce((sum: number, v: any) => sum + v.contractedAmount, 0),
            paid: vendors.reduce((sum: number, v: any) => sum + v.paidAmount, 0),
            totalAmount: vendors.reduce((sum: number, v: any) => sum + v.contractedAmount, 0),
          },
          tasks: {
            total: tasks.length,
            todo: tasks.filter((t: any) => t.status === 'TODO').length,
            inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
            done: tasks.filter((t: any) => t.status === 'DONE').length,
          },
          financial: {
            budget: financial.reduce((sum: number, f: any) => sum + f.budgetAmount, 0),
            actual: financial.reduce((sum: number, f: any) => sum + f.actualAmount, 0),
            paid: financial.reduce((sum: number, f: any) => sum + f.paidAmount, 0),
          },
          timeline: {
            total: timeline.length,
          },
          venue: {
            total: venue.length,
          },
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getRSVPPercentage = () => {
    if (!stats || stats.guests.total === 0) return 0;
    return Math.round((stats.guests.confirmed / stats.guests.total) * 100);
  };

  // Wedding date
  const weddingDate = new Date('2026-05-29');
  const today = new Date();
  const daysUntil = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Wedding Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Guest Count */}
        <Link href="/guests" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Guest Count</h2>
          <p className="text-3xl font-bold text-purple-600">{stats.guests.total}</p>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Confirmed</span>
              <span className="font-medium text-green-600">{stats.guests.confirmed}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending</span>
              <span className="font-medium text-orange-600">{stats.guests.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>Declined</span>
              <span className="font-medium text-red-600">{stats.guests.declined}</span>
            </div>
          </div>
        </Link>
        
        {/* Budget */}
        <Link href="/financial" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Budget</h2>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.financial.budget)}</p>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Allocated</span>
              <span className="font-medium">{formatCurrency(stats.financial.actual)}</span>
            </div>
            <div className="flex justify-between">
              <span>Spent</span>
              <span className="font-medium text-green-600">{formatCurrency(stats.financial.paid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining</span>
              <span className="font-medium text-purple-600">{formatCurrency(stats.financial.budget - stats.financial.actual)}</span>
            </div>
          </div>
        </Link>
        
        {/* Vendors */}
        <Link href="/vendors" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Vendors</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.vendors.total}</p>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Contracted</span>
              <span className="font-medium">{formatCurrency(stats.vendors.contracted)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span className="font-medium text-green-600">{formatCurrency(stats.vendors.paid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining</span>
              <span className="font-medium text-orange-600">{formatCurrency(stats.vendors.contracted - stats.vendors.paid)}</span>
            </div>
          </div>
        </Link>
        
        {/* Tasks */}
        <Link href="/tasks" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Tasks</h2>
          <p className="text-3xl font-bold text-orange-600">{stats.tasks.total}</p>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>To Do</span>
              <span className="font-medium text-orange-600">{stats.tasks.todo}</span>
            </div>
            <div className="flex justify-between">
              <span>In Progress</span>
              <span className="font-medium text-blue-600">{stats.tasks.inProgress}</span>
            </div>
            <div className="flex justify-between">
              <span>Done</span>
              <span className="font-medium text-green-600">{stats.tasks.done}</span>
            </div>
          </div>
        </Link>
        
        {/* RSVP Status */}
        <Link href="/guests" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">RSVP Status</h2>
          <p className="text-3xl font-bold text-purple-600">{getRSVPPercentage()}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats.guests.confirmed} of {stats.guests.total} confirmed
          </p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${getRSVPPercentage()}%` }}
            />
          </div>
        </Link>
        
        {/* Days Until */}
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-6 rounded-lg shadow-sm border text-white">
          <h2 className="text-lg font-semibold mb-2">Days Until Wedding</h2>
          <p className="text-5xl font-bold">{daysUntil > 0 ? daysUntil : '🎉'}</p>
          <p className="text-sm mt-1 opacity-90">
            {daysUntil > 0 ? weddingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Today!'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link href="/guests" className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-3xl mb-2">👥</div>
            <span className="text-sm font-medium text-gray-700">Guests</span>
          </Link>
          <Link href="/vendors" className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-3xl mb-2">🤝</div>
            <span className="text-sm font-medium text-gray-700">Vendors</span>
          </Link>
          <Link href="/tasks" className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-3xl mb-2">✅</div>
            <span className="text-sm font-medium text-gray-700">Tasks</span>
          </Link>
          <Link href="/timeline" className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-3xl mb-2">⏰</div>
            <span className="text-sm font-medium text-gray-700">Timeline</span>
          </Link>
          <Link href="/financial" className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-3xl mb-2">💰</div>
            <span className="text-sm font-medium text-gray-700">Financial</span>
          </Link>
          <Link href="/venue" className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-3xl mb-2">🏛️</div>
            <span className="text-sm font-medium text-gray-700">Venue</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity / Next Steps (optional - can add later) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Timeline</h2>
          <p className="text-sm text-gray-600">{stats.timeline.total} events scheduled</p>
          <Link href="/timeline" className="mt-3 inline-block text-purple-600 hover:text-purple-700 text-sm font-medium">
            View full timeline →
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Venue</h2>
          <p className="text-sm text-gray-600">{stats.venue.total} venue{stats.venue.total !== 1 ? 's' : ''} booked</p>
          <Link href="/venue" className="mt-3 inline-block text-purple-600 hover:text-purple-700 text-sm font-medium">
            Manage venues →
          </Link>
        </div>
      </div>
    </div>
  );
}
