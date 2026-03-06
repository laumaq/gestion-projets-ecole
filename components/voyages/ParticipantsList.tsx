//components/voyages/ParticipantsList.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  voyageId: string;
  isResponsable: boolean;  // Ajouté
  userType: 'employee' | 'student' | null;  // Ajouté
}

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  niveau: number;
  sexe: string;
}

interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  email: string | null;
}

interface Participant {
  id: string;
  eleve_id: number;
  statut: string;
  genre: string;
  classe: string;
  type: 'eleve';
  eleve: Eleve;
}

interface ProfesseurParticipant {
  id: string;
  professeur_id: string;
  role: string;
  type: 'professeur';
  professeur: Professeur;
}

type ParticipantUnion = Participant | ProfesseurParticipant;

export default function ParticipantsList({ voyageId, isResponsable, userType }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [professeursParticipants, setProfesseursParticipants] = useState<ProfesseurParticipant[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [professeursDisponibles, setProfesseursDisponibles] = useState<Professeur[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'individuel' | 'classe' | 'niveau' | 'prof'>('individuel');
  const [selectedEleves, setSelectedEleves] = useState<Set<number>>(new Set());
  const [selectedProfesseurs, setSelectedProfesseurs] = useState<Set<string>>(new Set());
  const [classesDisponibles, setClassesDisponibles] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedProfRole, setSelectedProfRole] = useState('accompagnateur');
  
  // États pour gérer les permissions
  const [userId, setUserId] = useState<string | null>(null);
  const canEdit = userType === 'employee' && isResponsable;
  
  // Récupérer le type d'utilisateur au chargement
  useEffect(() => {
    const id = localStorage.getItem('userId');
    setUserId(id);
  }, []);

  // Charger les participants au démarrage
  useEffect(() => {
    loadParticipants();
    loadProfesseursParticipants();
  }, [voyageId]);

  // Charger les classes disponibles depuis la BDD quand on ouvre le modal
  useEffect(() => {
    if (showAddModal && canEdit ) {
      loadClassesDisponibles();
      loadProfesseursDisponibles();
      // Réinitialiser les sélections
      setElevesDisponibles([]);
      setProfesseursDisponibles([]);
      setSelectedEleves(new Set());
      setSelectedProfesseurs(new Set());
      setSearchTerm('');
      setSelectedClasse('');
      setSelectedNiveau('');
    }
  }, [showAddModal, userType]);

  // Charger automatiquement les élèves quand les filtres changent
  useEffect(() => {
    if (showAddModal && canEdit  && (addMode === 'individuel' || addMode === 'classe' || addMode === 'niveau')) {
      const timer = setTimeout(() => {
        loadElevesDisponibles();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, selectedClasse, selectedNiveau, addMode, showAddModal, userType]);

  // Charger automatiquement les professeurs
  useEffect(() => {
    if (showAddModal && canEdit  && addMode === 'prof') {
      loadProfesseursDisponibles();
    }
  }, [searchTerm, addMode, showAddModal, userType]);

  const loadClassesDisponibles = async () => {
    setLoadingClasses(true);
    const { data, error } = await supabase
      .from('students')
      .select('classe')
      .order('classe');

    if (!error && data) {
      const classes = Array.from(new Set(data.map(item => item.classe))).sort();
      setClassesDisponibles(classes);
    }
    setLoadingClasses(false);
  };

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('voyage_participants')
      .select(`
        *,
        eleve:students!inner(matricule, nom, prenom, classe, niveau, sexe)
      `)
      .eq('voyage_id', voyageId);

    if (!error && data) {
      setParticipants(data);
    }
  };

  const loadProfesseursParticipants = async () => {
    const { data, error } = await supabase
      .from('voyage_professeurs')
      .select(`
        *,
        professeur:employees (
          id,
          nom,
          prenom,
          initiale,
          email
        )
      `)
      .eq('voyage_id', voyageId);
  
    console.log('Professeurs participants data:', data); // Pour debug
    console.log('Erreur:', error);
  
    if (!error && data) {
      const professeursFormates = data.map((item: any) => ({
        ...item,
        type: 'professeur',
        professeur: item.professeur // Déjà un objet, pas besoin de Array.isArray
      }));
      setProfesseursParticipants(professeursFormates);
    }
    setLoading(false);
  };

  const loadElevesDisponibles = async () => {
    const participantIds = participants.map(p => p.eleve_id);
    
    let query = supabase
      .from('students')
      .select('*')
      .order('classe')
      .order('nom');

    if (participantIds.length > 0) {
      query = query.not('matricule', 'in', `(${participantIds.join(',')})`);
    }

    if (addMode === 'niveau' && selectedNiveau !== '') {
      query = query.eq('niveau', selectedNiveau);
    } else if (addMode === 'classe' && selectedClasse) {
      query = query.eq('classe', selectedClasse);
    }

    if (searchTerm) {
      query = query.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`);
    }

    query = query.limit(200);

    const { data, error } = await query;

    if (!error && data) {
      setElevesDisponibles(data);
    }
  };

  const loadProfesseursDisponibles = async () => {
    const professeursIds = professeursParticipants.map(p => p.professeur_id);
    
    let query = supabase
      .from('employees')
      .select('id, nom, prenom, initiale, email')
      .order('nom');

    if (professeursIds.length > 0) {
      query = query.not('id', 'in', `(${professeursIds.map(id => `'${id}'`).join(',')})`);
    }

    if (searchTerm) {
      query = query.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setProfesseursDisponibles(data);
    }
  };

  const addParticipants = async () => {
    if (addMode === 'prof') {
      // Ajouter des professeurs
      if (selectedProfesseurs.size === 0) {
        alert('Sélectionnez au moins un professeur');
        return;
      }

      const professeursData = Array.from(selectedProfesseurs).map(profId => ({
        voyage_id: voyageId,
        professeur_id: profId,
        role: selectedProfRole
      }));

      const { error } = await supabase
        .from('voyage_professeurs')
        .insert(professeursData);

      if (!error) {
        loadProfesseursParticipants();
        setShowAddModal(false);
        setSelectedProfesseurs(new Set());
      }
    } else {
      // Ajouter des élèves
      let elevesAAjouter: Eleve[] = [];

      if (addMode === 'individuel' && selectedEleves.size > 0) {
        elevesAAjouter = elevesDisponibles.filter(e => selectedEleves.has(e.matricule));
      } else if (addMode === 'classe' && selectedClasse) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('classe', selectedClasse)
          .not('matricule', 'in', `(${participants.map(p => p.eleve_id).join(',')})`);
        elevesAAjouter = data || [];
      } else if (addMode === 'niveau' && selectedNiveau !== '') {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('niveau', selectedNiveau)
          .not('matricule', 'in', `(${participants.map(p => p.eleve_id).join(',')})`);
        elevesAAjouter = data || [];
      }

      if (elevesAAjouter.length === 0) {
        alert('Aucun élève à ajouter');
        return;
      }

      const participantsData = elevesAAjouter.map(eleve => ({
        voyage_id: voyageId,
        eleve_id: eleve.matricule,
        genre: eleve.sexe,
        classe: eleve.classe,
        statut: 'confirme'
      }));

      const { error } = await supabase
        .from('voyage_participants')
        .insert(participantsData);

      if (!error) {
        loadParticipants();
        setShowAddModal(false);
        setSelectedEleves(new Set());
      }
    }
  };

  const removeParticipant = async (participant: ParticipantUnion) => {
    if ('type' in participant && participant.type === 'professeur') {
      if (confirm('Retirer ce professeur du voyage ?')) {
        const { error } = await supabase
          .from('voyage_professeurs')
          .delete()
          .eq('id', participant.id);

        if (!error) loadProfesseursParticipants();
      }
    } else {
      if (confirm('Retirer cet élève du voyage ?')) {
        const { error } = await supabase
          .from('voyage_participants')
          .delete()
          .eq('id', participant.id);

        if (!error) loadParticipants();
      }
    }
  };

  const removeMultipleParticipants = async () => {
    const classesPresentes = Array.from(new Set(participants.map(p => p.classe))).sort();
    const classeToRemove = prompt(`Entrez la classe à retirer:\nClasses disponibles: ${classesPresentes.join(', ')}`);
    
    if (classeToRemove && classesPresentes.includes(classeToRemove)) {
      const participantsToRemove = participants.filter(p => p.classe === classeToRemove);
      
      if (confirm(`Retirer les ${participantsToRemove.length} élèves de la classe ${classeToRemove} ?`)) {
        const { error } = await supabase
          .from('voyage_participants')
          .delete()
          .in('id', participantsToRemove.map(p => p.id));

        if (!error) loadParticipants();
      }
    } else if (classeToRemove) {
      alert('Classe non trouvée parmi les participants');
    }
  };

  const updateStatut = async (participantId: string, statut: string) => {
    const { error } = await supabase
      .from('voyage_participants')
      .update({ statut })
      .eq('id', participantId);

    if (!error) loadParticipants();
  };

  const updateStatutMultiple = async (statut: string) => {
    const classesPresentes = Array.from(new Set(participants.map(p => p.classe))).sort();
    const classeToUpdate = prompt(`Entrez la classe à mettre à jour (statut: ${statut})\nClasses disponibles: ${classesPresentes.join(', ')}`);
    
    if (classeToUpdate && classesPresentes.includes(classeToUpdate)) {
      const participantsToUpdate = participants.filter(p => p.classe === classeToUpdate);
      
      if (confirm(`Mettre à jour les ${participantsToUpdate.length} élèves de la classe ${classeToUpdate} ?`)) {
        const { error } = await supabase
          .from('voyage_participants')
          .update({ statut })
          .in('id', participantsToUpdate.map(p => p.id));

        if (!error) loadParticipants();
      }
    } else if (classeToUpdate) {
      alert('Classe non trouvée parmi les participants');
    }
  };

  const updateProfRole = async (participantId: string, role: string) => {
    const { error } = await supabase
      .from('voyage_professeurs')
      .update({ role })
      .eq('id', participantId);

    if (!error) loadProfesseursParticipants();
  };

  const toggleSelectEleve = (matricule: number) => {
    const newSelection = new Set(selectedEleves);
    if (newSelection.has(matricule)) {
      newSelection.delete(matricule);
    } else {
      newSelection.add(matricule);
    }
    setSelectedEleves(newSelection);
  };

  const toggleSelectProfesseur = (id: string) => {
    const newSelection = new Set(selectedProfesseurs);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedProfesseurs(newSelection);
  };

  const toggleSelectAllEleves = () => {
    if (selectedEleves.size === elevesDisponibles.length) {
      setSelectedEleves(new Set());
    } else {
      setSelectedEleves(new Set(elevesDisponibles.map(e => e.matricule)));
    }
  };

  const toggleSelectAllProfesseurs = () => {
    if (selectedProfesseurs.size === professeursDisponibles.length) {
      setSelectedProfesseurs(new Set());
    } else {
      setSelectedProfesseurs(new Set(professeursDisponibles.map(p => p.id)));
    }
  };

  const classesParticipants = Array.from(new Set(participants.map(p => p.classe))).sort();
  const niveaux = [1, 2, 3, 4, 5, 6];

  if (loading) return <div className="text-center py-8">Chargement des participants...</div>;

  // Calculer le nombre d'élèves confirmés uniquement
  const elevesConfirmes = participants.filter(p => p.statut === 'confirme').length;
  const totalParticipants = elevesConfirmes + professeursParticipants.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <p className="text-gray-600 mt-1">
            {totalParticipants} participant{totalParticipants > 1 ? 's' : ''} ({elevesConfirmes} élève{elevesConfirmes > 1 ? 's' : ''} confirmé{elevesConfirmes > 1 ? 's' : ''}, {professeursParticipants.length} professeur{professeursParticipants.length > 1 ? 's' : ''})
          </p>
        </div>

        {/* Boutons d'action - UNIQUEMENT pour les employés */}
        {canEdit  && (
          <div className="flex gap-2">
            <button
              onClick={removeMultipleParticipants}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              Retirer une classe
            </button>
            <button
              onClick={() => updateStatutMultiple('liste_attente')}
              className="px-4 py-2 border border-yellow-300 text-yellow-600 rounded-lg hover:bg-yellow-50"
            >
              Mettre en liste d'attente
            </button>
            
            {/* Bouton pour ajouter des professeurs */}
            <button
              onClick={() => {
                setAddMode('prof');
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              + Ajouter des professeurs
            </button>
            
            {/* Bouton pour ajouter des élèves */}
            <button
              onClick={() => {
                setAddMode('individuel');
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              + Ajouter des élèves
            </button>
          </div>
        )}
      </div>

      {/* Message pour les élèves */}
      {userType === 'student' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">
            👋 Voici la liste des participants à ce voyage. Vous pouvez voir qui participe, mais vous ne pouvez pas modifier la liste.
          </p>
        </div>
      )}

      {/* Filtres - toujours visibles */}
      <div className="flex gap-4">
        <select
          value={selectedClasse}
          onChange={(e) => setSelectedClasse(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Toutes les classes</option>
          {classesParticipants.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Liste des professeurs participants */}
      {professeursParticipants.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="grid grid-cols-12 gap-4 p-4 bg-purple-50 font-medium text-sm text-gray-700 border-b">
            <div className="col-span-4">Professeur</div>
            <div className="col-span-2">Rôle</div>
            <div className="col-span-6"></div>
          </div>

          {professeursParticipants.map((prof) => (
            <div key={prof.id} className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50">
              <div className="col-span-4">
                <div className="font-medium">
                  {prof.professeur.prenom} {prof.professeur.nom}
                </div>
              </div>
              <div className="col-span-2">
                {canEdit  ? (
                  <select
                    value={prof.role}
                    onChange={(e) => updateProfRole(prof.id, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="accompagnateur">👥 Accompagnateur</option>
                    <option value="responsable">⭐ Responsable</option>
                    <option value="direction">🏢 Direction</option>
                    <option value="infirmier">🏥 Infirmier</option>
                  </select>
                ) : (
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    prof.role === 'responsable' ? 'bg-yellow-100 text-yellow-800' :
                    prof.role === 'direction' ? 'bg-blue-100 text-blue-800' :
                    prof.role === 'infirmier' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {prof.role === 'accompagnateur' ? '👥 Accompagnateur' :
                     prof.role === 'responsable' ? '⭐ Responsable' :
                     prof.role === 'direction' ? '🏢 Direction' :
                     prof.role === 'infirmier' ? '🏥 Infirmier' : prof.role}
                  </span>
                )}
              </div>
              <div className="col-span-6">
                {/* Pour les élèves, pas d'actions */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liste des élèves participants */}
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700 border-b">
          <div className="col-span-4">Élève</div>
          <div className="col-span-2">Classe</div>
          <div className="col-span-2">Genre</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-2"></div>
        </div>

        {participants
          .filter(p => !selectedClasse || p.classe === selectedClasse)
          .map((participant) => (
            <div key={participant.id} className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50">
              <div className="col-span-4">
                <div className="font-medium">{participant.eleve.nom} {participant.eleve.prenom}</div>
              </div>
              <div className="col-span-2 text-gray-600">{participant.classe}</div>
              <div className="col-span-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  participant.genre === 'M' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {participant.genre === 'M' ? 'Garçon' : 'Fille'}
                </span>
              </div>
              <div className="col-span-2">
                {canEdit  ? (
                  <select
                    value={participant.statut}
                    onChange={(e) => updateStatut(participant.id, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="confirme">✅ Confirmé</option>
                    <option value="liste_attente">⏳ Liste d'attente</option>
                    <option value="annule">❌ Annulé</option>
                  </select>
                ) : (
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    participant.statut === 'confirme' ? 'bg-green-100 text-green-800' :
                    participant.statut === 'liste_attente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {participant.statut === 'confirme' ? '✅ Confirmé' :
                     participant.statut === 'liste_attente' ? '⏳ Liste d\'attente' :
                     '❌ Annulé'}
                  </span>
                )}
              </div>
              <div className="col-span-2">
                {/* Pour les élèves, pas d'actions */}
              </div>
            </div>
          ))}
      </div>

      {/* Modal d'ajout - UNIQUEMENT visible pour les employés */}
      {canEdit  && showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {addMode === 'prof' ? 'Ajouter des professeurs' : 'Ajouter des élèves'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              
              {/* Mode d'ajout (caché quand on est en mode prof) */}
              {addMode !== 'prof' && (
                <div className="mt-4 flex gap-4 border-b pb-4">
                  <button
                    onClick={() => {
                      setAddMode('individuel');
                      setSelectedClasse('');
                      setSelectedNiveau('');
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      addMode === 'individuel' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Ajout individuel
                  </button>
                  <button
                    onClick={() => {
                      setAddMode('classe');
                      setSelectedNiveau('');
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      addMode === 'classe' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Ajouter une classe
                  </button>
                  <button
                    onClick={() => {
                      setAddMode('niveau');
                      setSelectedClasse('');
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      addMode === 'niveau' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Ajouter un niveau
                  </button>
                </div>
              )}
              
              {/* Filtres automatiques */}
              <div className="mt-4 space-y-4">
                {addMode === 'prof' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Rechercher un professeur (nom ou prénom)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      autoFocus
                    />
                    <select
                      value={selectedProfRole}
                      onChange={(e) => setSelectedProfRole(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="accompagnateur">👥 Accompagnateur</option>
                      <option value="responsable">⭐ Responsable</option>
                      <option value="direction">🏢 Direction</option>
                      <option value="infirmier">🏥 Infirmier</option>
                    </select>
                  </>
                ) : (
                  <>
                    {addMode === 'individuel' && (
                      <input
                        type="text"
                        placeholder="Rechercher un élève (nom ou prénom)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        autoFocus
                      />
                    )}

                    {addMode === 'classe' && (
                      <select
                        value={selectedClasse}
                        onChange={(e) => setSelectedClasse(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        autoFocus
                      >
                        <option value="">Choisir une classe...</option>
                        {loadingClasses ? (
                          <option disabled>Chargement des classes...</option>
                        ) : (
                          classesDisponibles.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))
                        )}
                      </select>
                    )}

                    {addMode === 'niveau' && (
                      <select
                        value={selectedNiveau}
                        onChange={(e) => setSelectedNiveau(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-4 py-2 border rounded-lg"
                        autoFocus
                      >
                        <option value="">Choisir un niveau...</option>
                        {niveaux.map(n => (
                          <option key={n} value={n}>Niveau {n}</option>
                        ))}
                      </select>
                    )}
                  </>
                )}

                {/* Message d'information sur le nombre de résultats */}
                {addMode === 'prof' && professeursDisponibles.length > 0 && (
                  <p className="text-sm text-gray-600">
                    {professeursDisponibles.length} professeur(s) disponible(s)
                  </p>
                )}
                {addMode !== 'prof' && elevesDisponibles.length > 0 && (
                  <p className="text-sm text-gray-600">
                    {elevesDisponibles.length} élève(s) trouvé(s)
                  </p>
                )}
              </div>
            </div>

            {/* Résultats */}
            <div className="flex-1 overflow-y-auto p-6">
              {addMode === 'prof' ? (
                <>
                  {professeursDisponibles.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedProfesseurs.size === professeursDisponibles.length && professeursDisponibles.length > 0}
                        onChange={toggleSelectAllProfesseurs}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">
                        {selectedProfesseurs.size === 0 
                          ? 'Sélectionner tous les professeurs'
                          : `${selectedProfesseurs.size} professeur(s) sélectionné(s)`}
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {professeursDisponibles.map((prof) => (
                      <div
                        key={prof.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProfesseurs.has(prof.id)}
                          onChange={() => toggleSelectProfesseur(prof.id)}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{prof.prenom} {prof.nom}</div>
                          <div className="text-sm text-gray-600">
                            {prof.email || '—'} • {prof.initiale}
                          </div>
                        </div>
                      </div>
                    ))}
                    {professeursDisponibles.length === 0 && searchTerm && (
                      <div className="text-center py-8 text-gray-500">
                        Aucun professeur trouvé avec "{searchTerm}"
                      </div>
                    )}
                  </div>

                  {selectedProfesseurs.size > 0 && (
                    <button
                      onClick={addParticipants}
                      className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Ajouter {selectedProfesseurs.size} professeur(s) avec le rôle "{selectedProfRole}"
                    </button>
                  )}
                </>
              ) : (
                /* Section élèves */
                addMode === 'individuel' ? (
                  <>
                    {elevesDisponibles.length > 0 && (
                      <div className="mb-4 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEleves.size === elevesDisponibles.length && elevesDisponibles.length > 0}
                          onChange={toggleSelectAllEleves}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-600">
                          {selectedEleves.size === 0 
                            ? 'Sélectionner tous les élèves'
                            : `${selectedEleves.size} élève(s) sélectionné(s)`}
                        </span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {elevesDisponibles.map((eleve) => (
                        <div
                          key={eleve.matricule}
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEleves.has(eleve.matricule)}
                            onChange={() => toggleSelectEleve(eleve.matricule)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{eleve.nom} {eleve.prenom}</div>
                            <div className="text-sm text-gray-600">
                              {eleve.classe} • Niveau {eleve.niveau} • {eleve.sexe === 'M' ? 'Garçon' : 'Fille'}
                            </div>
                          </div>
                        </div>
                      ))}
                      {elevesDisponibles.length === 0 && searchTerm && (
                        <div className="text-center py-8 text-gray-500">
                          Aucun élève trouvé avec "{searchTerm}"
                        </div>
                      )}
                    </div>

                    {selectedEleves.size > 0 && (
                      <button
                        onClick={addParticipants}
                        className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Ajouter {selectedEleves.size} élève(s)
                      </button>
                    )}
                  </>
                ) : (
                  /* Mode classe/niveau */
                  (addMode === 'classe' || addMode === 'niveau') && (
                    <>
                      {elevesDisponibles.length > 0 && (
                        <div>
                          <p className="mb-4 text-gray-600">
                            {elevesDisponibles.length} élève(s) vont être ajoutés
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                            {elevesDisponibles.slice(0, 20).map((eleve) => (
                              <div key={eleve.matricule} className="p-2 border rounded">
                                <span className="font-medium">{eleve.nom} {eleve.prenom}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  ({eleve.classe} - Niveau {eleve.niveau})
                                </span>
                              </div>
                            ))}
                            {elevesDisponibles.length > 20 && (
                              <p className="text-sm text-gray-500 mt-2">
                                et {elevesDisponibles.length - 20} autre(s)...
                              </p>
                            )}
                          </div>
                          
                          <button
                            onClick={addParticipants}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Ajouter {addMode === 'classe' ? 'cette classe' : 'ce niveau'} ({elevesDisponibles.length} élèves)
                          </button>
                        </div>
                      )}

                      {elevesDisponibles.length === 0 && (selectedClasse || selectedNiveau !== '') && (
                        <div className="text-center py-8 text-gray-500">
                          Aucun élève disponible dans {addMode === 'classe' ? 'cette classe' : 'ce niveau'}
                          <br />
                          <span className="text-sm">(peut-être déjà tous inscrits ?)</span>
                        </div>
                      )}

                      {elevesDisponibles.length === 0 && !selectedClasse && selectedNiveau === '' && (
                        <div className="text-center py-8 text-gray-400">
                          Sélectionnez {addMode === 'classe' ? 'une classe' : 'un niveau'} pour voir les élèves disponibles
                        </div>
                      )}
                    </>
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
