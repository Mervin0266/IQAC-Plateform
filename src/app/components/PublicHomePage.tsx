import React from 'react';
import { ArrowUpRight, ArrowRight, ClipboardCheck, Award, GraduationCap, BookOpen, Target, FileText, Check, ChevronRight } from 'lucide-react';

const IQAC = 'https://christuniversity.in/center/C/IQAC2026';
const verticals = [
  { title: 'Documentation & audits', detail: 'Turning institutional evidence into meaningful review and improvement.', icon: ClipboardCheck, href: IQAC + '/annual-academic-audit' },
  { title: 'Rankings & accreditation', detail: 'Benchmarking our progress against national and international standards.', icon: Award, href: IQAC + '/naac' },
  { title: 'Training & development', detail: 'Equipping our community to embed quality in everyday practice.', icon: GraduationCap, href: 'https://christuniversity.in/center/C/iqac2026' },
  { title: 'IQAC publications', detail: 'Sharing reports, insights, and the learning behind institutional progress.', icon: BookOpen, href: IQAC + '/iqac-report' },
  { title: 'Strategic initiatives', detail: 'Connecting long-term priorities with purposeful, measurable action.', icon: Target, href: IQAC + '/strategic-initiatives' },
];
const resources = [
  { type: 'QUALITY REVIEW', title: 'Annual Academic Audit', description: 'Explore the review process, audit timelines, and institutional quality practices.', href: IQAC + '/annual-academic-audit' },
  { type: 'INSTITUTIONAL REPORT', title: 'The IQAC Report', description: 'A consolidated view of quality initiatives, documentation, and continuous improvement.', href: IQAC + '/iqac-report' },
  { type: 'PLANNING & PROGRESS', title: 'Strategic Initiatives', description: 'Discover how institutional priorities guide planning, policy, and evidence-based interventions.', href: IQAC + '/strategic-initiatives' },
];

export function PublicHomePage({ onNavigate, onLoginClick }: { onNavigate: (section: string) => void; onLoginClick: () => void }) {
  return <div className="iq-home">
    <section className="iq-hero">
      <div className="iq-container iq-hero-grid">
        <div className="iq-hero-copy">
          <p className="iq-eyebrow"><span /> INTERNAL QUALITY ASSURANCE CELL</p>
          <h1>A culture of quality.<br /><em>A future of possibilities.</em></h1>
          <p className="iq-hero-description">Advancing academic excellence through evidence, collaboration, and continuous improvement at CHRIST (Deemed to be University).</p>
          <div className="iq-actions">
            <a className="iq-button iq-gold" href="#quality">Discover our approach <ArrowRight size={17} /></a>
            <a className="iq-text-link" href="#resources">Explore reports <ArrowUpRight size={17} /></a>
          </div>
          <div className="iq-hero-note"><span className="iq-note-line" /> Excellence and Service. In every initiative.</div>
        </div>
        <div className="iq-visual" role="img" aria-label="Quality improvement cycle: plan, implement, review, and improve">
          <div className="iq-orbit iq-orbit-outer" /><div className="iq-orbit iq-orbit-inner" />
          <div className="iq-orbit-dot dot-one" /><div className="iq-orbit-dot dot-two" />
          <div className="iq-cycle-core"><span>CHRIST</span><strong>Quality<br />in motion.</strong><small>CONTINUOUS IMPROVEMENT</small></div>
          <div className="iq-cycle-label cycle-plan"><span>01</span> Plan</div>
          <div className="iq-cycle-label cycle-act"><span>02</span> Implement</div>
          <div className="iq-cycle-label cycle-review"><span>03</span> Review</div>
          <div className="iq-cycle-label cycle-improve"><span>04</span> Improve</div>
          <div className="iq-visual-caption"><span className="iq-live-dot" /> A shared commitment. An ongoing process.</div>
        </div>
      </div>
      <div className="iq-container iq-hero-bottom"><span>01 / THE PURSUIT OF EXCELLENCE</span><a href="#quality">Explore IQAC <span aria-hidden="true">&#8595;</span></a></div>
    </section>

    <section className="iq-facts" aria-label="Institutional overview">
      <div className="iq-container iq-facts-grid">
        <div><strong>2003</strong><span>IQAC constituted</span></div>
        <div><strong>5</strong><span>Quality verticals</span></div>
        <a href={IQAC + '/naac'} target="_blank" rel="noopener noreferrer"><strong>A+</strong><span>NAAC accreditation <ArrowUpRight size={14} /></span></a>
        <a href={IQAC + '/naac'} target="_blank" rel="noopener noreferrer"><strong>3.42<span>/4</span></strong><span>NAAC CGPA</span></a>
      </div>
    </section>

    <section id="quality" className="iq-section iq-container">
      <div className="iq-section-intro"><div><p className="iq-eyebrow">PURPOSE INTO PRACTICE</p><h2>Excellence is a journey.<br /><em>Quality is how we move.</em></h2></div><div className="iq-intro-body"><p>Since 2003, IQAC has supported a culture of quality across CHRIST. We connect institutional priorities with the people, processes, and evidence that turn ambition into improvement.</p><a className="iq-inline-link" href="https://christuniversity.in/center/C/iqac2026" target="_blank" rel="noopener noreferrer">About the IQAC <ArrowUpRight size={17} /></a></div></div>
      <div className="iq-vertical-grid">{verticals.map(({ title, detail, icon: Icon, href }, index) => <a className="iq-vertical" href={href} target="_blank" rel="noopener noreferrer" key={title}><div className="iq-card-top"><Icon size={25} strokeWidth={1.5} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{detail}</p><ArrowUpRight className="iq-card-arrow" size={20} /></a>)}</div>
    </section>

    <section className="iq-accreditation"><div className="iq-container iq-accreditation-grid">
      <div className="iq-grade-art"><div className="iq-grade-ring"><Award size={36} strokeWidth={1.3} /><strong>A+</strong><span>NAAC ACCREDITED</span></div><p>CHRIST (Deemed to be University)</p></div>
      <div><p className="iq-eyebrow">RECOGNITION WITH RESPONSIBILITY</p><h2>A standard to uphold.<br /><em>A commitment to strengthen.</em></h2><p className="iq-accreditation-copy">Accreditation reflects our commitment to academic excellence, governance, and institutional quality. IQAC supports this work through structured documentation, data validation, and ongoing review.</p><div className="iq-accreditation-meta"><span><Check size={16} /> CGPA 3.42 out of 4</span><span><Check size={16} /> Valid until 25 October 2027</span></div><a className="iq-button iq-navy" href={IQAC + '/naac'} target="_blank" rel="noopener noreferrer">View accreditation details <ArrowUpRight size={17} /></a></div>
    </div></section>

    <section id="resources" className="iq-section iq-container">
      <div className="iq-section-intro"><div><p className="iq-eyebrow">KNOWLEDGE, EVIDENCE & PROGRESS</p><h2>Resources that bring<br /><em>the work into focus.</em></h2></div><p className="iq-intro-body">Find the reports, review processes, and strategic priorities behind our quality journey.</p></div>
      <div className="iq-resource-grid">{resources.map((item, index) => <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" className="iq-resource"><div className={'iq-resource-art resource-art-' + index}><FileText size={64} strokeWidth={.7} /><span>IQAC / 0{index + 1}</span><div className="iq-paper-lines"><i /><i /><i /></div></div><div className="iq-resource-body"><small>{item.type}</small><h3>{item.title} <ArrowUpRight size={20} /></h3><p>{item.description}</p><span className="iq-resource-link">Explore resource <ArrowRight size={16} /></span></div></a>)}</div>
    </section>

    <section className="iq-portfolio"><div className="iq-container"><p className="iq-eyebrow">EXPLORE THE INSTITUTION</p><div className="iq-portfolio-layout"><h2>Many perspectives.<br /><em>One pursuit of excellence.</em></h2><div className="iq-portfolio-links">{[['Research & innovation','research-innovation'],['Achievements & recognition','achievements'],['Rankings & benchmarks','rankings'],['Industry & international engagement','international-interactions']].map(([label,key]) => <button key={key} onClick={() => onNavigate(key)}>{label}<ChevronRight size={18} /></button>)}</div></div></div></section>
    <section className="iq-cta iq-container"><div><p className="iq-eyebrow">FOR THE CHRIST COMMUNITY</p><h2>Contribute to our next chapter.</h2><p>Access the institutional workspace to document, review, and advance quality initiatives.</p></div><button className="iq-button iq-navy" onClick={onLoginClick}>Institutional login <ArrowRight size={17} /></button></section>
  </div>;
}
