// app/tools/sciences/nouvelle-experience/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Colonne {
  nom: string;
  unite: string;
  type: 'number';
}

interface Tableau {
  nom: string;
  colonnes: Colonne[];
}

interface Serie {
  nom: string;
  x_colonne: string;
  y_colonne: string;
}

interface Graphique {
  nom: string;
  type: 'scatter' | 'line' | 'bar' | 'pie';
  tableau_source: number;
  series: Serie[];
}

export default function NouvelleExperiencePage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // États du formulaire
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [classe, setClasse] = useState('');
  const [tableaux, setTableaux] = useState<Tableau[]>([
    { nom: 'Mesures', colonnes: [{ nom: 'Valeur', unite: '', type: 'number' }] }
  ]);
  const [graphiques, setGraphiques] = useState<Graphique[]>([]);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const type = localStorage.getItem('userType');

    if (!id || type !== 'employee') {
      router.push('/tools/sciences');
      return;
    }

    setUserId(id);
    chargerClasses();
  }, [router]);

  const chargerClasses = async () => {
    try {
      const { data: students } = await supabase
        .from('students')
        .select('classe')
        .not('classe', 'is', null);

      if (students) {
        // Utiliser reduce pour créer un tableau de classes uniques
        const classesUniques = students
          .map(s => s.classe)
          .filter((classe, index, self) => self.indexOf(classe) === index)
          .sort();
        
        setClasses(classesUniques);
        if (classesUniques.length > 0) setClasse(classesUniques[0]);
      }
    } catch (error) {
      console.error('Erreur chargement classes:', error);
    }
  };

  const ajouterColonne = (tableauIndex: number) => {
    const nouveauxTableaux = [...tableaux];
    nouveauxTableaux[tableauIndex].colonnes.push({ 
      nom: '', 
      unite: '', 
      type: 'number' 
    });
    setTableaux(nouveauxTableaux);
  };

  const supprimerColonne = (tableauIndex: number, colonneIndex: number) => {
    if (tableaux[tableauIndex].colonnes.length <= 1) return;
    
    const nouveauxTableaux = [...tableaux];
    nouveauxTableaux[tableauIndex].colonnes.splice(colonneIndex, 1);
    setTableaux(nouveauxTableaux);
  };

  const ajouterTableau = () => {
    setTableaux([...tableaux, { 
      nom: `Tableau ${tableaux.length + 1}`, 
      colonnes: [{ nom: 'Valeur', unite: '', type: 'number' }] 
    }]);
  };

  const ajouterGraphique = () => {
    if (tableaux.length === 0) return;

    const nouveauGraphique: Graphique = {
      nom: `Graphique ${graphiques.length + 1}`,
      type: 'scatter',
      tableau_source: 0,
      series: []
    };
    setGraphiques([...graphiques, nouveauGraphique]);
  };

  const ajouterSerie = (graphiqueIndex: number) => {
    const tableau = tableaux[graphiques[graphiqueIndex].tableau_source];
    if (tableau.colonnes.length < 2) return;

    const nouveauxGraphiques = [...graphiques];
    nouveauxGraphiques[graphiqueIndex].series.push({
      nom: `Série ${nouveauxGraphiques[graphiqueIndex].series.length + 1}`,
      x_colonne: tableau.colonnes[0].nom || 'x',
      y_colonne: tableau.colonnes[1].nom || 'y'
    });
    setGraphiques(nouveauxGraphiques);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nom || !classe) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      const config = {
        tableaux,
        graphiques
      };

      const { data, error } = await supabase
        .from('experiences')
        .insert([
          {
            nom,
            description,
            classe,
            created_by: userId,
            config,
            statut: 'active'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      router.push(`/tools/sciences/experiences/${data.id}`);
    } catch (error) {
      console.error('Erreur création expérience:', error);
      alert('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Créer une nouvelle expérience
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informations de base */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informations générales
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'expérience *
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classe *
              </label>
              <select
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Sélectionnez une classe</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Configuration des tableaux */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Tableaux de données
            </h2>
            <button
              type="button"
              onClick={ajouterTableau}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              + Ajouter un tableau
            </button>
          </div>

          {tableaux.map((tableau, tIndex) => (
            <div key={tIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <input
                  type="text"
                  value={tableau.nom}
                  onChange={(e) => {
                    const nouveaux = [...tableaux];
                    nouveaux[tIndex].nom = e.target.value;
                    setTableaux(nouveaux);
                  }}
                  className="text-md font-medium bg-transparent border-b border-gray-300 focus:border-green-500 outline-none"
                  placeholder="Nom du tableau"
                />
                <span className="text-sm text-gray-500">
                  {tableau.colonnes.length} colonne(s)
                </span>
              </div>

              <div className="space-y-2">
                {tableau.colonnes.map((colonne, cIndex) => (
                  <div key={cIndex} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={colonne.nom}
                      onChange={(e) => {
                        const nouveaux = [...tableaux];
                        nouveaux[tIndex].colonnes[cIndex].nom = e.target.value;
                        setTableaux(nouveaux);
                      }}
                      placeholder="Nom"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={colonne.unite}
                      onChange={(e) => {
                        const nouveaux = [...tableaux];
                        nouveaux[tIndex].colonnes[cIndex].unite = e.target.value;
                        setTableaux(nouveaux);
                      }}
                      placeholder="Unité"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => supprimerColonne(tIndex, cIndex)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => ajouterColonne(tIndex)}
                className="mt-3 text-sm text-green-600 hover:text-green-700"
              >
                + Ajouter une colonne
              </button>
            </div>
          ))}
        </div>

        {/* Configuration des graphiques */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Graphiques
            </h2>
            <button
              type="button"
              onClick={ajouterGraphique}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              + Ajouter un graphique
            </button>
          </div>

          {graphiques.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Aucun graphique configuré
            </p>
          ) : (
            graphiques.map((graphique, gIndex) => (
              <div key={gIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Nom du graphique
                    </label>
                    <input
                      type="text"
                      value={graphique.nom}
                      onChange={(e) => {
                        const nouveaux = [...graphiques];
                        nouveaux[gIndex].nom = e.target.value;
                        setGraphiques(nouveaux);
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Type
                    </label>
                    <select
                      value={graphique.type}
                      onChange={(e) => {
                        const nouveaux = [...graphiques];
                        nouveaux[gIndex].type = e.target.value as any;
                        setGraphiques(nouveaux);
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="scatter">Nuage de points</option>
                      <option value="line">Lignes</option>
                      <option value="bar">Barres</option>
                      <option value="pie">Camembert</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-1">
                    Source des données
                  </label>
                  <select
                    value={graphique.tableau_source}
                    onChange={(e) => {
                      const nouveaux = [...graphiques];
                      nouveaux[gIndex].tableau_source = parseInt(e.target.value);
                      nouveaux[gIndex].series = [];
                      setGraphiques(nouveaux);
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {tableaux.map((t, index) => (
                      <option key={index} value={index}>
                        {t.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Séries</h4>
                    <button
                      type="button"
                      onClick={() => ajouterSerie(gIndex)}
                      className="text-xs text-green-600 hover:text-green-700"
                    >
                      + Ajouter une série
                    </button>
                  </div>

                  {graphique.series.map((serie, sIndex) => {
                    const tableau = tableaux[graphique.tableau_source];
                    return (
                      <div key={sIndex} className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          type="text"
                          value={serie.nom}
                          onChange={(e) => {
                            const nouveaux = [...graphiques];
                            nouveaux[gIndex].series[sIndex].nom = e.target.value;
                            setGraphiques(nouveaux);
                          }}
                          placeholder="Nom série"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <select
                          value={serie.x_colonne}
                          onChange={(e) => {
                            const nouveaux = [...graphiques];
                            nouveaux[gIndex].series[sIndex].x_colonne = e.target.value;
                            setGraphiques(nouveaux);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {tableau.colonnes.map((col) => (
                            <option key={col.nom} value={col.nom}>
                              X: {col.nom} ({col.unite})
                            </option>
                          ))}
                        </select>
                        <select
                          value={serie.y_colonne}
                          onChange={(e) => {
                            const nouveaux = [...graphiques];
                            nouveaux[gIndex].series[sIndex].y_colonne = e.target.value;
                            setGraphiques(nouveaux);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {tableau.colonnes.map((col) => (
                            <option key={col.nom} value={col.nom}>
                              Y: {col.nom} ({col.unite})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer l\'expérience'}
          </button>
        </div>
      </form>
    </div>
  );
}