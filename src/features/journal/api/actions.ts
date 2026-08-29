'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { put } from '@vercel/blob';
import { auth } from '@/features/auth/model/auth';
import { journalsToCsv } from '../model/export';
import { isValidProcessScore, REVIEW_NOTE_MAX } from '../model/review';
import type { JournalFilters, JournalInput } from '../model/types';
import { JournalValidationError, parseJournalInput } from '../model/validate';
import {
  createJournal as dbCreate,
  deleteJournal as dbDelete,
  getJournal,
  listAllJournals,
  markJournalReviewed,
  saveJournalReview,
  setJournalPinned,
  updateJournal as dbUpdate,
} from './server';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');
  return userId;
}

export type ActionState = { error: string } | null;

export async function createJournalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  let input;
  try {
    input = parseJournalInput(formData);
  } catch (e) {
    if (e instanceof JournalValidationError) return { error: e.message };
    throw e;
  }
  const journal = await dbCreate(userId, input);
  revalidatePath('/journal');
  // 임시저장은 계속 쓰던 흐름을 유지하도록 편집 화면으로 돌려보낸다.
  redirect(input.status === 'draft' ? `/journal/${journal.id}/edit` : `/journal/${journal.id}`);
}

export async function updateJournalAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  let input;
  try {
    input = parseJournalInput(formData);
  } catch (e) {
    if (e instanceof JournalValidationError) return { error: e.message };
    throw e;
  }

  const expectedRaw = String(formData.get('expectedUpdatedAt') ?? '').trim();
  const expected = expectedRaw ? new Date(expectedRaw) : undefined;
  const expectedUpdatedAt =
    expected && !Number.isNaN(expected.getTime()) ? expected : undefined;

  const result = await dbUpdate(userId, id, input, expectedUpdatedAt);
  if (!result.ok) {
    return {
      error:
        result.reason === 'conflict'
          ? '다른 곳에서 이 일지가 수정되었습니다. 최신 내용을 확인한 뒤 다시 저장해주세요.'
          : '일지를 찾을 수 없습니다.',
    };
  }
  revalidatePath('/journal');
  revalidatePath(`/journal/${id}`);
  redirect(input.status === 'draft' ? `/journal/${id}/edit` : `/journal/${id}`);
}

export async function deleteJournalAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await dbDelete(userId, id);
  revalidatePath('/journal');
  redirect('/journal');
}

const toNum = (s: string | null): number | null => {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** 기존 일지를 초안으로 복제하고 편집 화면으로 이동. */
export async function cloneJournalAction(id: string): Promise<void> {
  const userId = await requireUserId();
  const src = await getJournal(userId, id);
  if (!src) redirect('/journal');
  const input: JournalInput = {
    title: `${src.title} (복사본)`,
    content: src.content,
    status: 'draft',
    category: src.category,
    tickers: src.tickers,
    tags: src.tags,
    tradeTypes: src.tradeTypes,
    riskChecks: src.riskChecks,
    tradeQty: toNum(src.tradeQty),
    tradePrice: toNum(src.tradePrice),
    sellPrice: toNum(src.sellPrice),
    tradeFee: toNum(src.tradeFee),
    sentiment: src.sentiment,
    horizon: src.horizon,
    targetReturn: toNum(src.targetReturn),
    actualReturn: toNum(src.actualReturn),
    // 복제본은 새 매매이므로 연결·재점검·수익률 결과는 비운다.
    linkedJournalId: null,
    reviewAt: null,
    tradedAt: new Date(),
  };
  const created = await dbCreate(userId, input);
  revalidatePath('/journal');
  redirect(`/journal/${created.id}/edit`);
}

/** 일지를 '검토 완료'로 표시. */
export async function markReviewedAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await markJournalReviewed(userId, id, new Date());
  revalidatePath('/journal');
  revalidatePath(`/journal/${id}`);
}

/** 일지를 목록 상단에 고정하거나 해제한다. */
export async function setJournalPinnedAction(id: string, pinned: boolean): Promise<void> {
  const userId = await requireUserId();
  await setJournalPinned(userId, id, pinned);
  revalidatePath('/journal');
  revalidatePath(`/journal/${id}`);
}

/** 회고 채점을 저장한다. 결과(수익/손실)는 계산으로 나오므로 과정 점수만 받는다. */
export async function saveJournalReviewAction(
  id: string,
  processScore: number,
  reviewNote: string,
): Promise<{ error: string } | null> {
  const userId = await requireUserId();
  if (!isValidProcessScore(processScore)) return { error: '과정 점수를 선택해주세요.' };

  await saveJournalReview(userId, id, {
    processScore,
    reviewNote: reviewNote.trim().slice(0, REVIEW_NOTE_MAX),
    reviewedAt: new Date(),
  });
  revalidatePath('/journal');
  revalidatePath(`/journal/${id}`);
  return null;
}

/** 현재 필터에 맞는 일지 전체를 CSV 문자열로 반환. 다운로드는 클라이언트에서 처리. */
export async function exportJournalsCsvAction(filters: JournalFilters): Promise<string> {
  const userId = await requireUserId();
  const items = await listAllJournals(userId, filters);
  return journalsToCsv(items);
}

export type UploadResult = { url: string } | { error: string };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** 본문 이미지 업로드. BLOB_READ_WRITE_TOKEN 미설정 시 비활성. */
export async function uploadJournalImageAction(formData: FormData): Promise<UploadResult> {
  const userId = await requireUserId();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: '이미지 업로드가 설정되지 않았습니다. 외부 이미지 URL을 사용해주세요.' };
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: '업로드할 이미지가 없습니다.' };
  }
  if (!file.type.startsWith('image/')) {
    return { error: '이미지 파일만 업로드할 수 있습니다.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: '이미지는 10MB 이하만 업로드할 수 있습니다.' };
  }
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const key = `journal/${userId}/${crypto.randomUUID()}.${ext}`;
  const blob = await put(key, file, { access: 'public' });
  return { url: blob.url };
}
