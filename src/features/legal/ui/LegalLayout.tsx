import type { ReactNode } from 'react';

interface Props {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

export function LegalLayout({ title, effectiveDate, children }: Props) {
  return (
    <article className="mx-auto w-full max-w-screen-md px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b pb-6 sm:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">시행일: {effectiveDate}</p>
      </header>
      <div className="space-y-8 text-[15px] leading-relaxed sm:text-base">
        {children}
      </div>
    </article>
  );
}

interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, title, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      <div className="space-y-3 text-foreground/90">{children}</div>
    </section>
  );
}
