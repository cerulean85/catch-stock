'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { FileText, LogOut, Shield, Trash2, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOutAction } from '../api/actions';
import { DeleteAccountDialog } from './DeleteAccountDialog';

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserMenu({ user }: Props) {
  const { t } = useLocale();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingSignOut, startSignOutTransition] = useTransition();

  const initials = (user.name ?? user.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('userMenu')}
          className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} rounded-full`}
        >
          <Avatar className="h-8 w-8">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name ?? t('user')} />
            ) : null}
            <AvatarFallback>
              {user.image ? initials : <UserRound className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{user.name ?? t('user')}</span>
              {user.email && (
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              )}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/terms" />}>
            <FileText className="mr-2 h-4 w-4" />
            {t('terms')}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/privacy" />}>
            <Shield className="mr-2 h-4 w-4" />
            {t('privacy')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSignOutOpen(true)}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('signOut')}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('deleteAccount')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('signOut')}</DialogTitle>
            <DialogDescription className="pt-2">
              {t('signOutConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setSignOutOpen(false)}
              disabled={pendingSignOut}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="default"
              disabled={pendingSignOut}
              onClick={() => startSignOutTransition(() => signOutAction())}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {pendingSignOut ? t('processing') : t('signOut')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
