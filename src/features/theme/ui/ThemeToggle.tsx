'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('themeChange')}
        className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} relative`}
      >
        <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          {t('themeLight')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          {t('themeDark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          {t('themeSystem')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
