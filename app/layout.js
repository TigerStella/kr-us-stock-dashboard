import "./globals.css";

export const metadata = {
  title: "한국/미국 주식 대시보드",
  description: "한국·미국 주식·지수·환율 실시간 대시보드 (키 없는 공개 API)",
};

// 모바일 반응형: 실제 기기 폭 기준으로 렌더 (없으면 기본 980px 레이아웃 → 미디어쿼리 미적용)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
