import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { auth, SignInButton, UserMenu } from '@/features/auth';
import { ThemeToggle } from '@/features/theme';
import { LocaleToggle } from '@/features/locale';

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
        <div className="flex items-center justify-between gap-2">
          <Link href="/journal" className="flex items-center gap-2 font-semibold tracking-tight">
            <LineChart className="h-5 w-5" />
            <span>Catch Stock</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:hidden">
            <LocaleToggle />
            <ThemeToggle />
            {user ? (
              <UserMenu user={{ name: user.name, email: user.email, image: user.image }} />
            ) : (
              <SignInButton variant="outline" size="sm" labelKey="login" />
            )}
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm sm:flex-1 sm:justify-center">
          <Link href="/journal" className="text-muted-foreground hover:text-foreground">
            JOURNAL
          </Link>
        </nav>
        <div className="hidden items-center gap-1.5 sm:flex">
          <LocaleToggle />
          <ThemeToggle />
          {user ? (
            <UserMenu user={{ name: user.name, email: user.email, image: user.image }} />
          ) : (
            <SignInButton variant="outline" size="sm" labelKey="login" />
          )}
        </div>
      </div>
    </header>
  );
}
