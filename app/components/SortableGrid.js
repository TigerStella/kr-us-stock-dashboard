"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// 카드 그리드: 꾹 눌러(롱프레스) 순서 이동. (삭제는 카드의 X 버튼으로)
// 모바일 대응: 네이티브 touch 리스너(passive:false)로 드래그 중 스크롤 차단.
export default function SortableGrid({ items, onReorder, renderItem }) {
  const [list, setList] = useState(items);
  const [dragging, setDragging] = useState(null); // 표시용

  const listRef = useRef(items);
  const containerRef = useRef(null);
  const cbRef = useRef({ onReorder });

  const startRef = useRef(null); // {x,y,ticker}
  const modeRef = useRef("none"); // none|drag|scroll
  const dragRef = useRef(null);
  const lpTimer = useRef(null);
  const justMoved = useRef(false);

  useLayoutEffect(() => { cbRef.current = { onReorder }; });
  useEffect(() => { if (modeRef.current === "none") { listRef.current = items; setList(items); } }, [items]);

  const clearLP = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };

  const reorder = (dragT, overT) => {
    setList((cur) => {
      const from = cur.findIndex((x) => x.ticker === dragT);
      const to = cur.findIndex((x) => x.ticker === overT);
      if (from < 0 || to < 0 || from === to) return cur;
      const next = cur.slice();
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      listRef.current = next;
      return next;
    });
  };

  const begin = (x, y, target) => {
    const item = target && target.closest ? target.closest("[data-ticker]") : null;
    if (!item) return;
    if (target.closest && target.closest(".card-top-right, .qtybox, button, select, input")) return;
    const ticker = item.getAttribute("data-ticker");
    startRef.current = { x, y, ticker };
    modeRef.current = "none";
    clearLP();
    lpTimer.current = setTimeout(() => {
      if (modeRef.current === "none" && startRef.current) {
        modeRef.current = "drag";
        dragRef.current = ticker;
        setDragging(ticker);
      }
    }, 380);
  };

  const move = (x, y, ev) => {
    const s = startRef.current;
    if (!s) return;
    const dx = x - s.x;
    const dy = y - s.y;

    if (modeRef.current === "drag") {
      if (ev && ev.cancelable) ev.preventDefault();
      const el = document.elementFromPoint(x, y);
      const over = el && el.closest ? el.closest("[data-ticker]")?.getAttribute("data-ticker") : null;
      if (over && over !== dragRef.current) reorder(dragRef.current, over);
      return;
    }
    if (modeRef.current === "none") {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearLP();
        modeRef.current = "scroll"; // 롱프레스 전 움직임 → 스크롤로 양보
        startRef.current = null;
      }
    }
  };

  const end = () => {
    clearLP();
    if (modeRef.current === "drag") {
      justMoved.current = true;
      setTimeout(() => { justMoved.current = false; }, 350);
      cbRef.current.onReorder(listRef.current.map((x) => x.ticker));
    }
    dragRef.current = null;
    setDragging(null);
    modeRef.current = "none";
    startRef.current = null;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ts = (e) => { const t = e.touches[0]; if (t) begin(t.clientX, t.clientY, e.target); };
    const tm = (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY, e); };
    const te = () => end();
    const md = (e) => {
      if (e.button !== 0) return;
      begin(e.clientX, e.clientY, e.target);
      const mm = (ev) => move(ev.clientX, ev.clientY, ev);
      const mu = () => { end(); window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
    };
    const ck = (e) => { if (justMoved.current) { e.stopPropagation(); e.preventDefault(); } };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te);
    el.addEventListener("touchcancel", te);
    el.addEventListener("mousedown", md);
    el.addEventListener("click", ck, true);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
      el.removeEventListener("touchcancel", te);
      el.removeEventListener("mousedown", md);
      el.removeEventListener("click", ck, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className={`grid sortable${dragging ? " grabbing" : ""}`}>
      {list.map((h) => (
        <div
          key={h.ticker}
          data-ticker={h.ticker}
          className={`sortable-item${dragging === h.ticker ? " dragging" : ""}`}
        >
          {renderItem(h)}
        </div>
      ))}
    </div>
  );
}
