#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IMPORT RENTRÉE - SCRIPT UNIQUE SUPABASE
----------------------------------------
Parse EXP_ELEVE.txt et EXP_COURS.txt et importe directement dans Supabase.
"""

import csv
import re
import json
import uuid
from io import StringIO
from typing import Dict, List, Tuple, Optional, Set
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from pathlib import Path

# ============================================================================
# PARAMÈTRES MODIFIABLES
# ============================================================================

ANNEE_SCOLAIRE = 2026
PREFIXE_MATRICULE = str(ANNEE_SCOLAIRE)[-2:]

# MODE TEST : limite à 100 élèves et 100 cours (False pour tout importer)
MODE_TEST = True
LIMITE_ELEVES = 100
LIMITE_COURS = 100

# ============================================================================
# CONFIGURATION SUPABASE
# ============================================================================

env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"✅ .env chargé depuis {env_path}")
else:
    print(f"❌ .env introuvable dans {env_path}")
    exit(1)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or SUPABASE_KEY

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erreur: SUPABASE_URL et SUPABASE_KEY doivent être définis dans .env")
    exit(1)

supabase_anon = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_service = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

FICHIER_ELEVES = "EXP_ELEVE.txt"
FICHIER_COURS = "EXP_COURS.txt"

# ============================================================================
# DICTIONNAIRES DE CONVERSION
# ============================================================================

INDICES_ELEVES = {
    'NUMERO': 0,
    'NOM': 2,
    'PRENOM': 3,
    'PRENOM_USAGE': 4,
    'SEXE': 9,
    'CLASSE': 27,
    'GROUPES': 28,
    'OPT_LIB_1': 46,
    'OPT_LIB_2': 48,
    'OPT_LIB_3': 50,
    'OPT_LIB_4': 52,
    'OPT_LIB_5': 54
}

CONVERSION = {
    'G': 'Garçon',
    'F': 'Fille',
    'M': 'Morale',
    'Ma': 'Morale',
    'RC': 'Religion Catholique',
    'RCa': 'Religion Catholique',
    'RI': 'Religion Islamique',
    'RIa': 'Religion Islamique',
    'RP': 'Religion Protestante',
    'RPa': 'Religion Protestante',
    'CPC': 'CPC',
    'CPCa': 'CPC',
    'REL CAT': 'Religion Catholique',
    'REL ISL': 'Religion Islamique',
    'REL PROT': 'Religion Protestante',
    'rel cat': 'Religion Catholique',
    'rel isl': 'Religion Islamique',
    'rel prot': 'Religion Protestante',
    'O': 'Religion Orthodoxe',
    'Morale': 'Morale',
    'A': 'Anglais',
    'I': 'Italien',
    'E': 'Espagnol',
    'N': 'Néerlandais',
    'D': 'Allemand',
    'AI': 'Anglais Immersion',
    'DI': 'Allemand Immersion',
    'NI': 'Néerlandais Immersion',
    'EC': 'Sciences Économiques',
    'EC4': 'Sciences Économiques',
    'EC6': 'Sciences Économiques',
    'SO': 'Sciences Sociales',
    'SO4': 'Sciences Sociales',
    'MH': 'Histoire',
    'MH4': 'Histoire',
    'MH6': 'Histoire',
    'MS': 'Sciences',
    'MB': 'Sciences',
    'MB4': 'Sciences',
    'ML': 'Langues',
    'ML4': 'Langues',
    'LA6': 'Latin',
    'LB4': 'Latin',
    'LG4': 'Latin',
    'LH4': 'Latin',
    'ME4': 'Communication',
}

OPTION_DECOMPOSITIONS = {
    'L': [('Option', 'Latin')],
    'LW': [('Option', 'Latin')],
    'LS': [('Option', 'Latin'), ('Option', 'Sciences')],
    'LSW': [('Option', 'Latin'), ('Option', 'Sciences')],
    'LA': [('Option', 'Latin'), ('Option', 'Sciences')],
    'LA6': [('Option', 'Latin'), ('Option', 'Math'), ('Option', 'Sciences')],
    'LA6W': [('Option', 'Latin'), ('Option', 'Math'), ('Option', 'Sciences')],
    'LB4': [('Option', 'Latin'), ('Option', 'Sciences')],
    'LB4W': [('Option', 'Latin'), ('Option', 'Sciences')],
    'LC6': [('Option', 'Latin'), ('Option', 'Math')],
    'LC6W': [('Option', 'Latin'), ('Option', 'Math')],
    'LG4': [('Option', 'Latin'), ('Option', 'Grec')],
    'LG4W': [('Option', 'Latin'), ('Option', 'Grec')],
    'LH4': [('Option', 'Latin'), ('Option', 'Histoire')],
    'LH4W': [('Option', 'Latin'), ('Option', 'Histoire')],
    'LH6': [('Option', 'Latin'), ('Option', 'Histoire'), ('Option', 'Math')],
    'LH6W': [('Option', 'Latin'), ('Option', 'Histoire'), ('Option', 'Math')],
    'LL4': [('Option', 'Latin'), ('Option', 'Langues')],
    'LL4W': [('Option', 'Latin'), ('Option', 'Langues')],
    'MC6': [('Option', 'Math')],
    'MC6W': [('Option', 'Math')],
    'MA6': [('Option', 'Math'), ('Option', 'Sciences')],
    'MA6W': [('Option', 'Math'), ('Option', 'Sciences')],
    'MS': [('Option', 'Sciences')],
    'MSW': [('Option', 'Sciences')],
    'MB4': [('Option', 'Sciences')],
    'MB4W': [('Option', 'Sciences')],
    'EC': [('Option', 'Sciences Économiques')],
    'ECW': [('Option', 'Sciences Économiques')],
    'EC4': [('Option', 'Sciences Économiques')],
    'EC4W': [('Option', 'Sciences Économiques')],
    'EC6': [('Option', 'Sciences Économiques'), ('Option', 'Math')],
    'EC6W': [('Option', 'Sciences Économiques'), ('Option', 'Math')],
    'SO': [('Option', 'Sciences Sociales')],
    'SOW': [('Option', 'Sciences Sociales')],
    'SO4': [('Option', 'Sciences Sociales')],
    'SO4W': [('Option', 'Sciences Sociales')],
    'MH': [('Option', 'Histoire')],
    'MH4': [('Option', 'Histoire')],
    'MH4W': [('Option', 'Histoire')],
    'MH6': [('Option', 'Histoire'), ('Option', 'Math')],
    'MH6W': [('Option', 'Histoire'), ('Option', 'Math')],
    'ML': [('Option', 'Langues')],
    'ML4': [('Option', 'Langues')],
    'ML4W': [('Option', 'Langues')],
    'ML6': [('Option', 'Langues'), ('Option', 'Math')],
    'ML6W': [('Option', 'Langues'), ('Option', 'Math')],
    'ME4': [('Option', 'Communication')],
    'ME4W': [('Option', 'Communication')],
}

CODES_SANS_OPTION = {'M', 'MW', 'MAI', 'MNI', 'MDI', 'MNDI'}

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

def normaliser_valeur(valeur: str) -> str:
    if not valeur:
        return ""
    val = valeur.strip().lower().strip('"\'')
    normalisations = {
        'rel cat': 'rel cat',
        'rel isl': 'rel isl',
        'rel prot': 'rel prot',
        'o': 'o',
    }
    return normalisations.get(val, val.upper())

def traiter_option_principale(matricule: str, code_option: str) -> List[Tuple[str, str]]:
    resultats = []
    if not code_option:
        return resultats
    code_clean = code_option.strip().upper().strip('"\'')
    if code_clean in CODES_SANS_OPTION:
        return resultats
    if code_clean not in OPTION_DECOMPOSITIONS:
        print(f"   ⚠️  Code d'option non reconnu: '{code_clean}' (matricule {matricule})")
        resultats.append(('Option', f"CODE NON RECONNU: {code_clean}"))
        return resultats
    decompositions = OPTION_DECOMPOSITIONS[code_clean]
    for type_opt, valeur_opt in decompositions:
        resultats.append((type_opt, valeur_opt))
    return resultats

def extraire_classe_et_niveau(chaine_classe: str) -> Tuple[str, int]:
    if not chaine_classe:
        return "", 0
    match = re.search(r'^(\d{1,2}PA[A-Z])', chaine_classe)
    if match:
        classe = match.group(1)
        niveau = int(classe[0]) if classe and classe[0].isdigit() else 0
        return classe, niveau
    return "", 0

def calculer_heure_fin(heure_debut: str, duree_str: str) -> Optional[str]:
    """Calcule l'heure de fin avec séparateur 'h'."""
    if not heure_debut or not duree_str:
        return None
    
    try:
        duree_heures = int(duree_str.replace('h00', ''))
        duree_minutes = duree_heures * 50
        heure, minute = int(heure_debut[:2]), int(heure_debut[3:])
        total_minutes = heure * 60 + minute + duree_minutes
        heure_fin = total_minutes // 60
        minute_fin = total_minutes % 60
        return f"{heure_fin:02d}h{minute_fin:02d}"
    except:
        return None

def determiner_type_pattern(pattern: str) -> str:
    if not pattern:
        return "simple"
    if '[' in pattern and ']' in pattern:
        return "complexe"
    return "simple"

def parser_conditions_complexes(pattern: str, cours_id: int, next_id: int) -> Tuple[List[Dict], int]:
    """
    Parse les conditions complexes d'un pattern
    Retourne une liste de dict avec: id, cours_id, groupe_pedagogique, classe, tag_option, valeur_option
    """
    conditions = []
    current_id = next_id
    
    if not pattern or '[' not in pattern:
        return conditions, current_id
    
    # Séparer les parties par '+'
    parts = re.split(r'\+', pattern)
    
    for part in parts:
        part = part.strip()
        if not part or '[' not in part:
            continue
        
        # Extraire le groupe pédagogique
        match_groupe = re.search(r'\[([^\]]+)\]', part)
        if not match_groupe:
            continue
        groupe_pedagogique = match_groupe.group(1).strip()
        
        # Extraire la classe
        match_classe = re.search(r'<([^>]+)>', part)
        if not match_classe:
            continue
        classe = match_classe.group(1).strip()
        
        # Extraire le reste (les valeurs)
        rest = re.sub(r'\[[^\]]+\]', '', part)
        rest = re.sub(r'<[^>]+>', '', rest)
        rest = rest.strip()
        
        if not rest:
            continue
        
        # Chercher un tag entre < >
        tag_match = re.search(r'<([^>]+)>', rest)
        if tag_match:
            tag_option = tag_match.group(1).strip()
            valeurs_str = re.sub(r'<[^>]+>', '', rest).strip()
        else:
            tag_option = ''
            valeurs_str = rest
        
        # Si pas de tag mais on a "Option" dans le texte
        if not tag_option and 'Option' in rest:
            option_match = re.search(r'Option\s+([A-Za-z0-9\-]+)', rest)
            if option_match:
                tag_option = 'Option'
                valeurs_str = option_match.group(1).strip()
            else:
                valeurs_str = rest
        
        if not valeurs_str:
            continue
        
        valeurs_str = valeurs_str.strip()
        
        # Si la valeur contient un '+', c'est un tag composé
        if '+' in valeurs_str and 'Option' in valeurs_str:
            if not tag_option:
                tag_option = valeurs_str
                continue
        
        # Extraire toutes les valeurs
        if '-' in valeurs_str:
            valeurs_list = [v.strip() for v in valeurs_str.split('-') if v.strip()]
        else:
            valeurs_list = [v.strip() for v in valeurs_str.split() if v.strip()]
        
        for valeur in valeurs_list:
            valeur = re.sub(r'[<>+()]', '', valeur).strip()
            
            if valeur and valeur not in ['Option', 'LM1', 'LM2', 'LM3', 'EP', 'Philo']:
                # CONVERTIR la valeur via le dictionnaire CONVERSION
                valeur_convertie = CONVERSION.get(valeur, valeur)
                
                conditions.append({
                    'id': current_id,
                    'cours_id': cours_id,
                    'groupe_pedagogique': groupe_pedagogique,
                    'classe': classe,
                    'tag_option': tag_option,
                    'valeur_option': valeur_convertie
                })
                current_id += 1
    
    return conditions, current_id

def get_or_create_professeur(nom: str, prenom: str) -> Optional[str]:
    if not nom or not prenom:
        return None
    
    nom = nom.strip()
    prenom = prenom.strip()
    
    result = supabase_anon.table('employees').select('id, nom, prenom').execute()
    
    for emp in result.data:
        emp_nom = emp.get('nom', '').strip().lower()
        emp_prenom = emp.get('prenom', '').strip().lower()
        if emp_nom == nom.lower() and emp_prenom == prenom.lower():
            return emp['id']
    
    new_id = str(uuid.uuid4())
    initiale = prenom[0].upper() if prenom else ''
    
    new_prof = {
        'id': new_id,
        'nom': nom,
        'prenom': prenom,
        'initiale': initiale,
        'job': 'prof',
        'mot_de_passe': None,
        'eleve_voir_telephone': False,
        'tfh_accepte_numerique': False,
        'regime_alimentaire': json.dumps({"regime": "Végétarien", "notes": ""})
    }
    
    try:
        result = supabase_service.table('employees').insert(new_prof).execute()
        if result.data:
            print(f"   📝 Professeur créé: {prenom} {nom}")
            return result.data[0]['id']
    except Exception as e:
        print(f"   ❌ Erreur création professeur {prenom} {nom}: {e}")
    return None

# ============================================================================
# IMPORT DES ÉLÈVES
# ============================================================================

def importer_eleves():
    print("\n" + "="*60)
    print("📚 IMPORT DES ÉLÈVES")
    print(f"   Année scolaire: {ANNEE_SCOLAIRE} (préfixe matricule: {PREFIXE_MATRICULE})")
    print("   Identification par: nom + prénom UNIQUEMENT")
    if MODE_TEST:
        print(f"   🧪 MODE TEST: {LIMITE_ELEVES} élèves maximum")
    print("="*60)
    
    print(f"\n   Lecture de {FICHIER_ELEVES}...")
    try:
        with open(FICHIER_ELEVES, 'r', encoding='utf-16') as f:
            content = f.read()
            if content.startswith('\ufeff'):
                content = content[1:]
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_ELEVES} non trouvé!")
        return
    
    reader = csv.reader(StringIO(content), delimiter=',')
    rows = list(reader)
    print(f"   {len(rows)} lignes lues (header + {len(rows)-1} élèves)")
    
    total_eleves = 0
    total_options = 0
    total_groupes = 0
    total_crees = 0
    total_mis_a_jour = 0
    
    options_data = []
    groupes_data = []
    matricules_presents = []
    
    # Récupérer le prochain matricule
    try:
        result = supabase_anon.table('students').select('matricule').order('matricule', desc=True).limit(1).execute()
        
        if result.data:
            max_matricule = int(result.data[0]['matricule'])
            prochain_matricule = max_matricule + 1
        else:
            prochain_matricule = 260001
        
        if str(prochain_matricule).startswith('26'):
            pass
        else:
            prochain_matricule = 260001
            
        print(f"   📊 Prochain matricule disponible: {prochain_matricule}")
    except Exception as e:
        print(f"   ⚠️  Impossible de récupérer le max matricule: {e}")
        prochain_matricule = 260001
        print(f"   📊 Fallback: prochain matricule = {prochain_matricule}")
    
    # FORCER les IDs à partir de 1
    next_id_options = 1
    next_id_groups = 1
    
    print("\n   🔄 Traitement des élèves...")
    
    for i, row in enumerate(rows[1:], 1):
        if MODE_TEST and total_eleves >= LIMITE_ELEVES:
            print(f"   ⏹️  Limite TEST atteinte ({LIMITE_ELEVES} élèves)")
            break
        
        if len(row) < 55:
            continue
        
        try:
            nom = row[INDICES_ELEVES['NOM']].strip()
            prenom = row[INDICES_ELEVES['PRENOM']].strip()
            sexe = row[INDICES_ELEVES['SEXE']].strip() if len(row) > INDICES_ELEVES['SEXE'] else ""
            chaine_classe = row[INDICES_ELEVES['CLASSE']].strip() if len(row) > INDICES_ELEVES['CLASSE'] else ""
            chaine_groupes = row[INDICES_ELEVES['GROUPES']].strip() if len(row) > INDICES_ELEVES['GROUPES'] else ""
            
            if not nom or not prenom:
                continue
            
            classe, niveau = extraire_classe_et_niveau(chaine_classe)
            
            result = supabase_anon.table('students').select('matricule') \
                .ilike('nom', nom) \
                .ilike('prenom', prenom) \
                .execute()
            
            if result.data:
                matricule_effectif = result.data[0]['matricule']
                supabase_service.table('students').update({
                    'classe': classe,
                    'niveau': niveau
                }).eq('matricule', matricule_effectif).execute()
                total_mis_a_jour += 1
            else:
                matricule_effectif = prochain_matricule
                prochain_matricule += 1
                new_student = {
                    'matricule': matricule_effectif,
                    'nom': nom,
                    'prenom': prenom,
                    'classe': classe,
                    'niveau': niveau
                }
                supabase_service.table('students').insert(new_student).execute()
                print(f"   ✨ {prenom} {nom} → créé avec matricule {matricule_effectif}")
                total_crees += 1
            
            matricules_presents.append(matricule_effectif)
            
            # OPTIONS
            if sexe:
                if sexe == 'G':
                    options_data.append((next_id_options, matricule_effectif, 'EP', 'Garçon'))
                    next_id_options += 1
                    total_options += 1
                elif sexe == 'F':
                    options_data.append((next_id_options, matricule_effectif, 'EP', 'Fille'))
                    next_id_options += 1
                    total_options += 1
            
            if len(row) > INDICES_ELEVES['OPT_LIB_4']:
                philo = row[INDICES_ELEVES['OPT_LIB_4']].strip()
                if philo:
                    philo_normalisee = normaliser_valeur(philo)
                    valeur = CONVERSION.get(philo_normalisee, philo_normalisee)
                    options_data.append((next_id_options, matricule_effectif, 'Philo', valeur))
                    next_id_options += 1
                    total_options += 1
            
            for j, opt_type in enumerate(['LM1', 'LM2', 'LM3'], 1):
                idx = INDICES_ELEVES[f'OPT_LIB_{j}']
                if len(row) > idx:
                    langue = row[idx].strip()
                    if langue:
                        langue_normalisee = normaliser_valeur(langue)
                        valeur = CONVERSION.get(langue_normalisee, langue_normalisee)
                        options_data.append((next_id_options, matricule_effectif, opt_type, valeur))
                        next_id_options += 1
                        total_options += 1
            
            if len(row) > INDICES_ELEVES['OPT_LIB_5']:
                option_code = row[INDICES_ELEVES['OPT_LIB_5']].strip()
                if option_code:
                    decompositions = traiter_option_principale(matricule_effectif, option_code)
                    for type_opt, valeur_opt in decompositions:
                        options_data.append((next_id_options, matricule_effectif, type_opt, valeur_opt))
                        next_id_options += 1
                        total_options += 1
            
            # GROUPES
            if chaine_groupes:
                groupes = set(g.strip() for g in chaine_groupes.split('+') if g.strip())
                for groupe in groupes:
                    groupes_data.append((next_id_groups, matricule_effectif, groupe))
                    next_id_groups += 1
                    total_groupes += 1
            
            total_eleves += 1
                    
        except Exception as e:
            print(f"   ⚠️  Erreur ligne {i}: {e}")
            continue
    
    print(f"\n   ✅ {total_eleves} élèves traités ({total_crees} créés, {total_mis_a_jour} mis à jour)")
    print(f"   ✅ {total_options} options extraites")
    print(f"   ✅ {total_groupes} groupes extraits")
    
    # VIDER LES TABLES
    print("\n   🗑️  Vidage des tables students_options et students_groups...")
    try:
        supabase_service.table('students_options').delete().neq('matricule', 0).execute()
    except Exception as e:
        print(f"      ⚠️  Table students_options: {e}")
    try:
        supabase_service.table('students_groups').delete().neq('matricule', 0).execute()
    except Exception as e:
        print(f"      ⚠️  Table students_groups: {e}")
    
    # INSERTION DES OPTIONS
    print("   📤 Insertion des options...")
    batch_size = 100
    for i in range(0, len(options_data), batch_size):
        batch = options_data[i:i+batch_size]
        rows_to_insert = [
            {'id': id_val, 'matricule': m, 'type_option': t, 'valeur_option': v}
            for id_val, m, t, v in batch
        ]
        try:
            supabase_service.table('students_options').insert(rows_to_insert).execute()
        except Exception as e:
            print(f"      ❌ Erreur options batch {i//batch_size + 1}: {e}")
    
    # INSERTION DES GROUPES
    print("   📤 Insertion des groupes...")
    for i in range(0, len(groupes_data), batch_size):
        batch = groupes_data[i:i+batch_size]
        rows_to_insert = [
            {'id': id_val, 'matricule': m, 'groupe_code': g}
            for id_val, m, g in batch
        ]
        try:
            supabase_service.table('students_groups').insert(rows_to_insert).execute()
        except Exception as e:
            print(f"      ❌ Erreur groupes batch {i//batch_size + 1}: {e}")
    
    # NETTOYAGE DES ÉLÈVES ABSENTS
    print("\n   🧹 Nettoyage des élèves absents du fichier...")
    if matricules_presents:
        try:
            result = supabase_anon.table('students') \
                .select('matricule') \
                .filter('matricule', 'not.in', tuple(matricules_presents)) \
                .execute()
            
            ids_a_nettoyer = [r['matricule'] for r in result.data]
            if ids_a_nettoyer:
                for matricule in ids_a_nettoyer:
                    supabase_service.table('students') \
                        .update({'classe': None, 'niveau': 0}) \
                        .eq('matricule', matricule) \
                        .execute()
                print(f"   ✅ {len(ids_a_nettoyer)} élèves absents du fichier → classe effacée, niveau = 0")
            else:
                print("   ✅ Aucun élève absent à nettoyer")
        except Exception as e:
            print(f"      ⚠️  Erreur lors du nettoyage: {e}")
    else:
        print("   ⚠️  Aucun élève traité, nettoyage ignoré")
    
    print(f"\n✅ Import élèves terminé")

# ============================================================================
# IMPORT DES COURS
# ============================================================================

def importer_cours():
    print("\n" + "="*60)
    print("📚 IMPORT DES COURS")
    if MODE_TEST:
        print(f"   🧪 MODE TEST: {LIMITE_COURS} cours maximum")
    print("="*60)
    
    print(f"\n   Lecture de {FICHIER_COURS}...")
    try:
        with open(FICHIER_COURS, 'r', encoding='utf-16') as f:
            content = f.read()
            if content.startswith('\ufeff'):
                content = content[1:]
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_COURS} non trouvé!")
        return
    
    reader = csv.reader(StringIO(content), delimiter=',')
    rows = list(reader)
    print(f"   {len(rows)} lignes lues (header + {len(rows)-1} cours)")
    
    courses_data = []
    conditions_data = []
    courses_dict = {}
    cours_id_counter = 0
    cours_count = 0
    
    # FORCER les IDs à partir de 1
    next_id_conditions = 1
    
    for i, row in enumerate(rows[1:], 1):
        if MODE_TEST and cours_count >= LIMITE_COURS:
            print(f"   ⏹️  Limite TEST atteinte ({LIMITE_COURS} cours)")
            break
        
        if len(row) < 9:
            continue
        
        try:
            pattern = row[1].strip()
            prof_nom = row[2].strip()
            prof_prenom = row[3].strip()
            matiere = row[4].strip()
            salle = row[5].strip()
            jour = row[6].strip()
            heure_debut = row[7].strip()
            duree = row[8].strip()
            
            if not pattern or not matiere:
                continue
            
            if salle and salle.startswith('"') and salle.endswith('"'):
                salle = salle[1:-1]
            
            type_pattern = determiner_type_pattern(pattern)
            
            prof_display = ""
            if prof_nom and prof_prenom:
                if '+' in prof_nom or '+' in prof_prenom:
                    noms = [n.strip() for n in prof_nom.split('+') if n.strip()]
                    prenoms = [p.strip() for p in prof_prenom.split('+') if p.strip()]
                    if noms and prenoms:
                        prof_nom = noms[0]
                        prof_prenom = prenoms[0]
                
                get_or_create_professeur(prof_nom, prof_prenom)
                prof_display = f"{prof_nom} {prof_prenom}".strip()
            
            cle = (pattern, jour, heure_debut)
            if cle in courses_dict:
                cours_id = courses_dict[cle]
            else:
                cours_id_counter += 1
                cours_id = cours_id_counter
                courses_dict[cle] = cours_id
                cours_count += 1
                
                heure_fin = calculer_heure_fin(heure_debut, duree)
                
                course = {
                    'cours_id': cours_id,
                    'jour': jour,
                    'heure_debut': heure_debut,
                    'heure_fin': heure_fin,
                    'prof': prof_display,
                    'matiere': matiere,
                    'salle': salle,
                    'type_pattern': type_pattern,
                    'raw_pattern': pattern
                }
                courses_data.append(course)
            
            if type_pattern == "complexe":
                new_conditions, next_id_conditions = parser_conditions_complexes(
                    pattern, cours_id, next_id_conditions
                )
                conditions_data.extend(new_conditions)
                
        except Exception as e:
            print(f"   ⚠️  Erreur ligne {i}: {e}")
            continue
    
    print(f"\n   ✅ {len(courses_data)} cours extraits")
    print(f"   ✅ {len(conditions_data)} conditions extraites")
    
    # VIDER LES TABLES
    print("\n   🗑️  Vidage des tables courses et courses_conditions...")
    try:
        supabase_service.table('courses_conditions').delete().neq('cours_id', 0).execute()
    except Exception as e:
        print(f"      ⚠️  Table courses_conditions (peut-être déjà vide): {e}")
    try:
        supabase_service.table('courses').delete().neq('cours_id', 0).execute()
    except Exception as e:
        print(f"      ⚠️  Table courses: {e}")
    
    # INSERTION DES COURS
    print("   📤 Insertion des cours...")
    batch_size = 100
    for i in range(0, len(courses_data), batch_size):
        batch = courses_data[i:i+batch_size]
        try:
            supabase_service.table('courses').insert(batch).execute()
        except Exception as e:
            print(f"      ❌ Erreur batch {i//batch_size + 1}: {e}")
    
    # INSERTION DES CONDITIONS
    if conditions_data:
        print("   📤 Insertion des conditions...")
        for i in range(0, len(conditions_data), batch_size):
            batch = conditions_data[i:i+batch_size]
            try:
                supabase_service.table('courses_conditions').insert(batch).execute()
            except Exception as e:
                print(f"      ❌ Erreur conditions batch {i//batch_size + 1}: {e}")
    else:
        print("   ℹ️  Aucune condition à insérer")
    
    print(f"\n✅ Import cours terminé: {len(courses_data)} cours, {len(conditions_data)} conditions")

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("="*60)
    print("🚀 IMPORT RENTRÉE - SCRIPT UNIQUE SUPABASE")
    print(f"   Année scolaire: {ANNEE_SCOLAIRE}")
    if MODE_TEST:
        print("   🧪 MODE TEST ACTIF")
    print("="*60)
    
    if os.path.exists(FICHIER_ELEVES):
        importer_eleves()
    else:
        print("\n❌ Import élèves ignoré (fichier manquant)")
    
    if os.path.exists(FICHIER_COURS):
        importer_cours()
    else:
        print("\n❌ Import cours ignoré (fichier manquant)")
    
    print("\n" + "="*60)
    print("✅ IMPORT TERMINÉ AVEC SUCCÈS")
    print("="*60)
    print("\n📝 Récapitulatif:")
    print(f"   - Élèves: identifiés par (nom, prénom) UNIQUEMENT")
    print(f"   - Nouveaux matricules: préfixe {PREFIXE_MATRICULE}")
    print(f"   - Tables vidées: students_options, students_groups, courses, courses_conditions")
    print(f"   - Élèves absents du fichier: classe = NULL, niveau = 0")
    print(f"   - Professeurs: création automatique si inexistant")
    print(f"   - Heure de fin calculée automatiquement (format 'h')")
    if MODE_TEST:
        print(f"   🧪 MODE TEST: limité à {LIMITE_ELEVES} élèves et {LIMITE_COURS} cours")

if __name__ == "__main__":
    main()