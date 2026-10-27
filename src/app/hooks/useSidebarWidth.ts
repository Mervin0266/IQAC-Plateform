import { useState, useEffect, useCallback, useRef } from 'react';

export const MIN_SIDEBAR_WIDTH = 224;
export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MAX_SIDEBAR_WIDTH = 360;

const STORAGE_KEY = 'iqac-sidebar-width';

export function useSidebarWidth() {
  const [sidebarWidth, setSidebarWidthState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage access errors
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  // Sync CSS custom property on documentElement so entire app coordinates seamlessly
  const applyWidth = useCallback((width: number) => {
    const clamped = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
    setSidebarWidthState(clamped);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`);
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  // Set initial CSS property on mount
  useEffect(() => {
    applyWidth(sidebarWidth);
  }, [applyWidth, sidebarWidth]);

  // Pointer drag resizing handlers
  const startResizing = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      applyWidth(newWidth);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsResizing(false);
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {
        // Safe release
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [applyWidth, sidebarWidth]);

  // Keyboard accessibility handler for resize separator
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        applyWidth(sidebarWidth - 8);
        break;
      case 'ArrowRight':
        e.preventDefault();
        applyWidth(sidebarWidth + 8);
        break;
      case 'Home':
        e.preventDefault();
        applyWidth(MIN_SIDEBAR_WIDTH);
        break;
      case 'End':
        e.preventDefault();
        applyWidth(MAX_SIDEBAR_WIDTH);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        applyWidth(DEFAULT_SIDEBAR_WIDTH);
        break;
      default:
        break;
    }
  }, [applyWidth, sidebarWidth]);

  const resetSidebarWidth = useCallback(() => {
    applyWidth(DEFAULT_SIDEBAR_WIDTH);
  }, [applyWidth]);

  return {
    sidebarWidth,
    setSidebarWidth: applyWidth,
    resetSidebarWidth,
    isResizing,
    startResizing,
    handleKeyDown,
    MIN_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    DEFAULT_SIDEBAR_WIDTH,
  };
}
