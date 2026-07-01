// components/votes/ResultsViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Vote } from '@/hooks/votes/useVotes';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';

// Définir MENTIONS ici pour l'utiliser dans l'affichage
const MENTIONS = [
  { value: 6, label: 'Très bien', color: 'bg-green-600' },
  { value: 5, label: 'Bien', color: 'bg-green-500' },
  { value: 4, label: 'Assez bien', color: 'bg-green-400' },
  { value: 3, label: 'Passable', color: 'bg-yellow-400' },
  { value: 2, label: 'Insuffisant', color: 'bg-orange-400' },
  { value: 1, label: 'À rejeter', color: 'bg-red-500' }
];

interface ResultsViewerProps {
  vote: Vote;
  user: any;
}

export function ResultsViewer({ vote, user }: ResultsViewerProps) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCumulativeDetails, setShowCumulativeDetails] = useState(false);

    // Dans ResultsViewer, remplace le useEffect par :
    useEffect(() => {

    console.log('📊 ResultsViewer - vote.id:', vote.id);
    console.log('📊 ResultsViewer - vote.type_scrutin:', vote.type_scrutin);
    const fetchResults = async () => {
        if (!user) {
        console.log('❌ Pas d\'utilisateur');
        return;
        }
        
        try {
        console.log('🔍 Fetching ballots pour vote:', vote.id);
        const { data: ballots, error } = await supabase
            .from('vote_ballots')
            .select('choix')
            .eq('vote_id', vote.id);

        if (error) {
            console.error('❌ Erreur Supabase:', error);
            throw error;
        }

        console.log('📊 Ballots reçus:', ballots);

        if (!ballots || ballots.length === 0) {
            console.log('ℹ️ Aucun vote');
            setResults({ totalVotants: 0 });
            setLoading(false);
            return;
        }

        console.log('🧮 Calcul pour type:', vote.type_scrutin);
        
        let calculatedResults;
        switch (vote.type_scrutin) {
            case 'uninominal':
            calculatedResults = calculateUninominal(ballots, vote.options);
            break;
            case 'plurinominal':
            calculatedResults = calculatePlurinominal(ballots, vote.options);
            break;
            case 'jugement':
            calculatedResults = calculateJugement(ballots, vote.options);
            break;
            case 'rang':
            calculatedResults = calculateRang(ballots, vote.options);
            break;
        }
        
            console.log('📊 Ballots reçus dans ResultsViewer:', ballots);
            console.log('📊 Résultats calculés dans ResultsViewer:', calculatedResults);
            setResults(calculatedResults);
        } catch (error) {
        console.error('❌ Erreur complète:', error);
        } finally {
        setLoading(false);
        }
    };

    fetchResults();
    }, [vote.id, vote.type_scrutin, vote.options, user]);
  
  // Fonctions de calcul
  const calculateUninominal = (ballots: any[], options: any[]) => {
    const compteurs: Record<string, number> = {};
    options.forEach(opt => compteurs[opt.id] = 0);
    
    ballots.forEach(ballot => {
      // Correction : utiliser optionId (camelCase), pas option_id
      if (ballot.choix && Array.isArray(ballot.choix) && ballot.choix[0]?.selected) {
        const optionId = ballot.choix[0].optionId;  // ← optionId, pas option_id
        if (optionId && compteurs[optionId] !== undefined) {
          compteurs[optionId]++;
        }
      }
    });
    
    console.log('🔍 Compteurs uninominal:', compteurs);  // Pour debug
    
    return {
      compteurs,
      totalVotants: ballots.length
    };
  };

  const calculatePlurinominal = (ballots: any[], options: any[]) => {
    const compteurs: Record<string, number> = {};
    options.forEach(opt => compteurs[opt.id] = 0);
    
    ballots.forEach(ballot => {
      if (Array.isArray(ballot.choix)) {
        ballot.choix.forEach((choix: any) => {
          if (choix && choix.optionId && choix.selected === true) {
            compteurs[choix.optionId] = (compteurs[choix.optionId] || 0) + 1;
          }
        });
      }
    });

    return {
      compteurs,
      totalVotants: ballots.length
    };
  };

  const calculateJugement = (ballots: any[], options: any[]) => {
    const mentionsParOption: Record<string, number[]> = {};
    options.forEach(opt => mentionsParOption[opt.id] = []);
    
    ballots.forEach(ballot => {
      if (Array.isArray(ballot.choix)) {
        ballot.choix.forEach((choix: any) => {
          if (mentionsParOption[choix.optionId] && typeof choix.valeur === 'number') {
            mentionsParOption[choix.optionId].push(choix.valeur);
          }
        });
      }
    });

    const resultats = options.map(opt => {
      const mentions = (mentionsParOption[opt.id] || []).sort((a, b) => a - b);
      const total = mentions.length;
      
      const medianIndex = Math.floor((total - 1) / 2);
      const mentionMajoritaire = total > 0 ? mentions[medianIndex] : 0;
      
      const repartition = [
        { mention: 'Très bien', count: mentions.filter(v => v === 6).length, percentage: 0 },
        { mention: 'Bien', count: mentions.filter(v => v === 5).length, percentage: 0 },
        { mention: 'Assez bien', count: mentions.filter(v => v === 4).length, percentage: 0 },
        { mention: 'Passable', count: mentions.filter(v => v === 3).length, percentage: 0 },
        { mention: 'Insuffisant', count: mentions.filter(v => v === 2).length, percentage: 0 },
        { mention: 'À rejeter', count: mentions.filter(v => v === 1).length, percentage: 0 }
      ];

      repartition.forEach(r => {
        r.percentage = total > 0 ? (r.count / total) * 100 : 0;
      });

      return {
        optionId: opt.id,
        texte: opt.texte,
        mentionMajoritaire,
        repartition,
        totalVotes: total
      };
    });

    return {
      resultats,
      totalVotants: ballots.length
    };
  };

  const calculateRang = (ballots: any[], options: any[]) => {
    const points: Record<string, number> = {};
    const premiersChoix: Record<string, number> = {};
    options.forEach(opt => {
      points[opt.id] = 0;
      premiersChoix[opt.id] = 0;
    });
    
    ballots.forEach(ballot => {
      if (Array.isArray(ballot.choix)) {
        ballot.choix.forEach((choix: any) => {
          const pointsGagnes = options.length - choix.rang + 1;
          points[choix.optionId] += pointsGagnes;
          
          if (choix.rang === 1) {
            premiersChoix[choix.optionId] = (premiersChoix[choix.optionId] || 0) + 1;
          }
        });
      }
    });

    const resultats = options.map(opt => ({
      optionId: opt.id,
      texte: opt.texte,
      points: points[opt.id],
      premiersChoix: premiersChoix[opt.id] || 0
    }));

    resultats.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      return b.premiersChoix - a.premiersChoix;
    });

    return {
      resultats,
      totalVotants: ballots.length
    };
  };

  if (loading) {
    return <p className="text-gray-500 text-center py-4">Chargement des résultats...</p>;
  }

  if (!results) {
    return <p className="text-gray-500 text-center py-4">Aucun résultat disponible</p>;
  }

  return (
    <div className="space-y-8">
    
      {/* Jugement majoritaire */}
      {vote.type_scrutin === 'jugement' && results.resultats && (
        <div className="space-y-4">
          {results.resultats
            .sort((a: any, b: any) => b.mentionMajoritaire - a.mentionMajoritaire) // 6 d'abord (meilleurs)
            .map((result: any) => {
              const mention = MENTIONS.find(m => m.value === result.mentionMajoritaire);
              
              // Calculer la position de la médiane
              const total = result.totalVotes;
              let cumulative = 0;
              let medianPosition = 0;
              
              for (let i = 0; i < MENTIONS.length; i++) {
                const m = MENTIONS[i];
                const rep = result.repartition?.find((r: any) => r.mention === m.label);
                const count = rep?.count || 0;
                const prevCumulative = cumulative;
                cumulative += count;
                
                if (cumulative > total / 2) {
                  const positionInMention = (total / 2 - prevCumulative) / count;
                  medianPosition = (prevCumulative / total + positionInMention * (count / total)) * 100;
                  break;
                }
              }
              
              // Calcul des cumulés pour les détails
              let cumul = 0;
              const cumulativeData = MENTIONS.map((m) => {
                const rep = result.repartition?.find((r: any) => r.mention === m.label);
                const count = rep?.count || 0;
                cumul += count;
                const percentage = total > 0 ? (cumul / total) * 100 : 0;
                return {
                  mention: m.label,
                  count,
                  cumul,
                  percentage,
                  color: m.color
                };
              });

              return (
                <div key={result.optionId} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold">{result.texte}</h4>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${mention?.color || 'bg-gray-500'}`}>
                      {mention?.label || 'Inconnu'}
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="relative h-8 w-full bg-gray-100 rounded-lg overflow-hidden flex">
                    {MENTIONS.map((m, idx) => {
                      const rep = result.repartition?.find((r: any) => r.mention === m.label);
                      const percentage = rep?.percentage || 0;
                      
                      if (percentage === 0) return null;
                      
                      const gradientColors = [
                        'bg-green-600',    // 6: Très bien
                        'bg-green-400',   // 5: Bien
                        'bg-lime-400',    // 4: Assez bien
                        'bg-yellow-400',  // 3: Passable
                        'bg-orange-400',  // 2: Insuffisant
                        'bg-red-500'     // 1: À rejeter
                      ];
                      
                      return (
                        <div
                          key={idx}
                          className={`h-full ${gradientColors[idx]}`}
                          style={{ width: `${percentage}%` }}
                          title={`${m.label}: ${rep?.count || 0} voix (${Math.round(percentage)}%)`}
                        />
                      );
                    })}
                    
                    {/* Marqueur médiane */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
                      style={{ left: `${medianPosition}%` }}
                    />
                  </div>
                  
                  {/* Légende des mentions */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    {MENTIONS.map((m, idx) => {
                      const rep = result.repartition?.find((r: any) => r.mention === m.label);
                      const count = rep?.count || 0;
                      if (count === 0) return null;
                      return (
                        <div key={idx} className="flex items-center gap-1">
                          <div className={`w-3 h-3 rounded-full ${m.color}`} />
                          <span>{m.label}: {count}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Bouton pour dérouler les cumulées */}
                  <button
                    onClick={() => setShowCumulativeDetails(!showCumulativeDetails)}
                    className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {showCumulativeDetails ? '▲ Masquer les détails cumulés' : '▼ Voir les détails cumulés'}
                  </button>
                  
                  {showCumulativeDetails && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Progression cumulée (du meilleur au pire) :</p>
                      <div className="space-y-1">
                        {cumulativeData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="flex-1">{item.mention}</span>
                            <span className="font-mono">{item.count} voix</span>
                            <span className="font-mono font-bold text-blue-600 w-12 text-right">
                              {Math.round(item.percentage)}%
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Cumul des mentions de « {cumulativeData[0]?.mention} » jusqu'à « {cumulativeData[cumulativeData.length - 1]?.mention} »
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-3">
                    Total: {result.totalVotes} votant{result.totalVotes > 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}
        </div>
      )}
    
      {/* CLASSEMENT */}
      {vote.type_scrutin === 'rang' && results.resultats && (
        <div className="space-y-4">
          {results.resultats
            .sort((a: any, b: any) => b.points - a.points)
            .map((result: any, index: number) => {
              const total = results.totalVotants || 1;
              const pointsParVotant = (result.points / total).toFixed(1);
              
              return (
                <div key={result.optionId} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <h4 className="text-lg font-semibold">{result.texte}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-blue-600">{result.points}</span>
                      <span className="text-sm text-gray-500 ml-1">pts</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div 
                      className="bg-blue-600 h-4 rounded-full"
                      style={{ width: `${(result.points / (results.resultats[0]?.points || 1)) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{result.premiersChoix} premier{result.premiersChoix > 1 ? 's' : ''} choix</span>
                    <span>{pointsParVotant} pts/votant</span>
                  </div>
                </div>
              );
            })}
          <p className="text-sm text-gray-500 mt-2">
            Total: {results.totalVotants} votant{results.totalVotants > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {(vote.type_scrutin === 'uninominal' || vote.type_scrutin === 'plurinominal') && (
        <div className="space-y-4">
          {vote.options
            .map(opt => ({
              ...opt,
              count: results.compteurs?.[opt.id] || 0
            }))
            .sort((a, b) => b.count - a.count)
            .map((opt, index) => {
              const total = results.totalVotants || 1;
              const percentage = total > 0 ? Math.round((opt.count / total) * 100) : 0;
              
              return (
                <div key={opt.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <h4 className="font-semibold">{opt.texte}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-blue-600">{opt.count}</span>
                      <span className="text-sm text-gray-500 ml-1">voix</span>
                      <span className="text-sm text-gray-400 ml-2">({percentage}%)</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-600 h-4 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  {/* Bouton pour dérouler les détails cumulés */}
                  <button
                    onClick={() => setShowCumulativeDetails(!showCumulativeDetails)}
                    className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {showCumulativeDetails ? '▲ Masquer les détails' : '▼ Voir les détails cumulés'}
                  </button>
                  
                  {showCumulativeDetails && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Répartition cumulée :</p>
                      <div className="space-y-1">
                        {(() => {
                          // Calculer les pourcentages cumulés
                          const sortedOptions = vote.options
                            .map(o => ({
                              ...o,
                              count: results.compteurs?.[o.id] || 0
                            }))
                            .sort((a, b) => b.count - a.count);
                          
                          let cumulative = 0;
                          return sortedOptions.map((o, idx) => {
                            cumulative += o.count;
                            const cumulPercent = Math.round((cumulative / total) * 100);
                            const isCurrent = o.id === opt.id;
                            return (
                              <div key={o.id} className={`flex justify-between text-xs ${isCurrent ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                                <span>
                                  {isCurrent ? '▶ ' : ''}
                                  Top {idx + 1} : {o.texte}
                                </span>
                                <span>{cumulPercent}%</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          <p className="text-sm text-gray-500 mt-2">
            Total: {results.totalVotants} votant{results.totalVotants > 1 ? 's' : ''}
          </p>
        </div>
      )}

    </div>
  );
}