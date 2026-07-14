// PWA 매니페스트 — 앱 설치 시 이름/아이콘/색상. Next가 /manifest.webmanifest 로 제공하고 자동 링크.
export default function manifest() {
  return {
    name: "한국/미국 주식 대시보드",
    short_name: "주식 대시보드",
    description: "한국·미국 주식·지수·환율 실시간 대시보드 (키 없는 공개 API)",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
