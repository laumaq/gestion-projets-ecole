import csv
import re
import json
from io import StringIO
import requests

print("="*60)
print("SCRIPT IMPORT COURS - VERSION FINALE AVEC DICTIONNAIRE")
print("="*60)

# ============================================================================
# CONFIGURATION
# ============================================================================
HORAIRES_PERIODES = {
    1: ("08:15", "09:05"),
    2: ("09:05", "09:55"),
    3: ("09:55", "10:45"),
    4: ("11:00", "11:50"),
    5: ("11:50", "12:40"),
    6: ("12:40", "13:30"),
    7: ("13:40", "14:30"),
    8: ("14:30", "15:20"),
    9: ("15:20", "16:10"),
    10: ("16:10", "17:00")
}

URL_COURS = "https://raw.githubusercontent.com/laumaq/gestion-projets-ecole/main/data/EXP_COURS%20-%202025-12-05.txt"

# ============================================================================
# DICTIONNAIRE DE TRADUCTION DES MATIÈRES
# ============================================================================
DICT_MATIERES = {
    # Format: "CODE_SOURCE": "Nom normalisé"
    'ACPH': 'Physique Option',
    'ALLEMAND LM2': 'Allemand LM2',
    'ALLEMAND LM3': 'Allemand LM3',
    'ALP ANGLAIS': 'ALP Anglais',
    'ALP Allemand': 'ALP Allemand',
    'ALP Néerlandais': 'ALP Néerlandais',
    'ANGLAIS LM1': 'Anglais LM1',
    'ANGLAIS LM2': 'Anglais LM2',
    'BIO': 'Bio',
    'BIO opt.': 'Bio Option',
    'CHIMIE': 'Chimie',
    'CHIMIE opt.': 'Chimie Option',
    'COMMU': 'Communication',
    'CONSEIL': 'Conseil de la classe',
    'CPC1': 'CPC1',
    'CPC2': 'CPC2',
    'DESSIN': 'Dessin',
    'EducTECH': 'Educ Tech',
    'ESPAGNOL LM2': 'Espagnol LM2',
    'ESPAGNOL LM3': 'Espagnol LM3',
    'FRANÇAIS': 'Français',
    'GYM': 'Gym',
    'GÉO': 'Géo',
    'GÉO AI': 'Géo AI',
    'GÉO DI': 'Géo DI',
    'GÉO NI': 'Géo NI',
    'HIST': 'Histoire',
    'HIST AI': 'Histoire AI',
    'HIST DI': 'Histoire DI',
    'HIST NI': 'Histoire NI',
    'HIST opt.': 'Histoire Option',
    'Imm. Allemand': 'Immersion Allemand',
    'Imm. Néerlandais': 'Immersion Néerlandais',
    'Imm. Anglais': 'Immersion Anglais',
    'ITALIEN LM2': 'Italien LM2',
    'ITALIEN LM3': 'Italien LM3',
    'LABO Bio': 'Labo Bio',
    'LATIN': 'Latin',
    'LECTURE': 'Lecture',
    'MATH': 'Math',
    'MATH4': 'Math',
    'MATH6': 'Math Option',
    'MORALE': 'Morale',
    'MUSIQUE': 'Musique',
    'NÉERLANDAIS LM1': 'Néerlandais LM1',
    'NÉERLANDAIS LM2': 'Néerlandais LM2',
    'NÉERLANDAIS LM3': 'Néerlandais LM3',
    'PESM': 'PESM',
    'PHY opt.': 'Physique Option',
    'PHYSIQUE': 'Physique',
    'Rel. Cath.': 'Religion Catholique',
    'Rel. Islam.': 'Religion Islamique',
    'Rel. Ortho.': 'Religion Orthodoxe',
    'Rel. Prot.': 'Religion Protestante',
    'REM2': 'Remédiation 2eme',
    'SC. ECO.': 'Sciences éco',
    'SC. SOC.': 'Sciences sociales',
    'SCI AI': 'Sciences Anglais Immersion',
    'SCI DI': 'Sciences Allemand Immersion',
    'SCI NI': 'Sciences Néerlandais Immersion',
    'SCIENCES': 'Sciences',
    
    # Variantes et abréviations
    'PHYSIQUE opt.': 'Physique Option',
    'PHYSIQUE ScOp': 'Physique Option',
    'PHYSIQUE SCO': 'Physique Option',
    'PHYSIQUE SCOP': 'Physique Option',
}

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================
def telecharger_fichier(url):
    """Télécharge le fichier depuis GitHub avec UTF-16 LE"""
    print(f"Téléchargement depuis {url}")
    try:
        response = requests.get(url)
        response.encoding = 'utf-16-le'
        content = response.text
        
        if content.startswith('\ufeff'):
            content = content[1:]
            
        return content
    except Exception as e:
        print(f"ERREUR téléchargement: {e}")
        try:
            with open('EXP_COURS.txt', 'r', encoding='utf-16-le') as f:
                content = f.read()
                if content.startswith('\ufeff'):
                    content = content[1:]
                return content
        except:
            print("ERREUR: Impossible de lire le fichier")
            exit(1)

def duree_en_periodes(duree_str):
    """Convertit '1h00' en 1 période, '4h00' en 4 périodes"""
    if not duree_str:
        return 1
    
    duree_str = duree_str.strip()
    
    try:
        if 'h' in duree_str:
            heures_str = duree_str.split('h')[0]
            return int(heures_str)
        else:
            return int(duree_str)
    except:
        return 1

def normaliser_matiere(matiere, alertes_set):
    """Normalise le nom de la matière avec dictionnaire et alertes"""
    if not matiere:
        return ""
    
    matiere_originale = matiere.strip()
    matiere_upper = matiere_originale.upper()
    
    # Chercher d'abord une correspondance exacte
    if matiere_originale in DICT_MATIERES:
        return DICT_MATIERES[matiere_originale]
    
    if matiere_upper in DICT_MATIERES:
        return DICT_MATIERES[matiere_upper]
    
    # Chercher une correspondance partielle
    for source, trad in DICT_MATIERES.items():
        source_upper = source.upper()
        if source_upper in matiere_upper or matiere_upper in source_upper:
            return trad
    
    # Si pas trouvé, alerte
    if matiere_originale and matiere_originale not in alertes_set:
        alertes_set.add(matiere_originale)
        print(f"   ⚠️  Matière non reconnue: '{matiere_originale}'")
        print(f"      Veuillez ajouter au dictionnaire DICT_MATIERES")
    
    return matiere_originale

def extraire_groupe_principal(pattern):
    """
    Extrait le groupe principal d'un pattern.
    Pour "2PAA+ 2PAB+ 2PAC..." retourne "2PAA+2PAB+2PAC..."
    """
    if not pattern:
        return "", False, []
    
    # 1. Chercher un groupe complexe: "[xxx]"
    match_complexe = re.search(r'(\[[^\]]+\])', pattern)
    if match_complexe:
        groupe_principal = match_complexe.group(1)
        
        details = []
        parties = [p.strip() for p in pattern.split('+') if p.strip()]
        
        for partie in parties:
            if match_complexe.group(1) in partie:
                details.append(partie)
        
        return groupe_principal, True, details
    
    # 2. Chercher TOUTES les classes simples
    classes = re.findall(r'\b\dPA[A-Z]\b', pattern)
    if classes:
        if len(classes) == 1:
            return classes[0], False, []
        else:
            # Plusieurs classes: on retourne l'union
            # "2PAA+2PAB+2PAC..." (sans espaces)
            groupe_union = '+'.join(classes)
            return groupe_union, False, []
    
    # 3. Pattern vide ou non reconnu
    return "", False, []

def parser_profs(prof_nom, prof_prenom):
    """Parse les noms et prénoms multiples en JSON arrays"""
    noms = []
    prenoms = []
    
    if prof_nom and '+' in prof_nom:
        noms = [n.strip() for n in prof_nom.split('+')]
    elif prof_nom:
        noms = [prof_nom.strip()]
    
    if prof_prenom and '+' in prof_prenom:
        prenoms = [p.strip() for p in prof_prenom.split('+')]
    elif prof_prenom:
        prenoms = [prof_prenom.strip()]
    
    return json.dumps(noms, ensure_ascii=False), json.dumps(prenoms, ensure_ascii=False)

# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================
def main():
    # 1. Télécharger
    print("1. Téléchargement...")
    content = telecharger_fichier(URL_COURS)
    
    # 2. Parser ligne par ligne
    print("2. Parsing des lignes...")
    lines = content.split('\n')
    
    # Nettoyer
    clean_lines = []
    for line in lines:
        line = line.strip()
        if line and not line.startswith('NUMERO,CLASSE'):
            clean_lines.append(line)
    
    print(f"   {len(clean_lines)} lignes à traiter")
    
    # 3. Structures de données
    cours_dict = {}  # clé: (groupe_principal, matiere_normalisee, prof_nom) → cours_id
    cours_list = []  # liste des cours uniques
    cours_periodes_list = []
    groupes_complexes_list = []
    
    # Pour regrouper les cours identiques
    cours_par_cle = {}
    
    # Pour les alertes de matières non reconnues
    alertes_matieres = set()
    
    compteur_cours = 0
    compteur_periodes = 0
    
    print("\n3. Traitement des cours...")
    
    for i, line in enumerate(clean_lines):
        if i % 200 == 0:
            print(f"   Ligne {i}/{len(clean_lines)}...")
        
        try:
            # Parser CSV sur cette ligne
            reader = csv.reader(StringIO(line), delimiter=',', quotechar='"')
            row = list(next(reader))
            
            if len(row) < 9:
                row = row + [''] * (9 - len(row))
            
            numero = row[0].strip()
            pattern = row[1].strip()
            prof_nom = row[2].strip()
            prof_prenom = row[3].strip()
            matiere = row[4].strip()
            salle = row[5].strip()
            jour = row[6].strip()
            heure_debut = row[7].strip()
            duree = row[8].strip()
            
            # Ignorer si pas de pattern
            if not pattern:
                continue
            
            # Extraire groupe principal
            groupe_principal, est_complexe, details_complexes = extraire_groupe_principal(pattern)
            
            if not groupe_principal:
                continue
            
            # Normaliser matière avec alertes
            matiere_normalisee = normaliser_matiere(matiere, alertes_matieres)
            
            # Parser profs
            prof_nom_json, prof_prenom_json = parser_profs(prof_nom, prof_prenom)
            
            # Créer une clé unique pour ce cours
            # Même cours = même groupe + même matière + même prof
            cle_cours = (groupe_principal, matiere_normalisee, prof_nom)
            
            if cle_cours in cours_par_cle:
                # Cours déjà existant, on ajoute juste les périodes
                cours_id = cours_par_cle[cle_cours]
            else:
                # Nouveau cours
                cours_id = len(cours_list) + 1
                cours_par_cle[cle_cours] = cours_id
                
                # Ajouter à la liste
                cours_list.append([
                    cours_id,
                    groupe_principal,
                    matiere,
                    matiere_normalisee,
                    prof_nom_json,
                    prof_prenom_json,
                    pattern,
                    0  # nombre_periodes sera mis à jour plus tard
                ])
                compteur_cours += 1
                
                # Si groupe complexe, ajouter aux groupes à analyser
                if est_complexe:
                    for detail in details_complexes:
                        groupes_complexes_list.append([
                            cours_id,
                            groupe_principal,
                            detail[:300]  # tronquer si trop long
                        ])
            
            # Calculer les périodes pour cette occurrence
            nb_periodes = duree_en_periodes(duree)
            
            # Trouver l'index de période de début
            heure_formattee = heure_debut.replace('h', ':')
            periode_index_start = None
            
            for periode, (debut, fin) in HORAIRES_PERIODES.items():
                if heure_formattee == debut:
                    periode_index_start = periode
                    break
            
            if not periode_index_start:
                # print(f"   ⚠️  Heure non reconnue: {heure_debut} dans ligne {numero}")
                continue
            
            # Créer les périodes
            for periode_offset in range(nb_periodes):
                periode_index = periode_index_start + periode_offset
                
                if periode_index > len(HORAIRES_PERIODES):
                    # print(f"   ⚠️  Période hors limites: {periode_index}")
                    break
                
                heure_debut_periode, heure_fin_periode = HORAIRES_PERIODES[periode_index]
                
                # Ajouter la période
                cours_periodes_list.append([
                    len(cours_periodes_list) + 1,
                    cours_id,
                    jour,
                    periode_index,
                    heure_debut_periode,
                    heure_fin_periode,
                    salle
                ])
                compteur_periodes += 1
                
        except Exception as e:
            # print(f"   ERREUR ligne {i+1}: {e}")
            continue
    
    # 4. Mettre à jour le nombre de périodes par cours
    print("4. Calcul des périodes par cours...")
    for cours in cours_list:
        cours_id = cours[0]
        periodes_du_cours = [p for p in cours_periodes_list if p[1] == cours_id]
        cours[7] = len(periodes_du_cours)  # Mettre à jour nombre_periodes
    
    # 5. Écrire les fichiers CSV
    print(f"\n5. Écriture des fichiers...")
    
    # cours.csv
    with open('cours.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'groupe_principal', 'matiere_source', 'matiere_normalisee', 
                        'prof_nom_json', 'prof_prenom_json', 'raw_pattern', 'nombre_periodes_semaine'])
        writer.writerows(cours_list)
    print(f"   ✓ cours.csv : {compteur_cours} cours uniques")
    
    # cours_periodes.csv
    with open('cours_periodes.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'cours_id', 'jour', 'periode_index', 
                        'heure_debut', 'heure_fin', 'salle'])
        writer.writerows(cours_periodes_list)
    print(f"   ✓ cours_periodes.csv : {compteur_periodes} périodes")
    
    # groupes_complexes.csv
    with open('groupes_complexes.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['cours_id', 'groupe_code', 'raw_condition'])
        writer.writerows(groupes_complexes_list)
    print(f"   ✓ groupes_complexes.csv : {len(groupes_complexes_list)} groupes complexes")
    
    # 6. Afficher les alertes de matières
    if alertes_matieres:
        print(f"\n⚠️  ALERTE: {len(alertes_matieres)} matière(s) non reconnue(s):")
        for mat in sorted(alertes_matieres):
            print(f"   - '{mat}'")
        print("   Veuillez ajouter ces matières au dictionnaire DICT_MATIERES")
    
    # 7. Statistiques
    print("\n6. Statistiques finales:")
    
    # Compter les cours par nombre de périodes
    distribution = {}
    for cours in cours_list:
        nb_periodes = cours[7]
        distribution[nb_periodes] = distribution.get(nb_periodes, 0) + 1
    
    print("   Distribution des périodes par cours:")
    for nb_periodes in sorted(distribution.keys()):
        print(f"     {nb_periodes} période(s) : {distribution[nb_periodes]} cours")
    
    # Cours avec plusieurs jours
    cours_plusieurs_jours = set()
    for periode in cours_periodes_list:
        cours_id = periode[1]
        jour = periode[2]
        if cours_id not in cours_plusieurs_jours:
            # Vérifier si ce cours a d'autres jours
            autres_jours = [p for p in cours_periodes_list if p[1] == cours_id and p[2] != jour]
            if autres_jours:
                cours_plusieurs_jours.add(cours_id)
    
    print(f"   Cours sur plusieurs jours : {len(cours_plusieurs_jours)}")
    
    # Types de groupes
    groupes_simples = 0
    groupes_unions = 0
    groupes_complexes = 0
    
    for cours in cours_list:
        groupe = cours[1]
        if '[' in groupe and ']' in groupe:
            groupes_complexes += 1
        elif '+' in groupe:
            groupes_unions += 1
        else:
            groupes_simples += 1
    
    print(f"   Types de groupes:")
    print(f"     Simples (3PAX) : {groupes_simples}")
    print(f"     Unions (2PAA+2PAB) : {groupes_unions}")
    print(f"     Complexes ([6 - M4h4]) : {groupes_complexes}")
    
    # Exemples
    print("\n7. Exemples de cours:")
    
    # Exemple 1: Cours simple
    if len(cours_list) > 0:
        c = cours_list[0]
        periodes = [p for p in cours_periodes_list if p[1] == c[0]]
        print(f"   Cours {c[0]} : {c[1]} - {c[3]}")
        print(f"     Source: {c[2]}")
        print(f"     Périodes: {len(periodes)}")
        for p in periodes[:2]:  # Afficher 2 premières périodes max
            print(f"       {p[2]} {p[4]}-{p[5]} (période {p[3]})")
        if len(periodes) > 2:
            print(f"       ... et {len(periodes)-2} autres")
    
    # Exemple 2: Cours avec union
    for c in cours_list:
        if '+' in c[1] and '[' not in c[1]:
            periodes = [p for p in cours_periodes_list if p[1] == c[0]]
            print(f"\n   Cours avec union: {c[1]} - {c[3]}")
            print(f"     {len(periodes)} périodes au total")
            break
    
    # Exemple 3: Cours complexe
    if len(groupes_complexes_list) > 0:
        gc = groupes_complexes_list[0]
        print(f"\n   Groupe complexe exemple:")
        print(f"     Cours ID: {gc[0]}")
        print(f"     Groupe: {gc[1]}")
        print(f"     Condition: {gc[2][:80]}...")
    
    print("\n" + "="*60)
    print("✅ Fichiers générés:")
    print("   1. cours.csv - Les cours uniques (groupe + matière + prof)")
    print("   2. cours_periodes.csv - Les horaires de chaque cours")
    print("   3. groupes_complexes.csv - Pour analyse des conditions")
    print("\n⚠️  VÉRIFIEZ les alertes de matières ci-dessus!")
    print("="*60)

if __name__ == "__main__":
    main()