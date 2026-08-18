'use client';

import { useRef, useState, useTransition, type ReactNode } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface InlineNoteField {
  key: string;
  /** 칸이 하나뿐이면 생략. 여러 칸이면 소제목 겸 aria-label로 쓰인다. */
  label?: string;
  placeholder: string;
}

interface Props {
  title: string;
  icon: ReactNode;
  fields: InlineNoteField[];
  values: Record<string, string>;
  maxLength: number;
  emptyText: string;
  actionLabels: { edit: string; cancel: string; confirm: string; saving: string };
  /** 저장 성공이면 null, 실패면 표시할 에러 메시지. */
  onSave: (values: Record<string, string>) => Promise<string | null>;
  /** 메모 아래에 덧붙일 내용. 편집 중에는 감춘다. */
  footer?: ReactNode;
}

function trimAll(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
}

/**
 * 일지 목록 상단 메모 카드의 공통 껍데기. 읽기 상태에서는 줄 단위 목록,
 * 편집 버튼을 누르면 그 자리에서 입력이 열리고 확인을 누르면 저장 후 읽기 전용으로 돌아간다.
 */
export function InlineNoteCard({
  title,
  icon,
  fields,
  values,
  maxLength,
  emptyText,
  actionLabels,
  onSave,
  footer,
}: Props) {
  const [saved, setSaved] = useState(values);
  const [draft, setDraft] = useState(values);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);

  const startEditing = () => {
    setDraft(saved);
    setError(null);
    setEditing(true);
    // 편집 버튼을 누르면 바로 입력할 수 있도록 첫 칸으로 포커스를 옮긴다.
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  };

  const confirm = () => {
    startTransition(async () => {
      const message = await onSave(draft);
      if (message) {
        setError(message);
        return;
      }
      setSaved(trimAll(draft));
      setEditing(false);
    });
  };

  return (
    <section className="rounded-lg border border-l-4 border-l-primary bg-muted/40 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {icon}
          </span>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setDraft(saved);
                setError(null);
                setEditing(false);
              }}
            >
              {actionLabels.cancel}
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={confirm}>
              <Check className="mr-1.5 h-4 w-4" />
              {pending ? actionLabels.saving : actionLabels.confirm}
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={startEditing}>
            <Pencil className="mr-1.5 h-4 w-4" />
            {actionLabels.edit}
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        {fields.map((field, index) => (
          <div key={field.key}>
            {field.label && (
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </h3>
            )}
            {editing ? (
              <div className={field.label ? 'mt-2 space-y-1' : 'space-y-1'}>
                <Textarea
                  ref={index === 0 ? firstFieldRef : undefined}
                  value={draft[field.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  rows={fields.length > 1 ? 5 : 6}
                  maxLength={maxLength}
                  className="bg-background text-[15px] leading-relaxed"
                />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {(draft[field.key] ?? '').length}/{maxLength}
                </p>
              </div>
            ) : (
              <NoteLines
                text={saved[field.key] ?? ''}
                emptyText={emptyText}
                spaced={Boolean(field.label)}
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {footer && !editing && footer}
    </section>
  );
}

function NoteLines({
  text,
  emptyText,
  spaced,
}: {
  text: string;
  emptyText: string;
  spaced: boolean;
}) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return <p className={`${spaced ? 'mt-2 ' : ''}text-sm text-muted-foreground`}>{emptyText}</p>;
  }

  return (
    <ul className={`${spaced ? 'mt-2 ' : ''}space-y-2`}>
      {lines.map((line, i) => (
        <li key={`${i}-${line}`} className="flex gap-2.5 text-[15px] leading-relaxed">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
