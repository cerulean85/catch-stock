'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccountAction();
      } catch (e) {
        setError(e instanceof Error ? e.message : '탈퇴 처리에 실패했습니다.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회원탈퇴</DialogTitle>
          <DialogDescription className="pt-2">
            정말로 탈퇴하시겠습니까? 회원 정보와 모든 연결된 데이터가 데이터베이스에서 영구
            삭제되며 복구할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            <Trash2 className="mr-2 h-4 w-4" />
            {pending ? '처리 중…' : '탈퇴하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
