// app/tools/tfh/components/ProfileEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProfileEditorProps {
  userId: string;
  userType: 'lecteur_externe' | 'guide' | 'coordinateur' | 'mediateur' | 'eleve';
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ProfileEditor({ userId, userType, onClose, onUpdate }: ProfileEditorProps) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUserData();
  }, [userId, userType]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError('');

      let tableName = '';
      let idField = '';
      
      switch (userType) {
        case 'lecteur_externe':
          tableName = 'tfh_lecteurs_externes';
          idField = 'id';
          break;
        case 'guide':
          // Les guides sont dans employees
          tableName = 'employees';
          idField = 'id';
          break;
        case 'coordinateur':
          // Les coordinateurs sont dans employees
          tableName = 'employees';
          idField = 'id';
          break;
        case 'mediateur':
          tableName = 'tfh_mediateurs';
          idField = 'id';
          break;
        case 'eleve':
          // Les élèves sont dans students
          tableName = 'students';
          idField = 'matricule';
          break;
        default:
          throw new Error('Type d\'utilisateur non supporté');
      }

      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('nom, prenom, email, telephone')
        .eq(idField, userId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setNom(data.nom || '');
        setPrenom(data.prenom || '');
        setEmail(data.email || '');
        setTelephone(data.telephone || '');
      }
    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      setError('Impossible de charger vos informations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let tableName = '';
      let idField = '';
      
      switch (userType) {
        case 'lecteur_externe':
          tableName = 'tfh_lecteurs_externes';
          idField = 'id';
          break;
        case 'guide':
          tableName = 'employees';
          idField = 'id';
          break;
        case 'coordinateur':
          tableName = 'employees';
          idField = 'id';
          break;
        case 'mediateur':
          tableName = 'tfh_mediateurs';
          idField = 'id';
          break;
        case 'eleve':
          tableName = 'students';
          idField = 'matricule';
          break;
      }

      const updateData: any = {
        email: email.trim(),
        updated_at: new Date().toISOString()
      };
      
      // Seul le téléphone est optionnel
      if (telephone.trim()) {
        updateData.telephone = telephone.trim();
      } else {
        updateData.telephone = null;
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq(idField, userId);

      if (updateError) throw updateError;

      setSuccess('Vos informations ont été mises à jour avec succès !');
      
      // Mettre à jour le nom dans localStorage si c'est un élève ou un employee
      const currentUserName = localStorage.getItem('userName');
      const newUserName = `${prenom} ${nom}`;
      if (currentUserName !== newUserName) {
        localStorage.setItem('userName', newUserName);
      }

      if (onUpdate) {
        onUpdate();
      }

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de vos informations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Modifier mon profil</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom
            </label>
            <input
              type="text"
              value={nom}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">Le nom ne peut pas être modifié</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom
            </label>
            <input
              type="text"
              value={prenom}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">Le prénom ne peut pas être modifié</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Votre adresse email principale
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Facultatif"
            />
            <p className="text-xs text-gray-500 mt-1">
              Numéro pour contact urgent
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Seules certaines informations peuvent être modifiées.
            Pour d'autres modifications, contactez les coordinateurs TFH.
          </p>
        </div>
      </div>
    </div>
  );
}