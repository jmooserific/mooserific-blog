"use client"

import { useEffect, useRef, useState } from "react";

interface PointerReorderOptions {
  /** Reorder so `fromId` lands where `toId` is. Same-kind enforcement lives upstream. */
  onMove: (fromId: string, toId: string) => void;
  disabled: boolean;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  offX: number;
  offY: number;
  started: boolean;
  ghost: HTMLElement | null;
}

const DRAG_THRESHOLD = 8; // px before a press becomes a drag (vs. a tap on a control)

/**
 * Pointer-based drag-to-reorder for the media grid. Works with mouse *and* touch
 * (HTML5 drag-and-drop does not fire on touch, which matters for on-the-go phone
 * posting). The move/up listeners live on `document` and the drag state is a ref,
 * so the live re-render that happens every time the grid re-flows mid-drag can
 * never sever the gesture or strand the floating ghost — the bug that bit the
 * prototype. We deliberately avoid `setPointerCapture`: capturing on a tile that a
 * re-render then replaces is exactly what stranded the ghost.
 *
 * The ghost is a clone of the dragged tile appended to `document.body`, positioned
 * imperatively per frame, so dragging never triggers a React render of its own.
 */
export function usePointerReorder(
  containerRef: React.RefObject<HTMLElement | null>,
  { onMove, disabled }: PointerReorderOptions,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // Keep the latest callbacks in a ref so the document listeners bind once.
  const optsRef = useRef({ onMove, disabled });
  optsRef.current = { onMove, disabled };

  function onPointerDown(e: React.PointerEvent) {
    if (optsRef.current.disabled) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return; // let the remove button handle its own clicks
    const tile = target.closest<HTMLElement>("[data-tile-id]");
    const id = tile?.dataset.tileId;
    if (!tile || !id) return;
    const rect = tile.getBoundingClientRect();
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      started: false,
      ghost: null,
    };
  }

  useEffect(() => {
    function startGhost(drag: DragState, tile: HTMLElement) {
      const rect = tile.getBoundingClientRect();
      const ghost = tile.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("data-tile-id");
      Object.assign(ghost.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: "0",
        zIndex: "100",
        pointerEvents: "none",
        opacity: "0.96",
        boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
        transform: "translate(-9999px, -9999px) rotate(1.5deg)",
      } satisfies Partial<CSSStyleDeclaration>);
      document.body.appendChild(ghost);
      drag.ghost = ghost;
    }

    function positionGhost(drag: DragState, x: number, y: number) {
      if (drag.ghost) drag.ghost.style.transform = `translate(${x - drag.offX}px, ${y - drag.offY}px) rotate(1.5deg)`;
    }

    function hitTest(drag: DragState, x: number, y: number) {
      const container = containerRef.current;
      if (!container) return;
      const tiles = container.querySelectorAll<HTMLElement>("[data-tile-id]");
      for (const t of tiles) {
        if (t.dataset.tileId === drag.id) continue;
        const r = t.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          optsRef.current.onMove(drag.id, t.dataset.tileId!);
          return;
        }
      }
    }

    function onMoveEvt(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      if (!drag.started) {
        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD) return;
        const tile = containerRef.current?.querySelector<HTMLElement>(`[data-tile-id="${drag.id}"]`);
        if (!tile) return;
        drag.started = true;
        startGhost(drag, tile);
        setDraggingId(drag.id);
      }
      e.preventDefault(); // stop touch-scroll once we're dragging
      positionGhost(drag, e.clientX, e.clientY);
      hitTest(drag, e.clientX, e.clientY);
    }

    function onUp() {
      const drag = dragRef.current;
      if (!drag) return;
      drag.ghost?.remove();
      dragRef.current = null;
      setDraggingId(null);
    }

    document.addEventListener("pointermove", onMoveEvt, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMoveEvt);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      dragRef.current?.ghost?.remove();
    };
  }, [containerRef]);

  return { draggingId, onPointerDown };
}
