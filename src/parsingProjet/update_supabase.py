#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IMPORT RENTRÉE - SCRIPT UNIQUE SUPABASE (v2026)
----------------------------------------
Parse EXP_ELEVE.txt, EXP_COURS.txt et EXP_GROUPE.txt et importe dans Supabase.

Fichiers sources (UTF-8-BOM, séparateur ';') :
- EXP_ELEVE.txt  : liste des élèves
- EXP_COURS.txt  : grille horaire
- EXP_GROUPE.txt : composition des groupes pédagogiques

Mappings (JSON) :
- mapping_profs.json    : nom|prenom → employee_id
- mapping_groupes.json  : pattern → nom de groupe
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

MODE_TEST = False
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
FICHIER_GROUPE = "EXP_GROUPE.txt"
FICHIER_MAPPING_PROFS = "mapping_profs.json"
FICHIER_MAPPING_GROUPES = "mapping_groupes.json"

# ============================================================================
# DICTIONNAIRES
# ============================================================================

# Codes de langue
CODES_LANGUES = {'A', 'I', 'E', 'N', 'D', 'AI', 'DI', 'NI'}

# Codes de sexe
CODES_SEXE = {'G', 'F'}

# Codes de philo
CODES_PHILO = {
    'CPC', 'M', 'MORALE', 'RC', 'RI', 'RP', 'RO',
    'rel cat', 'rel isl', 'rel prot', 'rel ortho',
    'REL CAT', 'REL ISL', 'REL PROT',
    'Religion Catholique', 'Religion Islamique',
    'Religion Protestante', 'Religion Orthodoxe',
}

# Conversion des codes vers libellés lisibles
CONVERSION = {
    'G': 'Garçon', 'F': 'Fille',
    'M': 'Morale', 'Ma': 'Morale',
    'RC': 'Religion Catholique', 'RCa': 'Religion Catholique',
    'RI': 'Religion Islamique', 'RIa': 'Religion Islamique',
    'RP': 'Religion Protestante', 'RPa': 'Religion Protestante',
    'CPC': 'CPC', 'CPCa': 'CPC',
    'REL CAT': 'Religion Catholique', 'REL ISL': 'Religion Islamique',
    'REL PROT': 'Religion Protestante',
    'rel cat': 'Religion Catholique', 'rel isl': 'Religion Islamique',
    'rel prot': 'Religion Protestante',
    'O': 'Religion Orthodoxe', 'Morale': 'Morale',
    'A': 'Anglais', 'I': 'Italien', 'E': 'Espagnol',
    'N': 'Néerlandais', 'D': 'Allemand',
    'AI': 'Anglais Immersion', 'DI': 'Allemand Immersion',
    'NI': 'Néerlandais Immersion',
    'EC': 'Sciences Économiques', 'EC4': 'Sciences Économiques',
    'EC6': 'Sciences Économiques',
    'SO': 'Sciences Sociales', 'SO4': 'Sciences Sociales',
    'MH': 'Histoire', 'MH4': 'Histoire', 'MH6': 'Histoire',
    'MS': 'Sciences', 'MB': 'Sciences', 'MB4': 'Sciences',
    'ML': 'Langues', 'ML4': 'Langues',
    'LA6': 'Latin', 'LB4': 'Latin', 'LG4': 'Latin', 'LH4': 'Latin',
    'ME4': 'Communication',
}

# Décomposition des options principales
OPTION_DECOMPOSITIONS = {
    'L': [('Option', 'Latin')], 'LW': [('Option', 'Latin')],
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
    'MC6': [('Option', 'Math')], 'MC6W': [('Option', 'Math')],
    'MA6': [('Option', 'Math'), ('Option', 'Sciences')],
    'MA6W': [('Option', 'Math'), ('Option', 'Sciences')],
    'MS': [('Option', 'Sciences')], 'MSW': [('Option', 'Sciences')],
    'MB4': [('Option', 'Sciences')], 'MB4W': [('Option', 'Sciences')],
    'EC': [('Option', 'Sciences Économiques')],
    'ECW': [('Option', 'Sciences Économiques')],
    'EC4': [('Option', 'Sciences Économiques')],
    'EC4W': [('Option', 'Sciences Économiques')],
    'EC6': [('Option', 'Sciences Économiques'), ('Option', 'Math')],
    'EC6W': [('Option', 'Sciences Économiques'), ('Option', 'Math')],
    'SO': [('Option', 'Sciences Sociales')], 'SOW': [('Option', 'Sciences Sociales')],
    'SO4': [('Option', 'Sciences Sociales')], 'SO4W': [('Option', 'Sciences Sociales')],
    'MH': [('Option', 'Histoire')], 'MH4': [('Option', 'Histoire')],
    'MH4W': [('Option', 'Histoire')],
    'MH6': [('Option', 'Histoire'), ('Option', 'Math')],
    'MH6W': [('Option', 'Histoire'), ('Option', 'Math')],
    'ML': [('Option', 'Langues')], 'ML4': [('Option', 'Langues')],
    'ML4W': [('Option', 'Langues')],
    'ML6': [('Option', 'Langues'), ('Option', 'Math')],
    'ML6W': [('Option', 'Langues'), ('Option', 'Math')],
    'ME4': [('Option', 'Communication')], 'ME4W': [('Option', 'Communication')],
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
        'rel cat': 'rel cat', 'rel isl': 'rel isl', 'rel prot': 'rel prot', 'o': 'o',
    }
    return normalisations.get(val, val.upper())

def normaliser_groupe(code: str) -> str:
    """Normalise un nom de groupe (trim + espaces simples)"""
    if not code:
        return ""
    return ' '.join(code.strip().split())

def extraire_classe_et_niveau(chaine_classe: str) -> Tuple[str, int]:
    if not chaine_classe:
        return "", 0
    match = re.search(r'(\d{1,2}PA[A-Z])', chaine_classe)
    if match:
        classe = match.group(1)
        niveau = int(classe[0]) if classe[0].isdigit() else 0
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

def parser_valeurs_options(valeurs_str: str) -> List:
    """
    Parse les valeurs d'une condition et retourne une liste
    [Sexe, LM1, LM2, LM3, Philo, Opt1, Opt2, Opt3]
    """
    options = [None, None, None, None, None, None, None, None]
    
    if not valeurs_str:
        return options
    
    # Nettoyer
    valeurs_str = valeurs_str.strip()
    # Ignorer "que LM1", " CL", etc.
    valeurs_str = re.sub(r'\s+que\s+LM\d?', '', valeurs_str, flags=re.IGNORECASE)
    valeurs_str = re.sub(r'\s+CL\s*$', '', valeurs_str)
    valeurs_str = valeurs_str.strip()
    
    # Découper par '-'
    parties = [p.strip() for p in valeurs_str.split('-') if p.strip()]
    
    # Compteur pour les langues (dans l'ordre)
    langues_trouvees = []
    options_principales = []
    philo_trouvee = None
    sexe_trouve = None
    
    for partie in parties:
        # Ignorer les suffixes spéciaux
        partie = partie.strip()
        if not partie:
            continue
        
        # Sexe
        if partie in CODES_SEXE:
            sexe_trouve = partie
            continue
        
        # Philo
        partie_lower = partie.lower()
        if (partie in CODES_PHILO or 
            partie_lower in ['rel cat', 'rel isl', 'rel prot', 'rel ortho', 'morale'] or
            'rel ' in partie_lower or 'religion' in partie_lower):
            philo_trouvee = partie
            continue
        
        # Langue
        if partie in CODES_LANGUES:
            langues_trouvees.append(partie)
            continue
        
        # Option principale (tout le reste)
        # Gérer les '+' internes (ex: CPC-EC+SO déjà splité, mais EC+SO ici)
        if '+' in partie:
            # Plusieurs options dans une même partie
            sous_options = [p.strip() for p in partie.split('+') if p.strip()]
            options_principales.extend(sous_options)
        else:
            options_principales.append(partie)
    
    # Remplir le tableau
    options[0] = sexe_trouve
    for i, langue in enumerate(langues_trouvees[:3]):
        options[1 + i] = langue
    options[4] = philo_trouvee
    for i, opt in enumerate(options_principales[:3]):
        options[5 + i] = opt
    
    return options

# ============================================================================
# GESTION DES MAPPINGS
# ============================================================================

def charger_mapping(nom_fichier: str) -> Dict:
    mapping_file = Path(__file__).parent / nom_fichier
    if mapping_file.exists():
        try:
            with open(mapping_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}

def sauvegarder_mapping(mapping: Dict, nom_fichier: str):
    mapping_file = Path(__file__).parent / nom_fichier
    with open(mapping_file, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)

# ============================================================================
# GESTION DES PROFESSEURS
# ============================================================================

def normaliser_nom(chaine: str) -> str:
    if not chaine:
        return ""
    chaine = chaine.lower().strip()
    accents = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'ô': 'o', 'ö': 'o',
        'ï': 'i', 'î': 'i', 'ç': 'c',
        'ù': 'u', 'û': 'u', 'ü': 'u'
    }
    for accent, sans in accents.items():
        chaine = chaine.replace(accent, sans)
    return chaine

def get_or_create_professeur(nom: str, prenom: str, mapping: Dict, employees_cache: List) -> Optional[str]:
    """Récupère ou crée un professeur"""
    if not nom or not prenom:
        return None
    
    nom = nom.strip()
    prenom = prenom.strip()
    cle_mapping = f"{nom}|{prenom}"
    
    # 1. Vérifier le mapping
    if cle_mapping in mapping:
        return mapping[cle_mapping]
    
    # 2. Recherche dans le cache employees
    nom_norm = normaliser_nom(nom)
    prenom_norm = normaliser_nom(prenom)
    
    for emp in employees_cache:
        emp_nom = normaliser_nom(emp.get('nom', ''))
        emp_prenom = normaliser_nom(emp.get('prenom', ''))
        if emp_nom == nom_norm and emp_prenom == prenom_norm:
            mapping[cle_mapping] = emp['id']
            return emp['id']
    
    # 3. Pas trouvé → demander
    print(f"\n   ❓ Professeur inconnu: {prenom} {nom}")
    
    # Correspondances partielles
    correspondances = []
    for emp in employees_cache:
        emp_nom = normaliser_nom(emp.get('nom', ''))
        emp_prenom = normaliser_nom(emp.get('prenom', ''))
        if (nom_norm in emp_nom or emp_nom in nom_norm or
            prenom_norm in emp_prenom or emp_prenom in prenom_norm):
            correspondances.append((emp.get('nom', ''), emp.get('prenom', ''), emp['id']))
    
    if correspondances:
        print("   🔍 Correspondances possibles:")
        for i, (e_nom, e_prenom, e_id) in enumerate(correspondances, 1):
            print(f"      {i}. {e_prenom} {e_nom} (ID: {e_id})")
        print("      0. Aucun - Créer un nouveau professeur")
        
        choix = input("   Choisissez un numéro: ").strip()
        if choix.isdigit() and 1 <= int(choix) <= len(correspondances):
            prof_id = correspondances[int(choix) - 1][2]
            mapping[cle_mapping] = prof_id
            return prof_id
    
    # Créer
    print("   📝 Création d'un nouveau professeur")
    nouveau_nom = input(f"   Nom (actuel: {nom}): ").strip() or nom
    nouveau_prenom = input(f"   Prénom (actuel: {prenom}): ").strip() or prenom
    
    new_id = str(uuid.uuid4())
    initiale = nouveau_prenom[0].upper() if nouveau_prenom else ''
    
    new_prof = {
        'id': new_id,
        'nom': nouveau_nom,
        'prenom': nouveau_prenom,
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
            prof_id = result.data[0]['id']
            print(f"   ✅ Professeur créé: {nouveau_prenom} {nouveau_nom} (ID: {prof_id})")
            mapping[cle_mapping] = prof_id
            # Ajouter au cache
            employees_cache.append({'id': prof_id, 'nom': nouveau_nom, 'prenom': nouveau_prenom})
            return prof_id
    except Exception as e:
        print(f"   ❌ Erreur création professeur: {e}")
    
    return None

# ============================================================================
# PHASE 1 : EXP_GROUPE → courses_conditions
# ============================================================================

def importer_groupes():
    """Parse EXP_GROUPE.txt et remplit courses_conditions"""
    print("\n" + "="*60)
    print("📚 IMPORT DES GROUPES PÉDAGOGIQUES (courses_conditions)")
    print("="*60)
    
    print(f"\n   Lecture de {FICHIER_GROUPE}...")
    try:
        with open(FICHIER_GROUPE, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_GROUPE} non trouvé!")
        return
    
    # Parser
    conditions_data = []
    current_groupe = None
    current_cours_id = 0
    current_condition_id = 0
    
    for line in lines:
        line = line.rstrip('\n\r')
        if not line.strip():
            continue
        
        # Détecter si c'est un nom de groupe (pas d'indentation, pas de <>)
        if not line.startswith('<') and not line.startswith(' ') and ' ' not in line[:3]:
            # C'est un nom de groupe
            current_groupe = normaliser_groupe(line)
            continue
        
        # C'est une condition
        match = re.match(r'<\s*([^>]+)\s*>\s*(.+)', line)
        if not match:
            continue
        
        classe = match.group(1).strip()
        valeurs_str = match.group(2).strip()
        
        # Parser les valeurs
        options = parser_valeurs_options(valeurs_str)
        
        current_cours_id += 1
        current_condition_id += 1
        
        conditions_data.append({
            'id': current_condition_id,
            'cours_id': current_cours_id,
            'groupe_pedagogique': current_groupe,
            'classe': classe,
            'options': json.dumps(options, ensure_ascii=False)
        })
    
    print(f"   ✅ {len(conditions_data)} conditions extraites ({current_groupe})")
    
    # Vider et insérer
    print("\n   🗑️  Vidage de courses_conditions...")
    try:
        supabase_service.table('courses_conditions').delete().neq('id', 0).execute()
    except Exception as e:
        print(f"      ⚠️  {e}")
    
    print("   📤 Insertion...")
    batch_size = 100
    for i in range(0, len(conditions_data), batch_size):
        batch = conditions_data[i:i+batch_size]
        try:
            supabase_service.table('courses_conditions').insert(batch).execute()
        except Exception as e:
            print(f"      ❌ Erreur batch {i//batch_size + 1}: {e}")
    
    print(f"\n✅ Import groupes terminé: {len(conditions_data)} conditions")

# ============================================================================
# PHASE 2 : EXP_ELEVE
# ============================================================================

def importer_eleves(employees_cache: List):
    """Parse EXP_ELEVE.txt et importe élèves, options, groupes"""
    print("\n" + "="*60)
    print("📚 IMPORT DES ÉLÈVES")
    print(f"   Année scolaire: {ANNEE_SCOLAIRE} (préfixe matricule: {PREFIXE_MATRICULE})")
    print("="*60)
    
    print(f"\n   Lecture de {FICHIER_ELEVES}...")
    try:
        with open(FICHIER_ELEVES, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_ELEVES} non trouvé!")
        return
    
    reader = csv.reader(StringIO(content), delimiter=';')
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
    
    # Prochain matricule
    try:
        result = supabase_anon.table('students').select('matricule').order('matricule', desc=True).limit(1).execute()
        if result.data:
            max_matricule = int(result.data[0]['matricule'])
            prochain_matricule = max_matricule + 1
        else:
            prochain_matricule = int(f"{PREFIXE_MATRICULE}0001")
        
        if not str(prochain_matricule).startswith(PREFIXE_MATRICULE):
            prochain_matricule = int(f"{PREFIXE_MATRICULE}0001")
        
        print(f"   📊 Prochain matricule: {prochain_matricule}")
    except Exception as e:
        print(f"   ⚠️  Impossible de récupérer le max matricule: {e}")
        prochain_matricule = int(f"{PREFIXE_MATRICULE}0001")
    
    next_id_options = 1
    next_id_groups = 1
    
    print("\n   🔄 Traitement des élèves...")
    
    for i, row in enumerate(rows[1:], 1):
        if MODE_TEST and total_eleves >= LIMITE_ELEVES:
            print(f"   ⏹️  Limite TEST atteinte")
            break
        
        if len(row) < 10:
            continue
        
        try:
            nom = row[0].strip()
            prenom = row[1].strip()
            sexe = row[2].strip()
            classe_raw = row[3].strip()
            opt1 = row[4].strip() if len(row) > 4 else ""
            opt2 = row[5].strip() if len(row) > 5 else ""
            opt3 = row[6].strip() if len(row) > 6 else ""
            opt4 = row[7].strip() if len(row) > 7 else ""
            opt5 = row[8].strip() if len(row) > 8 else ""
            groupes_str = row[10].strip() if len(row) > 10 else ""
            
            if not nom or not prenom:
                continue
            
            classe, niveau = extraire_classe_et_niveau(classe_raw)
            
            # Recherche
            result = supabase_anon.table('students').select('matricule') \
                .ilike('nom', nom).ilike('prenom', prenom).execute()
            
            if result.data:
                matricule_effectif = result.data[0]['matricule']
                supabase_service.table('students').update({
                    'classe': classe, 'niveau': niveau
                }).eq('matricule', matricule_effectif).execute()
                total_mis_a_jour += 1
            else:
                matricule_effectif = prochain_matricule
                prochain_matricule += 1
                supabase_service.table('students').insert({
                    'matricule': matricule_effectif,
                    'nom': nom, 'prenom': prenom,
                    'classe': classe, 'niveau': niveau
                }).execute()
                print(f"   ✨ {prenom} {nom} → créé avec matricule {matricule_effectif}")
                total_crees += 1
            
            matricules_presents.append(matricule_effectif)
            
            # Options
            # Sexe (EP)
            if sexe:
                if sexe == 'G':
                    options_data.append((next_id_options, matricule_effectif, 'EP', 'Garçon'))
                    next_id_options += 1
                    total_options += 1
                elif sexe == 'F':
                    options_data.append((next_id_options, matricule_effectif, 'EP', 'Fille'))
                    next_id_options += 1
                    total_options += 1
            
            # Langues LM1, LM2, LM3
            for j, opt in enumerate([opt1, opt2, opt3], 1):
                if opt:
                    norm = normaliser_valeur(opt)
                    val = CONVERSION.get(norm, norm)
                    options_data.append((next_id_options, matricule_effectif, f'LM{j}', val))
                    next_id_options += 1
                    total_options += 1
            
            # Philo (opt4)
            if opt4:
                norm = normaliser_valeur(opt4)
                val = CONVERSION.get(norm, norm)
                options_data.append((next_id_options, matricule_effectif, 'Philo', val))
                next_id_options += 1
                total_options += 1
            
            # Option principale (opt5)
            if opt5:
                code_clean = opt5.strip().upper().strip('"\'')
                if code_clean not in CODES_SANS_OPTION:
                    if code_clean in OPTION_DECOMPOSITIONS:
                        for type_opt, val_opt in OPTION_DECOMPOSITIONS[code_clean]:
                            options_data.append((next_id_options, matricule_effectif, type_opt, val_opt))
                            next_id_options += 1
                            total_options += 1
                    else:
                        options_data.append((next_id_options, matricule_effectif, 'Option', opt5))
                        next_id_options += 1
                        total_options += 1

            
            # Groupes pédagogiques (ceux du fichier EXP_ELEVE)
            if groupes_str:
                for groupe in groupes_str.split(','):
                    groupe_norm = normaliser_groupe(groupe)
                    if groupe_norm:
                        groupes_data.append((next_id_groups, matricule_effectif, groupe_norm))
                        next_id_groups += 1
                        total_groupes += 1
            
            # ⭐ Groupe-classe : pour matcher les cours dont raw_pattern = classe
            if classe:
                # Éviter les doublons (si la classe est déjà dans les groupes pédagogiques)
                deja_present = any(
                    g[2] == classe for g in groupes_data 
                    if g[1] == matricule_effectif
                )
                if not deja_present:
                    groupes_data.append((next_id_groups, matricule_effectif, classe))
                    next_id_groups += 1
                    total_groupes += 1
            
            total_eleves += 1
                    
        except Exception as e:
            print(f"   ⚠️  Erreur ligne {i}: {e}")
            continue
    
    print(f"\n   ✅ {total_eleves} élèves ({total_crees} créés, {total_mis_a_jour} mis à jour)")
    print(f"   ✅ {total_options} options, {total_groupes} groupes")
    
    # Vider et insérer
    print("\n   🗑️  Vidage...")
    try:
        supabase_service.table('students_options').delete().neq('matricule', 0).execute()
    except Exception as e:
        print(f"      ⚠️  {e}")
    try:
        supabase_service.table('students_groups').delete().neq('matricule', 0).execute()
    except Exception as e:
        print(f"      ⚠️  {e}")
    
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
            print(f"      ❌ {e}")
    
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
            print(f"      ❌ {e}")
    
    # Nettoyage
    print("\n   🧹 Nettoyage des élèves absents...")
    if matricules_presents:
        try:
            result = supabase_anon.table('students') \
                .select('matricule, nom') \
                .filter('matricule', 'not.in', tuple(matricules_presents)) \
                .execute()
            
            # Filtrer en Python pour exclure les Testeur
            ids_a_nettoyer = [
                r['matricule'] for r in result.data 
                if r.get('nom', '').lower() != 'testeur'
            ]
            
            if ids_a_nettoyer:
                for matricule in ids_a_nettoyer:
                    supabase_service.table('students') \
                        .update({'classe': None, 'niveau': 0}) \
                        .eq('matricule', matricule).execute()
                print(f"   ✅ {len(ids_a_nettoyer)} élèves absents → classe=NULL, niveau=0")
            else:
                print("   ✅ Aucun élève absent à nettoyer")
        except Exception as e:
            print(f"      ⚠️  {e}")


# ============================================================================
# PHASE 3 : EXP_COURS
# ============================================================================

def importer_cours(employees_cache: List, mapping_profs: Dict, mapping_groupes: Dict):
    """Parse EXP_COURS.txt et importe cours"""
    print("\n" + "="*60)
    print("📚 IMPORT DES COURS")
    print("="*60)
    
    print(f"\n   Lecture de {FICHIER_COURS}...")
    try:
        with open(FICHIER_COURS, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_COURS} non trouvé!")
        return
    
    reader = csv.reader(StringIO(content), delimiter=';')
    rows = list(reader)
    print(f"   {len(rows)} lignes lues (header + {len(rows)-1} cours)")
    
    courses_data = []
    conditions_data = []
    cours_count = 0
    next_id_conditions = 0
    
    # Prochain ID conditions (pour ne pas écraser EXP_GROUPE)
    try:
        result = supabase_anon.table('courses_conditions').select('id').order('id', desc=True).limit(1).execute()
        next_id_conditions = (result.data[0]['id'] + 1) if result.data else 1
    except:
        next_id_conditions = 1
    
    for i, row in enumerate(rows[1:], 1):
        if MODE_TEST and cours_count >= LIMITE_COURS:
            print(f"   ⏹️  Limite TEST atteinte")
            break
        
        if len(row) < 9:
            continue
        
        try:
            duree = row[0].strip()
            mat_code = row[1].strip()
            mat_libelle = row[2].strip()
            prof_nom = row[3].strip()
            prof_prenom = row[4].strip()
            classe_pattern = row[5].strip()
            pond = row[6].strip()
            jour = row[7].strip()
            h_debut = row[8].strip()
            
            # Ignorer si pas de matière et pas de prof
            if not prof_nom and not prof_prenom:
                continue
            
            # --- Identifier les profs ---
            prof_ids = []
            noms = [n.strip() for n in prof_nom.split(',') if n.strip()]
            prenoms = [p.strip() for p in prof_prenom.split(',') if p.strip()]
            
            for j, nom in enumerate(noms):
                prenom = prenoms[j] if j < len(prenoms) else ''
                if nom and prenom:
                    prof_id = get_or_create_professeur(nom, prenom, mapping_profs, employees_cache)
                    if prof_id:
                        prof_ids.append(prof_id)
            
            prof_json = json.dumps(prof_ids, ensure_ascii=False)
            
            # --- Type de pattern ---
            if not classe_pattern:
                # Cours externe
                type_pattern = 'externe'
                matiere = ''
                salle = 'externe'
                raw_pattern = ''
            else:
                # Analyser le pattern
                if classe_pattern.startswith('<'):
                    # Pattern complexe sans groupe identifié
                    type_pattern = 'complexe'
                    raw_pattern = classe_pattern
                    
                    # Demander un nom de groupe
                    if raw_pattern in mapping_groupes:
                        groupe_nom = mapping_groupes[raw_pattern]
                    else:
                        print(f"\n   ❓ Pattern sans groupe identifié: {raw_pattern[:100]}...")
                        groupe_nom = input(f"   Nom du groupe: ").strip()
                        if not groupe_nom:
                            groupe_nom = f"GROUPE_{cours_count + 1}"
                        mapping_groupes[raw_pattern] = groupe_nom
                        sauvegarder_mapping(mapping_groupes, FICHIER_MAPPING_GROUPES)
                    
                    # Ajouter les conditions dans courses_conditions
                    for bloc in classe_pattern.split(','):
                        bloc = bloc.strip()
                        match = re.search(r'<\s*([^>]+)\s*>\s*(.+)', bloc)
                        if match:
                            classe = match.group(1).strip()
                            valeurs_str = match.group(2).strip()
                            options = parser_valeurs_options(valeurs_str)
                            
                            next_id_conditions += 1
                            conditions_data.append({
                                'id': next_id_conditions,
                                'cours_id': next_id_conditions,
                                'groupe_pedagogique': groupe_nom,
                                'classe': classe,
                                'options': json.dumps(options, ensure_ascii=False)
                            })
                    
                    salle = ''
                    matiere = mat_libelle or mat_code
                else:
                    # Pattern avec [groupe] et/ou mixte
                    type_pattern = 'complexe' if '[' in classe_pattern else 'simple'
                    raw_pattern = classe_pattern
                    
                    # Extraire les groupes [xxx]
                    groupes_trouves = re.findall(r'\[([^\]]+)\]', classe_pattern)
                    
                    # Vérifier s'il y a des patterns complexes additionnels
                    if '<' in classe_pattern:
                        # Mixte : groupe + conditions ad hoc
                        if raw_pattern in mapping_groupes:
                            groupe_nom = mapping_groupes[raw_pattern]
                        else:
                            print(f"\n   ❓ Pattern mixte: {raw_pattern[:100]}...")
                            groupe_nom = input(f"   Nom du groupe: ").strip()
                            if not groupe_nom:
                                groupe_nom = f"GROUPE_{cours_count + 1}"
                            mapping_groupes[raw_pattern] = groupe_nom
                            sauvegarder_mapping(mapping_groupes, FICHIER_MAPPING_GROUPES)
                        
                        # Ajouter les conditions complexes
                        for match in re.finditer(r'<\s*([^>]+)\s*>\s*([^<]+?)(?=\s*[,<]|$)', classe_pattern):
                            classe = match.group(1).strip()
                            valeurs_str = match.group(2).strip()
                            options = parser_valeurs_options(valeurs_str)
                            
                            next_id_conditions += 1
                            conditions_data.append({
                                'id': next_id_conditions,
                                'cours_id': next_id_conditions,
                                'groupe_pedagogique': groupe_nom,
                                'classe': classe,
                                'options': json.dumps(options, ensure_ascii=False)
                            })
                    
                    salle = ''
                    matiere = mat_libelle or mat_code
                
                # Nettoyer salle
                if salle.startswith('"') and salle.endswith('"'):
                    salle = salle[1:-1]
            
            # Calculer heure_fin
            heure_fin = calculer_heure_fin(h_debut, duree)
            
            cours_count += 1
            courses_data.append({
                'cours_id': cours_count,
                'jour': jour,
                'heure_debut': h_debut,
                'heure_fin': heure_fin,
                'prof': prof_json,
                'matiere': matiere if 'matiere' in dir() else (mat_libelle or mat_code),
                'salle': salle if 'salle' in dir() else '',
                'type_pattern': type_pattern,
                'raw_pattern': raw_pattern if 'raw_pattern' in dir() else ''
            })
                    
        except Exception as e:
            print(f"   ⚠️  Erreur ligne {i}: {e}")
            continue
    
    print(f"\n   ✅ {len(courses_data)} cours extraits")
    print(f"   ✅ {len(conditions_data)} conditions supplémentaires")
    
    # Sauvegarder le mapping
    sauvegarder_mapping(mapping_profs, FICHIER_MAPPING_PROFS)
    sauvegarder_mapping(mapping_groupes, FICHIER_MAPPING_GROUPES)
    
    # Vider et insérer
    print("\n   🗑️  Vidage de courses...")
    try:
        supabase_service.table('courses').delete().neq('cours_id', 0).execute()
    except Exception as e:
        print(f"      ⚠️  {e}")
    
    print("   📤 Insertion des cours...")
    batch_size = 100
    for i in range(0, len(courses_data), batch_size):
        batch = courses_data[i:i+batch_size]
        try:
            supabase_service.table('courses').insert(batch).execute()
        except Exception as e:
            print(f"      ❌ {e}")
    
    if conditions_data:
        print("   📤 Insertion des conditions supplémentaires...")
        for i in range(0, len(conditions_data), batch_size):
            batch = conditions_data[i:i+batch_size]
            try:
                supabase_service.table('courses_conditions').insert(batch).execute()
            except Exception as e:
                print(f"      ❌ {e}")
    
    print(f"\n✅ Import cours terminé: {len(courses_data)} cours")

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
    
    # Charger le cache employees
    print("\n🔍 Chargement des employees...")
    employees_cache = []
    try:
        result = supabase_anon.table('employees').select('id, nom, prenom').execute()
        employees_cache = result.data
        print(f"   {len(employees_cache)} employees en cache")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return
    
    # Charger les mappings
    mapping_profs = charger_mapping(FICHIER_MAPPING_PROFS)
    mapping_groupes = charger_mapping(FICHIER_MAPPING_GROUPES)
    print(f"   {len(mapping_profs)} mappings profs")
    print(f"   {len(mapping_groupes)} mappings groupes")
    
    # Phase 1 : Groupes pédagogiques (courses_conditions)
    if os.path.exists(FICHIER_GROUPE):
        importer_groupes()
    else:
        print(f"\n⚠️  Fichier {FICHIER_GROUPE} non trouvé - étape ignorée")
    
    # Phase 2 : Élèves
    if os.path.exists(FICHIER_ELEVES):
        importer_eleves(employees_cache)
    else:
        print(f"\n❌ Fichier {FICHIER_ELEVES} non trouvé")
    
    # Phase 3 : Cours
    if os.path.exists(FICHIER_COURS):
        importer_cours(employees_cache, mapping_profs, mapping_groupes)
    else:
        print(f"\n❌ Fichier {FICHIER_COURS} non trouvé")
    
    print("\n" + "="*60)
    print("✅ IMPORT TERMINÉ AVEC SUCCÈS")
    print("="*60)

if __name__ == "__main__":
    main()