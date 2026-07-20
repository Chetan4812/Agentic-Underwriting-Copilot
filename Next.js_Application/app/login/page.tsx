import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { LoginClient } from './LoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getSession();
  if (session) redirect(searchParams.next || '/dashboard');
  return <LoginClient next={searchParams.next || '/dashboard'} />;
}
