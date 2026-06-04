'use client';

import { useRef } from 'react';

interface Tilt3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  perspective?: number;
}

export function Tilt3D({
  children,
  className = '',
  intensity = 10,
  perspective: persp = 700,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(${persp}px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale(1.025) translateZ(8px)`;
    el.style.boxShadow = `0 20px 60px rgba(0,168,181,0.22), 0 0 0 1px rgba(0,168,181,0.2)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    el.style.boxShadow = '';
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        willChange: 'transform',
        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease',
      }}
    >
      {children}
    </div>
  );
}
