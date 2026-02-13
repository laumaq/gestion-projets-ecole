'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  voyageId: string;
}

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  niveau: number; // Changé en number car c'est un int8
  sexe: string;
}

interface Participant {
  id: string;
  eleve_id: number;
  statut: string;
  genre: string;
  classe: string;
  eleve: Eleve;
}

export default function ParticipantsList({ voyageId }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState<number | ''>(''); // Changé en number
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'individuel' | 'classe' | 'niveau'>('individuel');
  const [selectedEleves, setSelectedEleves] = useState<Set<number>>(new Set());
  const [debug, setDebug] = useState<string>('');

  useEffect(() => {
    loadParticipants();
  }, [voyageId]);

  const loadParticipants = async () => {
    console.log('Chargement des participants pour voyage:', voyageId);
    const { data, error } = await supabase
      .from('voyage_participants')
      .select(`
        *,
        eleve:students!inner(matricule, nom, prenom, classe, niveau, sexe)
      `)
      .eq('voyage_id', voyageId);

    if (error) {
      console.error('Erreur chargement participants:', error);
      setDebug('Erreur: ' + error.message);
    } else {
      console.log('Participants chargés:', data?.length);
      setParticipants(data || []);
    }
    setLoading(false);
  };

  const loadElevesDisponibles = async () => {
    console.log('Chargement des élèves disponibles...');
    setDebug('Chargement...');
    
    // Récupérer les IDs des élèves déjà participants
    const participantIds = participants.map(p => p.eleve_id);
    console.log('IDs déjà participants:', participantIds);
    
    let query = supabase
      .from('students')
      .select('*')
      .order('classe')
      .order('nom');

    // Exclure les déjà participants
    if (participantIds.length > 0) {
      query = query.not('matricule', 'in', `(${participantIds.join(',')})`);
    }

    // Filtre par niveau (attention: niveau est un nombre)
    if (selectedNiveau !== '') {
      console.log('Filtre par niveau:', selectedNiveau);
      query = query.eq('niveau', selectedNiveau);
    }
    // Filtre par classe (si pas de niveau sélectionné)
    else if (selectedClasse) {
      console.log('Filtre par classe:', selectedClasse);
      query = query.eq('classe', selectedClasse);
    }

    // Recherche textuelle
    if (searchTerm) {
      console.log('Recherche:', searchTerm);
      query = query.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`);
    }

    // Limite pour éviter de surcharger
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error('Erreur chargement élèves:', error);
      setDebug('Erreur: ' + error.message);
    } else {
      console.log('Élèves trouvés:', data?.length);
      setDebug(`${data?.length || 0} élèves trouvés`);
      setElevesDisponibles(data || []);
    }
  };

  // Fonction pour compter les élèves par classe/niveau avant ajout
  const countElevesParClasse = async () => {
    if (addMode === 'classe' && selectedClasse) {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('classe', selectedClasse)
        .not('matricule', 'in', `(${participants.map(p => p.eleve_id).join(',')})`);
      
      if (!error) {
        setDebug(`${count} élèves disponibles dans la classe ${selectedClasse}`);
      }
    } else if (addMode === 'niveau' && selectedNiveau !== '') {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('niveau', selectedNiveau)
        .not('matricule', 'in', `(${participants.map(p => p.eleve_id).join(',')})`);
      
      if (!error) {
        setDebug(`${count} élèves disponibles en niveau ${selectedNiveau}`);
      }
    }
  };

  const addParticipants = async () => {
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

    console.log('Ajout de', elevesAAjouter.length, 'élèves');
    setDebug(`Ajout de ${elevesAAjouter.length} élèves...`);

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

    if (error) {
      console.error('Erreur ajout:', error);
      alert('Erreur: ' + error.message);
    } else {
      loadParticipants();
      setShowAddModal(false);
      setSelectedEleves(new Set());
      setDebug('');
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (confirm('Retirer cet élève du voyage ?')) {
      const { error } = await supabase
        .from('voyage_participants')
        .delete()
        .eq('id', participantId);

      if (!error) loadParticipants();
    }
  };

  const removeMultipleParticipants = async () => {
    const classes = Array.from(new Set(participants.map(p => p.classe))).sort();
    const classeToRemove = prompt(`Entrez la classe à retirer (ex: 3PAS):\nClasses disponibles: ${classes.join(', ')}`);
    
    if (classeToRemove) {
      const participantsToRemove = participants.filter(p => p.classe === classeToRemove);
      if (participantsToRemove.length === 0) {
        alert('Aucun participant trouvé dans cette classe');
        return;
      }

      if (confirm(`Retirer les ${participantsToRemove.length} élèves de la classe ${classeToRemove} ?`)) {
        const { error } = await supabase
          .from('voyage_participants')
          .delete()
          .in('id', participantsToRemove.map(p => p.id));

        if (!error) loadParticipants();
      }
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
    const classes = Array.from(new Set(participants.map(p => p.classe))).sort();
    const classeToUpdate = prompt(`Entrez la classe à mettre à jour (statut: ${statut})\nClasses disponibles: ${classes.join(', ')}`);
    
    if (classeToUpdate) {
      const participantsToUpdate = participants.filter(p => p.classe === classeToUpdate);
      if (participantsToUpdate.length === 0) {
        alert('Aucun participant trouvé dans cette classe');
        return;
      }

      if (confirm(`Mettre à jour les ${participantsToUpdate.length} élèves de la classe ${classeToUpdate} ?`)) {
        const { error } = await supabase
          .from('voyage_participants')
          .update({ statut })
          .in('id', participantsToUpdate.map(p => p.id));

        if (!error) loadParticipants();
      }
    }
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

  const toggleSelectAll = () => {
    if (selectedEleves.size === elevesDisponibles.length) {
      setSelectedEleves(new Set());
    } else {
      setSelectedEleves(new Set(elevesDisponibles.map(e => e.matricule)));
    }
  };

  const classes = Array.from(new Set(participants.map(p => p.classe))).sort();
  // Niveaux comme nombres (1 à 6)
  const niveaux = [1, 2, 3, 4, 5, 6];

  if (loading) return <div className="text-center py-8">Chargement des participants...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <p className="text-gray-600 mt-1">
            {participants.length} élève{participants.length > 1 ? 's' : ''} inscrit{participants.length > 1 ? 's' : ''}
          </p>
          {debug && <p className="text-sm text-gray-500 mt-1">Debug: {debug}</p>}
        </div>
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
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedClasse('');
              setSelectedNiveau('');
              setElevesDisponibles([]);
              setSelectedEleves(new Set());
              setAddMode('individuel');
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            + Ajouter des élèves
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-4">
        <select
          value={selectedClasse}
          onChange={(e) => setSelectedClasse(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Toutes les classes</option>
          {classes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Liste des participants */}
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700 border-b">
          <div className="col-span-4">Élève</div>
          <div className="col-span-2">Classe</div>
          <div className="col-span-2">Genre</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-2">Actions</div>
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
                  participant.genre === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                }`}>
                  {participant.genre === 'M' ? 'Garçon' : 'Fille'}
                </span>
              </div>
              <div className="col-span-2">
                <select
                  value={participant.statut}
                  onChange={(e) => updateStatut(participant.id, e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="confirme">✅ Confirmé</option>
                  <option value="liste_attente">⏳ Liste d'attente</option>
                  <option value="annule">❌ Annulé</option>
                </select>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => removeParticipant(participant.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Retirer
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Ajouter des élèves</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              
              {/* Mode d'ajout */}
              <div className="mt-4 flex gap-4 border-b pb-4">
                <button
                  onClick={() => setAddMode('individuel')}
                  className={`px-4 py-2 rounded-lg ${
                    addMode === 'individuel' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ajout individuel
                </button>
                <button
                  onClick={() => setAddMode('classe')}
                  className={`px-4 py-2 rounded-lg ${
                    addMode === 'classe' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ajouter une classe
                </button>
                <button
                  onClick={() => setAddMode('niveau')}
                  className={`px-4 py-2 rounded-lg ${
                    addMode === 'niveau' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ajouter un niveau
                </button>
              </div>
              
              {/* Recherche et filtres */}
              <div className="mt-4 flex gap-4">
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                
                {addMode === 'classe' && (
                  <select
                    value={selectedClasse}
                    onChange={(e) => {
                      setSelectedClasse(e.target.value);
                      setSelectedNiveau('');
                    }}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="">Choisir une classe</option>
                    {['1PAA','1PAB','1PAC','1PAD','1PAE','1PAF','2PAA','2PAB','2PAC','2PAD','2PAE','2PAF','2PAG','3PAS','3PAT','3PAU','3PAV','3PAW','3PAX','3PAY','3PAZ','4PAS','4PAT','4PAU','4PAV','4PAW','4PAX','4PAY','4PAZ','5PAS','5PAT','5PAU','5PAV','5PAW','5PAX','5PAY','5PAZ','6PAU','6PAV','6PAW','6PAX','6PAY','6PAZ'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}

                {addMode === 'niveau' && (
                  <select
                    value={selectedNiveau}
                    onChange={(e) => {
                      setSelectedNiveau(e.target.value ? Number(e.target.value) : '');
                      setSelectedClasse('');
                    }}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="">Choisir un niveau</option>
                    {niveaux.map(n => (
                      <option key={n} value={n}>Niveau {n}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => {
                    loadElevesDisponibles();
                    countElevesParClasse();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Rechercher
                </button>

                {addMode === 'individuel' && elevesDisponibles.length > 0 && (
                  <button
                    onClick={addParticipants}
                    disabled={selectedEleves.size === 0}
                    className={`px-4 py-2 rounded-lg ${
                      selectedEleves.size > 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Ajouter ({selectedEleves.size})
                  </button>
                )}

                {addMode === 'classe' && selectedClasse && (
                  <button
                    onClick={addParticipants}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Ajouter la classe
                  </button>
                )}
                
                {addMode === 'niveau' && selectedNiveau !== '' && (
                  <button
                    onClick={addParticipants}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Ajouter le niveau {selectedNiveau}
                  </button>
                )}
              </div>
            </div>

            {/* Résultats */}
            <div className="flex-1 overflow-y-auto p-6">
              {addMode === 'individuel' && (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedEleves.size === elevesDisponibles.length && elevesDisponibles.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">
                      {selectedEleves.size === 0 
                        ? 'Sélectionner tous les élèves'
                        : `${selectedEleves.size} élève(s) sélectionné(s)`}
                    </span>
                  </div>
                  
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
                        Aucun élève trouvé
                      </div>
                    )}
                  </div>
                </>
              )}

              {(addMode === 'classe' || addMode === 'niveau') && elevesDisponibles.length > 0 && (
                <div>
                  <p className="mb-4 text-gray-600">
                    {elevesDisponibles.length} élève(s) vont être ajoutés
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {elevesDisponibles.map((eleve) => (
                      <div key={eleve.matricule} className="p-2 border rounded">
                        <span className="font-medium">{eleve.nom} {eleve.prenom}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({eleve.classe} - Niveau {eleve.niveau})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {elevesDisponibles.length === 0 && (selectedClasse || selectedNiveau !== '') && (
                <div className="text-center py-8 text-gray-500">
                  Aucun élève disponible dans {addMode === 'classe' ? 'cette classe' : 'ce niveau'}
                  <br />
                  <span className="text-sm">(peut-être déjà tous inscrits ?)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
