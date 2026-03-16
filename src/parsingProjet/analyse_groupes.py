"""
analyse_groupes.py - VERSION ULTIME SIMPLIFIÉE
Objectif : Analyser correctement les conditions complexes
Approche : Parser directement les patterns sans surcomplication
"""

import csv
import re
import requests
from io import StringIO

print("="*60)
print("ANALYSE DES GROUPES COMPLEXES - VERSION SIMPLIFIÉE")
print("="*60)

# ============================================================================
# DICTIONNAIRES DE CONVERSION (identiques à import_eleves.py)
# ============================================================================

DICT_LANGUES = {
    'A': 'Anglais',
    'I': 'Italien',
    'E': 'Espagnol',
    'N': 'Néerlandais',
    'D': 'Allemand',
    'AI': 'Anglais Immersion',
    'DI': 'Allemand Immersion',
    'NI': 'Néerlandais Immersion',
    '/': '',
    '+': '',
    '-': '',
    ' ': '',
}

DICT_OPTIONS = {
    'MH': 'Histoire',
    'MH4': 'Histoire',
    'SO': 'Sciences Sociales',
    'SO4': 'Sciences Sociales',
    'EC': 'Sciences Économiques',
    'EC4': 'Sciences Économiques',
    'EC6': 'Sciences Économiques',
    'MS': 'Sciences',
    'MB': 'Sciences',
    'MB4': 'Sciences',
    'ME4': 'Communication',
    'ML': 'Langues',
    'ML4': 'Langues',
    'ML6': 'Langues',
    'MA6': 'Math,Sciences',
    'MC6': 'Math',
    'L': 'Latin',
    'LS': 'Latin,Sciences',
    'LA': 'Latin,Sciences',
    'LA6': 'Latin,Math,Sciences',
    'LB4': 'Latin,Sciences',
    'LG4': 'Latin,Grec',
    'LH': 'Latin,Histoire',
    'LH4': 'Latin,Histoire',
    'LH6': 'Latin,Histoire,Math',
    'LL4': 'Latin,Langues',
    'LC6': 'Latin,Math',
}

def normaliser_option(code):
    """Convertit un code d'option en nom complet"""
    if not code:
        return ""
    
    code_clean = code.strip().upper()
    
    # Retirer les suffixes W, A, N, D
    code_base = re.sub(r'[WAND]$', '', code_clean)
    
    # Chercher dans le dictionnaire
    if code_base in DICT_OPTIONS:
        return DICT_OPTIONS[code_base]
    elif code_clean in DICT_OPTIONS:
        return DICT_OPTIONS[code_clean]
    
    # Chercher une correspondance partielle
    for dict_code, dict_value in DICT_OPTIONS.items():
        if dict_code in code_base or code_base in dict_code:
            return dict_value
    
    return code_clean

def normaliser_langue(code):
    """Convertit un code de langue en nom complet"""
    if not code or code in ['/', '+', '-', ' ']:
        return ""
    
    code_clean = code.strip().upper()
    
    if code_clean in DICT_LANGUES:
        return DICT_LANGUES[code_clean]
    
    for dict_code, dict_value in DICT_LANGUES.items():
        if dict_code and code_clean.startswith(dict_code):
            return dict_value
    
    return code_clean

# ============================================================================
# FONCTION DE PARSING SIMPLIFIÉE
# ============================================================================

def parser_une_condition(partie):
    """
    Parse une condition simple comme:
    [6 - M4h4]<6PAW> <Option+LM1+LM2(+LM3)> MB4-A-E
    ou
    [3+4 - LM1 - NI]<3PAV> <LM1> NI
    """
    result = {
        'groupe_code': '',
        'classe': '',
        'option': '',
        'LM1': '',
        'LM2': '',
        'LM3': ''
    }
    
    # 1. Extraire le groupe entre []
    match_groupe = re.search(r'\[([^\]]+)\]', partie)
    if match_groupe:
        result['groupe_code'] = match_groupe.group(1).strip()
    
    # 2. Extraire la classe entre <>
    match_classe = re.search(r'<\s*([^>]+)\s*>', partie)
    if match_classe:
        result['classe'] = match_classe.group(1).strip()
    
    # 3. Chercher les valeurs (tout ce qui suit le dernier >)
    # On prend tout ce qui vient après le dernier >, jusqu'au prochain [ ou fin de chaîne
    match_valeurs = re.search(r'>\s*([^<\[\]]+?)(?=\s*\[|$)', partie)
    if not match_valeurs:
        # Alternative: prendre tout ce qui n'est pas groupe ou classe
        temp = re.sub(r'\[[^\]]+\]', '', partie)
        temp = re.sub(r'<[^>]+>', '', temp)
        valeurs_brutes = temp.strip()
    else:
        valeurs_brutes = match_valeurs.group(1).strip()
    
    # 4. Nettoyer les valeurs (enlever les + à la fin)
    valeurs_brutes = valeurs_brutes.strip('+').strip()
    
    # DEBUG
    # print(f"DEBUG - Partie: {partie}")
    # print(f"DEBUG - Valeurs brutes: '{valeurs_brutes}'")
    
    # 5. Parser les valeurs selon plusieurs formats possibles
    
    # Format 1: Option-LM1-LM2 (ex: MB4-A-E)
    if '-' in valeurs_brutes:
        parties = [p.strip() for p in valeurs_brutes.split('-') if p.strip()]
        
        # DEBUG
        # print(f"DEBUG - Parties après split '-': {parties}")
        
        if len(parties) >= 1:
            # La première partie peut être une option ou une langue
            if re.match(r'^[A-Z]{2,3}\d*[WAND]?$', parties[0]):
                # C'est une option (ex: MB4, MH4, EC4)
                result['option'] = normaliser_option(parties[0])
                
                if len(parties) >= 2:
                    result['LM1'] = normaliser_langue(parties[1])
                if len(parties) >= 3:
                    result['LM2'] = normaliser_langue(parties[2])
                if len(parties) >= 4:
                    result['LM3'] = normaliser_langue(parties[3])
            else:
                # C'est probablement une langue (ex: NI, DI, A)
                result['LM1'] = normaliser_langue(parties[0])
                if len(parties) >= 2:
                    result['LM2'] = normaliser_langue(parties[1])
    
    # Format 2: Une seule valeur (ex: NI, MS, SO)
    elif valeurs_brutes:
        # Vérifier si c'est une option ou une langue
        if re.match(r'^[A-Z]{2,3}\d*[WAND]?$', valeurs_brutes):
            # C'est une option
            result['option'] = normaliser_option(valeurs_brutes)
        elif valeurs_brutes in ['A', 'I', 'E', 'N', 'D', 'AI', 'DI', 'NI', 'F', 'G']:
            # C'est une langue ou EP
            if valeurs_brutes in ['F', 'G']:
                # C'est pour EP, pas une langue
                pass
            else:
                result['LM1'] = normaliser_langue(valeurs_brutes)
    
    return result

def analyser_pattern(pattern):
    """
    Analyse un pattern complet qui peut contenir plusieurs conditions séparées par +
    """
    conditions = []
    
    if not pattern or '[' not in pattern:
        return conditions
    
    # DEBUG: Afficher le pattern original
    # print(f"\nDEBUG - Pattern original: {pattern}")
    
    # Méthode simple: split sur + qui suit un > et précède un [
    # Mais attention aux + dans les valeurs (ex: LH4-A-/+)
    
    # Approche: trouver toutes les occurrences de [groupe]<classe>
    matches = re.finditer(r'(\[[^\]]+\]\s*<\s*[^>]+\s*>\s*[^<\[\]]+)', pattern)
    
    for match in matches:
        partie = match.group(0).strip()
        
        # Nettoyer: enlever le + à la fin si présent
        if partie.endswith('+'):
            partie = partie[:-1].strip()
        
        # DEBUG
        # print(f"DEBUG - Partie extraite: '{partie}'")
        
        condition = parser_une_condition(partie)
        if condition['groupe_code'] and condition['classe']:
            conditions.append(condition)
    
    # Si aucune condition n'a été trouvée avec la méthode ci-dessus,
    # essayer une méthode plus simple
    if not conditions:
        # Split manuel sur + en évitant de splitter à l'intérieur des []
        parties = []
        current = ""
        bracket_depth = 0
        
        for char in pattern:
            if char == '[':
                bracket_depth += 1
            elif char == ']':
                bracket_depth -= 1
            
            if char == '+' and bracket_depth == 0:
                if current.strip():
                    parties.append(current.strip())
                current = ""
            else:
                current += char
        
        if current.strip():
            parties.append(current.strip())
        
        for partie in parties:
            condition = parser_une_condition(partie)
            if condition['groupe_code'] and condition['classe']:
                conditions.append(condition)
    
    return conditions

# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def main():
    # 1. Télécharger le fichier
    url = "https://raw.githubusercontent.com/laumaq/gestion-projets-ecole/main/data/EXP_COURS%20-%202025-12-05.txt"
    print("1. Téléchargement du fichier cours...")
    
    try:
        response = requests.get(url)
        response.encoding = 'utf-16-le'
        content = response.text
        
        if content.startswith('\ufeff'):
            content = content[1:]
        print(f"   ✓ Fichier téléchargé")
    except:
        try:
            with open('EXP_COURS.txt', 'r', encoding='utf-16-le') as f:
                content = f.read()
                if content.startswith('\ufeff'):
                    content = content[1:]
            print(f"   ✓ Fichier local chargé")
        except:
            print("   ✗ Impossible de charger le fichier")
            return
    
    # 2. Parser le CSV
    print("\n2. Parsing du fichier CSV...")
    reader = csv.reader(StringIO(content), delimiter=',', quotechar='"')
    rows = list(reader)
    
    print(f"   {len(rows)} lignes lues")
    
    # 3. TEST AVEC DES EXEMPLES CONNUS
    print("\n3. Test avec des exemples connus:")
    
    test_cases = [
        ("[6 - M4h4]<6PAW> <Option+LM1+LM2(+LM3)> MB4-A-E", "Devrait: Sciences, Anglais, Espagnol"),
        ("[3+4 - LM1 - NI]<3PAV> <LM1> NI", "Devrait: Néerlandais Immersion"),
        ("[4 - ScOp1]<4PAS> <Option> MS", "Devrait: Sciences"),
        ("[6 - LM2 - E1]<6PAX> <Option+LM1+LM2(+LM3)> MH4-A-E", "Devrait: Histoire, Anglais, Espagnol"),
        ("[5 - Hop]<5PAW> <Option+LM1+LM2(+LM3)> LH4-A-/+", "Devrait: Latin,Histoire, Anglais"),
    ]
    
    for pattern, attendu in test_cases:
        print(f"\n   Test: {pattern[:50]}...")
        print(f"   Attendu: {attendu}")
        conditions = analyser_pattern(pattern)
        
        for cond in conditions:
            print(f"     → Groupe: {cond['groupe_code']}")
            print(f"       Classe: {cond['classe']}")
            print(f"       Option: {cond['option']}")
            print(f"       LM1: {cond['LM1']}")
            print(f"       LM2: {cond['LM2']}")
            print(f"       LM3: {cond['LM3']}")
    
    # 4. Traiter tout le fichier
    print("\n4. Traitement de tout le fichier...")
    
    toutes_conditions = []
    compteur_patterns = 0
    
    for i, row in enumerate(rows):
        if i == 0:
            continue
        
        if len(row) > 1:
            pattern = row[1].strip()
            if pattern and '[' in pattern:
                conditions = analyser_pattern(pattern)
                toutes_conditions.extend(conditions)
                compteur_patterns += 1
        
        if i % 100 == 0:
            print(f"   Lignes traitées: {i}/{len(rows)}")
    
    print(f"   ✓ {len(toutes_conditions)} conditions extraites de {compteur_patterns} patterns")
    
    # 5. Éliminer les doublons
    print("\n5. Suppression des doublons...")
    
    conditions_uniques = []
    vues = set()
    
    for cond in toutes_conditions:
        cle = (cond['groupe_code'], cond['classe'], cond['option'], 
               cond['LM1'], cond['LM2'], cond['LM3'])
        
        if cle not in vues:
            vues.add(cle)
            conditions_uniques.append(cond)
    
    print(f"   ✓ {len(conditions_uniques)} conditions uniques")
    
    # 6. Écrire le fichier CSV
    print("\n6. Création du fichier groupes_composition.csv...")
    
    with open('groupes_composition.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'groupe_code', 'classe', 'option', 'LM1', 'LM2', 'LM3'])
        
        for i, cond in enumerate(conditions_uniques, 1):
            writer.writerow([
                i,
                cond['groupe_code'],
                cond['classe'],
                cond['option'],
                cond['LM1'],
                cond['LM2'],
                cond['LM3']
            ])
    
    print(f"   ✓ Fichier créé avec {len(conditions_uniques)} entrées")
    
    # 7. Afficher des statistiques
    print("\n7. Statistiques:")
    
    # Afficher les 20 premières entrées
    print(f"\n   Premières 20 entrées:")
    for i, cond in enumerate(conditions_uniques[:20]):
        print(f"   {i+1:3d}. {cond['groupe_code']:20} {cond['classe']:6} "
              f"Option: {cond['option'] or 'AUCUNE':20} "
              f"LM1: {cond['LM1'] or '-':10} LM2: {cond['LM2'] or '-':10}")
    
    # Compter les conditions avec option
    avec_option = sum(1 for c in conditions_uniques if c['option'])
    avec_lm1 = sum(1 for c in conditions_uniques if c['LM1'])
    avec_lm2 = sum(1 for c in conditions_uniques if c['LM2'])
    
    print(f"\n   Récapitulatif:")
    print(f"     Conditions avec option: {avec_option}")
    print(f"     Conditions avec LM1: {avec_lm1}")
    print(f"     Conditions avec LM2: {avec_lm2}")
    
    # 8. Créer un fichier de vérification
    print("\n8. Création du fichier de vérification...")
    
    with open('verification_groupes.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['pattern_original', 'groupe_code', 'classe', 'option', 'LM1', 'LM2', 'LM3'])
        
        # Prendre 50 patterns au hasard
        import random
        indices = random.sample(range(1, min(100, len(rows))), 20)
        
        for idx in indices:
            if idx < len(rows) and len(rows[idx]) > 1:
                pattern = rows[idx][1].strip()
                if pattern and '[' in pattern:
                    conditions = analyser_pattern(pattern)
                    for cond in conditions:
                        writer.writerow([
                            pattern[:80],
                            cond['groupe_code'],
                            cond['classe'],
                            cond['option'],
                            cond['LM1'],
                            cond['LM2'],
                            cond['LM3']
                        ])
    
    print("   ✓ Fichier 'verification_groupes.csv' créé")
    
    print("\n" + "="*60)
    print("✅ ANALYSE TERMINÉE")
    print("="*60)
    print("\nVérifiez:")
    print("1. groupes_composition.csv - le fichier principal")
    print("2. verification_groupes.csv - pour voir comment les patterns sont parsés")
    print("\nSi les options/langues sont toujours vides, on peut ajuster le parsing.")
    print("="*60)

if __name__ == "__main__":
    main()