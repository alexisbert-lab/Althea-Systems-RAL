'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from '@/lib/translations';
import { Navbar } from '@/components/barre-navigation';
import { Footer } from '@/components/pied-page';
import { GlassButton } from '@/components/glass-button';
import { Reveal } from '@/components/reveal';
import { toast } from 'sonner';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Clock } from 'lucide-react';

/* ── Carte info latérale avec tilt 3D ── */
function InfoCard({ icon: Icon, label, value, delay }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(400px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <Reveal delay={delay}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="group glass-light rounded-xl p-5 flex items-start gap-4 cursor-default"
        style={{ willChange: 'transform', transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease' }}
      >
        {/* icône */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-althea-cta/15 flex items-center justify-center group-hover:bg-althea-cta/25 transition-colors duration-200">
          <Icon className="w-5 h-5 text-althea-cta" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-althea-cta/70 mb-0.5">{label}</p>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
      </div>
    </Reveal>
  );
}

export default function ContactPage() {
  const t = useTranslations('contactPage');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const csrfTokenRef = useRef<string>('');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/csrf/token`)
      .then((r) => r.json())
      .then((d) => { csrfTokenRef.current = d.csrfToken || ''; })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfTokenRef.current,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || t('error'));
      }
      setSent(true);
      toast.success(t('success'));
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main id="main-content" className="relative min-h-screen overflow-hidden">

        {/* ── Fond ambiant — orbs animés ── */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="orb orb-teal  w-[500px] h-[500px] -top-32   -left-20   animate-orb-drift-slow" />
          <div className="orb orb-navy  w-[420px] h-[420px]  top-1/2  -right-24   animate-orb-drift-reverse" />
          <div className="orb orb-cyan  w-[280px] h-[280px]  bottom-0  left-1/2    animate-orb-drift-slow" style={{ animationDelay: '-4s' }} />
          {/* grille de points subtile */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #00a8b5 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">

          {/* ── Header ── */}
          <Reveal>
            <div className="mb-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-althea-cta/30 bg-althea-cta/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-althea-cta mb-5">
                <MessageSquare className="w-3.5 h-3.5" />
                {t('badge')}
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                {t('title')}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                {t('subtitle')}
              </p>
            </div>
          </Reveal>

          {/* ── Grid principal ── */}
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">

            {/* ── Colonne gauche : infos ── */}
            <div className="flex flex-col gap-5">

              <Reveal>
                <div className="glass rounded-2xl p-6 relative overflow-hidden">
                  {/* mini orb décoratif dans la carte */}
                  <div className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #00a8b5, transparent 70%)' }} />

                  <h2 className="text-base font-bold text-foreground mb-1">{t('info.title')}</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('availability')}
                  </p>

                  <div className="flex flex-col gap-4">
                    <InfoCard icon={Mail}    label={t('info.email')}   value="contact@althea-system.fr" delay={0}   />
                    <InfoCard icon={Phone}   label={t('info.phone')}   value="+33 1 23 45 67 89"         delay={60}  />
                    <InfoCard icon={MapPin}  label={t('info.address')} value="Paris, France"             delay={120} />
                  </div>
                </div>
              </Reveal>

              {/* Temps de réponse */}
              <Reveal delay={80}>
                <div className="glass-light rounded-xl p-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-althea-success/15 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-althea-success" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-althea-success/80 mb-0.5">{t('responseTimeLabel')}</p>
                    <p className="text-sm font-medium text-foreground">{t('responseTimeValue')}</p>
                  </div>
                </div>
              </Reveal>

              {/* Ligne décorative gradient */}
              <Reveal delay={120}>
                <div className="rounded-xl overflow-hidden h-2"
                  style={{ background: 'linear-gradient(90deg, #00a8b5, #33bfc9, #d4f4f7)' }} />
              </Reveal>
            </div>

            {/* ── Colonne droite : formulaire ── */}
            <Reveal delay={60}>
              <div className="glass rounded-2xl p-8 md:p-10 relative overflow-hidden">
                {/* orb décoratif en haut à droite */}
                <div className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, #00a8b5, transparent 70%)' }} />

                {sent ? (
                  /* ── État succès ── */
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full bg-althea-success/15 flex items-center justify-center animate-success-pop">
                        <CheckCircle2 className="w-10 h-10 text-althea-success" />
                      </div>
                      {/* halo pulsant */}
                      <div className="absolute inset-0 rounded-full border-2 border-althea-success/30 animate-ping" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">{t('successTitle')}</h2>
                    <p className="text-muted-foreground mb-8 max-w-sm">{t('successMessage')}</p>
                    <GlassButton
                      onClick={() => {
                        setSent(false);
                        setForm({ name: '', email: '', subject: '', message: '' });
                      }}
                    >
                      {t('sendAnother')}
                    </GlassButton>
                  </div>
                ) : (
                  /* ── Formulaire ── */
                  <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <ContactField id="contact-name" label={t('name')} type="text" autoComplete="name"
                        value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                      <ContactField id="contact-email" label={t('email')} type="email" autoComplete="email"
                        value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                    </div>
                    <ContactField id="contact-subject" label={t('subject')} type="text"
                      value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
                    <ContactTextarea id="contact-message" label={t('message')} rows={6}
                      value={form.message} onChange={(v) => setForm({ ...form, message: v })} />

                    <GlassButton type="submit" fullWidth size="lg" disabled={loading}>
                      <span className="flex items-center justify-center gap-2">
                        <Send className={`w-4 h-4 transition-transform duration-300 ${loading ? 'opacity-0' : ''}`} />
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                            </svg>
                            {t('sending')}
                          </span>
                        ) : t('sendMessage')}
                      </span>
                    </GlassButton>
                  </form>
                )}
              </div>
            </Reveal>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

/* ── Champ input stylisé ── */
function ContactField({ id, label, type, value, onChange, autoComplete }: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="group/field">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground/80 group-focus-within/field:text-althea-cta transition-colors duration-200">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        aria-required="true"
        className="contact-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground"
      />
    </div>
  );
}

/* ── Textarea stylisé ── */
function ContactTextarea({ id, label, value, onChange, rows }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div className="group/field">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground/80 group-focus-within/field:text-althea-cta transition-colors duration-200">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required
        aria-required="true"
        className="contact-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground resize-none"
      />
    </div>
  );
}
