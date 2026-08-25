import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Users, FileText, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  totalAchievements?: number;
  facultyAchievements?: number;
  annualReports?: number;
}

/**
 * AnimatedCounter — counts up from 0 to `end` on mount.
 * Provides a satisfying count-up effect for KPI stats.
 */
function AnimatedCounter({ end, duration = 1200 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setCount(end);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number;
          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease-out cubic for a smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}</span>;
}

export function StatsCards({
  totalAchievements = 120,
  facultyAchievements = 85,
  annualReports = 15
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Achievements',
      value: totalAchievements,
      change: '+10%',
      icon: Trophy,
      gradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100',
      iconColor: 'text-blue-600',
      accentColor: 'border-blue-200',
    },
    {
      title: 'Faculty Achievements',
      value: facultyAchievements,
      change: '+8%',
      icon: Users,
      gradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-600',
      accentColor: 'border-emerald-200',
    },
    {
      title: 'Annual Reports',
      value: annualReports,
      change: '+8%',
      icon: FileText,
      gradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-gradient-to-br from-amber-100 to-orange-100',
      iconColor: 'text-amber-600',
      accentColor: 'border-amber-200',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.gradient} rounded-xl shadow-sm border ${stat.accentColor} p-6 
              hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-default group`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1.5">{stat.title}</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-bold text-gray-900">
                    <AnimatedCounter end={stat.value} />
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.iconBg} 
                group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}