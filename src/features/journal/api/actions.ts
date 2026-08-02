'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { put } from '@vercel/blob';
import { auth } from '@/features/auth/model/auth';
import { journalsToCsv } from '../model/export';
import type { JournalFilters } from '../model/types';
import { JournalValidationError, parseJournalInput } from '../model/validate';
import {
  createJournal as dbCreate,
  deleteJournal as dbDelete,
  listAllJournals,
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
  redirect(`/journal/${journal.id}`);
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
  redirect(`/journal/${id}`);
}

export async function deleteJournalAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await dbDelete(userId, id);
  revalidatePath('/journal');
  redirect('/journal');
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
