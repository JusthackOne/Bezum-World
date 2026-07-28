"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export function useClickTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const isPinnedOpenRef = useRef(false);
  const boundaryId = useId();

  const close = useCallback(() => {
    isPinnedOpenRef.current = false;
    setIsPinnedOpen(false);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !isPinnedOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      const targetBoundaryId =
        target instanceof Element
          ? target
              .closest("[data-click-tooltip-boundary]")
              ?.getAttribute("data-click-tooltip-boundary")
          : null;

      if (targetBoundaryId !== boundaryId) {
        close();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [boundaryId, close, isOpen, isPinnedOpen]);

  const pinOpen = useCallback(() => {
    isPinnedOpenRef.current = true;
    setIsPinnedOpen(true);
    setIsOpen(true);
  }, []);

  const handleOpenChange = useCallback((nextIsOpen: boolean) => {
    if (!nextIsOpen && isPinnedOpenRef.current) {
      return;
    }

    setIsOpen(nextIsOpen);
  }, []);

  return {
    boundaryId,
    isOpen,
    handleOpenChange,
    pinOpen,
  };
}
