"""
Script d'import des données réelles pour l'application de gestion de projets scolaires
- Import des 913 élèves depuis ListesEleves.csv
- Import des horaires depuis les 6 fichiers CSV d'horaires
- Génération des cours et créneaux horaires

Prérequis:
    pip install pandas supabase
"""

import pandas as pd
import re
from supabase import create_client, Client
from typing import Dict, List, Tuple, Optional
import os

# ============================================
# CONFIGURATION SUPABASE
# ============================================
SUPABASE_URL = "https://bjbxatevbcrybsrkgdzx.supabase.co"  # Remplacer par votre URL
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnhhdGV2YmNyeWJzcmtnZHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDg3ODQsImV4cCI6MjA3NTgyNDc4NH0.PTmREL0Nw1FZTgYDsJk72ABObuOabA7eoaztMPdupPE"  # Remplacer par votre clé anon

# Chemin vers vos fichiers CSV (à adapter)
DATA_DIR = "."

# Mapping des périodes (1-10) vers les heures
PERIOD_TIMES = {
    1: ("08:15", "09:05"),
    2: ("09:05", "09:55"),
    3: ("09:55", "10:45"),
    4: ("11:00", "11:50"),
    5: ("11:50", "12:40"),
    6: ("12:40", "13:40"),  # Pause midi (souvent)
    7: ("13:40", "14:30"),
    8: ("14:30", "15:20"),
    9: ("15:20", "16:10"),
    10: ("16:10", "17:00")
}

# Mapping des jours
DAY_MAPPING = {
    "Lundi": 1,
    "Mardi": 2,
    "Mercredi": 3,
    "Jeudi": 4,
    "Vendredi": 5
}

# Fichiers d'horaires
HORAIRE_FILES = [
    "LocalisationWahaAnnexe.csv",
    "LocalisationWaha1etage.csv",
    "LocalisationWaha2etage.csv",
    "LocalisationWaha3etage.csv",
    "LocalisationWaha4etage.csv",
    "LocalisationWaha6etage.csv"
]


# ============================================
# CONNEXION SUPABASE
# ============================================
def init_supabase() -> Client:
    """Initialise la connexion Supabase"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================
# IMPORT DES ÉLÈVES
# ============================================
def import_students(supabase: Client, csv_path: str):
    """Import les 913 élèves depuis le CSV"""
    print("📚 Import des élèves...")
    
    # Lire le CSV
    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    
    # Nettoyer les colonnes
    df.columns = df.columns.str.strip()
    
    students_data = []
    
    for _, row in df.iterrows():
        # Ignorer les lignes de comptage
        if pd.isna(row['Nom Elève']) or str(row['Nom Elève']).startswith('Nombre'):
            continue
        
        # Extraire l'année depuis GrpEl (ex: "1PAA" -> 1)
        grp_el = str(row['GrpEl']).strip()
        annee = int(grp_el[0]) if grp_el and grp_el[0].isdigit() else 0
        
        student = {
            'nom': str(row['Nom Elève']).strip(),
            'prenom': str(row['Prénom Elève']).strip(),
            'annee': annee,
            'classe_principale': grp_el
        }
        students_data.append(student)
    
    # Insérer par batch de 100 pour éviter les timeouts
    batch_size = 100
    total_inserted = 0
    
    for i in range(0, len(students_data), batch_size):
        batch = students_data[i:i+batch_size]
        try:
            result = supabase.table('students').insert(batch).execute()
            total_inserted += len(batch)
            print(f"  ✓ Inséré {total_inserted}/{len(students_data)} élèves")
        except Exception as e:
            print(f"  ✗ Erreur batch {i}: {e}")
    
    print(f"✅ {total_inserted} élèves importés")

def link_students_to_groups(supabase: Client, csv_path: str):
    """Lie chaque élève à TOUS ses groupes (classe + options + philo + langues)"""
    try:
        print("🔗 Liaison complète des élèves aux groupes...")
        
        # Lire le CSV des élèves
        df = pd.read_csv(csv_path, encoding='utf-8-sig')
        df.columns = df.columns.str.strip()
        
        # Récupérer tous les élèves et groupes
        students = supabase.table('students').select('id, nom, prenom, classe_principale').execute()
        groups = supabase.table('groups').select('id, nom_groupe, type').execute()
        
        # Créer des mappings
        group_map = {g['nom_groupe']: g['id'] for g in groups.data}
        student_map = {}  # (nom, prenom, classe) -> student_id
        
        for s in students.data:
            key = (s['nom'].strip(), s['prenom'].strip(), s['classe_principale'])
            student_map[key] = s['id']
        
        # Préparer tous les liens
        all_links = []
        links_set = set()  # Pour éviter les doublons
        
        for _, row in df.iterrows():
            # Ignorer les lignes de comptage
            if pd.isna(row['Nom Elève']) or str(row['Nom Elève']).startswith('Nombre'):
                continue
            
            nom = str(row['Nom Elève']).strip()
            prenom = str(row['Prénom Elève']).strip()
            grp_el = str(row['GrpEl']).strip()
            
            # Trouver l'élève
            student_key = (nom, prenom, grp_el)
            if student_key not in student_map:
                continue
            
            student_id = student_map[student_key]
            groups_to_link = []
            
            # 1. Classe principale
            groups_to_link.append(grp_el)
            
            # 2. Orientation (si différente de la classe)
            orientation = str(row.get('Orientation', '')).strip()
            if orientation and orientation != grp_el and orientation in group_map:
                groups_to_link.append(orientation)
            
            # 3. Cours de philo
            philo = str(row.get('Philo', '')).strip()
            if philo:
                # Extraire l'année depuis GrpEl (ex: "5PAV" -> 5)
                annee = grp_el[0] if grp_el and grp_el[0].isdigit() else ''
                
                # Mapping des codes philo vers les groupes
                philo_groups = {
                    'M': 'CPC',  # Morale -> CPC
                    'C': 'CPC',  # Citoyenneté -> CPC
                    'D': 'CPC',  # Dispensé -> CPC (souvent)
                    'P': 'RC',   # Protestant -> Religion protestante
                    'I': 'RI',   # Islamique -> Religion islamique
                    'O': 'RO',   # Orthodoxe -> Religion orthodoxe
                }
                
                if philo in philo_groups:
                    base_code = philo_groups[philo]
                    # Chercher des groupes qui matchent (ex: "5 - CPC1", "5 - RI", etc.)
                    matching_groups = [g for g in group_map.keys() if base_code in g and g.startswith(annee)]
                    if matching_groups:
                        groups_to_link.append(matching_groups[0])
            
            # 4. Langues modernes
            for lang_col in ['Langue I', 'Langue II', 'Langue III']:
                langue = str(row.get(lang_col, '')).strip()
                if not langue:
                    continue
                
                annee = grp_el[0] if grp_el and grp_el[0].isdigit() else ''
                
                # Mapping des codes de langues
                # A = Anglais, N = Néerlandais, E = Espagnol, D = Allemand, I = Italien
                lang_patterns = {
                    'A': ['LM1 - A', 'LM2 - A', '- AI'],
                    'N': ['LM1 - N', 'LM2 - N', '- N'],
                    'E': ['LM2 - E', 'LM3 - E'],
                    'D': ['LM2 - D', 'LM3 - D', '- DI'],
                    'I': ['LM1 - I', 'LM2 - I', 'LM3 - I']
                }
                
                if langue in lang_patterns:
                    # Chercher les groupes de langues correspondants
                    for pattern in lang_patterns[langue]:
                        matching = [g for g in group_map.keys() if pattern in g and g.startswith(annee)]
                        if matching:
                            groups_to_link.append(matching[0])
                            break  # Prendre le premier match seulement
            
            # Créer les liens (éviter les doublons)
            for group_name in groups_to_link:
                if group_name in group_map:
                    link_key = (student_id, group_map[group_name])
                    if link_key not in links_set:
                        links_set.add(link_key)
                        all_links.append({
                            'student_id': student_id,
                            'group_id': group_map[group_name]
                        })
        
        print(f"  📊 {len(all_links)} liens à créer...")
        
        # Insérer par batch
        batch_size = 100
        total_inserted = 0
        
        for i in range(0, len(all_links), batch_size):
            batch = all_links[i:i+batch_size]
            try:
                supabase.table('student_groups').insert(batch).execute()
                total_inserted += len(batch)
                print(f"    ✓ Inséré {total_inserted}/{len(all_links)} liens")
            except Exception as e:
                # Ignorer les erreurs de doublons
                if 'duplicate key' not in str(e):
                    print(f"    ⚠️  Erreur batch {i}: {e}")
        
        print(f"✅ {total_inserted} liens élèves-groupes créés")
        
    except Exception as e:
        print(f"✗ Erreur liaison complète: {e}")

# ============================================
# PARSING DES HORAIRES
# ============================================
def parse_cell_content(cell_content: str) -> Tuple[Optional[str], str]:
    """
    Parse le contenu d'une cellule d'horaire
    Retourne: (nom_prof, code_groupe)
    
    Exemples:
    - "5PAV" -> (None, "5PAV")
    - "Belloi - 4PAU" -> ("Belloi", "4PAU")
    - "Hervelle - 5 - LM2 - E4" -> ("Hervelle", "5 - LM2 - E4")
    """
    if pd.isna(cell_content) or str(cell_content).strip() == '':
        return None, ''
    
    content = str(cell_content).strip()
    
    # Cas spéciaux à ignorer
    if content in ['CdlC', 'ADN', 'Midi', ''] or content.startswith('CdlC ') or content.startswith('Midi '):
        return None, ''
    
    # Chercher le pattern "NomProf - CodeGroupe"
    if ' - ' in content:
        parts = content.split(' - ', 1)
        prof_name = parts[0].strip()
        group_code = parts[1].strip()
        
        # Vérifier que le prof n'est pas juste un chiffre ou un code de groupe
        if prof_name and not prof_name[0].isdigit():
            return prof_name, group_code
        else:
            return None, content
    
    return None, content

def extract_course_name(group_code: str) -> str:
    """
    Extrait un nom de cours depuis un code de groupe
    
    Exemples:
    - "5 - LM2 - E4" -> "Langues modernes 2 - Espagnol"
    - "4 - Sc1" -> "Sciences"
    - "6PAV" -> "Cours classe"
    """
    # Groupes de langues
    if 'LM1' in group_code:
        if 'AI' in group_code:
            return "Langues modernes 1 - Anglais immersion"
        elif 'DI' in group_code:
            return "Langues modernes 1 - Allemand immersion"
        elif 'NI' in group_code:
            return "Langues modernes 1 - Néerlandais immersion"
        elif ' - A' in group_code:
            return "Langues modernes 1 - Anglais"
        elif ' - N' in group_code:
            return "Langues modernes 1 - Néerlandais"
        elif ' - I' in group_code:
            return "Langues modernes 1 - Italien"
    
    if 'LM2' in group_code:
        if ' - A' in group_code:
            return "Langues modernes 2 - Anglais"
        elif ' - E' in group_code:
            return "Langues modernes 2 - Espagnol"
        elif ' - N' in group_code:
            return "Langues modernes 2 - Néerlandais"
        elif ' - I' in group_code:
            return "Langues modernes 2 - Italien"
        elif ' - D' in group_code:
            return "Langues modernes 2 - Allemand"
    
    if 'LM3' in group_code:
        if ' - E' in group_code:
            return "Langues modernes 3 - Espagnol"
        elif ' - D' in group_code:
            return "Langues modernes 3 - Allemand"
    
    # Sciences
    if 'Sc' in group_code or 'Labo' in group_code:
        if 'ScOp' in group_code:
            return "Sciences option"
        return "Sciences"
    
    # Mathématiques
    if ' - M' in group_code or group_code.startswith('M'):
        if 'M4h' in group_code:
            return "Mathématiques 4h"
        elif 'M6h' in group_code:
            return "Mathématiques 6h"
        elif 'M+' in group_code:
            return "Mathématiques renforcé"
        return "Mathématiques"
    
    # Histoire/Géographie
    if 'HG' in group_code or ' - H' in group_code or 'Hop' in group_code:
        return "Histoire-Géographie"
    
    # Sciences humaines
    if ' - EC' in group_code:
        return "Sciences économiques"
    if ' - SO' in group_code:
        return "Sciences sociales"
    if 'Commu' in group_code:
        return "Communication"
    
    # Religion/Philo
    if 'CPC' in group_code:
        return "Cours philosophique et de citoyenneté"
    if ' - RC' in group_code:
        return "Religion catholique"
    if ' - RI' in group_code:
        return "Religion islamique"
    if ' - RO' in group_code:
        return "Religion orthodoxe"
    if ' - RP' in group_code:
        return "Religion protestante"
    
    # Langues simples
    if ' - AI' in group_code or group_code.endswith('AI'):
        return "Anglais immersion"
    if ' - A' in group_code:
        return "Anglais"
    if ' - N' in group_code:
        return "Néerlandais"
    if ' - DI' in group_code or 'DI' in group_code:
        return "Allemand immersion"
    if ' - NI' in group_code or 'NI' in group_code:
        return "Néerlandais immersion"
    
    # Latin
    if 'Latin' in group_code or ' - L' in group_code:
        return "Latin"
    
    # Remédiation
    if 'REM' in group_code:
        return "Remédiation"
    
    # Classe principale (codes du type 4PAU, 5PAV, etc.)
    if re.match(r'^\d+PA[A-Z]$', group_code):
        return "Cours classe"
    
    # Par défaut
    return "Cours général"

def import_schedules(supabase: Client, data_dir: str):
    """Import les horaires depuis tous les CSV"""
    print("📅 Import des horaires...")
    
    # Récupérer les profs et groupes existants
    profs = supabase.table('users').select('id, nom').eq('role', 'prof').execute()
    prof_map = {p['nom'].lower(): p['id'] for p in profs.data}
    
    groups = supabase.table('groups').select('id, nom_groupe').execute()
    group_map = {g['nom_groupe']: g['id'] for g in groups.data}
    
    all_courses = {}  # (nom_cours, prof_id) -> course_id
    all_schedules = []
    
    for filename in HORAIRE_FILES:
        filepath = os.path.join(data_dir, filename)
        print(f"  📖 Traitement de {filename}...")
        
        try:
            # Lire le CSV
            df = pd.read_csv(filepath, header=None)
            
            # Les 4 premières lignes sont les en-têtes (locaux, équipements, etc.)
            # Les colonnes sont : Jour | Heure | Local1 | Local2 | ...
            
            # Extraire les noms de locaux depuis la ligne 1
            rooms = df.iloc[0, 2:].tolist()  # Colonne 2+ = locaux
            
            # Parser les données d'horaires (lignes 5+)
            current_day = None
            
            for idx, row in df.iloc[4:].iterrows():
                # Colonne 0 = Jour (Lundi, Mardi, etc.)
                if pd.notna(row[0]) and str(row[0]).strip():
                    current_day = str(row[0]).strip()
                
                # Colonne 1 = Période (1-10)
                if pd.notna(row[1]):
                    try:
                        period = int(row[1])
                    except:
                        continue
                    
                    if period not in PERIOD_TIMES or current_day not in DAY_MAPPING:
                        continue
                    
                    day_num = DAY_MAPPING[current_day]
                    start_time, end_time = PERIOD_TIMES[period]
                    
                    # Parser chaque local (colonnes 2+)
                    for room_idx, cell in enumerate(row[2:]):
                        if pd.isna(cell) or str(cell).strip() == '':
                            continue
                        
                        prof_name, group_code = parse_cell_content(cell)
                        
                        if not group_code or group_code not in group_map:
                            continue
                        
                        # Déterminer le prof
                        prof_id = None
                        if prof_name:
                            prof_key = prof_name.lower()
                            prof_id = prof_map.get(prof_key)
                        
                        # Créer ou récupérer le cours
                        course_name = extract_course_name(group_code)
                        course_key = (course_name, prof_id)
                        
                        if course_key not in all_courses:
                            # Créer le cours
                            course_data = {
                                'nom_cours': course_name,
                                'prof_id': prof_id
                            }
                            try:
                                result = supabase.table('courses').insert(course_data).execute()
                                all_courses[course_key] = result.data[0]['id']
                            except Exception as e:
                                print(f"    ⚠️  Erreur création cours: {e}")
                                continue
                        
                        course_id = all_courses[course_key]
                        group_id = group_map[group_code]
                        
                        # Créer l'horaire
                        schedule = {
                            'group_id': group_id,
                            'course_id': course_id,
                            'jour_semaine': day_num,
                            'heure_debut': start_time,
                            'heure_fin': end_time
                        }
                        all_schedules.append(schedule)
        
        except Exception as e:
            print(f"  ✗ Erreur avec {filename}: {e}")
    
    # Insérer tous les horaires par batch
    print(f"  💾 Insertion de {len(all_schedules)} créneaux horaires...")
    batch_size = 100
    total_inserted = 0
    
    for i in range(0, len(all_schedules), batch_size):
        batch = all_schedules[i:i+batch_size]
        try:
            supabase.table('schedule').insert(batch).execute()
            total_inserted += len(batch)
            print(f"    ✓ Inséré {total_inserted}/{len(all_schedules)} horaires")
        except Exception as e:
            print(f"    ✗ Erreur batch {i}: {e}")
    
    print(f"✅ {len(all_courses)} cours et {total_inserted} horaires créés")

# ============================================
# MAIN
# ============================================
def main():
    print("=" * 60)
    print("🚀 IMPORT DES DONNÉES RÉELLES")
    print("=" * 60)
    
    # Connexion Supabase
    print("\n🔌 Connexion à Supabase...")
    supabase = init_supabase()
    print("✅ Connecté")
    
    # Import des élèves
    print("\n" + "=" * 60)
    students_file = os.path.join(DATA_DIR, "ListesEleves.csv")
    if os.path.exists(students_file):
        import_students(supabase, students_file)
    else:
        print(f"⚠️  Fichier non trouvé: {students_file}")
    
    # Import des horaires
    print("\n" + "=" * 60)
    import_schedules(supabase, DATA_DIR)
    
    print("\n" + "=" * 60)
    print("✅ IMPORT TERMINÉ")
    print("=" * 60)

if __name__ == "__main__":
    main()