import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { auth, SignInButton, UserMenu } from '@/features/auth';
import { ThemeToggle } from '@/features/theme';

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LineChart className="h-5 w-5" />
          <span>Catch Stock</span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-4 text-sm sm:flex">
          <Link href="/#liquidity" className="text-muted-foreground hover:text-foreground">
            유동성
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            스크리너
          </Link>
          {user && (
            <Link href="/journal" className="text-muted-foreground hover:text-foreground">
              투자 일지
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <UserMenu user={{ name: user.name, email: user.email, image: user.image }} />
          ) : (
            <SignInButton variant="outline" size="sm" label="로그인" />
          )}
        </div>
      </div>
    </header>
  );
}
