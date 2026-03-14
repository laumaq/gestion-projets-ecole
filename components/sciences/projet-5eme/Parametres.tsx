'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Access {
  id: string;
  employee_id: string;
  added_by: string | null;
  created_at: string;
  employees: { nom: string; prenom: string; initiale: string; job: string } | null;
}

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  job: string;
}

interface Props {
  currentUserId: string;
}

const JOB_LABELS: Record<string, string> = {
  prof: 'Professeur·e',
  educ: 'Éducateur·trice',
  direction: 'Direction',
  administration: 'Administration',
};

export default function Parametres({ currentUserId }: Props) {
  const [access, setAccess] = useState<Access[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadAccess = async () => {
      const { data: rows } = await supabase
        .from('projet_cite_commune_acces')
        .select('id, employee_id, added_by, created_at')
        .order('created_at', { ascending: true });

      if (!rows || rows.length === 0) {
        setAccess([]);
        setLoading(false);
        return;
      }

      const ids = rows.map(r => r.employee_id);
      const { data: emps } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale, job')
        .in('id', ids);

      const empMap = Object.fromEntries((emps ?? []).map(e => [e.id, e]));
      setAccess(rows.map(r => ({ ...r, employees: empMap[r.employee_id] ?? null })));
      setLoading(false);
    };

  useEffect(() => { loadAccess(); }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length < 2) { setSearchResults([]); return; }
      setSearching(true);
      const { data } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale, job')
        .or(`nom.ilike.%${search}%,prenom.ilike.%${search}%`)
        .limit(8);
      const existingIds = access.map(a => a.employee_id);
      setSearchResults((data ?? []).filter(e => !existingIds.includes(e.id)));
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, access]);

  const handleAdd = async (employee: Employee) => {
    setAdding(employee.id);
    setError('');
    const { error: err } = await supabase.from('projet_cite_commune_acces').insert({
      employee_id: employee.id,
      added_by: currentUserId,
    });
    setAdding(null);
    if (err) {
      if (err.code === '23505') {
        setError('Cette personne a déjà accès au projet.');
      } else {
        setError('Erreur : ' + err.message);
      }
      return;
    }
    setSearch('');
    setSearchResults([]);
    loadAccess();
  };

  const handleRemove = async (accessId: string, employeeId: string) => {
    if (employeeId === currentUserId) {
      if (!confirm('Tu vas te retirer toi-même. Continue ?')) return;
    }
    setRemoving(accessId);
    await supabase.from('projet_cite_commune_acces').delete().eq('id', accessId);
    setRemoving(null);
    loadAccess();
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Accès au projet</h2>
      <p className="text-sm text-gray-500 mb-6">
        Gère les enseignants et membres du personnel qui ont accès à cet outil et peuvent voir l'ensemble des données.
      </p>

      {/* Liste des accès actuels */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Personnes autorisées</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : access.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun accès configuré.</p>
        ) : (
          <div className="space-y-2">
            {access.map(a => {
              const emp = a.employees;
              const isSelf = a.employee_id === currentUserId;
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between bg-white border rounded-lg px-4 py-3 ${
                    isSelf ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800">
                        {emp ? `${emp.prenom} ${emp.nom}` : a.employee_id}
                      </span>
                      {isSelf && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">vous</span>
                      )}
                    </div>
                    {emp && (
                      <p className="text-xs text-gray-400">{JOB_LABELS[emp.job] ?? emp.job}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(a.id, a.employee_id)}
                    disabled={removing === a.id}
                    className="text-gray-300 hover:text-red-400 text-xl leading-none transition-colors disabled:opacity-50"
                    title="Retirer l'accès"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recherche pour ajouter */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Ajouter un accès</h3>
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Rechercher par nom ou prénom..."
            value={search}
            onChange={e => { setSearch(e.target.value); setError(''); }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {searching && (
            <span className="absolute right-3 top-2.5 text-gray-400 text-xs">...</span>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {searchResults.map(emp => (
              <div
                key={emp.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-t first:border-t-0"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">{emp.prenom} {emp.nom}</span>
                  <span className="text-xs text-gray-400 ml-2">{JOB_LABELS[emp.job] ?? emp.job}</span>
                </div>
                <button
                  onClick={() => handleAdd(emp)}
                  disabled={adding === emp.id}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors disabled:opacity-60"
                >
                  {adding === emp.id ? '...' : '+ Ajouter'}
                </button>
              </div>
            ))}
          </div>
        )}

        {search.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            Aucun résultat (les personnes déjà autorisées n'apparaissent pas).
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}