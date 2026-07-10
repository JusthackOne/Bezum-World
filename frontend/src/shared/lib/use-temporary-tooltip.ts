"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useTemporaryTooltip(timeoutMs = 1800) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const showTemporarily = useCallback(() => {
    setIsOpen(true);

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, timeoutMs);
  }, [timeoutMs]);

  return {
    isOpen,
    setIsOpen,
    showTemporarily,
  };
}
