/**
 * NotificationDropdown — Self-contained notification panel.
 *
 * Extracted from Sidebar.tsx to reduce its responsibility.
 * Includes visibility-aware polling (pauses when tab is hidden)
 * and a configurable poll interval (default 30s).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const POLL_INTERVAL_MS = 30_000; // 30 seconds (was 10s)

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.token) return;
    // Skip if tab is hidden (visibility-aware polling)
    if (document.visibilityState === 'hidden') return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (e) {
      console.error('Notification fetch error:', e);
    }
  }, [user?.token]);

  // Start/stop polling based on visibility
  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-fetch immediately when tab becomes visible
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    if (!user?.token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error('Mark as read error:', e);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="p-2 hover:bg-[#3d5bb0] rounded-md transition-colors text-blue-100 relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-blue-900" />
        )}
      </button>

      {showNotifications && (
        <div className="absolute bottom-12 left-0 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 text-gray-800 p-3 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
            <span className="font-semibold text-xs text-gray-700">
              Notifications ({unreadCount})
            </span>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Close
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markAsRead(n.id);
                  }}
                  className={`p-2 rounded text-xs transition-colors cursor-pointer text-left ${
                    n.isRead
                      ? 'bg-gray-50 text-gray-500'
                      : 'bg-blue-50 text-blue-900 font-medium hover:bg-blue-100'
                  }`}
                >
                  <p className="font-semibold text-gray-800">{n.title}</p>
                  <p className="mt-0.5 text-gray-600">{n.message}</p>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    {new Date(n.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
