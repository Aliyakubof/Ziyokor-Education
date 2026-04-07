import { useEffect } from 'react';

export function usePullToRefresh() {
  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    // This is useful mostly for standalone PWA on iOS
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!isStandalone) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Allow pull to refresh only if we are at the very top
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      // If user pulled down more than 120px
      if (distance > 120) {
        isPulling = false; // Prevent multiple reloads
        window.location.reload();
      }
    };

    const handleTouchEnd = () => {
      isPulling = false;
    };

    // Passive listener allows standard scroll behaviors
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
}
