"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// 카드 그리드: 꾹 눌러(롱프레스) 순서 이동 + 왼쪽으로 밀어(스와이프) 삭제.
// 모바일 대응: 네이티브 touch 리스너(passive:false)로 스크롤 제어. 드래그 중 touch-action:none.
export default function SortableGrid({ items, onReorder, onSwipeDelete, renderItem }) {
  const [list, setList] = useState(items);
  const [dragging, setDragging] = useState(null); // 표시용
  const [swipe, setSwipe] = useState({ ticker: null, px: 0 }); // 표시용

  const listRef = useRef(items);
  const containerRef = useRef(null);
  const itemsRef = useRef(items);
  const cbRef = useRef({ onReorder, onSwipeDelete });

  const startRef = useRef(null); // {x,y,ticker}
  const modeRef = useRef("none"); // none|drag|swipe|scroll
  const dragRef = useRef(null);
  const swipeDxRef = useRef(0);
  const lpTimer = useRef(null);
  const justMoved = useRef(false);

  useLayoutEffect(() => { itemsRef.current = items; cbRef.current = { onReorder, onSwipeDelete }; });
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
    // 수량 셀렉트/버튼 위에서 시작하면 제스처 시작 안 함
    if (target.closest && target.closest(".card-top-right, .qtybox, button, select, input")) return;
    const ticker = item.getAttribute("data-ticker");
    startRef.current = { x, y, ticker };
    modeRef.current = "none";
    swipeDxRef.current = 0;
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
    if (modeRef.current === "swipe") {
      if (ev && ev.cancelable) ev.preventDefault();
      swipeDxRef.current = Math.max(Math.min(dx, 0), -160);
      setSwipe({ ticker: s.ticker, px: swipeDxRef.current });
      return;
    }
    if (modeRef.current === "none") {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearLP();
        if (dx < 0 && Math.abs(dx) > Math.abs(dy) + 4) {
          modeRef.current = "swipe";
          if (ev && ev.cancelable) ev.preventDefault();
          swipeDxRef.current = Math.max(dx, -160);
          setSwipe({ ticker: s.ticker, px: swipeDxRef.current });
        } else {
          modeRef.current = "scroll"; // 세로 스크롤은 브라우저에 양보
          startRef.current = null;
        }
      }
    }
  };

  const end = () => {
    clearLP();
    if (modeRef.current === "drag" || modeRef.current === "swipe") {
      justMoved.current = true;
      setTimeout(() => { justMoved.current = false; }, 350);
    }
    if (modeRef.current === "drag") {
      cbRef.current.onReorder(listRef.current.map((x) => x.ticker));
    } else if (modeRef.current === "swipe") {
      if (swipeDxRef.current < -80) {
        const t = startRef.current && startRef.current.ticker;
        const h = itemsRef.current.find((x) => x.ticker === t);
        if (h) cbRef.current.onSwipeDelete(h);
      }
      setSwipe({ ticker: null, px: 0 });
    }
    dragRef.current = null;
    setDragging(null);
    modeRef.current = "none";
    startRef.current = null;
    swipeDxRef.current = 0;
  };

  // 네이티브 리스너 (touchmove를 passive:false로 등록해야 preventDefault 가능)
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
          style={{ transform: swipe.ticker === h.ticker ? `translateX(${swipe.px}px)` : undefined }}
        >
          {swipe.ticker === h.ticker && swipe.px < -20 ? <div className="swipe-del">← 삭제</div> : null}
          {renderItem(h)}
        </div>
      ))}
    </div>
  );
}
