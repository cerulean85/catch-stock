'use client';

import type { ReactNode } from 'react';
import { ThemeProvider as NextThemes } from 'next-themes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
