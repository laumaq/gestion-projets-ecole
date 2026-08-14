// app/tools/tfh/coordination/tabs/GestionUtilisateursTab.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { Plus, Upload, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Eleve, Guide, Externe, UserType } from '../types';

interface GestionUtilisateursTabProps {
  eleves: Eleve[];
  guides: Guide[];
  externes: Externe[];
  onRefresh: () => void;
  selectedUserType: UserType;
  onSelectedUserTypeChange: (type: UserType) => void;
}

interface NewUser {
  nom: string;
  prenom: string;
  classe: string;
  email: string;
  telephone: string;
  initiale: string;
  categorie: string;
}

export default function GestionUtilisateursTab({
  eleves,
  guides,
  externes,
  onRefresh,
  selectedUserType,
  onSelectedUserTypeChange
}: GestionUtilisateursTabProps) {
  const [newUser, setNewUser] = useState<NewUser>({
    nom: '',
    prenom: '',
    classe: '',
    email: '',
    telephone: '',
    initiale: '',
    categorie: ''
  });
  const [showMassImport, setShowMassImport] = useState(false);
  const [massImportData, setMassImportData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [directionMembers, setDirectionMembers] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearMessages = () => {
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const getCurrentUsers = () => {
    switch (selectedUserType) {
      case 'eleves':
        return eleves;
      case 'guides':
        return guides;
      case 'direction':
        return directionMembers;
      case 'externes':
        return externes;
      default:
        return [];
    }
  };

  const getCurrentUserCount = () => {
    return getCurrentUsers().length;
  };

  const loadDirectionData = useCallback(async () => {
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, nom, prenom, initiale, email, telephone, job, mot_de_passe')
        .eq('job', 'direction')
        .order('nom', { ascending: true });
      
      if (employeesError) throw employeesError;
      
      setDirectionMembers(employeesData || []);
      
    } catch (err) {
      console.error('Erreur chargement direction:', err);
      setDirectionMembers([]);
    }
  }, []);

  useEffect(() => {
    if (selectedUserType === 'direction') {
      loadDirectionData();
    }
  }, [selectedUserType, loadDirectionData]);

  const handleAddUser = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      if (!newUser.nom.trim()) {
        setErrorMessage('Le nom est requis');
        clearMessages();
        setLoading(false);
        return;
      }

      if (!newUser.prenom.trim() && selectedUserType !== 'direction') {
        setErrorMessage('Le prénom est requis');
        clearMessages();
        setLoading(false);
        return;
      }

      switch (selectedUserType) {
        case 'eleves':
          if (!newUser.classe.trim()) {
            setErrorMessage('La classe est requise pour un élève');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const initialeEleve = newUser.prenom.trim().charAt(0).toUpperCase();
          
          const { error: eleveError } = await supabase
            .from('tfh_eleves')
            .insert([{
              student_matricule: null,
              nom: newUser.nom,
              prenom: newUser.prenom,
              classe: newUser.classe,
              categorie: newUser.categorie || null,
              initiale: initialeEleve,
              guide_id: null,
              mot_de_passe: null
            }]);

          if (eleveError) throw eleveError;
          break;

        case 'guides':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un guide');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const initialeGuide = newUser.prenom.trim().charAt(0).toUpperCase();
          
          const { error: guideError } = await supabase
            .from('employees')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              initiale: initialeGuide,
              email: newUser.email || null,
              telephone: newUser.telephone || null,
              job: 'prof',
              mot_de_passe: null
            }]);

          if (guideError) throw guideError;
          break;

        case 'direction':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un membre de la direction');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const initialeDirection = newUser.prenom.trim().charAt(0).toUpperCase();
          
          // Vérifier si l'utilisateur existe déjà
          const { data: existingUser } = await supabase
            .from('employees')
            .select('id')
            .eq('nom', newUser.nom)
            .eq('prenom', newUser.prenom)
            .maybeSingle();

          if (existingUser) {
            // Mettre à jour le job vers direction
            const { error: updateError } = await supabase
              .from('employees')
              .update({ 
                job: 'direction',
                email: newUser.email || null,
                telephone: newUser.telephone || null
              })
              .eq('id', existingUser.id);
            
            if (updateError) throw updateError;
          } else {
            // Créer un nouvel utilisateur
            const { error: insertError } = await supabase
              .from('employees')
              .insert([{
                nom: newUser.nom,
                prenom: newUser.prenom,
                initiale: initialeDirection,
                email: newUser.email || null,
                telephone: newUser.telephone || null,
                job: 'direction',
                mot_de_passe: null
              }]);

            if (insertError) throw insertError;
          }
          break;

        case 'externes':
          if (!newUser.prenom.trim()) {
            setErrorMessage('Le prénom est requis pour un externe');
            clearMessages();
            setLoading(false);
            return;
          }
          
          const { error: externeError } = await supabase
            .from('tfh_externes')
            .insert([{
              nom: newUser.nom,
              prenom: newUser.prenom,
              email: newUser.email || null,
              telephone: newUser.telephone || null,
              lecteur_externe_id: crypto.randomUUID(),
              mediateur_id: crypto.randomUUID(),
              mot_de_passe: null
            }]);

          if (externeError) throw externeError;
          break;
      }

      setSuccessMessage('Utilisateur ajouté avec succès!');
      clearMessages();
      
      setNewUser({
        nom: '',
        prenom: '',
        classe: '',
        email: '',
        telephone: '',
        initiale: '',
        categorie: ''
      });
      
      onRefresh();
      if (selectedUserType === 'direction') {
        loadDirectionData();
      }
    } catch (err) {
      console.error('Erreur ajout utilisateur:', err);
      setErrorMessage('Erreur lors de l\'ajout de l\'utilisateur: ' + (err as Error).message);
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const hasPassword = (user: any): boolean => {
    return user.mot_de_passe !== null && user.mot_de_passe !== undefined && user.mot_de_passe !== '';
  };

  const renderConnectionStatus = (user: any) => {
    const connected = hasPassword(user);
    
    return (
      <div className="flex items-center gap-2">
        {connected ? (
          <span className="p-1.5 bg-green-100 text-green-700 rounded-full" title="Utilisateur connecté">
            <CheckCircle className="w-4 h-4" />
          </span>
        ) : (
          <span className="p-1.5 bg-red-100 text-red-700 rounded-full" title="Utilisateur non connecté">
            <XCircle className="w-4 h-4" />
          </span>
        )}
      </div>
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        const csvText = jsonData.map(row => row.join(',')).join('\n');
        setMassImportData(csvText);
        setShowMassImport(true);
      } catch (err) {
        console.error('Erreur lecture fichier:', err);
        setErrorMessage('Erreur lors de la lecture du fichier');
        clearMessages();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMassImport = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const rows = massImportData.trim().split('\n').filter(row => row.trim());
      if (rows.length === 0) {
        setErrorMessage('Aucune donnée à importer');
        clearMessages();
        setLoading(false);
        return;
      }

      const firstRow = rows[0].split(',').map(c => c.trim().toLowerCase());
      const hasHeaders = firstRow.includes('nom') || firstRow.includes('prenom') || firstRow.includes('classe');
      
      const dataRows = hasHeaders ? rows.slice(1) : rows;
      
      console.log(`Import de ${dataRows.length} utilisateurs...`);

      switch (selectedUserType) {
        case 'eleves':
          const elevesToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            return {
              student_matricule: null,
              nom: values[0] || '',
              prenom: values[1] || '',
              classe: values[2] || '',
              initiale: (values[1] || '').charAt(0).toUpperCase(),
              categorie: values[3] || null,
              guide_id: null,
              mot_de_passe: null
            };
          }).filter(e => e.nom && e.prenom && e.classe);

          if (elevesToInsert.length > 0) {
            const { error } = await supabase
              .from('tfh_eleves')
              .insert(elevesToInsert);
            if (error) throw error;
          }
          break;

        case 'guides':
          const guidesToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            return {
              nom: values[0] || '',
              prenom: values[1] || '',
              initiale: (values[1] || '').charAt(0).toUpperCase(),
              email: values[2] || null,
              telephone: values[3] || null,
              job: 'prof',
              mot_de_passe: null
            };
          }).filter(g => g.nom && g.prenom);

          if (guidesToInsert.length > 0) {
            const { error } = await supabase
              .from('employees')
              .insert(guidesToInsert);
            if (error) throw error;
          }
          break;

        case 'direction':
          const directionToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            return {
              nom: values[0] || '',
              prenom: values[1] || '',
              initiale: (values[1] || '').charAt(0).toUpperCase(),
              email: values[2] || null,
              telephone: values[3] || null,
              job: 'direction',
              mot_de_passe: null
            };
          }).filter(d => d.nom && d.prenom);

          if (directionToInsert.length > 0) {
            const { error } = await supabase
              .from('employees')
              .insert(directionToInsert);
            if (error) throw error;
          }
          break;

        case 'externes':
          const externesToInsert = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim());
            return {
              nom: values[0] || '',
              prenom: values[1] || '',
              email: values[2] || null,
              telephone: values[3] || null,
              lecteur_externe_id: crypto.randomUUID(),
              mediateur_id: crypto.randomUUID(),
              mot_de_passe: null
            };
          }).filter(e => e.nom && e.prenom);

          if (externesToInsert.length > 0) {
            const { error } = await supabase
              .from('tfh_externes')
              .insert(externesToInsert);
            if (error) throw error;
          }
          break;
      }

      setSuccessMessage(`${dataRows.length} utilisateur${dataRows.length > 1 ? 's' : ''} importé${dataRows.length > 1 ? 's' : ''} avec succès!`);
      clearMessages();
      setShowMassImport(false);
      setMassImportData('');
      onRefresh();
      if (selectedUserType === 'direction') {
        loadDirectionData();
      }
    } catch (err) {
      console.error('Erreur import massif:', err);
      setErrorMessage('Erreur lors de l\'importation: ' + (err as Error).message);
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeLabel = () => {
    switch (selectedUserType) {
      case 'eleves': return 'Élèves';
      case 'guides': return 'Guides';
      case 'direction': return 'Direction';
      case 'externes': return 'Externes';
      default: return '';
    }
  };

  const renderMessages = () => {
    if (!successMessage && !errorMessage) return null;

    return (
      <div className="fixed top-4 right-4 z-50 max-w-md">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-2 shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">{successMessage}</span>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderMessages()}
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Gestion des utilisateurs
            </h2>
            <p className="text-gray-600">
              Ajout et gestion des utilisateurs du système
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {getCurrentUserCount()} {getUserTypeLabel().toLowerCase()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'utilisateur
            </label>
            <select
              value={selectedUserType}
              onChange={(e) => {
                onSelectedUserTypeChange(e.target.value as UserType);
                if (e.target.value === 'direction') {
                  loadDirectionData();
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="eleves">Élèves</option>
              <option value="guides">Guides</option>
              <option value="direction">Direction</option>
              <option value="externes">Externes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import
            </label>
            <button
              onClick={() => setShowMassImport(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer CSV/Excel
            </button>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Ajouter un {getUserTypeLabel().toLowerCase()}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {selectedUserType === 'eleves' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Classe *
                  </label>
                  <input
                    type="text"
                    placeholder="Classe"
                    value={newUser.classe}
                    onChange={(e) => setNewUser({...newUser, classe: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            
            {(selectedUserType === 'guides' || selectedUserType === 'direction') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={newUser.telephone}
                    onChange={(e) => setNewUser({...newUser, telephone: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {selectedUserType === 'externes' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={newUser.telephone}
                    onChange={(e) => setNewUser({...newUser, telephone: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleAddUser}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Ajouter
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">
              Liste des {getUserTypeLabel().toLowerCase()} ({getCurrentUserCount()})
            </h3>
            <span className="text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 inline text-green-600 mr-1" /> = Connecté
              <XCircle className="w-4 h-4 inline text-red-600 mr-1 ml-3" /> = Non connecté
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {selectedUserType === 'eleves' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Classe
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                  </>
                )}
                {(selectedUserType === 'guides' || selectedUserType === 'direction') && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                  </>
                )}
                {selectedUserType === 'externes' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Connecté
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getCurrentUsers().map((user: any) => (
                <tr key={user.id || user.student_matricule} className="hover:bg-gray-50 transition-colors">
                  {selectedUserType === 'eleves' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.classe}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                    </>
                  )}
                  {(selectedUserType === 'guides' || selectedUserType === 'direction') && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.email ? (
                          <a 
                            href={`mailto:${user.email}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {user.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.telephone ? (
                          <a 
                            href={`tel:${user.telephone.replace(/\s/g, '')}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {user.telephone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                    </>
                  )}
                  {selectedUserType === 'externes' && (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.prenom}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.email ? (
                          <a 
                            href={`mailto:${user.email}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {user.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.telephone ? (
                          <a 
                            href={`tel:${user.telephone.replace(/\s/g, '')}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {user.telephone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {renderConnectionStatus(user)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'import massif */}
      {showMassImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Import massif depuis CSV/Excel</h3>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format attendu pour les {getUserTypeLabel().toLowerCase()}:
                </label>
                <div className="text-sm text-gray-600 mb-3">
                  {selectedUserType === 'eleves' && 'Colonnes: nom, prenom, classe, categorie (optionnel)'}
                  {selectedUserType === 'guides' && 'Colonnes: nom, prenom, email, telephone (optionnels)'}
                  {selectedUserType === 'direction' && 'Colonnes: nom, prenom, email, telephone (optionnels)'}
                  {selectedUserType === 'externes' && 'Colonnes: nom, prenom, email, telephone (optionnels)'}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx,.xls"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Données CSV (vous pouvez aussi coller directement):
                </label>
                <textarea
                  value={massImportData}
                  onChange={(e) => setMassImportData(e.target.value)}
                  rows={10}
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                  placeholder="Collez vos données CSV ici..."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMassImport(false);
                  setMassImportData('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleMassImport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!massImportData.trim() || loading}
              >
                {loading ? 'Importation...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}