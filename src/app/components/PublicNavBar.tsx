import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X, ChevronDown } from 'lucide-react';
import christLogo from '../../assets/logo.png';
const links = [
  ['Home', 'home'], ['About IQAC', '#quality'], ['Resources', '#resources'], ['Institutional profile', '#institution'],
];
const more = [['Achievements', 'achievements'], ['Research', 'research-innovation'], ['Rankings', 'rankings'], ['Placements', 'placements-internships'], ['Infrastructure', 'infrastructure'], ['International', 'international-interactions'], ['Centres of excellence', 'centre-excellence'], ['Incubations', 'incubations'], ['Industry connects', 'industry-connects'], ['Consultancy', 'consultancy-projects']];
export function PublicNavBar({ currentSection, onNavigate, onLoginClick }: { currentSection: string; onNavigate: (section: string) => void; onLoginClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (details.current?.open) {
        details.current.open = false;
        details.current.querySelector('summary')?.focus();
      }
      if (open) { setOpen(false); toggle.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const navigate = (key: string) => { setOpen(false); if (details.current) details.current.open = false; onNavigate(key); };
  return <>
    <a className="iq-skip" href="#public-content">Skip to content</a>
    <div className="iq-utility"><div className="iq-container"><span>CHRIST (Deemed to be University)</span><a href="https://christuniversity.in" target="_blank" rel="noopener noreferrer">University website <ArrowUpRight size={12} /></a></div></div>
    <header className="iq-header"><div className="iq-container iq-header-inner"><button className="iq-brand" onClick={() => navigate('home')} aria-label="CHRIST IQAC home"><img src={christLogo} alt="CHRIST (Deemed to be University)" width="170" height="60" /><span className="iq-brand-divider" /><span><strong>IQAC</strong><small>Quality. With purpose.</small></span></button>
      <nav aria-label="Primary navigation" className="iq-desktop-nav">{links.map(([label,key]) => <button key={key} onClick={() => navigate(key)} aria-current={currentSection === key ? 'page' : undefined}>{label}</button>)}<details ref={details} className="iq-more"><summary>Explore <ChevronDown size={13} /></summary><div>{more.map(([label,key]) => <button key={key} onClick={() => navigate(key)}>{label}</button>)}</div></details><button className="iq-nav-login" onClick={onLoginClick}>Institutional login <ArrowUpRight size={14} /></button></nav>
      <button ref={toggle} className="iq-menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="iq-mobile-nav" aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X /> : <Menu />}</button>
    </div>{open && <nav id="iq-mobile-nav" aria-label="Mobile navigation" className="iq-mobile-nav">{[...links, ...more].map(([label,key]) => <button key={key} onClick={() => navigate(key)} aria-current={currentSection === key ? 'page' : undefined}>{label}</button>)}<button onClick={() => { setOpen(false); onLoginClick?.(); }}>Institutional login <ArrowUpRight size={15} /></button></nav>}</header>
  </>;
}
