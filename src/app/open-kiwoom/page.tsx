'use client';

import { useEffect } from 'react';

/**
 * 카카오톡 알림 버튼 클릭 시 모바일 기기에서 영웅문S# 앱을 직접 실행하는 리다이렉트 페이지.
 * 앱이 설치되어 있으면 영웅문S#이 실행되고, 미설치 시 키움 모바일 웹으로 이동합니다.
 */
export default function OpenKiwoomPage() {
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isAndroid) {
      // 안드로이드 영웅문S# 인텐트 스킴
      window.location.href =
        'intent://#Intent;scheme=heromts;package=com.kiwoom.heromts;end';
    } else if (isIOS) {
      // iOS 영웅문S# URL 스킴
      window.location.href = 'heromts://';
      // 2초 후 앱이 안 열리면 모바일 웹 또는 앱스토어로 이동
      setTimeout(() => {
        window.location.href =
          'https://apps.apple.com/kr/app/%ED%82%A4%EC%9B%80%EC%A6%9D%EA%B6%8C-%EC%98%81%EC%9B%85%EB%AC%B8s-new/id1589718424';
      }, 2000);
    } else {
      // PC 브라우저
      window.location.href = 'https://m.kiwoom.com';
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center text-white">
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl max-w-sm w-full">
        <div className="mb-4 text-4xl">🚀</div>
        <h1 className="text-xl font-bold mb-2">영웅문S# 앱으로 이동 중...</h1>
        <p className="text-sm text-slate-400 mb-6">
          잠시 후 영웅문S# 앱이 자동으로 실행됩니다. 자동으로 열리지 않는 경우 아래 버튼을 눌러주세요.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="heromts://"
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-500"
          >
            영웅문S# 앱 열기
          </a>
          <a
            href="intent://#Intent;scheme=heromts;package=com.kiwoom.heromts;end"
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
          >
            안드로이드 영웅문S# 직접 열기
          </a>
          <a
            href="https://m.kiwoom.com"
            className="w-full rounded-xl bg-slate-700 py-2.5 text-sm text-slate-300 transition hover:bg-slate-600"
          >
            키움 모바일 웹으로 이동
          </a>
        </div>
      </div>
    </div>
  );
}
