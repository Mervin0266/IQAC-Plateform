import React, { createContext, useContext, useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'motion/react';

export const QuietMotion = createContext(false);

/** Content remains visible until enhancement starts; entrance runs only once. */
export function Reveal({ children, className, delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const quiet = useContext(QuietMotion);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.12 });
  const controls = useAnimation();
  useEffect(() => {
    if (quiet) { controls.stop(); controls.set({ opacity: 1, y: 0 }); return; }
    if (seen) void controls.start({
      opacity: [0, 1], y: [18, 0],
      transition: { duration: .65, delay, ease: [.22, 1, .36, 1] },
    });
    return () => controls.stop();
  }, [seen, quiet, controls, delay]);
  return <motion.div ref={ref} className={className} data-revealed={quiet || seen ? 'true' : 'false'} initial={false} animate={controls}>{children}</motion.div>;
}
