'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteAccountAction } from '../api/actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: Props) {
  const { t } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccountAction();
      } catch (e) {
        setError(e instanceof Error ? e.message : t('deleteAccountFailed'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteAccount')}</DialogTitle>
          <DialogDescription className="pt-2">
            {t('deleteAccountConfirm')}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            <Trash2 className="mr-2 h-4 w-4" />
            {pending ? t('processing') : t('deleteAccount')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
