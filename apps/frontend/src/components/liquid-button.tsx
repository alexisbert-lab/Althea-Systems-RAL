'use client';

import { useRef, useEffect, useState } from 'react';

interface LiquidButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

/**
 * LiquidButton — bouton avec effet liquide/gelée
 *
 * Technique : SVG feTurbulence + feDisplacementMap pour le morphing des bords,
 * combiné à un blob canvas qui suit la souris.
 *
 * Inspiré du ray-marched jelly shader (TypeGPU) mais 100% CSS/Canvas —
 * compatible tous navigateurs, zéro dépendance GPU.
 */
export function LiquidButton({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
}: LiquidButtonProps) {
  const btnRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const blobRef = useRef<HTMLSpanElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const animRef = useRef<number>(0);
  const posRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  /* ── Blob magnétique qui suit la souris ── */
  useEffect(() => {
    const btn = btnRef.current;
    const blob = blobRef.current;
    if (!btn || !blob) return;

    const onMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      posRef.current.tx = e.clientX - rect.left - rect.width / 2;
      posRef.current.ty = e.clientY - rect.top - rect.height / 2;
    };

    const onLeave = () => {
      posRef.current.tx = 0;
      posRef.current.ty = 0;
    };

    btn.addEventListener('mousemove', onMove as EventListener);
    btn.addEventListener('mouseleave', onLeave);
    return () => {
      btn.removeEventListener('mousemove', onMove as EventListener);
      btn.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  /* ── Interpolation fluide (lerp) du blob ── */
  useEffect(() => {
    const blob = blobRef.current;
    if (!blob) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      const pos = posRef.current;
      pos.x = lerp(pos.x, pos.tx, 0.1);
      pos.y = lerp(pos.y, pos.ty, 0.1);
      blob.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const sizeClasses = {
    sm: 'px-5 py-2 text-sm',
    md: 'px-7 py-3 text-base',
    lg: 'px-9 py-4 text-lg',
  }[size];

  const baseClasses = `
    liquid-btn relative overflow-hidden
    font-poppins font-semibold tracking-wide
    rounded-full cursor-pointer select-none
    transition-all duration-300
    ${sizeClasses}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${isPressed ? 'scale-[0.96]' : isHovered ? 'scale-[1.03]' : ''}
    ${className}
  `;

  const variantClasses = {
    primary: 'bg-althea-cta text-white border-2 border-althea-cta/50',
    outline: 'bg-transparent text-althea-cta border-2 border-althea-cta',
  }[variant];

  const sharedProps = {
    ref: btnRef as React.RefObject<HTMLButtonElement>,
    className: `${baseClasses} ${variantClasses}`,
    onMouseEnter: () => !disabled && setIsHovered(true),
    onMouseLeave: () => { setIsHovered(false); setIsPressed(false); },
    onMouseDown: () => !disabled && setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onClick: disabled ? undefined : onClick,
    style: {
      filter: isHovered ? 'url(#liquid-goo)' : 'none',
    } as React.CSSProperties,
  };

  const content = (
    <>
      {/* Blob liquide interne */}
      <span
        ref={blobRef}
        aria-hidden="true"
        className="liquid-blob pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700"
        style={{
          width: isHovered ? '200%' : '0%',
          paddingBottom: isHovered ? '200%' : '0%',
          background:
            variant === 'primary'
              ? 'radial-gradient(circle, rgba(51,191,201,0.9) 0%, rgba(0,168,181,0.7) 100%)'
              : 'radial-gradient(circle, rgba(0,168,181,0.15) 0%, rgba(0,168,181,0.05) 100%)',
          opacity: isHovered ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Particules de surface (micro-highlight) */}
      {isHovered && (
        <>
          <span
            aria-hidden="true"
            className="liquid-glint pointer-events-none absolute"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              top: '18%',
              left: '22%',
              animation: 'liquidGlint 1.8s ease-in-out infinite',
            }}
          />
          <span
            aria-hidden="true"
            className="liquid-glint pointer-events-none absolute"
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              top: '55%',
              left: '70%',
              animation: 'liquidGlint 2.3s ease-in-out 0.4s infinite',
            }}
          />
        </>
      )}

      {/* Texte — passe au-dessus du blob */}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  );

  return (
    <>
      {/* Filtre SVG gooey — monté une fois dans le DOM */}
      <LiquidFilter />

      {href ? (
        <a
          href={href}
          ref={btnRef as unknown as React.RefObject<HTMLAnchorElement>}
          className={`${baseClasses} ${variantClasses} inline-flex items-center`}
          onMouseEnter={() => !disabled && setIsHovered(true)}
          onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
          onMouseDown={() => !disabled && setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          style={{ filter: isHovered ? 'url(#liquid-goo)' : 'none' }}
        >
          {content}
        </a>
      ) : (
        <button type="button" {...sharedProps}>
          {content}
        </button>
      )}
    </>
  );
}

/* ── Filtre SVG gooey (singleton dans le DOM) ── */
let filterMounted = false;

function LiquidFilter() {
  useEffect(() => {
    if (filterMounted) return;
    filterMounted = true;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    svg.innerHTML = `
      <defs>
        <filter id="liquid-goo" x="-20%" y="-20%" width="140%" height="140%"
                color-interpolation-filters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.025"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="1.5" result="blur" />
          <feComposite in="blur" in2="SourceGraphic" operator="atop" />
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);

    return () => {
      filterMounted = false;
      document.body.removeChild(svg);
    };
  }, []);

  return null;
}
