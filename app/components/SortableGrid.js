"use client";

import { useEffect, useRef, useState } from "react";

// 카드 그리드: 꾹 눌러(롱프레스) 순서 이동 + 왼쪽으로 밀어(스와이프) 삭제.
// items: 정렬된 배열([{ticker,...}]), onReorder(tickers[]), onSwipeDelete(item), renderItem(item)
export default function SortableGrid({ items, onReorder, onSwipeDelete, renderItem }) {
  const [list, setList] = useState(items);
  const listRef = useRef(items);
  const active = useRef(false); // 제스처(드래그/스와이프) 진행 중 여부
  const setListBoth = (updater) => setList((cur) => { const next = typeof updater === "function" ? updater(cur) : updater; listRef.current = next; return next; });
  // 제스처 중에는 외부 items 변경(시세 폴링 등)으로 순서를 되돌리지 않음
  useEffect(() => { if (!active.current) setListBoth(items); }, [items]);

  const [dragging, setDragging] = useState(null); // 드래그 중 ticker (표시용)
  const dragRef = useRef(null); // 핸들러에서 참조(클로저 staleness 방지)
  const [swipe, setSwipe] = useState({}); // ticker -> px(음수) (표시용)
  const start = useRef(null); // {x,y,ticker}
  const lpTimer = useRef(null);
  const swiping = useRef(null);
  const swipeDx = useRef(0);
  const moved = useRef(false);

  const clearLP = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };

  const onPointerDown = (e, ticker) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, ticker };
    swiping.current = null;
    moved.current = false;
    clearLP();
    lpTimer.current = setTimeout(() => { active.current = true; dragRef.current = ticker; setDragging(ticker); moved.current = true; }, 350);
  };

  const onPointerMove = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (dragRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const item = el && el.closest ? el.closest("[data-ticker]") : null;
      const over = item && item.getAttribute("data-ticker");
      if (over && over !== dragRef.current) {
        setListBoth((cur) => {
          const from = cur.findIndex((x) => x.ticker === dragRef.current);
          const to = cur.findIndex((x) => x.ticker === over);
          if (from < 0 || to < 0) return cur;
          const next = cur.slice();
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          return next;
        });
      }
      return;
    }

    if (swiping.current) {
      swipeDx.current = Math.max(Math.min(dx, 0), -160);
      setSwipe((s) => ({ ...s, [swiping.current]: swipeDx.current }));
      return;
    }

    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
      clearLP();
      if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
        swiping.current = start.current.ticker;
        active.current = true;
        moved.current = true;
        swipeDx.current = Math.max(dx, -160);
        setSwipe((s) => ({ ...s, [swiping.current]: swipeDx.current }));
      } else {
        start.current = null; // 세로 스크롤 → 제스처 종료
      }
    }
  };

  const onPointerUp = () => {
    clearLP();
    if (dragRef.current) {
      onReorder(listRef.current.map((x) => x.ticker));
      dragRef.current = null;
      setDragging(null);
    } else if (swiping.current) {
      const t = swiping.current;
      if (swipeDx.current < -80) {
        const h = items.find((x) => x.ticker === t);
        if (h) onSwipeDelete(h);
      }
      setSwipe((s) => { const n = { ...s }; delete n[t]; return n; });
      swiping.current = null;
      swipeDx.current = 0;
    }
    start.current = null;
    active.current = false;
  };

  // 드래그·스와이프 직후 카드 클릭(차트 열기) 방지
  const onClickCapture = (e) => {
    if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false; }
  };

  return (
    <div
      className="grid sortable"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClickCapture={onClickCapture}
    >
      {list.map((h) => (
        <div
          key={h.ticker}
          data-ticker={h.ticker}
          className={`sortable-item${dragging === h.ticker ? " dragging" : ""}`}
          style={{
            transform: swipe[h.ticker] ? `translateX(${swipe[h.ticker]}px)` : undefined,
            touchAction: "pan-y",
          }}
          onPointerDown={(e) => onPointerDown(e, h.ticker)}
        >
          {swipe[h.ticker] < -20 ? <div className="swipe-del">← 삭제</div> : null}
          {renderItem(h)}
        </div>
      ))}
    </div>
  );
}
