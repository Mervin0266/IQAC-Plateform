import React from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LucideIcon } from 'lucide-react';

interface GenericPageProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function GenericPage({ onNavigate, currentPage, title, subtitle, icon: Icon, children }: GenericPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          
          {children}
        </div>
      </main>
    </div>
  );
}