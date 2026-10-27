# CHRIST (Deemed to be University) IQAC Platform
# Sidebar Resizing Architectural Specification & Implementation

**Document:** `design-audit/SIDEBAR_RESIZE_IMPLEMENTATION.md`  
**Status:** PRODUCTION READY & TESTED  
**Component:** `Sidebar.tsx`, `AppShell.tsx`, `useSidebarWidth.ts`  

---

## 1. Architectural Overview

The CHRIST University IQAC Platform previously operated with a hardcoded `256px` (`w-64`) desktop navigation drawer. Users with high-resolution monitors, extensive academic module names (such as *Centres of Excellence*, *Placements & Internships*, *Sponsored Research & Grants*), or customized desktop arrangements had no mechanism to expand or compact the sidebar.

A production-grade, draggable width-resizing system was designed and integrated without introducing heavy external dependencies. It synchronizes across React state, the root CSS DOM variable `--sidebar-width`, and persistent local storage.

---

## 2. Width Boundaries & Design Tokens

| Property | Value | Rationale |
|---|---|---|
| **Minimum Width (`MIN_SIDEBAR_WIDTH`)** | `224px` | Ensures module labels and icons do not collide or wrap awkwardly. |
| **Default Width (`DEFAULT_SIDEBAR_WIDTH`)** | `256px` | Institutional baseline standard matching initial visual proportions. |
| **Maximum Width (`MAX_SIDEBAR_WIDTH`)** | `360px` | Allows deep nested menu trees and long departmental names without encroaching excessively on data tables. |
| **Resize Handle Width** | `8px` (`w-2`) | Narrow, discoverable interactive target positioned at `right: -4px`. |
| **Storage Key** | `iqac-sidebar-width` | Local browser cache key for instant preference hydration. |

---

## 3. State Management & Synchronization Architecture

### 3.1 Custom Hook: `useSidebarWidth.ts`

The hook encapsulates all resize physics, bounds checking, pointer capture, keyboard adjustments, and local persistence:

```typescript
export function useSidebarWidth() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Synchronize CSS custom property on documentElement for zero-lag flex reflow
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  // Persist valid width to localStorage
  const updateWidth = useCallback((newWidth: number) => {
    const clamped = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
    setSidebarWidth(clamped);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, clamped.toString());
    } catch {
      // Graceful fallback for private browsing quotas
    }
  }, []);
  ...
}
```

### 3.2 Layout Coordination in `AppShell.tsx`

Rather than relying on static Tailwind classes like `ml-64`, `AppShell.tsx` dynamically calculates its left margin using the shared state:

```tsx
<div
  className="flex-1 flex flex-col min-w-0 transition-[margin] duration-75"
  style={{
    marginLeft: hideSidebar ? 0 : `${sidebarWidth}px`,
  }}
>
  <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto">
    {children}
  </main>
</div>
```

---

## 4. Interaction Features & Safety Controls

### 4.1 Draggable Handle with Pointer Capture
- **Hover Feedback:** When the user moves their mouse near the sidebar's right boundary, a subtle blue accent line illuminates (`hover:bg-[#2F4692]/80`), and the cursor switches to `col-resize`.
- **Pointer Capture:** Calling `e.currentTarget.setPointerCapture(e.pointerId)` guarantees that dragging continues smoothly even if the pointer momentarily leaves the narrow handle or moves over iframe elements, tables, or buttons.
- **Accidental Selection Prevention:** `document.body.style.userSelect = 'none'` is engaged during active drags, preventing text highlight flickers.

### 4.2 Double-Click Reset
- Double-clicking the resize handle immediately restores the default width of `256px` and persists the reset to `localStorage`.

### 4.3 Accessible Keyboard Support
The resize handle adheres to WAI-ARIA separator semantics:
- `role="separator"`
- `aria-orientation="vertical"`
- `aria-valuenow={sidebarWidth}`
- `aria-valuemin={MIN_SIDEBAR_WIDTH}`
- `aria-valuemax={MAX_SIDEBAR_WIDTH}`
- `aria-label="Sidebar width resize handle"`
- **Keybindings:**
  - `ArrowRight`: Expands sidebar by 8px.
  - `ArrowLeft`: Contracts sidebar by 8px.
  - `Home`: Immediately snaps to minimum width (`224px`).
  - `End`: Immediately snaps to maximum width (`360px`).
  - `Enter` / `Space`: Resets to default width (`256px`).
- **Focus Indicator:** A visible outline (`focus:ring-2 focus:ring-[#2F4692]`) appears when tabbed to via keyboard.

---

## 5. Mobile & Tablet Responsiveness

At viewports below the desktop breakpoint (`lg` / `< 1024px`):
- Sidebar resizing is automatically disabled to protect mobile navigation.
- The existing slide-out navigation drawer is preserved.
- The resize separator handle is hidden (`hidden lg:block`).
- Mobile backdrop overlay and touch swipe dismissal continue to function without interference.

---

## 6. Verification & Regression Testing

| Test Scenario | Action Performed | Result |
|---|---|---|
| **Drag Expand** | Pointer drag from 256px to 320px | Sidebar expanded cleanly; main content contracted smoothly; no horizontal page scrollbar appeared. |
| **Drag Clamp (Max)** | Pointer dragged past 400px | Stopped strictly at 360px boundary. |
| **Drag Clamp (Min)** | Pointer dragged below 200px | Stopped strictly at 224px boundary. |
| **Double-Click Reset** | Double clicked handle at 310px | Snapped back to 256px immediately. |
| **Persistence** | Reloaded browser tab at 300px | Width restored to exactly 300px on hydration. |
| **Keyboard Navigation** | Focused handle, pressed ArrowRight 4 times | Width stepped up by 32px (8px per keypress). |
| **Mobile Breakpoint** | Resized browser window to 768px and 390px | Resize handle hidden; drawer operates normally; 0 layout shifts. |
