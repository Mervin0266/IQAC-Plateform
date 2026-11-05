import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Award, BookOpen, TrendingUp, Briefcase, Users, Building, Globe, Target,
  ChevronRight, CheckCircle, Star, ChevronDown, GraduationCap, FlaskConical,
  Lightbulb, FileText, Calendar, ArrowRight, Shield, BarChart3,
  Landmark, BookMarked, Network, Microscope, Trophy, Sparkles,
  Play, Pause, ExternalLink, Quote, ClipboardCheck, Medal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

/* ─────────────── Constants & Data ─────────────── */

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=80',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920&q=80',
  'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1920&q=80',
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&q=80',
  'https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=1920&q=80',
];

const HERO_CAPTIONS = [
  { title: 'Internal Quality Assurance Cell', subtitle: 'CHRIST (Deemed to be University), Bangalore' },
  { title: 'Excellence in Education & Research', subtitle: 'NAAC A+ Accredited | CGPA 3.42/4.00' },
  { title: 'Fostering Innovation & Global Impact', subtitle: 'World-Class Infrastructure & Global Partnerships' },
  { title: 'Shaping Future Leaders', subtitle: 'Holistic Development Through Quality Education' },
  { title: 'Committed to Continuous Improvement', subtitle: 'Quality Assurance Through Systematic Planning' },
];

const STATS_DATA = [
  { label: 'Research Papers Published', end: 312, suffix: '+', icon: FileText },
  { label: 'Patents Filed', end: 48, suffix: '', icon: Shield },
  { label: 'Placement Rate', end: 92, suffix: '%', icon: TrendingUp },
  { label: 'Industry Partners', end: 186, suffix: '+', icon: Briefcase },
  { label: 'International MoUs', end: 24, suffix: '', icon: Globe },
  { label: 'Programmes Offered', end: 70, suffix: '+', icon: GraduationCap },
];

const QUICK_LINKS = [
  { icon: Award, label: 'Achievements', key: 'achievements', gradient: 'from-amber-500 to-orange-600', description: 'Awards, recognitions & milestones' },
  { icon: FlaskConical, label: 'Research & Innovation', key: 'research-innovation', gradient: 'from-violet-500 to-purple-700', description: 'Papers, patents & breakthroughs' },
  { icon: BarChart3, label: 'Rankings', key: 'rankings', gradient: 'from-emerald-500 to-green-700', description: 'NIRF, QS & global rankings' },
  { icon: Users, label: 'Placements', key: 'placements-internships', gradient: 'from-sky-500 to-blue-700', description: 'Career outcomes & internships' },
  { icon: Building, label: 'Infrastructure', key: 'infrastructure', gradient: 'from-rose-500 to-red-700', description: 'Campus facilities & labs' },
  { icon: Globe, label: 'International', key: 'international-interactions', gradient: 'from-cyan-500 to-teal-700', description: 'Global collaborations & MoUs' },
  { icon: Lightbulb, label: 'Centre of Excellence', key: 'centre-excellence', gradient: 'from-indigo-500 to-blue-800', description: 'Specialized research centres' },
  { icon: Network, label: 'Industry Connects', key: 'industry-connects', gradient: 'from-fuchsia-500 to-pink-700', description: 'Industry partnerships & projects' },
];

const LATEST_NEWS = [
  {
    title: 'IQAC Annual Academic Audit',
    description: 'A structured quality assurance initiative that reviews academic and administrative performance across the University.',
    date: '2024-03-15',
    category: 'Accreditation',
    icon: Medal,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    title: 'IQAC Report 2024-25',
    description: 'Faculty members receive prestigious research grants totaling ₹5 Crore for cutting-edge research across multiple disciplines.',
    date: '2024-03-10',
    category: 'Research',
    icon: Microscope,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    title: 'Annual Academic Audit 2024-25',
    description: 'The annual audit reviews quality practices across campuses, Schools, and Departments.',
    date: '2024-03-05',
    category: 'International',
    icon: Globe,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    title: 'IQAC Annual Academic Audit',
    description: 'A systematic mechanism for reviewing performance against quality benchmarks and strategic goals.',
    date: '2024-02-28',
    category: 'Placements',
    icon: Trophy,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    title: 'New Centre of Excellence Launched',
    description: 'Inaugurated the Centre for Artificial Intelligence & Data Science to drive innovation in emerging technologies.',
    date: '2024-02-15',
    category: 'Innovation',
    icon: Sparkles,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    title: 'Strategic Initiatives',
    description: 'Evidence-based initiatives that align quality enhancement with the University long-term vision.',
    date: '2024-02-10',
    category: 'Rankings',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
];

const IQAC_OBJECTIVES = [
  { title: 'Quality Enhancement', description: 'Systematic development and application of quality benchmarks for academic and administrative processes.', icon: Target },
  { title: 'Continuous Improvement', description: 'Periodic assessment and review of institutional performance with actionable quality improvement strategies.', icon: TrendingUp },
  { title: 'Stakeholder Feedback', description: 'Structured feedback mechanisms from students, faculty, alumni, and industry partners for holistic improvement.', icon: Users },
  { title: 'Best Practices', description: 'Identification, documentation, and dissemination of best practices across departments and campuses.', icon: Star },
  { title: 'Accreditation Readiness', description: 'Continuous preparation and documentation for NAAC, NBA, and other accreditation body requirements.', icon: ClipboardCheck },
  { title: 'Research Promotion', description: 'Fostering a culture of research, innovation, and knowledge creation across all academic disciplines.', icon: FlaskConical },
];

const CHAIRMAN_MESSAGE = {
  name: 'Dr. Fr. Abraham V M',
  title: 'Vice Chancellor, CHRIST (Deemed to be University)',
  quote: 'The Internal Quality Assurance Cell is the cornerstone of our institutional commitment to excellence. Through rigorous quality auditing, continuous benchmarking, and stakeholder engagement, we ensure that every student who walks through our doors receives nothing but the finest education that prepares them for a world of possibilities.',
};

const AQAR_TIMELINE = [
  { year: '2023-24', status: 'Submitted', highlight: true },
  { year: '2022-23', status: 'Submitted', highlight: false },
  { year: '2021-22', status: 'Submitted', highlight: false },
  { year: '2020-21', status: 'Submitted', highlight: false },
  { year: '2019-20', status: 'Submitted', highlight: false },
];

/* ─────────────── Utility Components ─────────────── */

interface PublicHomePageProps {
  onNavigate: (section: string) => void;
}

/** Animated counter hook */
function useCounter(end: number, isVisible: boolean, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    let raf: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.floor(eased * end));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isVisible, end, duration]);
  return count;
}

/** Intersection-Observer–based reveal */
function RevealOnScroll({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode; className?: string; delay?: number; direction?: 'up' | 'left' | 'right' | 'scale';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const transforms: Record<string, string> = {
    up: 'translateY(40px)',
    left: 'translateX(-40px)',
    right: 'translateX(40px)',
    scale: 'scale(0.92)',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : transforms[direction],
        transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────── Main Component ─────────────── */

export function PublicHomePage({ onNavigate }: PublicHomePageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hero slideshow
  const startSlideshow = useCallback(() => {
    if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    heroIntervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
  }, []);

  useEffect(() => {
    if (!isPaused) startSlideshow();
    return () => { if (heroIntervalRef.current) clearInterval(heroIntervalRef.current); };
  }, [isPaused, startSlideshow]);

  // Stats intersection
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsStatsVisible(true); },
      { threshold: 0.2 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const goToSlide = (index: number) => {
    setCurrentImageIndex(index);
    startSlideshow();
  };

  return (
    <div className="w-full overflow-x-hidden">

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative h-[100vh] min-h-[600px] w-full overflow-hidden">
        {/* Decorative gold accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b from-[#e8c84a] via-[#d4a830] to-[#e8c84a] z-30" />

        {/* Slideshow backgrounds with Ken Burns effect */}
        {HERO_IMAGES.map((image, index) => (
          <div
            key={index}
            className="absolute inset-0"
            style={{
              opacity: index === currentImageIndex ? 1 : 0,
              transition: 'opacity 1.5s cubic-bezier(.4,0,.2,1)',
              zIndex: index === currentImageIndex ? 1 : 0,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                animation: index === currentImageIndex ? 'kenBurns 8s ease-in-out forwards' : 'none',
              }}
            />
          </div>
        ))}

        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 z-[2]" style={{
          background: `
            linear-gradient(180deg, rgba(11,19,43,0.92) 0%, rgba(11,19,43,0.65) 40%, rgba(11,19,43,0.78) 80%, rgba(11,19,43,0.95) 100%),
            radial-gradient(ellipse at 30% 20%, rgba(47,70,146,0.3) 0%, transparent 60%)
          `
        }} />

        {/* Floating particles / decorative elements */}
        <div className="absolute inset-0 z-[3] overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-2 h-2 rounded-full bg-[#e8c84a]/20 animate-pulse" />
          <div className="absolute top-[25%] right-[15%] w-1.5 h-1.5 rounded-full bg-[#e8c84a]/15 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[60%] left-[20%] w-1 h-1 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[40%] right-[25%] w-2.5 h-2.5 rounded-full bg-[#2f4692]/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4">
          <div className="max-w-5xl mx-auto text-center">
            {/* University crest badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-8"
              style={{ animation: 'fadeSlideIn 0.8s ease-out 0s both' }}>
              <Shield className="w-4 h-4 text-[#e8c84a]" />
              <span className="text-sm font-medium text-blue-100 tracking-wide">
                NAAC A+ Accredited - CGPA 3.42/4.00
              </span>
            </div>

            {/* Dynamic title that changes with slides */}
            <h1
              key={`title-${currentImageIndex}`}
              className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] font-bold mb-6 leading-[1.1] tracking-tight"
              style={{ animation: 'heroTextIn 0.9s cubic-bezier(.16,1,.3,1) both' }}
            >
              {HERO_CAPTIONS[currentImageIndex].title}
            </h1>
            <p
              key={`sub-${currentImageIndex}`}
              className="text-lg md:text-xl lg:text-2xl text-blue-100/90 mb-6 font-medium"
              style={{ animation: 'heroTextIn 0.9s cubic-bezier(.16,1,.3,1) 0.15s both' }}
            >
              {HERO_CAPTIONS[currentImageIndex].subtitle}
            </p>

            <p
              className="text-base md:text-lg text-blue-200/70 max-w-3xl mx-auto leading-relaxed mb-10"
              style={{ animation: 'fadeSlideIn 0.8s ease-out 0.3s both' }}
            >
              Empowering academic excellence through systematic quality planning, rigorous evaluation,
              and a commitment to holistic education at CHRIST (Deemed to be University).
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{ animation: 'fadeSlideIn 0.8s ease-out 0.45s both' }}>
              <button
                onClick={() => onNavigate('achievements')}
                className="group bg-[#e8c84a] hover:bg-[#d4a830] text-[#0B132B] px-8 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-[#e8c84a]/20 hover:shadow-xl hover:shadow-[#e8c84a]/30 hover:-translate-y-0.5"
              >
                Explore Achievements
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => onNavigate('research-innovation')}
                className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 inline-flex items-center gap-2 border border-white/20 hover:-translate-y-0.5"
              >
                Research & Innovation
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Slide controls */}
          <div className="absolute bottom-12 flex items-center gap-4" style={{ animation: 'fadeSlideIn 0.8s ease-out 0.6s both' }}>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
              aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-white" /> : <Pause className="w-3.5 h-3.5 text-white" />}
            </button>
            <div className="flex gap-2">
              {HERO_IMAGES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className="group relative h-2 rounded-full transition-all duration-500 overflow-hidden"
                  style={{ width: index === currentImageIndex ? '2rem' : '0.5rem' }}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <div className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                    index === currentImageIndex ? 'bg-[#e8c84a]' : 'bg-white/40 group-hover:bg-white/60'
                  }`} />
                  {index === currentImageIndex && (
                    <div className="absolute inset-0 rounded-full bg-[#e8c84a]/50 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-4 animate-bounce">
            <ChevronDown className="w-6 h-6 text-white/50" />
          </div>
        </div>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 40L48 36C96 32 192 24 288 28C384 32 480 48 576 52C672 56 768 48 864 40C960 32 1056 24 1152 28C1248 32 1344 48 1392 56L1440 64V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0V40Z" fill="#0f1746"/>
          </svg>
        </div>
      </section>

      {/* ═══════════════ ANIMATED STATS BAR ═══════════════ */}
      <section ref={statsRef} className="bg-[#0f1746] text-white py-14 relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {STATS_DATA.map((stat, i) => {
              const Icon = stat.icon;
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const count = useCounter(stat.end, isStatsVisible, 2200 + i * 100);
              return (
                <RevealOnScroll key={stat.label} delay={i * 0.08} direction="up">
                  <div className="text-center group">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mb-3 group-hover:bg-[#e8c84a]/10 group-hover:border-[#e8c84a]/30 transition-all duration-300">
                      <Icon className="w-5 h-5 text-[#e8c84a]" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold mb-1 text-[#e8c84a] tabular-nums">
                      {count}{stat.suffix}
                    </div>
                    <div className="text-xs text-blue-200/70 font-medium">{stat.label}</div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ ABOUT IQAC ═══════════════ */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-bold text-[#2f4692] bg-[#2f4692]/10 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">About IQAC</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Championing Quality in Higher Education
              </h2>
              <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
                The Internal Quality Assurance Cell (IQAC) at Christ University is the institutional mechanism
                for quality sustenance and enhancement — working towards the realization of our motto
                <em className="text-[#2f4692] font-medium"> "Excellence and Service"</em>.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Vision/Mission */}
            <RevealOnScroll direction="left">
              <div className="space-y-8">
                <div className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute -top-4 left-6">
                    <div className="bg-[#2f4692] text-white text-xs font-bold px-4 py-1.5 rounded-full">VISION</div>
                  </div>
                  <p className="text-gray-600 leading-relaxed pt-2">
                    To nurture an institutional culture of quality consciousness through continuous improvement,
                    ensuring Christ University remains a globally recognized centre of excellence in education, research, and service.
                  </p>
                </div>

                <div className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute -top-4 left-6">
                    <div className="bg-[#e8c84a] text-[#0B132B] text-xs font-bold px-4 py-1.5 rounded-full">MISSION</div>
                  </div>
                  <p className="text-gray-600 leading-relaxed pt-2">
                    To develop a system for conscious, consistent, and catalytic action to improve the academic
                    and administrative performance of the institution, and to promote measures for institutional
                    functioning towards quality enhancement and sustenance.
                  </p>
                </div>

                <div className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute -top-4 left-6">
                    <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">MANDATE</div>
                  </div>
                  <p className="text-gray-600 leading-relaxed pt-2">
                    As per NAAC guidelines, every accredited institution shall establish an Internal Quality Assurance Cell (IQAC)
                    as a post-accreditation quality sustenance measure. The IQAC channels all efforts and measures of the institution
                    towards promoting its holistic academic excellence.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            {/* Right: IQAC Composition */}
            <RevealOnScroll direction="right" delay={0.15}>
              <div className="bg-[#0B132B] rounded-2xl p-8 text-white relative overflow-hidden">
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#2f4692]/20 rounded-bl-[80px]" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#e8c84a]/10 rounded-tr-[60px]" />

                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-[#e8c84a]" />
                    IQAC Composition
                  </h3>
                  <div className="space-y-4">
                    {[
                      { role: 'Chairperson', person: 'Vice Chancellor', border: 'border-[#e8c84a]' },
                      { role: 'Director', person: 'IQAC Director', border: 'border-[#2f4692]' },
                      { role: 'Members', person: 'Senior Faculty Representatives', border: 'border-emerald-500' },
                      { role: 'External Members', person: 'Industry & Academic Experts', border: 'border-cyan-500' },
                      { role: 'Alumni Member', person: 'Distinguished Alumni Representative', border: 'border-purple-500' },
                      { role: 'Student Rep.', person: 'Student Council Representative', border: 'border-pink-500' },
                      { role: 'Admin Rep.', person: 'Administrative Staff Member', border: 'border-orange-500' },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-4 p-3 rounded-xl bg-white/5 border-l-3 ${item.border} hover:bg-white/10 transition-colors`}>
                        <span className="text-xs text-blue-200/60 font-medium w-24 shrink-0">{item.role}</span>
                        <span className="text-sm font-medium text-white/90">{item.person}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════════════ ACCREDITATION STATUS ═══════════════ */}
      <section className="py-20 bg-white relative">
        {/* Subtle top border accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4692] via-[#e8c84a] to-[#2f4692]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold text-[#e8c84a] bg-[#e8c84a]/10 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
                Accreditation & Quality
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Accreditation Status</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Our commitment to quality recognized by India's premier accreditation bodies
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* NAAC Card */}
            <RevealOnScroll delay={0}>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
                <div className="h-2 bg-gradient-to-r from-[#2f4692] to-[#4a6bd4]" />
                <CardHeader className="bg-gradient-to-br from-[#0B132B] to-[#1a2654] text-white pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl mb-1">NAAC Accreditation</CardTitle>
                      <CardDescription className="text-blue-200/80 text-xs">
                        National Assessment and Accreditation Council
                      </CardDescription>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                      <span className="text-2xl font-black text-[#e8c84a]">A+</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm">CGPA Score</span>
                      <span className="text-xl font-bold text-[#2f4692]">3.42 / 4.00</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm">Cycle</span>
                      <span className="text-sm font-semibold text-gray-700">4th Cycle</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500 text-sm">Valid Until</span>
                      <span className="text-sm font-semibold text-emerald-600">25 October 2027</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-start gap-2 bg-emerald-50 p-3 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          Highest accreditation grade demonstrating excellence in teaching, learning, research, and governance.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </RevealOnScroll>

            {/* NBA Card */}
            <RevealOnScroll delay={0.1}>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-green-600" />
                <CardHeader className="bg-gradient-to-br from-[#0B132B] to-[#1a2654] text-white pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl mb-1">NBA Accreditation</CardTitle>
                      <CardDescription className="text-blue-200/80 text-xs">
                        National Board of Accreditation
                      </CardDescription>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                      <Shield className="w-7 h-7 text-emerald-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm">Programs Accredited</span>
                      <span className="text-xl font-bold text-[#2f4692]">8</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm">Compliance Rate</span>
                      <span className="text-sm font-bold text-emerald-600">97%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500 text-sm">Status</span>
                      <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Active
                      </span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                          All engineering programs meet NBA quality standards ensuring industry-relevant curriculum and outcomes.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </RevealOnScroll>

            {/* AQAR Timeline */}
            <RevealOnScroll delay={0.2}>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#e8c84a] to-[#d4a830]" />
                <CardHeader className="bg-gradient-to-br from-[#0B132B] to-[#1a2654] text-white pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl mb-1">AQAR Reports</CardTitle>
                      <CardDescription className="text-blue-200/80 text-xs">
                        Annual Quality Assurance Reports
                      </CardDescription>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                      <BookMarked className="w-7 h-7 text-[#e8c84a]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {AQAR_TIMELINE.map((item, i) => (
                      <div key={item.year} className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                        item.highlight ? 'bg-[#2f4692]/5 border border-[#2f4692]/10' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.highlight ? 'bg-[#e8c84a] ring-4 ring-[#e8c84a]/20' : 'bg-gray-300'}`} />
                          <span className={`text-sm font-semibold ${item.highlight ? 'text-[#2f4692]' : 'text-gray-600'}`}>
                            {item.year}
                          </span>
                          {item.highlight && <span className="text-[10px] font-bold text-white bg-[#2f4692] px-2 py-0.5 rounded-full">LATEST</span>}
                        </div>
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════════════ IQAC OBJECTIVES ═══════════════ */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
                Core Objectives
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Functions & Objectives of IQAC
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Strategic pillars driving quality enhancement across every facet of the institution
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {IQAC_OBJECTIVES.map((obj, i) => {
              const Icon = obj.icon;
              return (
                <RevealOnScroll key={obj.title} delay={i * 0.08} direction="up">
                  <div className="group relative p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#2f4692]/20 transition-all duration-400 hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-xl bg-[#2f4692]/8 flex items-center justify-center mb-4 group-hover:bg-[#2f4692] transition-colors duration-300">
                      <Icon className="w-5 h-5 text-[#2f4692] group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">{obj.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{obj.description}</p>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ CHAIRMAN MESSAGE ═══════════════ */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-[#2f4692]/3 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll>
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <span className="inline-block text-xs font-bold text-[#2f4692] bg-[#2f4692]/10 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
                  From the Vice Chancellor's Desk
                </span>
              </div>

              <div className="relative bg-gradient-to-br from-[#0B132B] to-[#162048] rounded-3xl p-8 md:p-12 text-white overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-6 left-8 text-[#e8c84a]/20">
                  <Quote className="w-16 h-16" />
                </div>
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#2f4692]/10 rounded-tl-[100px]" />

                <div className="relative z-10">
                  <blockquote className="text-base md:text-lg text-blue-100/80 leading-relaxed mb-8 italic pl-6 border-l-3 border-[#e8c84a]/40">
                    "{CHAIRMAN_MESSAGE.quote}"
                  </blockquote>
                  <div className="flex items-center gap-4 pl-6">
                    <div className="w-14 h-14 rounded-full bg-[#e8c84a]/20 flex items-center justify-center border-2 border-[#e8c84a]/30">
                      <GraduationCap className="w-6 h-6 text-[#e8c84a]" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{CHAIRMAN_MESSAGE.name}</p>
                      <p className="text-sm text-blue-200/60">{CHAIRMAN_MESSAGE.title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════ LATEST NEWS & EVENTS ═══════════════ */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="flex items-end justify-between mb-14">
              <div>
                <span className="inline-block text-xs font-bold text-rose-600 bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
                  Latest Updates
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">News & Events</h2>
                <p className="text-base text-gray-500">Stay updated with our latest achievements, milestones, and announcements</p>
              </div>
              <button className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-[#2f4692] hover:text-[#1e3175] transition-colors group">
                View All News
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LATEST_NEWS.map((news, index) => {
              const NewsIcon = news.icon;
              return (
                <RevealOnScroll key={index} delay={index * 0.08} direction="up">
                  <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-400 cursor-pointer hover:-translate-y-1 group overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[11px] font-bold ${news.color} ${news.bg} px-3 py-1 rounded-full`}>
                          {news.category}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {new Date(news.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${news.bg} flex items-center justify-center shrink-0`}>
                          <NewsIcon className={`w-5 h-5 ${news.color}`} />
                        </div>
                        <CardTitle className="text-base leading-snug group-hover:text-[#2f4692] transition-colors">
                          {news.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 leading-relaxed mb-4">{news.description}</p>
                      <button className="text-xs text-[#2f4692] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read More <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </CardContent>
                  </Card>
                </RevealOnScroll>
              );
            })}
          </div>

          <div className="md:hidden text-center mt-8">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#2f4692] hover:text-[#1e3175] transition-colors">
              View All News <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════ EXPLORE IQAC — QUICK LINKS ═══════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold text-[#2f4692] bg-[#2f4692]/10 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
                Explore
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Navigate the IQAC Portal</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Quick access to all major quality assurance sections and institutional data
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {QUICK_LINKS.map((link, index) => {
              const Icon = link.icon;
              return (
                <RevealOnScroll key={link.key} delay={index * 0.06} direction="scale">
                  <button
                    onClick={() => onNavigate(link.key)}
                    className="group w-full text-left bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-400 hover:-translate-y-1.5 hover:border-transparent relative overflow-hidden"
                  >
                    {/* Hover gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />

                    <div className="relative z-10">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:bg-white/20 group-hover:shadow-none transition-all duration-300`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-white transition-colors duration-300 mb-1">
                        {link.label}
                      </h3>
                      <p className="text-[11px] text-gray-400 group-hover:text-white/80 transition-colors duration-300 leading-relaxed">
                        {link.description}
                      </p>
                      <ArrowRight className="w-4 h-4 mt-3 text-gray-300 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                    </div>
                  </button>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ QUALITY INITIATIVES MARQUEE ═══════════════ */}
      <section className="py-4 bg-[#e8c84a]/10 border-y border-[#e8c84a]/20 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, setIdx) => (
            <React.Fragment key={setIdx}>
              {[
                '🏅 NAAC A+ Accredited',
                '📊 Quality benchmarks and rankings',
                '🌐 Global partnerships and engagement',
                '🔬 Research and knowledge creation',
                '🎓 Student progression and support',
                '🏗️ State-of-the-Art Infrastructure',
                '📈 Accreditation readiness',
                '🤝 Industry and stakeholder participation',
                '📝 AQAR reports and documentation',
                '⭐ ISO 9001:2015 Certified',
              ].map((item, i) => (
                <span key={`${setIdx}-${i}`} className="mx-8 text-sm font-medium text-[#2f4692]/80 inline-block">
                  {item}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ═══════════════ CALL TO ACTION ═══════════════ */}
      <section className="relative py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B132B] via-[#12204d] to-[#1b2d69]" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e8c84a] to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <RevealOnScroll direction="scale">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-[#e8c84a]" />
              <span className="text-sm font-medium text-blue-100">Excellence and Service</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Quality is Our <span className="text-[#e8c84a]">Commitment</span>
            </h2>
            <p className="text-lg text-blue-100/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join us in our mission to maintain and enhance educational excellence.
              The IQAC ensures every aspect of Christ University upholds the highest standards of quality.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('achievements')}
                className="group bg-[#e8c84a] hover:bg-[#d4a830] text-[#0B132B] px-8 py-4 rounded-xl font-bold transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-[#e8c84a]/20 hover:shadow-xl hover:-translate-y-0.5"
              >
                Explore Our Achievements
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => onNavigate('rankings')}
                className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 inline-flex items-center gap-2 border border-white/20 hover:-translate-y-0.5"
              >
                View Rankings <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════ CSS KEYFRAMES ═══════════════ */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroTextIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
