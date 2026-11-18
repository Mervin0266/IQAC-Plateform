import React from 'react';
import { Briefcase, CalendarDays, ChartNoAxesColumn, GraduationCap, MailCheck, Users } from 'lucide-react';
import { AppShell, PageHeader, StatCard } from './design-system';
import { Card } from './ui/card';

export type CareerPage = 'placements-internships' | 'internships' | 'alumni';

const placements = [
  { department: 'Computer Science', students: 4, letters: 3, packages: [7, 8, 10, 16], recruiters: ['A', 'B', 'C'] },
  { department: 'Electronics', students: 3, letters: 2, packages: [6, 7, 9], recruiters: ['B', 'D'] },
  { department: 'Mechanical Engineering', students: 3, letters: 2, packages: [5, 6, 8], recruiters: ['C', 'E'] },
];

const packages = placements.flatMap(row => row.packages).sort((a, b) => a - b);
const middle = Math.floor(packages.length / 2);
const median = packages.length % 2 ? packages[middle] : (packages[middle - 1] + packages[middle]) / 2;
const average = packages.reduce((sum, value) => sum + value, 0) / packages.length;
const formatPackage = (value: number) => `₹${value.toFixed(2)} LPA`;

type InternshipRow = [area: string, period: string, duration: string, participants: number];

const summer: InternshipRow[] = [
  ['Software development', 'May–July', '8 weeks', 12],
  ['Embedded systems', 'May–July', '8 weeks', 7],
];
const fastTrack: InternshipRow[] = [
  ['Product engineering', 'Semester 8', '16 weeks', 9],
  ['Manufacturing operations', 'Semester 8', '16 weeks', 5],
];
const alumni = [
  ['Career mentoring', 'One-to-one guidance for final-year students', 12],
  ['Mock interviews', 'Technical and HR interview practice', 6],
  ['Industry talks', 'Alumni-led sessions on career paths', 4],
];
const sumParticipants = (rows: InternshipRow[]) => rows.reduce((sum, row) => sum + row[3], 0);

function Records({ title, columns, rows }: { title: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <Card className="min-w-0 gap-0 overflow-hidden bg-white">
      <h2 className="px-5 py-4 font-semibold">{title}</h2>
      <div className="overflow-x-auto" role="region" aria-label={title} tabIndex={0}>
        <table className="w-full text-left">
          <thead><tr>{columns.map(column => <th key={column} scope="col" className="px-5 py-3 font-semibold">{column}</th>)}</tr></thead>
          <tbody>
            {rows.map(([label, ...values]) => (
              <tr key={label} className="border-t border-slate-100">
                <th scope="row" className="px-5 py-3 font-medium">{label}</th>
                {values.map((value, index) => <td key={index} className="px-5 py-3">{value}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function CareerOutcomesPage({ page, onNavigate, isPublic = false }: {
  page: CareerPage;
  onNavigate: (page: string) => void;
  isPublic?: boolean;
}) {
  const title = page === 'internships' ? 'Internships' : page === 'alumni' ? 'Alumni' : 'Placements';
  const description = page === 'internships'
    ? 'Summer internships and fast-track opportunities during the eighth semester.'
    : page === 'alumni'
      ? 'Career support from alumni through mentoring, interview preparation, and industry talks.'
      : 'Full-time offers, internship offer letters, and annual compensation for the sample cohort.';

  const content = (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title={title} badge="Mock data" description={description} />
      {page === 'placements-internships' && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard title="Students with full-time offers" value={placements.reduce((sum, row) => sum + row.students, 0)} icon={Briefcase} />
          <StatCard title="Students with internship offer letters" value={placements.reduce((sum, row) => sum + row.letters, 0)} icon={MailCheck} />
          <StatCard title="Average package" value={formatPackage(average)} icon={ChartNoAxesColumn} />
          <StatCard title="Median package" value={formatPackage(median)} icon={ChartNoAxesColumn} />
          <StatCard title="Highest package" value={formatPackage(Math.max(...packages))} icon={ChartNoAxesColumn} />
          <StatCard title="Recruiters" value={new Set(placements.flatMap(row => row.recruiters)).size} icon={Users} />
        </div>
        <Records title="Offers by department" columns={['Department', 'Students with full-time offers', 'Students with internship offer letters']}
          rows={placements.map(row => [row.department, row.students, row.letters])} />
      </>}
      {page === 'internships' && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard title="Summer internship participants" value={sumParticipants(summer)} icon={CalendarDays} />
          <StatCard title="Fast-track internship participants" subtitle="During semester 8" value={sumParticipants(fastTrack)} icon={Briefcase} />
        </div>
        <Records title="Summer Internships" columns={['Area', 'Period', 'Duration', 'Participants']} rows={summer} />
        <Records title="Fast-Track Internships" columns={['Area', 'Period', 'Duration', 'Participants']} rows={fastTrack} />
      </>}
      {page === 'alumni' && <>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Alumni mentors" value={alumni[0][2]} icon={Users} />
          <StatCard title="Mock interview sessions" value={alumni[1][2]} icon={Briefcase} />
          <StatCard title="Industry talks" value={alumni[2][2]} icon={GraduationCap} />
        </div>
        <Records title="Alumni Career Support" columns={['Activity', 'Details', 'Count']} rows={alumni} />
      </>}
    </div>
  );

  return isPublic ? content : <AppShell currentPage={page} onNavigate={onNavigate}>{content}</AppShell>;
}
