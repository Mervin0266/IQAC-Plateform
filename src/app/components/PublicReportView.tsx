import '../../styles/public-reports.css';
import React, { useState } from 'react';
import { ArrowUpRight, Award, BookOpen, BriefcaseBusiness, Building2, FlaskConical, Globe2, GraduationCap, Handshake, Layers, Lightbulb, Network, ScrollText, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import sections from '../public-report-sections.json';
import { demoReports, reportMetric, usePublicReport } from '../publicReports';
import type { Overview, PublishedReport, Report, ReportSection } from '../publicReports';
import { PageHeader } from './design-system';
import examples from '../report-examples.json';
import { publicPath } from './PublicNavBar';

function publicLink(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
}

const icons = {
  achievements: Award, rankings: ScrollText, profile: Building2, 'research-innovation': BookOpen,
  'placements-internships': BriefcaseBusiness, internships: GraduationCap, alumni: Users,
  infrastructure: Layers, 'international-interactions': Globe2, 'centre-excellence': FlaskConical,
  incubations: Lightbulb, 'industry-connects': Handshake, 'consultancy-projects': Network,
};

function samplePeriods(section: ReportSection): PublishedReport[] {
  const definition = sections[section];
  return ['2025-26', '2024-25'].map((period, year) => {
    const metrics: Report['metrics'] = {};
    Object.entries(definition.metrics).forEach(([label, kind], index) => {
      if (kind === 'date') metrics[label] = '2027-10-25';
      else if (kind === 'text') metrics[label] = label === 'NAAC grade' ? 'A+' : '1201–1400';
      else if (label === 'NAAC CGPA') metrics[label] = 3.42;
      else if (kind === 'package') metrics[label] = [8, 7, 16][index - 2] - year;
      else metrics[label] = (index + 2) * 4 - year;
    });
    return { period, publishedAt: '', published: {
      metrics, source: 'Illustrative local sample', url: '',
      records: examples[section].map((title, index) => ({
        title, category: definition.categories[index], detail: title + ' is included in this illustrative ' + period + ' report.', url: '',
      })),
    }};
  });
}

export function ReportContent({ section, period, report, topic }: { section: ReportSection; period?: string; report?: Report; topic?: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  if (!report) return null;
  const definition = sections[section];
  const { layout, heading } = definition;
  const Icon = icons[section];
  const labels = Object.keys(definition.metrics);
  const metrics = labels.filter(label => (!topic || label === topic) && report.metrics[label] !== undefined && report.metrics[label] !== '');
  const categories = [...new Set(report.records.map(record => record.category).filter(Boolean))];
  const visible = report.records.filter(record => (!topic || record.category.toLowerCase() === topic.toLowerCase()) && (!category || record.category === category) &&
    [record.title, record.detail, record.category].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const amounts = metrics.filter(label => label.endsWith('package'));
  const max = Math.max(1, ...amounts.map(label => Number(report.metrics[label])));
  const grouped = layout === 'partnerships';
  const groups = grouped ? [...new Set(visible.map(record => record.category))] : [''];
  const tracks = !topic && layout === 'tracks';
  const source = publicLink(report.url);
  return <div className={'iq-edition edition-' + layout}>
    <header className="edition-head"><Icon size={34} strokeWidth={1.3} /><div><small>{period}</small><h2>{topic ? topic + ' records' : heading}</h2></div></header>
    <div className="edition-figures">
      {metrics.filter(label => !amounts.includes(label)).map(label => <div key={label}>
        <strong>{reportMetric(section,label,report.metrics[label])}</strong><span>{label}</span>
      </div>)}
    </div>
    <p className="iq-report-source">Source · {source ? <a href={source}>{report.source} <ArrowUpRight size={14} /></a> : report.source}</p>
    {!!amounts.length && <section className="edition-chart"><h3>Annual compensation</h3>
      {amounts.map(label => <div key={label}><span>{label}</span><meter aria-hidden="true" min={0} max={max} value={Number(report.metrics[label])} />
        <strong>{reportMetric(section,label,report.metrics[label])}</strong></div>)}</section>}
    {(tracks || !!report.records.length) && <div className="edition-tools">
      {(!topic && (tracks || categories.length > 0)) && <div role="group" aria-label="Filter records">
        {['', ...new Set([...(tracks ? definition.categories : []), ...categories])].map(name =>
          <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name || 'All records'}</button>)}
      </div>}
      <label>Search {heading.toLowerCase()}<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>}
    {tracks && category && definition.categories.includes(category) && <p className="edition-track-value">
      {labels[definition.categories.indexOf(category)]} · {reportMetric(section,labels[definition.categories.indexOf(category)],report.metrics[labels[definition.categories.indexOf(category)]])}
    </p>}
    {groups.map(group => <section key={group} className="edition-group">
      {grouped && <h3>{group || 'Other engagements'}</h3>}
      <ul className="edition-records">{visible.filter(record => !grouped || record.category === group).map((record,index) => {
        const link = publicLink(record.url);
        const body = <>{record.detail && <p>{record.detail}</p>}{link && <a href={link}>View supporting source <ArrowUpRight size={14} /></a>}</>;
        return <li key={record.title + index}>
          {['directory','cases','ventures'].includes(layout) ? <details><summary><small>{record.category}</small><strong>{record.title}</strong></summary>{body}</details>
            : <><small>{grouped ? period : record.category}</small><h3>{record.title}</h3>{body}</>}
        </li>;
      })}</ul>
    </section>)}
    {(topic || category || query) && !visible.length && <p role="status">No matching records.</p>}
  </div>;
}

const researchTopics: Record<string, string> = {
  publications: 'Publications', patents: 'Patents', copyrights: 'Copyrights',
  'external-research': 'External Research', 'internal-research': 'Internal Research',
};

export function PublicReportPage({ section, workspaceTopic }: { section: ReportSection; workspaceTopic?: string }) {
  const [params] = useSearchParams();
  const topic = section === 'research-innovation' ? researchTopics[workspaceTopic ?? params.get('topic') ?? ''] : undefined;
  const { data: published, failed } = usePublicReport<PublishedReport[]>('/section/' + section);
  const sample = demoReports && (failed || published?.length === 0);
  const data = sample ? samplePeriods(section) : published;
  const [period, setPeriod] = useState('');
  const active = data?.find(item => item.period === period) ?? data?.[0];
  const { title, description } = sections[section];
  const trend = section === 'placements-internships' ? (data ?? []).flatMap(item => {
    const count = item.published.metrics['Students with full-time offers'];
    return typeof count === 'number' ? [{ period: item.period, count }] : [];
  }).reverse() : [];
  const trendMaximum = Math.max(1, ...trend.map(item => item.count));
  return <div className="space-y-5 iq-report-page">
    <PageHeader title={topic ?? title} description={topic ? undefined : description} badge={sample ? "Local demonstration data" : undefined} />
    {section === 'research-innovation' && !workspaceTopic && <nav className="edition-tools" aria-label="Research subsections">
      {[['Research & Innovation', ['Overview', 'Consultancy Projects', 'Publications']], ['Sponsored Research', ['External Research', 'Internal Research']], ['IPRs', ['Patents', 'Copyrights']]].map(([group, names]) => <div key={String(group)}>
        <strong>{group}</strong><div className="iq-lens-links">{(names as string[]).map(name => {
          const key = Object.keys(researchTopics).find(key => researchTopics[key] === name);
          const to = name === 'Consultancy Projects' ? publicPath('consultancy-projects') : publicPath(section) + (key ? '?topic=' + key : '');
          return <Link key={name} aria-current={name === (topic ?? 'Overview') ? 'page' : undefined} to={to}>{name}</Link>;
        })}</div></div>)}
    </nav>}
    {active && <div className="iq-report-filters">
      <label>Reporting period<select value={active.period} onChange={event => setPeriod(event.target.value)}>
        {data?.map(item => <option key={item.period}>{item.period}</option>)}
      </select></label>
    </div>}
    {!data && !failed ? <p role="status">Loading published reports…</p> : <>
      {!active && <p role="status">{failed ? 'Reports are temporarily unavailable.' : 'No report has been published for this section yet.'}</p>}
      <ReportContent key={(active?.period ?? '') + topic} section={section} period={active?.period} topic={topic} report={active?.published} />
      {section === 'rankings' && data && data.length > 1 && <section className="edition-chart"><h2>Rankings across reporting periods</h2>
        <div className="edition-table"><table><thead><tr><th>Framework</th>{data.map(item => <th key={item.period}>{item.period}</th>)}</tr></thead>
        <tbody>{['NIRF university rank','QS world band','THE world band'].map(label => <tr key={label}><th>{label}</th>
          {data.map(item => <td key={item.period}>{reportMetric(section,label,item.published.metrics[label])}</td>)}</tr>)}</tbody></table></div>
      </section>}
      {trend.length > 1 && <section className="iq-report-panel space-y-3">
        <h2>Students with full-time offers by reporting period</h2>
        <ul className="iq-report-trend">
          {trend.map(({ period, count }) => <li key={period}>
            <span>{period}</span><meter aria-hidden="true" max={trendMaximum} value={count} />
            <strong>{count.toLocaleString('en-IN')}</strong>
          </li>)}
        </ul>
      </section>}
    </>}
  </div>;
}

const themes: { name: string; question: string; links: [ReportSection, string][] }[] = [
  { name: 'Recognition', question: 'How is CHRIST recognised?', links: [['rankings', 'NAAC grade'], ['rankings', 'NIRF university rank'], ['rankings', 'QS world band'], ['rankings', 'THE world band']] },
  { name: 'Student journeys', question: 'Where do students go next?', links: [['placements-internships', 'Students with full-time offers'], ['internships', 'Summer internship participants'], ['alumni', 'Alumni mentors']] },
  { name: 'Research', question: 'What are our researchers creating?', links: [['research-innovation', 'Publications'], ['centre-excellence', 'Active centres'], ['incubations', 'Active startups']] },
  { name: 'Connections', question: 'Who learns and works together?', links: [['profile', 'Departments'], ['profile', 'Students'], ['international-interactions', 'International partners'], ['industry-connects', 'Industry partners']] },
];

export function PublicHighlights({ overview, loading }: { overview?: Overview; loading: boolean }) {
  const [active, setActive] = useState(0);
  const theme = themes[active];
  const destinations = [...new Set(theme.links.map(([section]) => section))];
  const available = theme.links.filter(([section, metric]) => overview?.[section]?.published.metrics[metric] !== undefined);

  return <section className="iq-container iq-highlights" aria-labelledby="christ-at-a-glance">
    <h2 id="christ-at-a-glance">CHRIST at a glance</h2>
    <div className="iq-lens-options" role="group" aria-label="Explore by interest">
      {themes.map(({ name }, index) => <button type="button" key={name} aria-pressed={index === active}
        aria-controls="iq-lens-detail" onClick={() => setActive(index)}>{name}</button>)}
    </div>
    <div id="iq-lens-detail" className="iq-lens-detail">
      <div className="iq-lens-intro" key={theme.name}>
        <h3>{theme.question}</h3>
        <div className="iq-lens-links">{destinations.map(section => <Link key={section}
          to={section === 'profile' ? '/#institution' : publicPath(section)}>
          {sections[section].title}<ArrowUpRight size={16} />
        </Link>)}</div>
      </div>
      <div className="iq-lens-results" aria-live="polite">
        {loading ? <p>Loading figures…</p> : available.length ? available.map(([section, metric]) => {
          const item = overview![section]!;
          return <div key={metric}><span>{metric}</span><strong>{reportMetric(section, metric, item.published.metrics[metric])}</strong>
            <small>{item.period} · {item.published.source}</small></div>;
        }) : <div><h4>Reporting coverage</h4><p>Figures are currently unavailable for these measures.</p>
          <ul>{theme.links.map(([, metric]) => <li key={metric}>{metric}</li>)}</ul></div>}
      </div>
    </div>
  </section>;
}
