import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import one from '../../assets/login-campus-1.jpeg';
import two from '../../assets/login-campus-2.jpg';
import three from '../../assets/login-campus-3.webp';
const slides = [one, two, three];
const descriptions = ['Campus buildings and landscaped gardens', 'CHRIST academic building and palm-lined grounds', 'Aerial view of Kengeri campus'];

export function LoginShowcase() {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const available = slides.map((_, i) => i).filter(i => !failed.includes(i));
  const active = available.includes(index) ? index : available[0];
  const running = !paused && !hovered && !focused && !hidden && !reduced && available.length > 1;
  const move = (step: number) => setIndex(available[(available.indexOf(active) + step + available.length) % available.length]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => move(1), 6000);
    return () => window.clearTimeout(timer);
  }, [active, running, failed]);
  return <section className="iq-login-showcase" aria-label="CHRIST campus photographs" aria-roledescription="carousel" data-slide={active ?? 'none'} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="iq-login-slides">{slides.map((src, i) => !failed.includes(i) && <img key={src} src={src} alt={descriptions[i]} aria-hidden={i !== active} className={i === active ? 'is-active' : ''} style={{ objectPosition: i === 1 ? '55% center' : '50% center' }} loading="eager" fetchPriority={i === 0 ? 'high' : 'low'} onError={() => setFailed(old => old.includes(i) ? old : [...old, i])} />)}</div>
    <div className="iq-login-shade" aria-hidden="true" />
    <footer className="iq-campus-footer">
      <p className="iq-campus-label"><span aria-hidden="true" /> CHRIST · Kengeri Campus</p>
      <h1>Quality. With purpose.</h1>
      <p className="iq-campus-title">Internal Quality Assurance Cell</p>
      <p className="iq-campus-description">A shared commitment to academic excellence.</p>
      {available.length > 1 && <div className="iq-campus-controls">
        <div className="iq-campus-dots">{available.map((i, n) => <button key={i} type="button" aria-label={`Show campus photograph ${n + 1}`} aria-pressed={active === i} onClick={() => setIndex(i)}><span /></button>)}</div>
        <span className="iq-campus-count" aria-hidden="true">0{available.indexOf(active) + 1} / 0{available.length}</span>
        <div className="iq-campus-actions"><button type="button" aria-label="Previous campus photograph" onClick={() => move(-1)}><ArrowLeft size={16} /></button><button type="button" aria-label="Next campus photograph" onClick={() => move(1)}><ArrowRight size={16} /></button>{!reduced && <button type="button" aria-label={paused ? 'Resume campus slideshow' : 'Pause campus slideshow'} onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}</div>
      </div>}
    </footer>
  </section>;
}
