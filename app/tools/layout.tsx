// app/tools/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/');
    }
  }, [router]);

  // Si on est dans une section TFH, ne pas appliquer le wrapper (pleine largeur)
  const isTfh = pathname?.startsWith('/tools/tfh');

  if (isTfh) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}