'use client';

import { useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { draftJournalBodyAction, suggestJournalTagsAction } from '../api/ai';

interface Props {
  title: string;
  content: string;
  tickers: string[];
  tradeTypes: string[];
  existingTags: string[];
  onApplyDraft: (text: string) => void;
  onAddTag: (tag: string) => void;
}

export function AiAssist({
  title,
  content,
  tickers,
  tradeTypes,
  existingTags,
  onApplyDraft,
  onAddTag,
}: Props) {
  const { t } = useLocale();
  const [drafting, setDrafting] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runDraft = async () => {
    setDrafting(true);
    setError(null);
    const res = await draftJournalBodyAction({ title, tickers, tradeTypes, notes: content });
    setDrafting(false);
    if ('error' in res) setError(res.error);
    else onApplyDraft(res.data);
  };

  const runTags = async () => {
    setTagging(true);
    setError(null);
    const res = await suggestJournalTagsAction({ title, content, tickers });
    setTagging(false);
    if ('error' in res) setError(res.error);
    else setSuggested(res.data);
  };

  const remaining = suggested.filter((tag) => !existingTags.includes(tag));

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('aiAssist')}
        </span>
        <Button type="button" size="sm" variant="secondary" onClick={runDraft} disabled={drafting}>
          {drafting ? t('aiGenerating') : t('aiDraft')}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={runTags} disabled={tagging}>
          {tagging ? t('aiGenerating') : t('aiSuggestTags')}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {remaining.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('aiSuggestedTags')}:</span>
          {remaining.map((tag) => (
            <button key={tag} type="button" onClick={() => onAddTag(tag)}>
              <Badge variant="outline" className="cursor-pointer gap-1 select-none hover:bg-muted">
                <Plus className="h-3 w-3" />
                {tag}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
