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
    },
    {
      title: 'Faculty Achievements',
      value: facultyAchievements,
      change: '+8%',
      icon: Users,
    },
    {
      title: 'Annual Reports',
      value: annualReports,
      change: '+8%',
      icon: FileText,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {stat.title}
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                <AnimatedCounter end={stat.value} />
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}