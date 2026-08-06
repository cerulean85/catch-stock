/** 문자열 콘텐츠를 파일로 다운로드(브라우저 전용). */
export function downloadText(filename: string, text: string, mime: string): void {
  // CSV는 Excel 한글 호환을 위해 UTF-8 BOM 추가.
  const prefix = mime.includes('csv') ? '﻿' : '';
  const blob = new Blob([prefix + text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
