import "./globals.css";

export const metadata = {
  title: "한국/미국 주식 대시보드",
  description: "한국·미국 주식·지수·환율 실시간 대시보드 (키 없는 공개 API)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
