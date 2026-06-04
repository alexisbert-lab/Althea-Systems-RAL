'use client';

import { useRef, useState, useCallback } from 'react';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  className?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

/**
 * GlassButton — bouton verre 3D avec tracking magnétique de la souris
 *
 * Effets :
 *  - Reflet spéculaire (streak blanc en haut)
 *  - Bords asymétriques (lumière haut/gauche, ombre bas/droite)
 *  - Tilt 3D qui suit la position de la souris (perspective)
 *  - Glow teal ambiant + inner highlights
 *  - Ligne de transmission lumineuse en bas (light through glass)
 */
export function GlassButton({
  children,
  onClick,
  href,
  className = '',
  fullWidth = false,
  size = 'md',
  disabled = false,
  type = 'button',
  'aria-label': ariaLabel,
}: GlassButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [style, setStyle] = useState({
    '--rx': '0deg',
    '--ry': '0deg',
    '--tz': '0px',
    '--ty': '0px',
    '--glow': '0.12',
  } as React.CSSProperties);
  const [pressed, setPressed] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 → 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;   // -0.5 → 0.5
    setStyle({
      '--rx': `${(-y * 14).toFixed(1)}deg`,
      '--ry': `${(x * 14).toFixed(1)}deg`,
      '--tz': '6px',
      '--ty': '-2px',
      '--glow': '0.35',
    } as React.CSSProperties);
  }, []);

  const onLeave = useCallback(() => {
    setStyle({
      '--rx': '0deg',
      '--ry': '0deg',
      '--tz': '0px',
      '--ty': '0px',
      '--glow': '0.12',
    } as React.CSSProperties);
    setPressed(false);
  }, []);

  const sizeClass = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  }[size];

  const base = `glass-btn-3d ${sizeClass} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  const sharedProps = {
    className: base,
    style,
    onMouseMove: disabled ? undefined : onMove,
    onMouseLeave: disabled ? undefined : onLeave,
    onMouseDown: () => !disabled && setPressed(true),
    onMouseUp: () => setPressed(false),
    onClick: disabled ? undefined : onClick,
    'data-pressed': pressed ? '' : undefined,
    'aria-label': ariaLabel,
  };

  if (href) {
    return (
      <a href={href} {...(sharedProps as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        <span className="glass-btn-content">{children}</span>
      </a>
    );
  }

  return (
    <button ref={ref} type={type} {...sharedProps} disabled={disabled}>
      <span className="glass-btn-content">{children}</span>
    </button>
  );
}
