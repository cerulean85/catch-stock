'use client';

import { useRef, useState } from 'react';
import { Eye, Pencil, Columns2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/features/locale';
import type { ContentFormat } from '../model/types';
import { MarkdownPreview } from './MarkdownPreview';

type Mode = 'edit' | 'preview' | 'split';

interface Props {
  name: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** 'text'면 미리보기·이미지 삽입 없이 순수 텍스트 입력만 제공한다. */
  format?: ContentFormat;
  imageUploadEnabled?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
}

export function MarkdownEditor({
  name,
  value,
  onChange,
  placeholder,
  format = 'markdown',
  imageUploadEnabled = false,
  onImageUpload,
}: Props) {
  const { t } = useLocale();
  // 미리보기는 기본으로 접어둔다. 필요할 때만 분할/미리보기로 펼친다.
  const [mode, setMode] = useState<Mode>('edit');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + text);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + text + value.slice(end));
  };

  const uploadFiles = async (files: FileList | File[] | null) => {
    if (!onImageUpload || !files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of images) {
        const url = await onImageUpload(file);
        insertAtCursor(`\n![${file.name}](${url})\n`);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const isMarkdown = format === 'markdown';
  const canUpload = isMarkdown && imageUploadEnabled && !!onImageUpload;
  // 일반 텍스트에는 미리보기가 없으므로 편집 화면만 보여준다.
  const activeMode: Mode = isMarkdown ? mode : 'edit';

  return (
    <div className="flex flex-col gap-2">
      {isMarkdown && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={mode === 'edit' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('edit')}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t('editMode')}
          </Button>
          <Button
            type="button"
            variant={mode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('split')}
            className="hidden sm:inline-flex"
          >
            <Columns2 className="mr-1.5 h-3.5 w-3.5" /> {t('splitMode')}
          </Button>
          <Button
            type="button"
            variant={mode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('preview')}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> {t('preview')}
          </Button>
          {canUpload && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                {uploading ? t('imageUploading') : t('imageAdd')}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void uploadFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {uploadError}
        </p>
      )}

      <div
        className={
          activeMode === 'split'
            ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
            : 'grid grid-cols-1 gap-3'
        }
      >
        {(activeMode === 'edit' || activeMode === 'split') && (
          <div
            className="relative"
            onDragOver={(e) => {
              if (!canUpload) return;
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              if (!canUpload) return;
              e.preventDefault();
              setDragOver(false);
              void uploadFiles(e.dataTransfer.files);
            }}
          >
            <Textarea
              ref={textareaRef}
              name={name}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="min-h-[28rem] font-mono text-sm"
            />
            {dragOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/5 text-sm text-primary">
                {t('imageDropHere')}
              </div>
            )}
          </div>
        )}
        {(activeMode === 'preview' || activeMode === 'split') && (
          <div className="min-h-[28rem] rounded-md border bg-card p-4">
            <MarkdownPreview content={value} />
          </div>
        )}
      </div>
    </div>
  );
}
