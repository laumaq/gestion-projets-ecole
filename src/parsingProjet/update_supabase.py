#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IMPORT RENTRÉE - SCRIPT UNIQUE SUPABASE (v2026-2027)
"""

import csv
import re
import json
import uuid
from io import StringIO
from typing import Dict, List, Tuple, Optional, Set, Any
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from pathlib import Path

# ============================================================================
# PARAMÈTRES MODIFIABLES
# ============================================================================

ANNEE_SCOLAIRE = 2026
PREFIXE_MATRICULE = str(ANNEE_SCOLAIRE)[-2:]
ANNEE_SCOLAIRE_LABEL = "2026-2027"

MODE_TEST = False
LIMITE_ELEVES = 100
LIMITE_COURS = 100

VIDER_COURSES = True              # True pour tester (vide courses avant import)

# Import des élèves : passer à False une fois qu'ils sont stables (gain de temps)
IMPORTER_ELEVES = False

# Nettoyage one-shot des cours logiques obsolètes.
# PASSER À False après un premier run propre !
NETTOYER_COURS_LOGICIQUES_OBSOLETES = True

NOMS_A_PRESERVER = ['testeur']

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

MAPPING_GROUPES: Dict[str, str] = {}

# ============================================================================
# DICTIONNAIRES
# ============================================================================

CODES_LANGUES = {'A', 'I', 'E', 'N', 'D', 'AI', 'DI', 'NI'}
CODES_SEXE = {'G', 'F'}

CODES_PHILO = {
    'CPC', 'M', 'MORALE', 'RC', 'RI', 'RP', 'RO',
    'rel cat', 'rel isl', 'rel prot', 'rel ortho',
    'REL CAT', 'REL ISL', 'REL PROT',
    'Religion Catholique', 'Religion Islamique',
    'Religion Protestante', 'Religion Orthodoxe',
}

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
# FONCTIONS UTILITAIRES (PAGINATION FIABLE)
# ============================================================================

def fetch_all(
    table_name: str,
    select: str = '*',
    filters: Optional[List[Tuple[str, str, Any]]] = None,
    order_by: Optional[Tuple[str, bool]] = None,
    client=None,
    batch_size: int = 500,
    verbose: bool = False,
) -> List[Dict]:
    """
    Récupère TOUTES les lignes d'une table en paginant.

    Notes importantes :
      - PostgREST retourne (batch_size - 1) éléments pour .range(0, N-1) (quirk).
      - On avance de len(data) réellement reçu, et on ne s'arrête QUE sur
        réponse vide. Cela évite de couper la pagination trop tôt.
      - order_by est OBLIGATOIRE : sans ordre stable, la pagination n'est
        pas déterministe et certaines lignes peuvent être sautées.
    """
    if client is None:
        client = supabase_service

    if order_by is None:
        raise ValueError(
            f"fetch_all('{table_name}') requiert un order_by explicite "
            f"pour une pagination fiable."
        )

    all_rows: List[Dict] = []
    offset = 0
    iteration = 0
    max_iterations = 10_000

    while True:
        iteration += 1
        if iteration > max_iterations:
            print(f"      ⚠️  fetch_all({table_name}) : garde-fou atteint à {len(all_rows)} lignes")
            break

        q = client.table(table_name).select(select)
        if filters:
            for op, col, val in filters:
                if op == 'eq':
                    q = q.eq(col, val)
                elif op == 'neq':
                    q = q.neq(col, val)
                elif op == 'ilike':
                    q = q.ilike(col, val)
                elif op == 'in':
                    q = q.in_(col, val)
                elif op == 'not.in':
                    q = q.not_.in_(col, val)
                elif op == 'gte':
                    q = q.gte(col, val)
                elif op == 'lte':
                    q = q.lte(col, val)

        col, desc = order_by
        q = q.order(col, desc=desc)
        q = q.range(offset, offset + batch_size - 1)

        res = q.execute()
        data = res.data or []

        if verbose:
            print(f"      [fetch_all {table_name}] iter={iteration} offset={offset} reçu={len(data)}")

        if not data:
            break

        all_rows.extend(data)
        offset += len(data)

    if verbose:
        print(f"      [fetch_all {table_name}] TOTAL = {len(all_rows)}")

    return all_rows


def delete_by_values_in_batches(table_name: str, column: str, values: List[Any], batch_size: int = 500):
    """DELETE ... WHERE column IN (...) par batches pour éviter la limite URL."""
    if not values:
        return 0
    total = 0
    for i in range(0, len(values), batch_size):
        batch = values[i:i + batch_size]
        try:
            supabase_service.table(table_name).delete().in_(column, batch).execute()
            total += len(batch)
        except Exception as e:
            print(f"      ⚠️  delete batch {i // batch_size + 1}: {e}")
    return total


def est_testeur(nom: str) -> bool:
    if not nom:
        return False
    return any(p in nom.lower() for p in NOMS_A_PRESERVER)


def normaliser_valeur(valeur: str) -> str:
    if not valeur:
        return ""
    val = valeur.strip().lower().strip('"\'')
    return {'rel cat': 'rel cat', 'rel isl': 'rel isl', 'rel prot': 'rel prot', 'o': 'o'}.get(val, val.upper())


def normaliser_groupe(code: str) -> str:
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
    if not heure_debut or not duree_str:
        return None
    try:
        duree_heures = int(duree_str.replace('h00', ''))
        duree_minutes = duree_heures * 50
        heure, minute = int(heure_debut[:2]), int(heure_debut[3:])
        total_minutes = heure * 60 + minute + duree_minutes
        return f"{total_minutes // 60:02d}h{total_minutes % 60:02d}"
    except Exception:
        return None


def parser_valeurs_options(valeurs_str: str) -> List:
    options = [None] * 8
    if not valeurs_str:
        return options
    valeurs_str = valeurs_str.strip()
    valeurs_str = re.sub(r'\s+que\s+LM\d?', '', valeurs_str, flags=re.IGNORECASE)
    valeurs_str = re.sub(r'\s+CL\s*$', '', valeurs_str)
    parties = [p.strip() for p in valeurs_str.split('-') if p.strip()]

    langues, options_principales = [], []
    philo, sexe = None, None
    for partie in parties:
        if not partie:
            continue
        if partie in CODES_SEXE:
            sexe = partie; continue
        pl = partie.lower()
        if (partie in CODES_PHILO or
                pl in ['rel cat', 'rel isl', 'rel prot', 'rel ortho', 'morale'] or
                'rel ' in pl or 'religion' in pl):
            philo = partie; continue
        if partie in CODES_LANGUES:
            langues.append(partie); continue
        if '+' in partie:
            options_principales.extend([p.strip() for p in partie.split('+') if p.strip()])
        else:
            options_principales.append(partie)

    options[0] = sexe
    for i, l in enumerate(langues[:3]):
        options[1 + i] = l
    options[4] = philo
    for i, o in enumerate(options_principales[:3]):
        options[5 + i] = o
    return options


# ============================================================================
# MAPPINGS
# ============================================================================

def charger_mapping(nom_fichier: str) -> Dict:
    p = Path(__file__).parent / nom_fichier
    if p.exists():
        try:
            with open(p, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def sauvegarder_mapping(mapping: Dict, nom_fichier: str):
    p = Path(__file__).parent / nom_fichier
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)


def demander_nom_groupe(pattern: str) -> str:
    global MAPPING_GROUPES
    pattern = (pattern or "").strip()
    if pattern in MAPPING_GROUPES:
        return MAPPING_GROUPES[pattern]
    print("\n   ❓ Pattern de groupe sans nom [groupe] :")
    print(f"      {pattern}")
    nom = input("   Nom du groupe pour ce pattern ? ").strip()
    while not nom:
        nom = input("   Le nom ne peut pas être vide. Nom du groupe ? ").strip()
    nom = normaliser_groupe(nom)
    MAPPING_GROUPES[pattern] = nom
    sauvegarder_mapping(MAPPING_GROUPES, FICHIER_MAPPING_GROUPES)
    print(f"   ✅ Groupe enregistré : {nom}")
    return nom


def extraire_groupe(classe_pattern: str) -> str:
    global MAPPING_GROUPES
    pattern = (classe_pattern or "").strip()
    if not pattern:
        return ""
    if pattern in MAPPING_GROUPES:
        return MAPPING_GROUPES[pattern]
    m = re.search(r'\[([^\]]+)\]', pattern)
    if m:
        return normaliser_groupe(m.group(1))
    if pattern.startswith('<'):
        return demander_nom_groupe(pattern)
    return normaliser_groupe(pattern)


# ============================================================================
# PARSING PATTERNS COMPLEXES
# ============================================================================

def parser_pattern_groupe(pattern: str) -> List[Tuple[str, str, str]]:
    if not pattern:
        return []
    p = re.sub(r'^\s*\[[^\]]+\]\s*,?\s*', '', pattern).strip()
    result = []
    for part in re.split(r',\s*(?=<)', p):
        m = re.match(r'<([^>]+)>\s*<([^>]+)>\s*(.+)', part.strip())
        if m:
            result.append((m.group(1).strip(), m.group(2).strip(),
                           m.group(3).strip().rstrip(',').strip()))
    return result


def matcher_condition_student(raw: Dict, template: str, valeur: str) -> bool:
    suffix = None
    if ' + ' in valeur:
        main, suffix = valeur.split(' + ', 1)
        valeur = main.strip()
        suffix = suffix.strip()

    template_parts = [t.strip() for t in template.strip().strip('()').split('+') if t.strip()]
    valeur_parts = [v.strip() for v in valeur.split('-')]

    for i, tp in enumerate(template_parts):
        if i >= len(valeur_parts):
            break
        v = valeur_parts[i].upper()
        tpu = tp.upper()
        if tpu == 'OPTION':
            if (raw.get('opt5') or '').strip().upper() != v:
                return False
        elif tpu.startswith('LM'):
            idx = tpu[2:]
            if idx not in ('1', '2', '3'):
                continue
            if (raw.get(f'opt{idx}') or '').strip().upper() != v:
                return False
        elif tpu == 'PHILO':
            if (raw.get('opt4') or '').strip().upper() != v:
                return False
        elif tpu == 'SEXE':
            if (raw.get('sexe') or '').strip().upper() != v:
                return False

    if suffix:
        s = suffix.upper()
        o4 = (raw.get('opt4') or '').strip().upper()
        mapping = {
            'CPC': ('CPC',),
            'REL CAT': ('RC', 'REL CAT'),
            'RC': ('RC', 'REL CAT'),
            'REL ISL': ('RI', 'REL ISL'),
            'RI': ('RI', 'REL ISL'),
            'REL PROT': ('RP', 'REL PROT'),
            'RP': ('RP', 'REL PROT'),
            'MORALE': ('M', 'MORALE', 'MA'),
            'M': ('M', 'MORALE', 'MA'),
        }
        if s in mapping and o4 not in mapping[s]:
            return False
    return True


def completer_students_groups(matricule_to_raw: Dict, next_id_groups: int) -> List[Tuple[int, int, str]]:
    if not MAPPING_GROUPES or not matricule_to_raw:
        return []
    print("\n   🔗 Complétion students_groups depuis mapping_groupes.json...")
    rows = []
    stats = {}
    for pattern, code in MAPPING_GROUPES.items():
        if not pattern or not code:
            continue
        conditions = parser_pattern_groupe(pattern)
        if not conditions:
            continue
        matched = set()
        for classe, template, valeur in conditions:
            for matricule, raw in matricule_to_raw.items():
                if raw.get('classe') != classe:
                    continue
                if matcher_condition_student(raw, template, valeur):
                    matched.add(matricule)
        for m in matched:
            rows.append((next_id_groups, m, code))
            next_id_groups += 1
        stats[code] = stats.get(code, 0) + len(matched)
    for code, n in stats.items():
        print(f"      • {code} : {n} élèves")
    print(f"   ✅ {len(rows)} associations supplémentaires")
    return rows


# ============================================================================
# PROFS
# ============================================================================

def normaliser_nom(chaine: str) -> str:
    if not chaine:
        return ""
    chaine = chaine.lower().strip()
    for a, s in {'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a', 'ä': 'a',
                 'ô': 'o', 'ö': 'o', 'ï': 'i', 'î': 'i', 'ç': 'c',
                 'ù': 'u', 'û': 'u', 'ü': 'u'}.items():
        chaine = chaine.replace(a, s)
    return chaine


def get_or_create_professeur(nom: str, prenom: str, mapping: Dict, employees_cache: List) -> Optional[str]:
    if not nom or not prenom:
        return None
    nom, prenom = nom.strip(), prenom.strip()
    cle = f"{nom}|{prenom}"
    if cle in mapping:
        return mapping[cle]

    nn, pn = normaliser_nom(nom), normaliser_nom(prenom)
    for emp in employees_cache:
        if normaliser_nom(emp.get('nom', '')) == nn and normaliser_nom(emp.get('prenom', '')) == pn:
            if emp.get('job') != 'prof':
                try:
                    supabase_service.table('employees').update({'job': 'prof'}).eq('id', emp['id']).execute()
                    emp['job'] = 'prof'
                    print(f"   🔄 {prenom} {nom} → job remis à 'prof'")
                except Exception as e:
                    print(f"   ⚠️  {e}")
            mapping[cle] = emp['id']
            return emp['id']

    print(f"\n   ❓ Professeur inconnu: {prenom} {nom}")
    correspondances = []
    for emp in employees_cache:
        en, ep = normaliser_nom(emp.get('nom', '')), normaliser_nom(emp.get('prenom', ''))
        if (nn in en or en in nn or pn in ep or ep in pn):
            correspondances.append((emp.get('nom', ''), emp.get('prenom', ''), emp['id']))

    if correspondances:
        print("   🔍 Correspondances possibles:")
        for i, (en, ep, eid) in enumerate(correspondances, 1):
            print(f"      {i}. {ep} {en} (ID: {eid})")
        print("      0. Aucun - Créer un nouveau professeur")
        choix = input("   Choisissez un numéro: ").strip()
        if choix.isdigit() and 1 <= int(choix) <= len(correspondances):
            prof_id = correspondances[int(choix) - 1][2]
            mapping[cle] = prof_id
            return prof_id

    print("   📝 Création d'un nouveau professeur")
    nouveau_nom = input(f"   Nom (actuel: {nom}): ").strip() or nom
    nouveau_prenom = input(f"   Prénom (actuel: {prenom}): ").strip() or prenom
    new_id = str(uuid.uuid4())
    new_prof = {
        'id': new_id, 'nom': nouveau_nom, 'prenom': nouveau_prenom,
        'initiale': nouveau_prenom[0].upper() if nouveau_prenom else '',
        'job': 'prof', 'mot_de_passe': None,
        'eleve_voir_telephone': False, 'tfh_accepte_numerique': False,
        'regime_alimentaire': json.dumps({"regime": "Végétarien", "notes": ""}),
    }
    try:
        r = supabase_service.table('employees').insert(new_prof).execute()
        if r.data:
            pid = r.data[0]['id']
            print(f"   ✅ Professeur créé: {nouveau_prenom} {nouveau_nom} (ID: {pid})")
            mapping[cle] = pid
            employees_cache.append({'id': pid, 'nom': nouveau_nom, 'prenom': nouveau_prenom, 'job': 'prof'})
            return pid
    except Exception as e:
        print(f"   ❌ {e}")
    return None


# ============================================================================
# PHASE 1 : EXP_GROUPE → group_conditions
# ============================================================================

def importer_groupes():
    print("\n" + "=" * 60)
    print("📚 IMPORT DES GROUPES PÉDAGOGIQUES (group_conditions)")
    print("=" * 60)

    try:
        with open(FICHIER_GROUPE, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_GROUPE} non trouvé!")
        return

    conditions_data = []
    classes_vues = set()
    current_groupe = None
    cid = 0

    for line in lines:
        line = line.rstrip('\n\r')
        if not line.strip():
            continue
        if not line.startswith('<') and not line.startswith(' ') and ' ' not in line[:3]:
            current_groupe = normaliser_groupe(line)
            continue
        m = re.match(r'<\s*([^>]+)\s*>\s*(.+)', line)
        if not m:
            continue
        classe = m.group(1).strip()
        options = parser_valeurs_options(m.group(2).strip())
        cid += 1
        conditions_data.append({
            'id': cid, 'groupe_pedagogique': current_groupe,
            'classe': classe, 'options': json.dumps(options, ensure_ascii=False),
        })
        classes_vues.add(classe)

    print(f"   ✅ {len(conditions_data)} conditions extraites depuis EXP_GROUPE.txt")
    print(f"   📚 Ajout des lignes pour les classes simples...")
    for classe in sorted(classes_vues):
        if not any(c['groupe_pedagogique'] == classe and c['classe'] == classe for c in conditions_data):
            cid += 1
            conditions_data.append({
                'id': cid, 'groupe_pedagogique': classe,
                'classe': classe, 'options': json.dumps([None] * 8, ensure_ascii=False),
            })
    print(f"   ✅ {len(conditions_data)} conditions au total")

    print("\n   🗑️  Vidage de group_conditions...")
    try:
        supabase_service.table('group_conditions').delete().neq('id', 0).execute()
    except Exception as e:
        print(f"      ⚠️  {e}")

    print("   📤 Insertion...")
    for i in range(0, len(conditions_data), 100):
        try:
            supabase_service.table('group_conditions').insert(conditions_data[i:i + 100]).execute()
        except Exception as e:
            print(f"      ❌ batch {i // 100 + 1}: {e}")
    print(f"\n✅ Import groupes terminé: {len(conditions_data)} conditions")


# ============================================================================
# PHASE 2 : EXP_ELEVE
# ============================================================================

def importer_eleves(employees_cache: List):
    print("\n" + "=" * 60)
    print("📚 IMPORT DES ÉLÈVES")
    print(f"   Année: {ANNEE_SCOLAIRE_LABEL} (préfixe: {PREFIXE_MATRICULE})")
    print("=" * 60)

    try:
        with open(FICHIER_ELEVES, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_ELEVES} non trouvé!")
        return

    reader = csv.reader(StringIO(content), delimiter=';')
    rows = list(reader)
    print(f"   {len(rows)} lignes lues (header + {len(rows) - 1} élèves)")

    total_eleves = total_options = total_groupes = total_crees = total_mis_a_jour = 0
    options_data, groupes_data, matricules_presents = [], [], []
    matricule_to_raw: Dict[int, Dict[str, str]] = {}

    # Récupérer élèves à préserver (paginé + ordonné)
    matricules_preserves = []
    try:
        for r in fetch_all('students', select='matricule, nom',
                           order_by=('matricule', False)):
            if est_testeur(r.get('nom', '')):
                matricules_preserves.append(r['matricule'])
        print(f"   🧪 {len(matricules_preserves)} élèves à préserver")
    except Exception as e:
        print(f"   ⚠️  {e}")

    # Prochain matricule
    try:
        r = supabase_anon.table('students').select('matricule').order('matricule', desc=True).limit(1).execute()
        if r.data:
            prochain_matricule = int(r.data[0]['matricule']) + 1
        else:
            prochain_matricule = int(f"{PREFIXE_MATRICULE}0001")
        if not str(prochain_matricule).startswith(PREFIXE_MATRICULE):
            prochain_matricule = int(f"{PREFIXE_MATRICULE}0001")
        print(f"   📊 Prochain matricule: {prochain_matricule}")
    except Exception as e:
        print(f"   ⚠️  {e}")
        prochain_matricule = int(f"{PREFIXE_MATRICULE}0001")

    next_id_options = 1
    next_id_groups = 1

    print("\n   🔄 Traitement des élèves...")
    for i, row in enumerate(rows[1:], 1):
        if MODE_TEST and total_eleves >= LIMITE_ELEVES:
            break
        if len(row) < 10:
            continue
        try:
            nom, prenom, sexe, classe_raw = row[0].strip(), row[1].strip(), row[2].strip(), row[3].strip()
            opt1 = row[4].strip() if len(row) > 4 else ""
            opt2 = row[5].strip() if len(row) > 5 else ""
            opt3 = row[6].strip() if len(row) > 6 else ""
            opt4 = row[7].strip() if len(row) > 7 else ""
            opt5 = row[8].strip() if len(row) > 8 else ""
            groupes_str = row[10].strip() if len(row) > 10 else ""
            if not nom or not prenom:
                continue
            classe, niveau = extraire_classe_et_niveau(classe_raw)

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
                    'matricule': matricule_effectif, 'nom': nom, 'prenom': prenom,
                    'classe': classe, 'niveau': niveau
                }).execute()
                print(f"   ✨ {prenom} {nom} → matricule {matricule_effectif}")
                total_crees += 1
            matricules_presents.append(matricule_effectif)

            matricule_to_raw[matricule_effectif] = {
                'classe': classe, 'sexe': sexe,
                'opt1': opt1, 'opt2': opt2, 'opt3': opt3, 'opt4': opt4, 'opt5': opt5,
            }

            if sexe == 'G':
                options_data.append((next_id_options, matricule_effectif, 'EP', 'Garçon'))
                next_id_options += 1; total_options += 1
            elif sexe == 'F':
                options_data.append((next_id_options, matricule_effectif, 'EP', 'Fille'))
                next_id_options += 1; total_options += 1

            for j, opt in enumerate([opt1, opt2, opt3], 1):
                if opt:
                    norm = normaliser_valeur(opt)
                    options_data.append((next_id_options, matricule_effectif, f'LM{j}', CONVERSION.get(norm, norm)))
                    next_id_options += 1; total_options += 1

            if opt4:
                norm = normaliser_valeur(opt4)
                options_data.append((next_id_options, matricule_effectif, 'Philo', CONVERSION.get(norm, norm)))
                next_id_options += 1; total_options += 1

            if opt5:
                code_clean = opt5.strip().upper().strip('"\'')
                if code_clean not in CODES_SANS_OPTION:
                    if code_clean in OPTION_DECOMPOSITIONS:
                        for t, v in OPTION_DECOMPOSITIONS[code_clean]:
                            options_data.append((next_id_options, matricule_effectif, t, v))
                            next_id_options += 1; total_options += 1
                    else:
                        options_data.append((next_id_options, matricule_effectif, 'Option', opt5))
                        next_id_options += 1; total_options += 1

            if groupes_str:
                for g in groupes_str.split(','):
                    gn = normaliser_groupe(g)
                    if gn:
                        groupes_data.append((next_id_groups, matricule_effectif, gn))
                        next_id_groups += 1; total_groupes += 1

            if classe:
                if not any(g[2] == classe for g in groupes_data if g[1] == matricule_effectif):
                    groupes_data.append((next_id_groups, matricule_effectif, classe))
                    next_id_groups += 1; total_groupes += 1

            total_eleves += 1
        except Exception as e:
            print(f"   ⚠️  ligne {i}: {e}")

    print(f"\n   ✅ {total_eleves} élèves ({total_crees} créés, {total_mis_a_jour} MAJ)")
    print(f"   ✅ {total_options} options, {total_groupes} groupes (base)")

    groupes_supp = completer_students_groups(matricule_to_raw, next_id_groups)
    if groupes_supp:
        groupes_data.extend(groupes_supp)
        total_groupes += len(groupes_supp)
        print(f"   ✅ Total groupes après complétion : {total_groupes}")

    print("\n   🗑️  Vidage (en préservant les protégés)...")
    try:
        if matricules_preserves:
            supabase_service.table('students_options').delete().not_.in_('matricule', matricules_preserves).execute()
        else:
            supabase_service.table('students_options').delete().neq('matricule', 0).execute()
    except Exception as e:
        print(f"      ⚠️  Options: {e}")
    try:
        if matricules_preserves:
            supabase_service.table('students_groups').delete().not_.in_('matricule', matricules_preserves).execute()
        else:
            supabase_service.table('students_groups').delete().neq('matricule', 0).execute()
    except Exception as e:
        print(f"      ⚠️  Groupes: {e}")

    print("   📤 Insertion options...")
    for i in range(0, len(options_data), 100):
        batch = options_data[i:i + 100]
        try:
            supabase_service.table('students_options').insert([
                {'id': idv, 'matricule': m, 'type_option': t, 'valeur_option': v}
                for idv, m, t, v in batch
            ]).execute()
        except Exception as e:
            print(f"      ❌ {e}")

    print("   📤 Insertion groupes...")
    for i in range(0, len(groupes_data), 100):
        batch = groupes_data[i:i + 100]
        try:
            supabase_service.table('students_groups').insert([
                {'id': idv, 'matricule': m, 'groupe_code': g} for idv, m, g in batch
            ]).execute()
        except Exception as e:
            print(f"      ❌ {e}")

    print("\n   🧹 Nettoyage élèves absents...")
    if matricules_presents:
        try:
            presents_set = set(matricules_presents)
            ids_a_nettoyer = [
                r['matricule'] for r in fetch_all('students', select='matricule, nom',
                                                   order_by=('matricule', False))
                if r['matricule'] not in presents_set and not est_testeur(r.get('nom', ''))
            ]
            for m in ids_a_nettoyer:
                supabase_service.table('students').update({'classe': None, 'niveau': 0}).eq('matricule', m).execute()
            print(f"   ✅ {len(ids_a_nettoyer)} élèves absents → classe=NULL, niveau=0")
        except Exception as e:
            print(f"      ⚠️  {e}")


# ============================================================================
# PHASE 3 : EXP_COURS
# ============================================================================

def importer_cours(employees_cache: List, mapping_profs: Dict) -> Set[str]:
    print("\n" + "=" * 60)
    print("📚 IMPORT DES COURS")
    if VIDER_COURSES:
        print("   ⚠️  VIDER_COURSES=True")
    print("=" * 60)

    try:
        with open(FICHIER_COURS, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"   ❌ Fichier {FICHIER_COURS} non trouvé!")
        return set()

    reader = csv.reader(StringIO(content), delimiter=';')
    rows = list(reader)
    print(f"   {len(rows)} lignes lues")

    if VIDER_COURSES:
        print("\n   🗑️  Vidage de courses...")
        try:
            supabase_service.table('courses').delete().neq('cours_id', 0).execute()
            print("      ✅ Vidée")
        except Exception as e:
            print(f"      ⚠️  {e}")

    try:
        r = supabase_anon.table('courses').select('cours_id').order('cours_id', desc=True).limit(1).execute()
        max_id = int(r.data[0]['cours_id']) if r.data else 0
    except Exception:
        max_id = 0
    cours_id_next = max_id + 1
    print(f"   📊 Prochain cours_id: {cours_id_next}")

    courses_data = []
    profs_references = set()
    cours_count = 0

    for i, row in enumerate(rows[1:], 1):
        if MODE_TEST and cours_count >= LIMITE_COURS:
            break
        if len(row) < 9:
            continue
        try:
            duree, mat_code, mat_libelle = row[0].strip(), row[1].strip(), row[2].strip()
            prof_nom, prof_prenom = row[3].strip(), row[4].strip()
            classe_pattern = row[5].strip()
            jour, h_debut = row[7].strip(), row[8].strip()
            if not prof_nom and not prof_prenom:
                continue

            prof_ids = []
            noms = [n.strip() for n in prof_nom.split(',') if n.strip()]
            prenoms = [p.strip() for p in prof_prenom.split(',') if p.strip()]
            for j, n in enumerate(noms):
                p = prenoms[j] if j < len(prenoms) else ''
                if n and p:
                    pid = get_or_create_professeur(n, p, mapping_profs, employees_cache)
                    if pid:
                        prof_ids.append(pid)
                        profs_references.add(pid)

            groupe = extraire_groupe(classe_pattern)
            if not classe_pattern:
                matiere, salle = '', 'externe'
            else:
                salle = ''
                matiere = mat_libelle or mat_code

            courses_data.append({
                'cours_id': cours_id_next,
                'jour': jour, 'heure_debut': h_debut,
                'heure_fin': calculer_heure_fin(h_debut, duree),
                'prof': json.dumps(prof_ids, ensure_ascii=False),
                'matiere': matiere, 'salle': salle, 'groupe': groupe,
                'annee_scolaire': ANNEE_SCOLAIRE_LABEL,
            })
            cours_id_next += 1
            cours_count += 1
        except Exception as e:
            print(f"   ⚠️  ligne {i}: {e}")

    print(f"\n   ✅ {len(courses_data)} cours extraits")
    print(f"   ✅ {len(profs_references)} profs référencés")

    sauvegarder_mapping(mapping_profs, FICHIER_MAPPING_PROFS)
    sauvegarder_mapping(MAPPING_GROUPES, FICHIER_MAPPING_GROUPES)

    print("\n   📤 Insertion des cours...")
    for i in range(0, len(courses_data), 100):
        try:
            supabase_service.table('courses').insert(courses_data[i:i + 100]).execute()
        except Exception as e:
            print(f"      ❌ {e}")

    print(f"\n✅ Import cours terminé: {len(courses_data)} cours")
    return profs_references


# ============================================================================
# PHASE 4 : COURS LOGIQUES
# ============================================================================

def _parser_prof_field(prof_field) -> List[str]:
    if not prof_field:
        return []
    try:
        arr = json.loads(prof_field) if isinstance(prof_field, str) else prof_field
        if not isinstance(arr, list):
            return []
        return [str(x) for x in arr if x]
    except Exception:
        return []


def detecter_groupes_orphelins() -> Set[str]:
    try:
        rows_c = fetch_all(
            'courses',
            select='groupe',
            filters=[('eq', 'annee_scolaire', ANNEE_SCOLAIRE_LABEL)],
            order_by=('cours_id', False),
        )
        groupes_courses = {(r.get('groupe') or '').strip() for r in rows_c if (r.get('groupe') or '').strip()}

        rows_sg = fetch_all(
            'students_groups',
            select='groupe_code',
            order_by=('matricule', False),
        )
        groupes_eleves = {(r.get('groupe_code') or '').strip() for r in rows_sg if (r.get('groupe_code') or '').strip()}

        return groupes_courses - groupes_eleves
    except Exception as e:
        print(f"   ⚠️  {e}")
        return set()


def creer_cours_logiques() -> Set[str]:
    print("\n" + "=" * 60)
    print("🎓 GÉNÉRATION DES COURS LOGIQUES")
    print(f"   Année : {ANNEE_SCOLAIRE_LABEL}")
    print("=" * 60)

    # -----------------------------------------------------------------
    # 1. Charger toutes les plages (paginé + ordonné)
    # -----------------------------------------------------------------
    try:
        courses = fetch_all(
            'courses',
            select='cours_id, matiere, groupe, prof, annee_scolaire',
            filters=[('eq', 'annee_scolaire', ANNEE_SCOLAIRE_LABEL)],
            order_by=('cours_id', False),
        )
    except Exception as e:
        print(f"   ❌ {e}")
        return set()
    print(f"\n   {len(courses)} plages horaires chargées")

    # -----------------------------------------------------------------
    # 2. Classifier
    # -----------------------------------------------------------------
    a_traiter = []
    stats = {'B': 0, 'C': 0, 'E': 0}
    for c in courses:
        m = (c.get('matiere') or '').strip()
        g = (c.get('groupe') or '').strip()
        if m == 'Conseil de la classe':
            stats['B'] += 1; continue
        if not m and g:
            stats['E'] += 1; continue
        if not m or not g:
            stats['C'] += 1; continue
        a_traiter.append(c)
    print(f"   Cat. A+D : {len(a_traiter)} | Ignorés → Conseil: {stats['B']}, "
          f"Externes: {stats['C']}, Sans matière: {stats['E']}")

    groupes_cours: Dict[Tuple[str, str, str], List[Dict]] = {}
    for c in a_traiter:
        groupes_cours.setdefault((c['matiere'], c['groupe'], c['annee_scolaire']), []).append(c)
    print(f"   Cours logiques attendus : {len(groupes_cours)}")

    # -----------------------------------------------------------------
    # 3. Charger cours logiques existants (paginé + ordonné)
    # -----------------------------------------------------------------
    try:
        existants = fetch_all(
            'cours_logiques',
            select='id, matiere, groupe_pedagogique, annee_scolaire',
            filters=[('eq', 'annee_scolaire', ANNEE_SCOLAIRE_LABEL)],
            order_by=('id', False),
        )
    except Exception as e:
        print(f"   ❌ {e}")
        return set()

    index_existants: Dict[Tuple[str, str, str], str] = {}
    for cl in existants:
        index_existants[(cl['matiere'], cl['groupe_pedagogique'], cl['annee_scolaire'])] = cl['id']
    nb_preserves = len(existants)
    print(f"   {nb_preserves} cours logiques existants")

    # -----------------------------------------------------------------
    # 4. Créer les manquants
    # -----------------------------------------------------------------
    a_creer = []
    for cle in groupes_cours:
        if cle not in index_existants:
            m, g, a = cle
            a_creer.append({
                'matiere': m, 'groupe_pedagogique': g,
                'annee_scolaire': a, 'nom_affichage': f"{m} {g}",
            })

    nb_crees = 0
    if a_creer:
        print(f"\n   📝 Création de {len(a_creer)} cours logiques...")
        for i in range(0, len(a_creer), 100):
            batch = a_creer[i:i + 100]
            try:
                r = supabase_service.table('cours_logiques').insert(batch).execute()
                for cl in (r.data or []):
                    index_existants[(cl['matiere'], cl['groupe_pedagogique'], cl['annee_scolaire'])] = cl['id']
                    nb_crees += 1
            except Exception as e:
                print(f"      ❌ batch {i // 100 + 1}: {e}")
        print(f"      ✅ {nb_crees} créés")
    else:
        print("\n   ✅ Aucun nouveau cours logique à créer")

    # -----------------------------------------------------------------
    # 5. Lier les plages
    # -----------------------------------------------------------------
    print(f"\n   🔗 Liaison des plages...")
    try:
        rows = fetch_all(
            'courses',
            select='cours_id, cours_logique_id',
            filters=[('eq', 'annee_scolaire', ANNEE_SCOLAIRE_LABEL)],
            order_by=('cours_id', False),
        )
        cours_id_to_existing = {r['cours_id']: r.get('cours_logique_id') for r in rows}
    except Exception as e:
        print(f"      ⚠️  {e}")
        cours_id_to_existing = {}

    liaisons_ok = 0
    liaisons_faites = 0
    non_liees = 0
    for c in a_traiter:
        cle = (c['matiere'], c['groupe'], c['annee_scolaire'])
        cl_id = index_existants.get(cle)
        if not cl_id:
            non_liees += 1
            continue
        cid = c['cours_id']
        if cours_id_to_existing.get(cid) == cl_id:
            liaisons_ok += 1
            continue
        try:
            supabase_service.table('courses').update({'cours_logique_id': cl_id}).eq('cours_id', cid).execute()
            liaisons_faites += 1
            liaisons_ok += 1
        except Exception as e:
            print(f"      ⚠️  cours_id {cid} : {e}")
    print(f"      ✅ {liaisons_ok} liées ({liaisons_faites} MAJ)")

    # -----------------------------------------------------------------
    # 6. Nettoyer les cours logiques obsolètes
    # -----------------------------------------------------------------
    ids_obsoletes: Set[str] = set()
    if NETTOYER_COURS_LOGICIQUES_OBSOLETES:
        print(f"\n   🧹 Nettoyage cours logiques obsolètes...")
        try:
            tous_cl = fetch_all(
                'cours_logiques',
                select='id, matiere, groupe_pedagogique, annee_scolaire',
                filters=[('eq', 'annee_scolaire', ANNEE_SCOLAIRE_LABEL)],
                order_by=('id', False),
            )
        except Exception as e:
            print(f"      ⚠️  {e}")
            tous_cl = []

        cles_references = set(groupes_cours.keys())

        for cl in tous_cl:
            m = (cl.get('matiere') or '').strip()
            g = (cl.get('groupe_pedagogique') or '').strip()
            cle = (m, g, cl['annee_scolaire'])
            raison = None
            if m == 'Conseil de la classe':
                raison = 'Conseil'
            elif not m or not g:
                raison = 'Matière ou groupe vide'
            elif cle not in cles_references:
                raison = 'Orphelin'
            if raison:
                ids_obsoletes.add(cl['id'])

        if ids_obsoletes:
            print(f"      {len(ids_obsoletes)} cours logiques obsolètes détectés")
            n_assoc = delete_by_values_in_batches('cours_logiques_profs', 'cours_logique_id', list(ids_obsoletes))
            print(f"      🗑️  {n_assoc} associations supprimées")
            n_cl = delete_by_values_in_batches('cours_logiques', 'id', list(ids_obsoletes))
            print(f"      🗑️  {n_cl} cours logiques supprimés")
            for k in [k for k, v in index_existants.items() if v in ids_obsoletes]:
                del index_existants[k]
        else:
            print("      ✅ Aucun cours logique obsolète")

    # -----------------------------------------------------------------
    # 7. Charger associations existantes (paginé + ordonné)
    # -----------------------------------------------------------------
    print(f"\n   👥 Associations profs ↔ cours logiques...")
    try:
        assoc_existantes = fetch_all(
            'cours_logiques_profs',
            select='cours_logique_id, employee_id, role',
            order_by=('cours_logique_id', False),
        )
    except Exception as e:
        print(f"      ❌ {e}")
        assoc_existantes = []
    assoc_set = {(a['cours_logique_id'], a['employee_id']) for a in assoc_existantes}
    print(f"      {len(assoc_existantes)} associations existantes")

    # -----------------------------------------------------------------
    # 8. Calculer les associations à créer (upsert idempotent)
    # -----------------------------------------------------------------
    profs_par_cl: Dict[str, Set[str]] = {}
    for cle, list_courses in groupes_cours.items():
        cl_id = index_existants.get(cle)
        if not cl_id:
            continue
        profs = set()
        for c in list_courses:
            profs.update(_parser_prof_field(c.get('prof')))
        if profs:
            profs_par_cl.setdefault(cl_id, set()).update(profs)

    assoc_a_creer = []
    cl_sans_prof = 0
    for cl_id, profs in profs_par_cl.items():
        if not profs:
            cl_sans_prof += 1
            continue
        for emp_id in profs:
            if (cl_id, emp_id) not in assoc_set:
                assoc_a_creer.append({
                    'cours_logique_id': cl_id, 'employee_id': emp_id, 'role': 'prof',
                })

    nb_assoc_crees = 0
    erreurs = 0
    if assoc_a_creer:
        print(f"      📝 {len(assoc_a_creer)} associations à créer (upsert)...")
        for assoc in assoc_a_creer:
            try:
                supabase_service.table('cours_logiques_profs') \
                    .upsert(assoc, on_conflict='cours_logique_id,employee_id') \
                    .execute()
                nb_assoc_crees += 1
            except Exception as e:
                erreurs += 1
                if erreurs <= 5:
                    print(f"      ⚠️  {assoc['cours_logique_id'][:8]}/{assoc['employee_id'][:8]}: {e}")
        print(f"      ✅ {nb_assoc_crees} créées, {erreurs} échecs")
    else:
        print("      ✅ Aucune nouvelle association")

    # -----------------------------------------------------------------
    # 9. Détection groupes orphelins
    # -----------------------------------------------------------------
    orphelins = detecter_groupes_orphelins()
    if orphelins:
        print(f"\n   ⚠️  {len(orphelins)} groupe(s) orphelin(s) :")
        for g in sorted(orphelins):
            print(f"      • {g}")
    else:
        print(f"\n   ✅ Aucun groupe orphelin")

    # -----------------------------------------------------------------
    # 10. Refresh vue
    # -----------------------------------------------------------------
    print(f"\n   🔄 Refresh v_course_teachers...")
    refresh_ok = False
    try:
        supabase_service.rpc('refresh_v_course_teachers').execute()
        refresh_ok = True
        print("      ✅ Vue rafraîchie (RPC)")
    except Exception:
        pass
    if not refresh_ok:
        try:
            supabase_service.rpc('exec_sql', {
                'query': 'REFRESH MATERIALIZED VIEW CONCURRENTLY v_course_teachers'
            }).execute()
            refresh_ok = True
            print("      ✅ Vue rafraîchie (exec_sql)")
        except Exception:
            print("      ⚠️  Refresh manuel requis : REFRESH MATERIALIZED VIEW CONCURRENTLY v_course_teachers;")

    # -----------------------------------------------------------------
    # 11. Bilan
    # -----------------------------------------------------------------
    print(f"\n   📊 BILAN :")
    print(f"      • Cours logiques préservés : {nb_preserves}")
    print(f"      • Cours logiques créés     : {nb_crees}")
    print(f"      • Cours logiques supprimés : {len(ids_obsoletes) if NETTOYER_COURS_LOGICIQUES_OBSOLETES else 0}")
    print(f"      • Plages liées             : {liaisons_ok}")
    print(f"      • Associations créées      : {nb_assoc_crees}")
    print(f"      • Cours logiques sans prof : {cl_sans_prof}")
    print(f"      • Groupes orphelins        : {len(orphelins)}")

    return orphelins


# ============================================================================
# MAIN
# ============================================================================

def main():
    global MAPPING_GROUPES
    print("=" * 60)
    print("🚀 IMPORT RENTRÉE - SUPABASE")
    print(f"   Année : {ANNEE_SCOLAIRE_LABEL}")
    if MODE_TEST:
        print("   🧪 MODE TEST ACTIF")
    if VIDER_COURSES:
        print("   ⚠️  VIDER_COURSES=True")
    if IMPORTER_ELEVES:
        print("   👨‍🎓 Import des élèves ACTIVÉ")
    else:
        print("   ⏭️  Import des élèves DÉSACTIVÉ")
    if NETTOYER_COURS_LOGICIQUES_OBSOLETES:
        print("   🧹 Nettoyage cours logiques obsolètes ACTIVÉ")
    print("=" * 60)

    print("\n🔍 Chargement des employees (paginé)...")
    try:
        employees_cache = fetch_all(
            'employees',
            select='id, nom, prenom, job',
            order_by=('id', False),
        )
        print(f"   {len(employees_cache)} employees")
    except Exception as e:
        print(f"   ❌ {e}")
        return

    profs_avant_import = {
        emp['id'] for emp in employees_cache
        if emp.get('job') == 'prof' and not est_testeur(emp.get('nom', ''))
    }
    print(f"   📋 {len(profs_avant_import)} profs actuellement en base")

    mapping_profs = charger_mapping(FICHIER_MAPPING_PROFS)
    print(f"   {len(mapping_profs)} mappings profs")
    MAPPING_GROUPES = charger_mapping(FICHIER_MAPPING_GROUPES)
    print(f"   {len(MAPPING_GROUPES)} mappings groupes")

    # Phase 1 : Groupes pédagogiques
    if os.path.exists(FICHIER_GROUPE):
        importer_groupes()
    else:
        print(f"\n⚠️  {FICHIER_GROUPE} absent")

    # Phase 2 : Élèves
    if IMPORTER_ELEVES:
        if os.path.exists(FICHIER_ELEVES):
            importer_eleves(employees_cache)
        else:
            print(f"\n❌ {FICHIER_ELEVES} absent")
    else:
        print("\n⏭️  Import des élèves sauté (IMPORTER_ELEVES=False)")

    # Phase 3 : Cours
    profs_references = set()
    if os.path.exists(FICHIER_COURS):
        profs_references = importer_cours(employees_cache, mapping_profs)
    else:
        print(f"\n❌ {FICHIER_COURS} absent")

    # Phase 4 : Cours logiques
    try:
        creer_cours_logiques()
    except Exception as e:
        print(f"\n⚠️  Erreur creer_cours_logiques : {e}")

    # Phase 5 : Nettoyage profs non référencés
    if profs_references and profs_avant_import:
        print("\n" + "=" * 60)
        print("🧹 NETTOYAGE DES PROFS NON RÉFÉRENCÉS")
        print("=" * 60)
        profs_a_retirer = profs_avant_import - profs_references
        if profs_a_retirer:
            print(f"   {len(profs_a_retirer)} profs → job=NULL")
            for pid in profs_a_retirer:
                try:
                    supabase_service.table('employees').update({'job': None}).eq('id', pid).execute()
                except Exception as e:
                    print(f"      ⚠️  {pid}: {e}")
            print(f"   ✅ {len(profs_a_retirer)} profs retirés")
        else:
            print("   ✅ Aucun prof à retirer")

    print("\n" + "=" * 60)
    print("✅ IMPORT TERMINÉ")
    print("=" * 60)


if __name__ == "__main__":
    main()