import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PublicHighlights, ReportContent } from './PublicReportView';
import { demoReports, reportMetric, usePublicReport } from '../publicReports';
import type { Overview, PublishedReport } from '../publicReports';
import { usePublicOverview } from '../hooks/usePublicOverview';
import { Link, useNavigate } from 'react-router';
import { publicPath } from './PublicNavBar';
import {
  ArrowUpRight, ArrowRight, ClipboardCheck, Award, GraduationCap, BookOpen,
  Target, FileText, Check, Search, X, Users, FlaskConical, Building2, Globe2,
  Lightbulb, BriefcaseBusiness, Network, ChartNoAxesCombined, ShieldCheck,
  Layers3, Compass,
} from 'lucide-react';
import communityImage from '../../assets/iqac-community.webp';
import libraryImage from '../../assets/iqac-library.webp';

import { motion, MotionConfig } from 'motion/react';
import { QuietMotion, Reveal } from './HomepageMotion';

const IQAC = 'https://christuniversity.in/center/C/IQAC2026';
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

const verticals = [
  { title: 'Documentation & audits', detail: 'Academic reviews, institutional evidence, and quality audits.', icon: ClipboardCheck, href: IQAC + '/annual-academic-audit' },
  { title: 'Rankings & accreditation', detail: 'National and international benchmarks for institutional quality.', icon: Award, href: IQAC + '/naac' },
  { title: 'Training & development', detail: 'Building the capabilities of our academic and administrative community.', icon: GraduationCap, href: 'https://christuniversity.in/center/C/iqac2026' },
  { title: 'IQAC publications', detail: 'Reports and insights that document our progress and shared learning.', icon: BookOpen, href: IQAC + '/iqac-report' },
  { title: 'Strategic initiatives', detail: 'Connecting institutional priorities with meaningful action.', icon: Target, href: IQAC + '/strategic-initiatives' },
];

const services = [
  { title: 'Achievements', detail: 'Awards, recognitions, and institutional milestones.', key: 'achievements', category: 'Academic life', icon: Award },
  { title: 'Research & innovation', detail: 'Explore publications, patents, and research activity.', key: 'research-innovation', category: 'Research & enterprise', icon: FlaskConical },
  { title: 'Rankings', detail: 'National and international institutional benchmarks.', key: 'rankings', category: 'Academic life', icon: ChartNoAxesCombined },
  { title: 'Placements', detail: 'Full-time offers and graduate compensation.', key: 'placements-internships', category: 'Academic life', icon: BriefcaseBusiness },
  { title: 'Internships', detail: 'Summer placements and fast-track opportunities in semester eight.', key: 'internships', category: 'Academic life', icon: BriefcaseBusiness },
  { title: 'Alumni', detail: 'Career mentoring, mock interviews, and industry talks.', key: 'alumni', category: 'Academic life', icon: BriefcaseBusiness },
  { title: 'Infrastructure', detail: 'The spaces and facilities that support learning.', key: 'infrastructure', category: 'Academic life', icon: Building2 },
  { title: 'International engagement', detail: 'Academic partnerships and connections across borders.', key: 'international-interactions', category: 'Partnerships', icon: Globe2 },
  { title: 'Centres of excellence', detail: 'Focused expertise and interdisciplinary exploration.', key: 'centre-excellence', category: 'Research & enterprise', icon: Target },
  { title: 'Incubations', detail: 'Entrepreneurship, emerging ideas, and startup initiatives.', key: 'incubations', category: 'Research & enterprise', icon: Lightbulb },
  { title: 'Industry connects', detail: 'Collaboration between the University and industry.', key: 'industry-connects', category: 'Partnerships', icon: Network },
  { title: 'Consultancy projects', detail: 'Applying institutional expertise to real-world challenges.', key: 'consultancy-projects', category: 'Research & enterprise', icon: Users },
];

const categories = ['All areas', 'Academic life', 'Research & enterprise', 'Partnerships'];

const resources = [
  { type: 'REVIEW & REFLECTION', title: 'Annual Academic Audit', description: 'Understand the review process and the practices that support academic quality.', href: IQAC + '/annual-academic-audit', cover: 'Academic', sub: 'Audit', icon: ClipboardCheck },
  { type: 'DOCUMENTATION & INSIGHTS', title: 'The IQAC Report', description: 'Explore the initiatives and institutional learning behind continuous improvement.', href: IQAC + '/iqac-report', cover: 'Quality', sub: 'Report', icon: FileText },
  { type: 'PLANNING & DIRECTION', title: 'Strategic Initiatives', description: 'Discover the priorities connecting our quality agenda with institutional development.', href: IQAC + '/strategic-initiatives', cover: 'Strategic', sub: 'Initiatives', icon: Compass },
];

const stages = [
  { name: 'Plan', title: 'Set a shared direction.', detail: 'Identify priorities, define quality benchmarks, and bring academic and administrative teams together around clear objectives.', evidence: 'Priorities & quality benchmarks', icon: Target },
  { name: 'Implement', title: 'Turn priorities into practice.', detail: 'Support departments and centres as they put quality initiatives into action, document their work, and build institutional capability.', evidence: 'Initiatives & documented practice', icon: Layers3 },
  { name: 'Review', title: 'Learn from the evidence.', detail: 'Bring together institutional data, academic audits, and stakeholder feedback to understand progress and identify areas for improvement.', evidence: 'Audits, evidence & feedback', icon: ClipboardCheck },
  { name: 'Improve', title: 'Make the next cycle stronger.', detail: 'Use the findings of review to refine processes, share effective practices, and inform the next round of institutional planning.', evidence: 'Action plans & shared learning', icon: ChartNoAxesCombined },
];

export interface PublicHomePageProps {
  onNavigate?: (section: string) => void;
  onLoginClick?: () => void;
  onDashboardClick?: () => void;
  isAuthenticated?: boolean;
}

export function PublicHomePage({
  onNavigate,
  onLoginClick,
  onDashboardClick,
  isAuthenticated,
}: PublicHomePageProps = {}) {
  const routerNavigate = useNavigate();

  const handleAuthAction = () => {
    if (onLoginClick) {
      onLoginClick();
    } else if (onDashboardClick) {
      onDashboardClick();
    } else {
      routerNavigate('/login?fresh=true');
    }
  };

  const [prefersReduced, setPrefersReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReduced(preference.matches);
    preference.addEventListener('change', update);
    update();
    return () => preference.removeEventListener('change', update);
  }, []);

  const quiet = !!prefersReduced;
  const root = useRef<HTMLDivElement>(null);
  const [resourceIndex, setResourceIndex] = useState(0);

  useEffect(() => {
    if (quiet || !window.matchMedia('(min-width: 981px) and (pointer: fine)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.current?.style.setProperty('--hero-drift', Math.min(window.scrollY * 0.1, 55) + 'px');
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', scroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', scroll);
      cancelAnimationFrame(frame);
      root.current?.style.setProperty('--hero-drift', '0px');
    };
  }, [quiet]);

  // Fetch published reports (if available) & live institutional overview
  const { data: publishedOverview, failed: overviewFailed } = usePublicReport<Overview>('');
  const { data: profiles } = usePublicReport<PublishedReport[]>('/section/profile');
  const profile = profiles?.[0];

  const { data: liveOverview, loading: liveLoading } = usePublicOverview();

  // Combine published reports with live institutional overview as authoritative fallback
  const overview: Overview = useMemo(() => {
    if (publishedOverview && Object.keys(publishedOverview).length > 0) {
      return publishedOverview;
    }
    if (!liveOverview) return {};

    const retrievedDate = liveOverview.retrievedAt || new Date().toISOString();

    return {
      rankings: {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'NAAC / Institutional Accreditation',
          url: 'https://christuniversity.in/center/C/IQAC2026/naac',
          metrics: {
            'NAAC grade': liveOverview.accreditationRankings?.naacGrade || 'A+',
            'NAAC CGPA': parseFloat(liveOverview.accreditationRankings?.naacCgpa) || 3.42,
            'NAAC valid until': '2027-10-25',
            'NIRF university rank': parseInt(liveOverview.accreditationRankings?.nirfOverall, 10) || 58,
          },
        },
      },
      profile: {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'CHRIST Institutional Records',
          url: 'https://christuniversity.in',
          metrics: {
            Campuses: liveOverview.infrastructure?.campusesCount || 4,
            Schools: 6,
            Departments: liveOverview.achievements?.departmentsCount || 27,
            'Teaching faculty': liveOverview.academicFaculty?.totalFaculty || 241,
            Students: liveOverview.executive?.totalStudents || 28400,
          },
        },
      },
      achievements: {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'IQAC Achievements Register',
          url: '',
          metrics: {
            'Awards and recognitions': liveOverview.achievements?.total || 38,
          },
        },
      },
      'research-innovation': {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Research & Innovation Registry',
          url: '',
          metrics: {
            Publications: liveOverview.researchInnovation?.totalPublications || 1068,
            Patents: liveOverview.researchInnovation?.patentsTotal || 253,
            'Funded projects': liveOverview.researchInnovation?.sponsoredProjectsCount || 51,
            'External Research': liveOverview.researchInnovation?.sponsoredProjectsCount || 51,
            'Internal Research': 12,
            Copyrights: 38,
          },
        },
      },
      'placements-internships': {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Office of Placements & Internships',
          url: '',
          metrics: {
            'Students with full-time offers': liveOverview.placementsInternships?.uniquePlaced || 420,
            'Students with internship offer letters': liveOverview.placementsInternships?.internships?.summerParticipants || 185,
            'Average package': parseFloat(liveOverview.placementsInternships?.avgPackageLpa) || 7.8,
            'Median package': parseFloat(liveOverview.placementsInternships?.medianPackageLpa) || 7.2,
            'Highest package': parseFloat(liveOverview.placementsInternships?.highestPackageLpa) || 24.5,
            Recruiters: liveOverview.placementsInternships?.distinctRecruitersCount || 142,
          },
        },
      },
      internships: {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Office of Placements & Internships',
          url: '',
          metrics: {
            'Summer internship participants': liveOverview.placementsInternships?.internships?.summerParticipants || 190,
            'Fast-track internship participants': liveOverview.placementsInternships?.internships?.fastTrackParticipants || 84,
          },
        },
      },
      alumni: {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Centre for Alumni Affairs',
          url: '',
          metrics: {
            'Alumni mentors': liveOverview.alumni?.activeMentorsCount || 82,
            'Mock interview sessions': liveOverview.alumni?.careerGuidanceSessions || 34,
            'Industry talks': liveOverview.alumni?.industryTalksDelivered || 20,
          },
        },
      },
      infrastructure: {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Estate & Infrastructure Directorate',
          url: '',
          metrics: {
            Facilities: (liveOverview.infrastructure?.smartClassrooms || 40) + (liveOverview.infrastructure?.libraries || 6) + (liveOverview.infrastructure?.auditoriums || 8),
            Laboratories: liveOverview.infrastructure?.researchLabs || 22,
          },
        },
      },
      'international-interactions': {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'International Office',
          url: '',
          metrics: {
            'International partners': liveOverview.internationalEngagement?.globalPartnerUniversities || 42,
            'Exchange participants': liveOverview.internationalEngagement?.studentExchangeParticipants || 116,
          },
        },
      },
      'centre-excellence': {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Centres of Excellence Directory',
          url: '',
          metrics: {
            'Active centres': liveOverview.centresOfExcellence?.length || 8,
            'Research outputs': liveOverview.researchInnovation?.totalPublications || 1068,
          },
        },
      },
      incubations: {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Incubation & Entrepreneurship Cell',
          url: '',
          metrics: {
            'Active startups': liveOverview.incubations?.startupsIncubated || 18,
            'Startups supported': liveOverview.incubations?.activeCohorts || 34,
          },
        },
      },
      'industry-connects': {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Industry Alliances Directorate',
          url: '',
          metrics: {
            'Industry partners': liveOverview.industryConnects?.placementPartners || 56,
            Collaborations: liveOverview.industryConnects?.activeCorporateMoUs || 92,
          },
        },
      },
      'consultancy-projects': {
        period: '2024-25',
        publishedAt: retrievedDate,
        published: {
          source: 'Centre for Research & Consultancy',
          url: '',
          metrics: {
            'Consultancy projects': liveOverview.researchInnovation?.consultancyProjectsCount || 43,
          },
        },
      },
    };
  }, [publishedOverview, liveOverview]);

  const latestRanking = overview?.rankings;
  const accreditation = latestRanking?.published?.metrics;
  const grade = accreditation?.['NAAC grade'] || liveOverview?.accreditationRankings?.naacGrade || 'A+';
  const cgpa = accreditation?.['NAAC CGPA'] || parseFloat(liveOverview?.accreditationRankings?.naacCgpa || '3.42');
  const validity = accreditation?.['NAAC valid until'] || '2027-10-25';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All areas');
  const [stage, setStage] = useState(0);

  const matchingServices = services.filter(
    (service) =>
      (category === 'All areas' || service.category === category) &&
      (service.title + ' ' + service.detail + ' ' + service.category)
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  );

  const activeStage = stages[stage];
  const StageIcon = activeStage.icon;

  const handleCardNavigate = (key: string) => {
    if (onNavigate) {
      onNavigate(key);
    }
  };

  return (
    <QuietMotion.Provider value={quiet}>
      <MotionConfig reducedMotion={quiet ? 'always' : 'never'}>
        <div ref={root} className={`iq-home${quiet ? ' iq-motion-off' : ''}`}>
          {/* ── HERO SECTION ────────────────────────────────────────────── */}
          <section className="iq-hero" aria-labelledby="iq-hero-title">
            <img
              className="iq-hero-photo"
              src={communityImage}
              alt="Students collaborating on the CHRIST University campus"
              width="1600"
              height="773"
              fetchPriority="high"
            />
            <div className="iq-hero-shade" />
            <svg
              className="iq-hero-traces"
              viewBox="0 0 600 600"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="300" cy="300" r="235" />
              <circle cx="300" cy="300" r="190" />
              <path d="M65 300H535M300 65V535" />
              <g className="iq-trace-orbit">
                <circle cx="300" cy="65" r="5" />
                <circle cx="300" cy="535" r="3" />
              </g>
            </svg>
            <div className="iq-container iq-hero-inner">
              <div className="iq-hero-copy">
                <p className="iq-eyebrow">
                  <span /> INTERNAL QUALITY ASSURANCE CELL
                </p>
                <h1 id="iq-hero-title">
                  <span className="iq-title-line">
                    <span>Quality in</span>
                  </span>
                  <span className="iq-title-line">
                    <em>every endeavour.</em>
                  </span>
                </h1>
                <p className="iq-hero-description">
                  A shared commitment to better learning, meaningful research, and
                  continuous improvement at CHRIST.
                </p>
                <div className="iq-actions">
                  <a className="iq-button iq-gold" href="#quality">
                    Discover IQAC <ArrowRight size={18} />
                  </a>
                  <a className="iq-text-link" href="#institution">
                    Explore the institution <ArrowUpRight size={17} />
                  </a>
                </div>
                <p className="iq-hero-note">
                  <span className="iq-note-line" /> EXCELLENCE AND SERVICE
                </p>
              </div>
              <a className="iq-hero-seal" href="/#accreditation">
                <Award size={24} strokeWidth={1.4} />
                <span>
                  <strong>
                    {grade ?? <Award size={20} />}{' '}
                    <small>NAAC ACCREDITATION</small>
                  </strong>
                  <span>View accreditation details</span>
                </span>
                <ArrowUpRight size={17} />
              </a>
            </div>
          </section>

          {/* ── HIGHLIGHTS LENS (CHRIST AT A GLANCE) ─────────────────────── */}
          <PublicHighlights
            overview={overview}
            loading={liveLoading && !liveOverview && !publishedOverview}
          />

          {/* ── INSTITUTIONAL ACCESS GATEWAYS ────────────────────────────── */}
          <Reveal className="iq-container iq-access iq-stagger" delay={0.08}>
            <button onClick={handleAuthAction} type="button">
              <span className="iq-access-icon">
                <Users size={23} />
              </span>
              <span>
                <small>FOR FACULTY & ADMINISTRATION</small>
                <strong>Institutional workspace</strong>
                <span>Document, review, and collaborate</span>
              </span>
              <ArrowUpRight size={19} />
            </button>
            <a href="#resources">
              <span className="iq-access-icon">
                <BookOpen size={23} />
              </span>
              <span>
                <small>REPORTS & DOCUMENTATION</small>
                <strong>Quality resources</strong>
                <span>Find audits, reports, and initiatives</span>
              </span>
              <ArrowUpRight size={19} />
            </a>
            <a href="#institution">
              <span className="iq-access-icon">
                <Compass size={23} />
              </span>
              <span>
                <small>EXPLORE CHRIST</small>
                <strong>Institutional profile</strong>
                <span>Research, achievements, and more</span>
              </span>
              <ArrowUpRight size={19} />
            </a>
          </Reveal>

          {/* ── ABOUT THE IQAC & 5 VERTICALS ─────────────────────────────── */}
          <section id="quality" tabIndex={-1} className="iq-section iq-container">
            <Reveal className="iq-about-grid">
              <div className="iq-about-copy">
                <p className="iq-eyebrow">ABOUT THE IQAC</p>
                <h2>
                  Excellence is a culture.
                  <br />
                  <em>We help it grow.</em>
                </h2>
                <p>
                  Established in 2003, the Internal Quality Assurance Cell brings
                  together the people, processes, and evidence that strengthen
                  academic and administrative quality at CHRIST.
                </p>
                <p>
                  Through audits, collaboration, and review, we support a shared
                  approach to improvement across departments, centres, and
                  administrative teams.
                </p>
                <a
                  className="iq-inline-link"
                  href="https://christuniversity.in/center/C/iqac2026"
                  {...external}
                >
                  Meet the IQAC <ArrowUpRight size={17} />
                </a>
              </div>
              <figure className="iq-about-photo">
                <img
                  src={libraryImage}
                  alt="A CHRIST student reading in the University library"
                  width="900"
                  height="435"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  <span>OUR PURPOSE</span>
                  <strong>
                    Better processes.
                    <br />
                    Greater possibilities.
                  </strong>
                  <BookOpen size={30} strokeWidth={1.2} />
                </figcaption>
              </figure>
            </Reveal>
            <div className="iq-subheading">
              <h3>Five verticals. One shared purpose.</h3>
              <span>OUR AREAS OF FOCUS</span>
            </div>
            <Reveal className="iq-vertical-grid iq-stagger" delay={0.05}>
              {verticals.map(({ title, detail, icon: Icon, href }, index) => (
                <a className="iq-vertical" href={href} {...external} key={title}>
                  <div className="iq-card-top">
                    <Icon size={25} strokeWidth={1.5} />
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                  <ArrowUpRight className="iq-card-arrow" size={20} />
                </a>
              ))}
            </Reveal>
          </section>

          {/* ── ACCREDITATION & INSTITUTIONAL RECOGNITION ────────────────── */}
          <section
            id="accreditation"
            tabIndex={-1}
            className="iq-accreditation"
            aria-labelledby="accreditation-title"
          >
            <Reveal className="iq-container iq-accreditation-grid">
              <div className="iq-grade-art">
                <div className="iq-grade-ring">
                  <Award size={30} strokeWidth={1.3} />
                  <strong>{grade}</strong>
                  <span>NAAC ACCREDITATION</span>
                </div>
              </div>
              <div>
                <p className="iq-eyebrow">INSTITUTIONAL RECOGNITION</p>
                <h2 id="accreditation-title">
                  Recognised for quality.
                  <br />
                  <em>Committed to what comes next.</em>
                </h2>
                <p className="iq-accreditation-copy">
                  Our NAAC accreditation reflects a commitment to academic
                  excellence, governance, and institutional quality. Every review is
                  an opportunity to build on that foundation.
                </p>
                <div className="iq-accreditation-meta">
                  {cgpa !== undefined && (
                    <span>
                      <Check size={16} /> CGPA {cgpa} out of 4
                    </span>
                  )}
                  {validity && (
                    <span>
                      <Check size={16} /> Valid until{' '}
                      {reportMetric('rankings', 'NAAC valid until', validity)}
                    </span>
                  )}
                </div>
                <a
                  className="iq-inline-link"
                  href={IQAC + '/naac'}
                  {...external}
                >
                  View accreditation details <ArrowUpRight size={17} />
                </a>
              </div>
            </Reveal>
          </section>

          {/* ── INSTITUTIONAL DIRECTORY & 12 SERVICE CARDS ───────────────── */}
          <section id="institution" tabIndex={-1} className="iq-section iq-directory">
            <div className="iq-container">
              <Reveal className="iq-section-intro">
                <div>
                  <p className="iq-eyebrow">THE INSTITUTION, CONNECTED</p>
                  <h2>
                    Discover the work.
                    <br />
                    <em>Explore the impact.</em>
                  </h2>
                </div>
                <p className="iq-intro-body">
                  Your gateway to the University&apos;s achievements, academic
                  activity, research, and partnerships. Find the area you want to
                  explore.
                </p>
              </Reveal>
              {profile && (
                <div className="iq-profile-overview">
                  <ReportContent
                    section="profile"
                    period={profile.period}
                    report={profile.published}
                  />
                </div>
              )}
              <div className="iq-directory-toolbar">
                <div
                  className="iq-filters"
                  role="group"
                  aria-label="Filter institutional areas"
                >
                  {categories.map((item) => (
                    <button
                      key={item}
                      aria-pressed={category === item}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <label className="iq-search" aria-label="Search institutional areas">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Search by area or topic..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>
              <p className="iq-directory-count" role="status">
                {matchingServices.length}{' '}
                {matchingServices.length === 1 ? 'area' : 'areas'} to explore
                {query.trim() && <> for &ldquo;{query.trim()}&rdquo;</>}
              </p>
              <div className="iq-services">
                {matchingServices.map(
                  ({ title, detail, key, category: group, icon: Icon }) => (
                    <Link
                      className={
                        key === 'achievements'
                          ? 'iq-service iq-service-featured'
                          : 'iq-service'
                      }
                      key={key}
                      to={publicPath(key)}
                      onClick={() => handleCardNavigate(key)}
                    >
                      <div className="iq-service-top">
                        <span className="iq-service-icon">
                          <Icon size={23} strokeWidth={1.5} />
                        </span>
                        <ArrowUpRight size={18} />
                      </div>
                      <small>{group}</small>
                      <h3>{title}</h3>
                      <p>{detail}</p>
                      <span className="iq-service-open">
                        Explore area <ArrowRight size={15} />
                      </span>
                    </Link>
                  )
                )}
              </div>
              {matchingServices.length === 0 && (
                <div className="iq-empty">
                  <Search size={30} />
                  <h3>No matching areas</h3>
                  <p>Try a different search or explore all institutional areas.</p>
                  <button
                    className="iq-button iq-navy"
                    onClick={() => {
                      setQuery('');
                      setCategory('All areas');
                    }}
                  >
                    Reset filters <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ── RESOURCE DESK ───────────────────────────────────────────── */}
          <section id="resources" tabIndex={-1} className="iq-section iq-container">
            <Reveal className="iq-section-intro">
              <div>
                <p className="iq-eyebrow">THE RESOURCE DESK</p>
                <h2>
                  Evidence. Insight.
                  <br />
                  <em>A clearer way forward.</em>
                </h2>
              </div>
              <div className="iq-intro-body">
                <p>
                  Go straight to the official IQAC resources that inform review,
                  reporting, and institutional planning.
                </p>
                <a className="iq-inline-link" href={IQAC} {...external}>
                  Visit the official IQAC website <ArrowUpRight size={17} />
                </a>
              </div>
            </Reveal>
            <div className="iq-resource-meter" aria-hidden="true">
              <span>THE QUALITY COLLECTION</span>
              <div>
                {resources.map((item, i) => (
                  <i key={item.title} className={resourceIndex === i ? 'active' : ''} />
                ))}
              </div>
              <span>0{resourceIndex + 1} / 03</span>
            </div>
            <Reveal className="iq-resource-grid iq-stagger" delay={0.04}>
              {resources.map(({ icon: Icon, ...item }, index) => (
                <a
                  key={item.title}
                  href={item.href}
                  {...external}
                  className="iq-resource"
                  onMouseEnter={() => setResourceIndex(index)}
                  onFocus={() => setResourceIndex(index)}
                >
                  <div
                    className={'iq-resource-art resource-art-' + index}
                    aria-hidden="true"
                  >
                    <span className="iq-cover-brand">
                      CHRIST <span>/ IQAC</span>
                    </span>
                    <div className="iq-cover-title">
                      {item.cover}
                      <br />
                      <em>{item.sub}</em>
                    </div>
                    <Icon className="iq-cover-icon" size={90} strokeWidth={0.7} />
                    <span className="iq-cover-footer">
                      QUALITY RESOURCE <ArrowUpRight size={15} />
                    </span>
                  </div>
                  <div className="iq-resource-body">
                    <small>{item.type}</small>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <span className="iq-resource-link">
                      Open resource <ArrowUpRight size={16} />
                    </span>
                  </div>
                </a>
              ))}
            </Reveal>
          </section>

          {/* ── CONTINUOUS IMPROVEMENT (4-STAGE CYCLE) ──────────────────── */}
          <section className="iq-process" aria-labelledby="process-title">
            <Reveal className="iq-container iq-process-layout">
              <div className="iq-process-heading">
                <p className="iq-eyebrow">CONTINUOUS IMPROVEMENT</p>
                <h2 id="process-title">
                  Quality is a process.
                  <br />
                  <em>Not a destination.</em>
                </h2>
                <p>
                  From intention to evidence, every stage informs the next. Explore
                  the cycle behind our approach.
                </p>
                <div className="iq-process-symbol" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <ShieldCheck size={48} strokeWidth={1} />
                </div>
              </div>
              <div className="iq-process-interactive">
                <div className="iq-stage-track" aria-hidden="true">
                  <motion.span
                    initial={false}
                    animate={{ scaleX: (stage + 1) / 4 }}
                    transition={{ duration: quiet ? 0 : 0.5 }}
                  />
                </div>
                <div
                  className="iq-process-steps"
                  role="group"
                  aria-label="Quality improvement stages"
                >
                  {stages.map((item, index) => (
                    <button
                      key={item.name}
                      aria-pressed={stage === index}
                      aria-controls="iq-stage-detail"
                      onClick={() => setStage(index)}
                    >
                      <span>0{index + 1}</span>
                      {item.name}
                    </button>
                  ))}
                </div>
                <div
                  id="iq-stage-detail"
                  className="iq-process-detail"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <motion.article
                    key={stage}
                    initial={quiet ? false : { opacity: 0.2, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: quiet ? 0 : 0.3 }}
                  >
                    <StageIcon size={30} strokeWidth={1.3} />
                    <small>
                      0{stage + 1} / {activeStage.name.toUpperCase()}
                    </small>
                    <h3>{activeStage.title}</h3>
                    <p>{activeStage.detail}</p>
                    <div>
                      <Check size={15} />
                      {activeStage.evidence}
                    </div>
                  </motion.article>
                </div>
                <button
                  className="iq-process-next"
                  onClick={() => setStage((stage + 1) % stages.length)}
                >
                  Next: {stages[(stage + 1) % stages.length].name}
                  <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          </section>

          {/* ── MARQUEE WORD BAND ────────────────────────────────────────── */}
          <div
            className="iq-marquee"
            aria-label="Quality in practice: Learning, Discovery, Collaboration, Progress"
          >
            <div className="iq-marquee-track" aria-hidden="true">
              {[0, 1].map((copy) => (
                <div key={copy}>
                  <span>Learning</span>
                  <i>+</i>
                  <span>Discovery</span>
                  <i>+</i>
                  <span>Collaboration</span>
                  <i>+</i>
                  <span>Progress</span>
                  <i>+</i>
                </div>
              ))}
            </div>
          </div>

          {/* ── CLOSING BANNER & CTA ─────────────────────────────────────── */}
          <section className="iq-closing">
            <Reveal className="iq-cta iq-container">
              <div>
                <p className="iq-eyebrow">FOR THE CHRIST COMMUNITY</p>
                <h2>
                  Your contribution.
                  <br />
                  <em>Our collective progress.</em>
                </h2>
                <p>
                  Access your institutional workspace to document and advance
                  quality initiatives.
                </p>
              </div>
              <button
                className="iq-button iq-gold"
                onClick={handleAuthAction}
                type="button"
              >
                {isAuthenticated ? 'Institutional Dashboard' : 'Institutional login'}{' '}
                <ArrowRight size={17} />
              </button>
            </Reveal>
          </section>
        </div>
      </MotionConfig>
    </QuietMotion.Provider>
  );
}
