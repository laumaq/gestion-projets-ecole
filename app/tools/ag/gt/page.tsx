// app/tools/ag/gt/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAGPermissions } from '@/hooks/useAGPermissions';
import { useAGData } from '@/hooks/useAGData';
import BureauManagement from '@/components/ag/BureauManagement';
import GTAssignment from '@/components/ag/GTAssignment';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AGGroupesPage() {
  const router = useRouter();
  const { canConfigure, loading: permissionsLoading } = useAGPermissions();
  const {
    bureau,
    groupes,
    employees,
    loading: dataLoading,
    error,
    addBureau,
    removeBureau,
    assignGroupe
  } = useAGData();

  useEffect(() => {
    if (!permissionsLoading && !canConfigure) {
      router.push('/tools/ag');
    }
  }, [canConfigure, permissionsLoading, router]);

  if (permissionsLoading || dataLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Groupes de travail</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BureauManagement
          bureau={bureau}
          employees={employees}
          onAdd={addBureau}
          onRemove={removeBureau}
        />

        <GTAssignment
          employees={employees}
          groupes={groupes}
          onAssign={assignGroupe}
        />
      </div>
    </main>
  );
}
