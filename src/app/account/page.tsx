import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { AccountBalanceView } from '@/features/account';
import { getAccountBalance, isConfigured } from '@/features/account/api/server';
import { getServerIp } from '@/features/account/api/ip';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '계좌 잔고 · Catch Stock',
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const configured = isConfigured();
  const [balance, serverIp] = await Promise.all([
    configured ? getAccountBalance() : Promise.resolve(null),
    getServerIp(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AccountBalanceView balance={balance} configured={configured} serverIp={serverIp} />
    </div>
  );
}
