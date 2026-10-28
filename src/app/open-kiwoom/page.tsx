'use client';

import { useEffect, useState } from 'react';

/**
 * 카카오톡 알림 버튼 클릭 시 모바일 기기에서 영웅문S# 앱을 직접 실행하는 리다이렉트 브릿지 페이지.
 * 앱이 설치되어 있으면 영웅문S# 실행 확인창이 뜨고, 미설치 시 앱스토어/스토어로 이동할 수 있습니다.
 */
export default function OpenKiwoomPage() {
  const [device, setDevice] = useState<'ios' | 'android' | 'pc'>('ios');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isAndroid) {
      setDevice('android');
      window.location.href =
        'intent://#Intent;scheme=heromts;package=com.kiwoom.heromts;end';
    } else if (isIOS) {
      setDevice('ios');
      // iOS 영웅문S# URL 스킴 즉시 호출
      window.location.href = 'heromts://';
    } else {
      setDevice('pc');
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center text-white">
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl max-w-sm w-full">
        <div className="mb-4 text-4xl animate-bounce">🚀</div>
        <h1 className="text-xl font-bold mb-2">영웅문S# 실행 중...</h1>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          화면에 <strong>&apos;영웅문S#에서 여시겠습니까?&apos;</strong> 창이 뜨면 <strong>[열기]</strong>를 눌러주세요.<br />
          창이 뜨지 않으면 아래 버튼을 눌러주세요.
        </p>

        <div className="flex flex-col gap-3">
          {device === 'android' ? (
            <a
              href="intent://#Intent;scheme=heromts;package=com.kiwoom.heromts;end"
              className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg transition active:bg-blue-700 hover:bg-blue-500"
            >
              영웅문S# 앱 열기
            </a>
          ) : (
            <a
              href="heromts://"
              className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg transition active:bg-blue-700 hover:bg-blue-500"
            >
              영웅문S# 앱 열기
            </a>
          )}

          {device === 'ios' && (
            <a
              href="https://apps.apple.com/kr/app/id1589718424"
              className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-600"
            >
              App Store에서 보기
            </a>
          )}

          {device === 'android' && (
            <a
              href="https://play.google.com/store/apps/details?id=com.kiwoom.herous.ma"
              className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-600"
            >
              Google Play에서 보기
            </a>
          )}

          <a
            href="https://m.kiwoom.com"
            className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2.5 text-xs text-slate-400 transition hover:bg-slate-700"
          >
            키움 모바일 웹으로 이동
          </a>
        </div>
      </div>
    </div>
  );
}

