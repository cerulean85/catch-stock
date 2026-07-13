import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더의 stray lockfile(~/package-lock.json)로 Turbopack이 워크스페이스 루트를
  // 잘못 추론해 tailwindcss 등 모듈 해석에 실패하는 문제 방지 — 루트를 이 프로젝트로 고정.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
