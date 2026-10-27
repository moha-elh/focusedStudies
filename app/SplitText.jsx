'use client';

// Trimmed from React Bits SplitText (https://reactbits.dev): words rise from behind a mask when scrolled into view,
// then lift toward the pointer on hover. Only the options this site uses are kept.

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

const STIFFNESS = 180;
const DAMPING = 19;

const fontsAreLoaded = () => typeof document !== 'undefined' && (!document.fonts || document.fonts.status === 'loaded');

/** @param {{ text: string, className?: string, stagger?: number, delay?: number }} props stagger in ms per word, delay in s before the first */
const SplitText = ({ text, className = '', stagger = 40, delay = 0 }) => {
  const ref = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(fontsAreLoaded);
  const [ready, setReady] = useState(false);

  // Split only once the font is in, or the word boxes are measured with the fallback font.
  useEffect(() => {
    if (fontsLoaded) return undefined;
    let active = true;
    document.fonts.ready.then(() => active && setFontsLoaded(true));
    return () => {
      active = false;
    };
  }, [fontsLoaded]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !text || !fontsLoaded) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setReady(true);
        return;
      }

      const em = parseFloat(getComputedStyle(el).fontSize) || 16;
      const lift = em * 0.2;
      const radius = em * 1.15;
      let movers = [];
      let centers = null;
      let revealed = false;
      let raf = 0;
      let last = 0;
      const springs = [];
      const pointer = { x: 0, y: 0, inside: false };

      const measure = () => {
        const box = el.getBoundingClientRect();
        centers = movers.map((node, i) => {
          const rect = node.getBoundingClientRect();
          return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top - (springs[i]?.y || 0) };
        });
      };

      // Each word is a damped spring pulled up by a gaussian around the pointer.
      const tick = now => {
        raf = 0;
        const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
        last = now;
        const spots = pointer.inside && revealed ? centers : null;
        let moving = false;
        movers.forEach((node, i) => {
          const spring = springs[i] || (springs[i] = { y: 0, v: 0 });
          const spot = spots?.[i];
          let target = 0;
          if (spot) {
            const dx = (spot.x - pointer.x) / radius;
            const dy = (spot.y - pointer.y) / (radius * 1.4);
            target = -lift * Math.exp(-(dx * dx + dy * dy) * 0.5);
          }
          spring.v += (STIFFNESS * (target - spring.y) - DAMPING * spring.v) * dt;
          spring.y += spring.v * dt;
          if (Math.abs(target - spring.y) < 0.02 && Math.abs(spring.v) < 0.05) {
            spring.y = target;
            spring.v = 0;
          } else moving = true;
          node.style.translate = Math.abs(spring.y) > 0.01 ? `0 ${spring.y.toFixed(2)}px` : '';
        });
        if (moving) raf = requestAnimationFrame(tick);
      };

      const wake = () => {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      };

      const onMove = e => {
        const box = el.getBoundingClientRect();
        pointer.x = e.clientX - box.left;
        pointer.y = e.clientY - box.top;
        pointer.inside = true;
        if (!revealed) return;
        if (!centers) measure();
        wake();
      };

      const onLeave = () => {
        pointer.inside = false;
        wake();
      };

      const split = new GSAPSplitText(el, {
        type: 'words',
        smartWrap: true,
        mask: 'words',
        wordsClass: 'split-word',
        reduceWhiteSpace: false,
        onSplit: self => {
          movers = self.masks?.length === self.words.length ? self.masks : self.words;
          centers = null;
          springs.length = 0;
          if (revealed) return undefined;
          return gsap.fromTo(
            self.words,
            { opacity: 0, y: 40, willChange: 'transform, opacity' },
            {
              opacity: 1,
              y: 0,
              delay,
              duration: 1,
              ease: 'power3.out',
              stagger: stagger / 1000,
              clearProps: 'willChange',
              scrollTrigger: { trigger: el, start: 'top 90%-=100px', once: true, fastScrollEnd: true },
              onComplete: () => (revealed = true)
            }
          );
        }
      });

      // Re-measure on each entry: a resize since the last hover may have re-wrapped the words.
      const onEnter = e => {
        centers = null;
        onMove(e);
      };

      setReady(true);
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);

      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointerenter', onEnter);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
        movers.forEach(node => (node.style.translate = ''));
        split.revert();
      };
    },
    { dependencies: [text, stagger, delay, fontsLoaded], scope: ref, revertOnUpdate: true }
  );

  return (
    <span ref={ref} className={`inline ${className}`} style={{ visibility: ready ? undefined : 'hidden' }}>
      {text}
    </span>
  );
};

export default SplitText;
