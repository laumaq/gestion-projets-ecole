// app/tools/tfh/coordination/tabs/DashboardTab.tsx
'use client';

import { Eleve, Guide, Externe, TabType } from '../types';
import { DemandeChangementRole } from '../hooks/useCoordinateurData';
import { detecterSessions, Journee, getJourneesFromSupabase } from '../utils/sessionUtils';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { 
  Shield, FileText, UserCheck, Calendar, 
  Users, Settings, BarChart, ChevronRight, BookOpen,
  AlertCircle, CheckCircle, XCircle, Clock, UserMinus, MessageCircle,
  Eye, History, Filter, AlertTriangle, Link as LinkIcon, RefreshCw
} from 'lucide-react';

interface DashboardTabProps {
  eleves: Eleve[];
  guides: Guide[];
  externes: Externe[];
  onTabChange: (tab: TabType) => void;
  userName: string;
  coordinateurNom: string; 
  coordinateurPrenom: string;
  demandesEnAttente: DemandeChangementRole[];
  demandesTraitees: DemandeChangementRole[];
  onApprouverDemande: (demandeId: string, commentaire?: string) => Promise<boolean>;
  onRefuserDemande: (demandeId: string, commentaire?: string) => Promise<boolean>;
  onRefresh: () => void;
}

export default function DashboardTab({ 
  eleves, 
  guides, 
  externes,
  onTabChange,
  userName,
  coordinateurNom,
  coordinateurPrenom,
  demandesEnAttente,
  demandesTraitees,
  onApprouverDemande,
  onRefuserDemande,
  onRefresh
}: DashboardTabProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [journees, setJournees] = useState<Journee[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<DemandeChangementRole | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [actionType, setActionType] = useState<'approuver' | 'refuser' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [conflitRole, setConflitRole] = useState<{ aConflit: boolean; message: string }>({ aConflit: false, message: '' });
  const [historiqueModalOpen, setHistoriqueModalOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<'toutes' | 'approuvee' | 'rejetee'>('toutes');
  const [filterNonPourvus, setFilterNonPourvus] = useState(false);

  // Charger les journées et sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const journees = await getJourneesFromSupabase();
        setJournees(journees);
        const detectedSessions = detecterSessions(journees);
        setSessions(detectedSessions);
      } catch (error) {
        console.error('Erreur chargement sessions:', error);
      }
    };
    
    loadSessions();
  }, []);
  
  // Vérifier si une demande est un changement de rôle
  const estChangementDeRole = (demande: DemandeChangementRole): boolean => {
    return demande.commentaire_demandeur?.startsWith('CHANGEMENT_DE_ROLE_LIE|') || false;
  };

  const verifierRoleDejaPourvu = (demande: DemandeChangementRole): { pourvu: boolean; nom?: string } => {
    if (!estChangementDeRole(demande)) {
      return { pourvu: false };
    }
    
    const nouveauRole = getNouveauRoleFromCommentaire(demande.commentaire_demandeur);
    const eleve = eleves.find(e => e.student_matricule === demande.student_matricule);
    
    if (!eleve || !nouveauRole) {
      return { pourvu: false };
    }
    
    let estPourvu = false;
    let nomPourvu = '';
    
    switch (nouveauRole) {
      case 'lecteur_externe':
        if (eleve.lecteur_externe_id && eleve.lecteur_externe_id !== demande.demandeur_id) {
          estPourvu = true;
          const externe = externes.find(e => e.id === eleve.lecteur_externe_id);
          nomPourvu = externe ? `${externe.prenom} ${externe.nom}` : 'quelqu\'un d\'autre';
        }
        break;
      case 'mediateur':
        if (eleve.mediateur_id && eleve.mediateur_id !== demande.demandeur_id) {
          estPourvu = true;
          const externe = externes.find(e => e.id === eleve.mediateur_id);
          nomPourvu = externe ? `${externe.prenom} ${externe.nom}` : 'quelqu\'un d\'autre';
        }
        break;
      default:
        break;
    }
    
    return { pourvu: estPourvu, nom: nomPourvu };
  };
  
  const getNouveauRoleFromCommentaire = (commentaire: string | null): string | null => {
    if (!commentaire || !commentaire.startsWith('CHANGEMENT_DE_ROLE_LIE|')) return null;
    const parts = commentaire.split('|');
    return parts.length > 1 ? parts[1] : null;
  };
  
  const getAncienRoleFromCommentaire = (commentaire: string | null): string | null => {
    if (!commentaire || !commentaire.startsWith('CHANGEMENT_DE_ROLE_LIE|')) return null;
    const parts = commentaire.split('|');
    return parts.length > 2 ? parts[2] : null;
  };

  const trouverDemandeLiee = (demande: DemandeChangementRole): DemandeChangementRole | undefined => {
    if (!estChangementDeRole(demande)) return undefined;
    
    const toutesDemandes = [...demandesEnAttente, ...demandesTraitees];
    
    return toutesDemandes.find(d => 
      d.id !== demande.id && 
      d.commentaire_demandeur === demande.commentaire_demandeur &&
      d.student_matricule === demande.student_matricule &&
      d.demandeur_id === demande.demandeur_id
    );
  };
  
  const verifierDisponibiliteRole = (demande: DemandeChangementRole): { disponible: boolean; message: string } => {
    if (!estChangementDeRole(demande)) {
      return { disponible: true, message: '' };
    }
    
    const nouveauRole = getNouveauRoleFromCommentaire(demande.commentaire_demandeur);
    const eleve = eleves.find(e => e.student_matricule === demande.student_matricule);
    
    if (!eleve || !nouveauRole) {
      return { disponible: true, message: '' };
    }
    
    let estPris = false;
    let nomPris = '';
    
    switch (nouveauRole) {
      case 'lecteur_externe':
        if (eleve.lecteur_externe_id && eleve.lecteur_externe_id !== demande.demandeur_id) {
          estPris = true;
          const externe = externes.find(e => e.id === eleve.lecteur_externe_id);
          nomPris = externe ? `${externe.prenom} ${externe.nom}` : 'quelqu\'un d\'autre';
        }
        break;
      case 'mediateur':
        if (eleve.mediateur_id && eleve.mediateur_id !== demande.demandeur_id) {
          estPris = true;
          const externe = externes.find(e => e.id === eleve.mediateur_id);
          nomPris = externe ? `${externe.prenom} ${externe.nom}` : 'quelqu\'un d\'autre';
        }
        break;
    }
    
    if (estPris) {
      return { 
        disponible: false, 
        message: `Le rôle ${getRoleLabel(nouveauRole)} a déjà été pris par ${nomPris}. L'utilisateur ne pourra que se désinscrire de son rôle actuel.` 
      };
    }
    
    return { disponible: true, message: '' };
  };
  
  const traiterDemandesLiees = async (demande: DemandeChangementRole, action: 'approuver' | 'refuser', commentaire?: string) => {
    const demandeLiee = trouverDemandeLiee(demande);
    const nouveauRole = getNouveauRoleFromCommentaire(demande.commentaire_demandeur);
    const ancienRole = getAncienRoleFromCommentaire(demande.commentaire_demandeur);
    const eleve = eleves.find(e => e.student_matricule === demande.student_matricule);
    
    if (action === 'approuver') {
      const disponibilite = verifierDisponibiliteRole(demande);
      
      let colonneAncien = '';
      switch (ancienRole) {
        case 'lecteur_externe': colonneAncien = 'lecteur_externe_id'; break;
        case 'mediateur': colonneAncien = 'mediateur_id'; break;
      }
      
      if (colonneAncien && eleve) {
        await supabase
          .from('tfh_eleves')
          .update({ [colonneAncien]: null })
          .eq('student_matricule', demande.student_matricule);
      }
      
      if (disponibilite.disponible && nouveauRole) {
        let colonneNouveau = '';
        switch (nouveauRole) {
          case 'lecteur_externe': colonneNouveau = 'lecteur_externe_id'; break;
          case 'mediateur': colonneNouveau = 'mediateur_id'; break;
        }
        
        if (colonneNouveau) {
          // Pour lecteur_externe et mediateur, on utilise l'ID de l'externe
          const externe = externes.find(e => e.lecteur_externe_id === demande.demandeur_id || e.mediateur_id === demande.demandeur_id);
          if (externe) {
            await supabase
              .from('tfh_eleves')
              .update({ [colonneNouveau]: externe.id })
              .eq('student_matricule', demande.student_matricule);
          }
        }
      }
      
      await onApprouverDemande(demande.id, commentaire || (disponibilite.disponible ? `Changement de rôle effectué : ${ancienRole} → ${nouveauRole}` : `Désinscription uniquement, le poste de ${nouveauRole} a été pris entre temps`));
      if (demandeLiee) {
        await onApprouverDemande(demandeLiee.id, commentaire || (disponibilite.disponible ? `Changement de rôle effectué : ${ancienRole} → ${nouveauRole}` : `Désinscription uniquement, le poste de ${nouveauRole} a été pris entre temps`));
      }
      
    } else {
      await onRefuserDemande(demande.id, commentaire || 'Demande de changement de rôle refusée');
      if (demandeLiee) {
        await onRefuserDemande(demandeLiee.id, commentaire || 'Demande de changement de rôle refusée');
      }
    }
    
    onRefresh();
  };
  
  const openTraitementModal = async (demande: DemandeChangementRole, action: 'approuver' | 'refuser') => {
    setSelectedDemande(demande);
    setActionType(action);
    setCommentaire('');
    
    if (estChangementDeRole(demande) && action === 'approuver') {
      const disponibilite = verifierDisponibiliteRole(demande);
      setConflitRole({ aConflit: !disponibilite.disponible, message: disponibilite.message });
    } else {
      setConflitRole({ aConflit: false, message: '' });
    }
    
    setModalOpen(true);
  };
  
  const handleTraiterDemande = async () => {
    if (!selectedDemande || !actionType) return;
    
    setProcessing(true);
    
    if (estChangementDeRole(selectedDemande)) {
      await traiterDemandesLiees(selectedDemande, actionType, commentaire || undefined);
    } else {
      let success = false;
      if (actionType === 'approuver') {
        success = await onApprouverDemande(selectedDemande.id, commentaire || undefined);
      } else {
        success = await onRefuserDemande(selectedDemande.id, commentaire || undefined);
      }
      if (success) {
        onRefresh();
      }
    }
    
    setProcessing(false);
    setModalOpen(false);
    setSelectedDemande(null);
    setActionType(null);
    setCommentaire('');
    setConflitRole({ aConflit: false, message: '' });
  };
  

  const isPosteNonPourvu = (demande: DemandeChangementRole): boolean => {
    const eleve = eleves.find(e => e.student_matricule === demande.student_matricule);
    if (!eleve) return false;
    
    switch (demande.role_type) {
      case 'lecteur_interne': return !eleve.lecteur_interne_id;
      case 'lecteur_externe': return !eleve.lecteur_externe_id;
      case 'mediateur': return !eleve.mediateur_id;
      default: return false;  // 'guide' n'est pas géré ici
    }
  };
    
  const getRoleLabel = (roleType: string) => {
    switch (roleType) {
      case 'guide': return 'Guide';
      case 'lecteur_interne': return 'Lecteur interne';
      case 'lecteur_externe': return 'Lecteur externe';
      case 'mediateur': return 'Médiateur';
      default: return roleType;
    }
  };
  
  const getRoleColor = (roleType: string) => {
    switch (roleType) {
      case 'guide': return 'bg-blue-100 text-blue-700';
      case 'lecteur_interne': return 'bg-purple-100 text-purple-700';
      case 'lecteur_externe': return 'bg-green-100 text-green-700';
      case 'mediateur': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getDemandesAffichees = (demandes: DemandeChangementRole[]): DemandeChangementRole[] => {
    const demandesLiees = new Set<string>();
    const result: DemandeChangementRole[] = [];
    
    for (const demande of demandes) {
      if (demandesLiees.has(demande.id)) continue;
      
      if (estChangementDeRole(demande)) {
        const liee = trouverDemandeLiee(demande);
        if (liee) {
          demandesLiees.add(liee.id);
          const ancienRole = getAncienRoleFromCommentaire(demande.commentaire_demandeur);
          const nouveauRole = getNouveauRoleFromCommentaire(demande.commentaire_demandeur);
          
          result.push({
            ...demande,
            commentaire_demandeur: `Changement de rôle : ${getRoleLabel(ancienRole || '')} → ${getRoleLabel(nouveauRole || '')}`
          });
          continue;
        }
      }
      result.push(demande);
    }
    
    return result;
  };
  
  const filteredDemandesTraitees = demandesTraitees.filter(demande => {
    if (filterStatut !== 'toutes' && demande.statut !== filterStatut) {
      return false;
    }
    
    if (filterNonPourvus && demande.statut === 'approuvee') {
      return isPosteNonPourvu(demande);
    }
    
    return true;
  });
  
  const countPostesNonPourvus = () => {
    return demandesTraitees.filter(d => 
      d.statut === 'approuvee' && isPosteNonPourvu(d)
    ).length;
  };
  
  const calculateSystemOverview = () => {
    const elevesConnected = eleves.filter(e => e.mot_de_passe && e.mot_de_passe !== '').length;
    const elevesTotal = eleves.length;
    const guidesConnected = guides.filter(g => g.mot_de_passe && g.mot_de_passe !== '').length;
    const guidesTotal = guides.length;
    const defensesProgrammees = eleves.filter(e => e.date_defense).length;
    const avecProblematique = eleves.filter(e => e.problematique && e.problematique.trim() !== '').length;
    const avecThematique = eleves.filter(e => e.thematique && e.thematique.trim() !== '').length;
    
    const getProchainesConvocations = () => {
      const prochaineSession = sessions.find(session => {
        const finSession = new Date(session.date_fin);
        finSession.setHours(23, 59, 59, 999);
        return finSession >= new Date();
      });
      
      if (!prochaineSession) return null;
      
      const sessionIndex = parseInt(prochaineSession.id.split('_')[1]);
      const convocations = eleves.filter(e => {
        const sessionKey = `session_${sessionIndex}_convoque` as keyof Eleve;
        const valeur = e[sessionKey];
        return valeur && typeof valeur === 'string' && valeur.startsWith('Oui');
      });
      
      return {
        session: sessionIndex,
        sessionNom: prochaineSession.nom,
        count: convocations.length,
        totalSessions: sessions.length
      };
    };
    
    const prochainesConvocations = getProchainesConvocations();
    
    return {
      elevesConnected,
      elevesTotal,
      guidesConnected,
      guidesTotal,
      defensesProgrammees,
      avecProblematique,
      avecThematique,
      prochainesConvocations
    };
  };
  
  const stats = calculateSystemOverview();
  
  const tabs = [
    {
      id: 'liste-tfh' as TabType,
      name: 'Liste des TFH',
      icon: <BookOpen className="w-5 h-5" />,
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200 hover:border-violet-300',
      iconBg: 'bg-violet-100 text-violet-600 group-hover:bg-violet-200',
      countColor: 'text-violet-600',
      chevronColor: 'bg-violet-50 text-violet-600',
      showCount: true,
      count: eleves.length,
      description: 'Vue complète des travaux par classe'
    },
    {
      id: 'convocations' as TabType,
      name: 'Convocations',
      icon: <FileText className="w-5 h-5" />,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200 hover:border-purple-300',
      iconBg: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
      countColor: 'text-purple-600',
      chevronColor: 'bg-purple-50 text-purple-600',
      showCount: true,
      count: eleves.length,
      description: 'Gestion des convocations'
    },
    {
      id: 'presences' as TabType,
      name: 'Présences',
      icon: <span className="font-bold">✓</span>,
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200 hover:border-fuchsia-300',
      iconBg: 'bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200',
      countColor: 'text-fuchsia-600',
      chevronColor: 'bg-fuchsia-50 text-fuchsia-600',
      showCount: false,
      description: 'Suivi des présences/absences'
    },
    {
      id: 'defenses' as TabType,
      name: 'Défenses',
      icon: <UserCheck className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200 hover:border-green-300',
      iconBg: 'bg-green-100 text-green-600 group-hover:bg-green-200',
      countColor: 'text-green-600',
      chevronColor: 'bg-green-50 text-green-600',
      showCount: true,
      count: eleves.filter(e => e.date_defense).length,
      description: 'Planification des soutenances'
    },
    {
      id: 'calendrier' as TabType,
      name: 'Calendrier',
      icon: <Calendar className="w-5 h-5" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200 hover:border-orange-300',
      iconBg: 'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
      countColor: 'text-orange-600',
      chevronColor: 'bg-orange-50 text-orange-600',
      showCount: false,
      description: 'Planning & détection de conflits'
    },
    {
      id: 'gestion-utilisateurs' as TabType,
      name: 'Utilisateurs',
      icon: <Users className="w-5 h-5" />,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200',
      countColor: 'text-indigo-600',
      chevronColor: 'bg-indigo-50 text-indigo-600',
      showCount: true,
      count: eleves.length + guides.length,
      description: 'Gestion des comptes utilisateurs'
    },
    {
      id: 'parametres' as TabType,
      name: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200 hover:border-sky-300',
      iconBg: 'bg-sky-100 text-sky-600 group-hover:bg-sky-200',
      countColor: 'text-sky-600',
      chevronColor: 'bg-sky-50 text-sky-600',
      showCount: false,
      description: 'Configuration système'
    },
    {
      id: 'stats' as TabType,
      name: 'Statistiques',
      icon: <BarChart className="w-5 h-5" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
      countColor: 'text-emerald-600',
      chevronColor: 'bg-emerald-50 text-emerald-600',
      showCount: false,
      description: 'Analyses et métriques'
    },
    {
      id: 'controle' as TabType,
      name: 'Contrôle',
      icon: <Shield className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200 hover:border-red-300',
      iconBg: 'bg-red-100 text-red-600 group-hover:bg-red-200',
      countColor: 'text-red-600',
      chevronColor: 'bg-red-50 text-red-600',
      showCount: true,
      count: guides.length,
      description: 'Suivi des performances des guides'
    }
  ];

  const demandesAffichees = getDemandesAffichees(demandesEnAttente);

  return (
    <div className="p-6">

      {/* NOTIFICATIONS - Demandes en attente */}
      {demandesAffichees.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold text-gray-800">
              Demandes en attente ({demandesAffichees.length})
            </h2>
          </div>
          <div className="space-y-3">
            {demandesAffichees.map((demande) => {
              const isChangement = estChangementDeRole(demande);
              const demandeLiee = isChangement ? trouverDemandeLiee(demande) : null;
              const roleDejaPourvu = isChangement ? verifierRoleDejaPourvu(demande) : { pourvu: false };
              
              return (
                <div key={demande.id} className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow ${
                  roleDejaPourvu.pourvu ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-200'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isChangement ? (roleDejaPourvu.pourvu ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700') : getRoleColor(demande.role_type)}`}>
                          {isChangement ? <RefreshCw className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800">
                              {demande.demandeur_prenom} {demande.demandeur_nom}
                            </span>
                            {isChangement ? (
                              roleDejaPourvu.pourvu ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  ⚠️ Rôle déjà pourvu
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                  🔄 Changement de rôle
                                </span>
                              )
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(demande.role_type)}`}>
                                {getRoleLabel(demande.role_type)}
                              </span>
                            )}
                            <span className="text-gray-400 text-sm">•</span>
                            <span className="text-sm text-gray-500">
                              {new Date(demande.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          {isChangement ? (
                            <div>
                              <p className="text-sm text-gray-700 mt-1 font-medium">
                                {demande.commentaire_demandeur}
                              </p>
                              {roleDejaPourvu.pourvu && (
                                <div className="mt-2 p-2 bg-yellow-100 rounded-lg text-sm text-yellow-700 flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span>
                                    Le rôle demandé a déjà été attribué à {roleDejaPourvu.nom}. 
                                    Si vous approuvez cette demande, l'utilisateur sera uniquement désinscrit de son rôle actuel.
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 mt-1">
                              souhaite se désinscrire de la défense de{' '}
                              <span className="font-medium">{demande.eleve_prenom} {demande.eleve_nom}</span>
                              {' '}({demande.eleve_classe})
                            </p>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Défense le {new Date(demande.defense_date).toLocaleDateString('fr-FR')} à {demande.defense_horaire} - {demande.defense_localisation}
                          </div>
                          {demande.commentaire_demandeur && !isChangement && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-600 flex items-start gap-2">
                              <MessageCircle className="w-3 h-3 text-gray-400 mt-0.5" />
                              <span>"{demande.commentaire_demandeur}"</span>
                            </div>
                          )}
                          {demandeLiee && !roleDejaPourvu.pourvu && (
                            <div className="mt-2 p-2 bg-indigo-50 rounded-lg text-sm text-indigo-700 flex items-start gap-2">
                              <LinkIcon className="w-3 h-3 text-indigo-400 mt-0.5" />
                              <span>Demande liée : {getRoleLabel(demandeLiee.role_type)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openTraitementModal(demande, 'refuser')}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Refuser
                      </button>
                      <button
                        onClick={() => openTraitementModal(demande, 'approuver')}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approuver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aperçu du système */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-6 text-lg">Aperçu du système</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-blue-700">
                {stats.elevesConnected}/{stats.elevesTotal}
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-blue-800 mb-1">Élèves connectés</div>
            <div className="text-xs text-blue-600">
              {stats.elevesConnected === stats.elevesTotal ? (
                <span className="text-green-600 font-medium">✓ Tous connectés</span>
              ) : (
                `${Math.round((stats.elevesConnected / stats.elevesTotal) * 100)}% ont accédé au portail`
              )}
            </div>
          </div>
          
          <div className="p-5 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-green-700">
                {stats.guidesConnected}/{stats.guidesTotal}
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-green-800 mb-1">Guides connectés</div>
            <div className="text-xs text-green-600">
              {stats.guidesConnected === stats.guidesTotal ? (
                <span className="text-green-600 font-medium">✓ Tous connectés</span>
              ) : (
                `${Math.round((stats.guidesConnected / stats.guidesTotal) * 100)}% ont accédé au portail`
              )}
            </div>
          </div>
          
          <div className="p-5 bg-purple-50 rounded-xl border border-purple-100">
            <div className="text-center mb-2">
              <div className="text-2xl md:text-3xl font-bold text-purple-700">
                {stats.defensesProgrammees > 0 ? stats.defensesProgrammees : 
                 stats.avecProblematique > 0 ? stats.avecProblematique : 
                 stats.avecThematique}
                <span className="font-normal text-purple-600 mx-1">/</span>
                {stats.defensesProgrammees > 0 ? stats.avecProblematique : 
                 stats.avecProblematique > 0 ? stats.avecThematique : 
                 stats.elevesTotal}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {stats.defensesProgrammees > 0 ? 'défenses / problématiques' : 
                 stats.avecProblematique > 0 ? 'problématiques / thématiques' : 
                 'thématiques / élèves'}
              </div>
            </div>
            <div className="text-sm font-medium text-purple-800 mb-1 text-center">
              {stats.defensesProgrammees > 0 ? 'Défenses programmées' : 
               stats.avecProblematique > 0 ? 'Problématiques définies' : 
               'Thématiques définies'}
            </div>
            <div className="text-xs text-purple-600 text-center">
              {stats.defensesProgrammees > 0 ? (
                `${Math.round((stats.defensesProgrammees / stats.elevesTotal) * 100)}% des élèves`
              ) : stats.avecProblematique > 0 ? (
                `${Math.round((stats.avecProblematique / stats.elevesTotal) * 100)}% ont une problématique`
              ) : (
                `${Math.round((stats.avecThematique / stats.elevesTotal) * 100)}% ont une thématique`
              )}
            </div>
          </div>
          
          <div className="p-5 bg-orange-50 rounded-xl border border-orange-100">
            <div className="text-center mb-2">
              <div className="text-2xl md:text-3xl font-bold text-orange-700">
                {stats.prochainesConvocations ? `${stats.prochainesConvocations.count}` : '0'}
                <span className="font-normal text-orange-600 mx-1">/</span>
                {stats.elevesTotal}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                convoqués / élèves total
              </div>
            </div>
            <div className="text-sm font-medium text-orange-800 mb-1 text-center">
              {stats.prochainesConvocations ? 
                `${stats.prochainesConvocations.sessionNom}` : 
                'Aucune convocation à venir'}
            </div>
            <div className="text-xs text-orange-600 text-center">
              {stats.prochainesConvocations ? (
                `${Math.round((stats.prochainesConvocations.count / stats.elevesTotal) * 100)}% des élèves`
              ) : (
                'Toutes les sessions sont terminées'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demandes traitées récemment */}
      {demandesTraitees.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-800">
                Demandes traitées récemment
              </h2>
              {countPostesNonPourvus() > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {countPostesNonPourvus()} poste(s) non pourvu(s)
                </span>
              )}
            </div>
            <button
              onClick={() => setHistoriqueModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Voir tout l'historique ({demandesTraitees.length})
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Demandeur</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Rôle</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Élève</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Décision</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Statut poste</th>
                </tr>
              </thead>
              <tbody>
                {demandesTraitees.slice(0, 5).map((demande) => {
                  const posteNonPourvu = demande.statut === 'approuvee' && isPosteNonPourvu(demande);
                  const isChangement = estChangementDeRole(demande);
                  
                  return (
                    <tr key={demande.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(demande.traitee_le!).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{demande.demandeur_prenom} {demande.demandeur_nom}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isChangement ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            🔄 Changement
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(demande.role_type)}`}>
                            {getRoleLabel(demande.role_type)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {demande.eleve_prenom} {demande.eleve_nom} ({demande.eleve_classe})
                      </td>
                      <td className="px-4 py-3">
                        {demande.statut === 'approuvee' ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Approuvée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            Rejetée
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {posteNonPourvu ? (
                          <span className="inline-flex items-center gap-1 text-yellow-600">
                            <AlertTriangle className="w-4 h-4" />
                            Poste vacant
                          </span>
                        ) : demande.statut === 'approuvee' ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Pourvu
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {demandesTraitees.length > 5 && (
              <div className="p-3 text-center border-t">
                <button
                  onClick={() => setHistoriqueModalOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + {demandesTraitees.length - 5} autres demandes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cartes de navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              bg-white rounded-xl shadow-sm border p-6 cursor-pointer
              transition-all hover:shadow-md hover:-translate-y-1
              ${tab.borderColor}
              group
            `}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-lg ${tab.iconBg}`}>
                {tab.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{tab.name}</h3>
                <p className="text-sm text-gray-500">{tab.description}</p>
              </div>
              {tab.showCount && tab.count !== undefined && (
                <div className={`text-lg font-bold ${tab.countColor}`}>
                  {tab.count}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accéder à la section</span>
                <div className={`p-1 rounded-full ${tab.chevronColor}`}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal d'historique complet */}
      {historiqueModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historique complet des demandes traitées
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredDemandesTraitees.length} demande(s) sur {demandesTraitees.length}
                </p>
              </div>
              <button 
                onClick={() => setHistoriqueModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                ✕
              </button>
            </div>
            
            <div className="px-6 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtres:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatut('toutes')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterStatut === 'toutes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilterStatut('approuvee')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterStatut === 'approuvee'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Approuvées
                </button>
                <button
                  onClick={() => setFilterStatut('rejetee')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterStatut === 'rejetee'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rejetées
                </button>
              </div>
              <label className="flex items-center gap-2 ml-auto">
                <input
                  type="checkbox"
                  checked={filterNonPourvus}
                  onChange={(e) => setFilterNonPourvus(e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Uniquement les postes non pourvus
                </span>
              </label>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {filteredDemandesTraitees.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Aucune demande ne correspond aux critères sélectionnés.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDemandesTraitees.map((demande) => {
                    const posteNonPourvu = demande.statut === 'approuvee' && isPosteNonPourvu(demande);
                    const isChangement = estChangementDeRole(demande);
                    
                    return (
                      <div 
                        key={demande.id} 
                        className={`bg-white rounded-lg border p-4 transition-shadow hover:shadow-md ${
                          posteNonPourvu ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-gray-800">
                                {demande.demandeur_prenom} {demande.demandeur_nom}
                              </span>
                              {isChangement ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                  🔄 Changement
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(demande.role_type)}`}>
                                  {getRoleLabel(demande.role_type)}
                                </span>
                              )}
                              {demande.statut === 'approuvee' ? (
                                <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                  <CheckCircle className="w-3 h-3" />
                                  Approuvée
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                                  <XCircle className="w-3 h-3" />
                                  Rejetée
                                </span>
                              )}
                              {posteNonPourvu && (
                                <span className="inline-flex items-center gap-1 text-yellow-600 text-xs">
                                  <AlertTriangle className="w-3 h-3" />
                                  Poste non pourvu
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Élève:</span> {demande.eleve_prenom} {demande.eleve_nom} ({demande.eleve_classe})
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Défense:</span> {new Date(demande.defense_date).toLocaleDateString('fr-FR')} à {demande.defense_horaire} - {demande.defense_localisation}
                            </p>
                            <div className="text-xs text-gray-400 mt-1">
                              Demandé le {new Date(demande.created_at).toLocaleString('fr-FR')}
                              {demande.traitee_le && ` • Traité le ${new Date(demande.traitee_le).toLocaleString('fr-FR')}`}
                            </div>
                            {demande.commentaire_demandeur && !isChangement && (
                              <div className="mt-2 p-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                                <span className="font-medium">Commentaire du demandeur:</span> "{demande.commentaire_demandeur}"
                              </div>
                            )}
                            {demande.commentaire_coordinateur && (
                              <div className="mt-1 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                                <span className="font-medium">Décision de coordination:</span> "{demande.commentaire_coordinateur}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {filteredDemandesTraitees.length} demande(s) affichée(s)
                </span>
                <button
                  onClick={() => setHistoriqueModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de traitement */}
      {modalOpen && selectedDemande && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {actionType === 'approuver' ? 'Approuver la demande' : 'Refuser la demande'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDemande.demandeur_prenom} {selectedDemande.demandeur_nom}
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Élève concerné :</span> {selectedDemande.eleve_prenom} {selectedDemande.eleve_nom} ({selectedDemande.eleve_classe})
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Défense :</span> {new Date(selectedDemande.defense_date).toLocaleDateString('fr-FR')} à {selectedDemande.defense_horaire} - {selectedDemande.defense_localisation}
                </p>
                {estChangementDeRole(selectedDemande) && (
                  <>
                    <div className="mt-3 p-2 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-indigo-800 font-medium">
                        {selectedDemande.commentaire_demandeur}
                      </p>
                    </div>
                    {conflitRole.aConflit && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{conflitRole.message}</span>
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-red-500 mt-2">
                      ⚠️ L'utilisateur sera désinscrit de son rôle actuel. Le nouveau rôle ne sera assigné que s'il est toujours disponible.
                    </p>
                  </>
                )}
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Commentaire (optionnel) :</label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full h-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={actionType === 'approuver' ? "Justification de l'approbation..." : "Motif du refus..."}
                autoFocus
              />
              {actionType === 'approuver' && !estChangementDeRole(selectedDemande) && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ L'utilisateur sera immédiatement désinscrit et le créneau deviendra disponible.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  disabled={processing}
                >
                  Annuler
                </button>
                <button
                  onClick={handleTraiterDemande}
                  disabled={processing}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    actionType === 'approuver'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processing ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Traitement...</>
                  ) : (
                    actionType === 'approuver' ? 'Approuver la demande' : 'Refuser la demande'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}