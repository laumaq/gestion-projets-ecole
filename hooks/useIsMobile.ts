'use client';

import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      // Mobile si :
      // - Largeur < breakpoint
      // - OU pointeur "coarse" (tactile) et largeur < 1024 (couvre les téléphones en paysage)
      const width = window.innerWidth;
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      
      const mobile =
        width < breakpoint ||
        (hasCoarsePointer && width < 1024);
      
      setIsMobile(mobile);
    };
    
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, [breakpoint]);

  return isMobile;
}