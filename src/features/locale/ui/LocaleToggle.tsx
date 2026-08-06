'use client';

import { Languages } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALE_OPTIONS } from '@/shared/lib/locale';
import { useLocale } from './LocaleProvider';

export function LocaleToggle() {
  const { id, setLocaleId, t } = useLocale();
  const current = LOCALE_OPTIONS.find((option) => option.id === id) ?? LOCALE_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('localeChange')}
        className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} relative`}
      >
        <Languages className="h-[1.1rem] w-[1.1rem]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('locale')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={id} onValueChange={setLocaleId}>
            {LOCALE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.id} value={option.id}>
                <span className="flex min-w-0 flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.timeZone}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="px-1.5 py-1 text-xs text-muted-foreground">{current.locale}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
