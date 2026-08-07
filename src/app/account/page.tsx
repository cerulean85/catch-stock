import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { AccountBalanceView } from '@/features/account';
import { getAccountBalance } from '@/features/account/api/server';
import { getRiskCriteria } from '@/features/risk/api/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '계좌 잔고 · Catch Stock',
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [balance, riskCriteria] = await Promise.all([
    getAccountBalance(),
    getRiskCriteria(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AccountBalanceView balance={balance} riskCriteria={riskCriteria} />
    </div>
  );
}
