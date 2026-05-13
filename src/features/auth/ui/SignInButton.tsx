import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '../api/actions';
import { GoogleIcon } from './GoogleIcon';

interface Props {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  fullWidth?: boolean;
  label?: string;
}

export function SignInButton({
  variant = 'outline',
  size = 'default',
  fullWidth = false,
  label = 'Google로 시작하기',
}: Props) {
  return (
    <form action={signInWithGoogle} className={fullWidth ? 'w-full' : undefined}>
      <Button type="submit" variant={variant} size={size} className={fullWidth ? 'w-full' : ''}>
        <GoogleIcon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </form>
  );
}
