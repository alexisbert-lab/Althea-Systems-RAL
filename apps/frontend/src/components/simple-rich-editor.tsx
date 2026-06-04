'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, Link, List, AlignLeft, AlignCenter } from 'lucide-react';
import { cn } from '@/lib/utilitaires';

interface SimpleRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

const execCmd = (cmd: string, value?: string) => {
  document.execCommand(cmd, false, value);
};

export function SimpleRichEditor({
  value,
  onChange,
  placeholder = 'Saisissez le texte...',
  className,
  minHeight = 80,
}: SimpleRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleLink = () => {
    const url = prompt('URL du lien :', 'https://');
    if (url) execCmd('createLink', url);
  };

  const ToolBtn = ({
    icon: Icon,
    cmd,
    val,
    title,
    onClick,
  }: {
    icon: React.ElementType;
    cmd?: string;
    val?: string;
    title: string;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        if (onClick) { onClick(); return; }
        if (cmd) execCmd(cmd, val);
        editorRef.current?.focus();
        handleInput();
      }}
      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className={cn('rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-althea-cta focus-within:border-althea-cta', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1">
        <ToolBtn icon={Bold} cmd="bold" title="Gras (Ctrl+B)" />
        <ToolBtn icon={Italic} cmd="italic" title="Italique (Ctrl+I)" />
        <ToolBtn icon={Underline} cmd="underline" title="Souligné (Ctrl+U)" />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolBtn icon={AlignLeft} cmd="justifyLeft" title="Aligner à gauche" />
        <ToolBtn icon={AlignCenter} cmd="justifyCenter" title="Centrer" />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolBtn icon={List} cmd="insertUnorderedList" title="Liste à puces" />
        <ToolBtn icon={Link} title="Insérer un lien" onClick={handleLink} />
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          'px-3 py-2 text-sm outline-none leading-relaxed',
          '[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground',
        )}
        style={{ minHeight }}
      />
    </div>
  );
}
