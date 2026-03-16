import sqlite3
import re
import csv
from io import StringIO
import requests

print("="*60)
print("SCRIPT ÉLÈVES - VERSION CORRECTE AVEC INDICES FIXES")
print("="*60)

# 0. Dictionnaire de conversion COMPLET
CONVERSION = {
    # Sexe
    'G': 'Garçon',
    'F': 'Fille',
    
    # Philosophie/Morale (avec formes spécifiques)
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
    # Formes spécifiques du fichier
    'REL CAT': 'Religion Catholique',  # Majuscules
    'REL ISL': 'Religion Islamique',
    'REL PROT': 'Religion Protestante',
    'rel cat': 'Religion Catholique',  # Minuscules
    'rel isl': 'Religion Islamique',
    'rel prot': 'Religion Protestante',
    'O': 'Religion Orthodoxe',  # O = Religion Orthodoxe
    'Morale': 'Morale',
    
    # Langues
    'A': 'Anglais',
    'I': 'Italien',
    'E': 'Espagnol',
    'N': 'Néerlandais',
    'D': 'Allemand',
    'AI': 'Anglais Immersion',
    'DI': 'Allemand Immersion',
    'NI': 'Néerlandais Immersion',
    
    # Options principales
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

# ============================================================================
# DICTIONNAIRE COMPLET DE DÉCOMPOSITION DES OPTIONS (OPT_LIB_5)
# ============================================================================
# Basé sur l'analyse de ExplicationSiglesOptions.csv
# Format: 'SIGLE': [(type_option, valeur_option), ...]
OPTION_DECOMPOSITIONS = {
    # ------------------------------------------------------------
    # LATIN et COMBINAISONS AVEC LATIN
    # ------------------------------------------------------------
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
    
    # ------------------------------------------------------------
    # MATHÉMATIQUES et COMBINAISONS
    # ------------------------------------------------------------
    'MC6': [('Option', 'Math')],
    'MC6W': [('Option', 'Math')],
    'MA6': [('Option', 'Math'), ('Option', 'Sciences')],
    'MA6W': [('Option', 'Math'), ('Option', 'Sciences')],
    
    # ------------------------------------------------------------
    # SCIENCES
    # ------------------------------------------------------------
    'MS': [('Option', 'Sciences')],
    'MSW': [('Option', 'Sciences')],
    'MB4': [('Option', 'Sciences')],
    'MB4W': [('Option', 'Sciences')],
    
    # ------------------------------------------------------------
    # SCIENCES ÉCONOMIQUES
    # ------------------------------------------------------------
    'EC': [('Option', 'Sciences Économiques')],
    'ECW': [('Option', 'Sciences Économiques')],
    'EC4': [('Option', 'Sciences Économiques')],
    'EC4W': [('Option', 'Sciences Économiques')],
    'EC6': [('Option', 'Sciences Économiques'), ('Option', 'Math')],
    'EC6W': [('Option', 'Sciences Économiques'), ('Option', 'Math')],
    
    # ------------------------------------------------------------
    # SCIENCES SOCIALES
    # ------------------------------------------------------------
    'SO': [('Option', 'Sciences Sociales')],
    'SOW': [('Option', 'Sciences Sociales')],
    'SO4': [('Option', 'Sciences Sociales')],
    'SO4W': [('Option', 'Sciences Sociales')],
    
    # ------------------------------------------------------------
    # HISTOIRE
    # ------------------------------------------------------------
    'MH': [('Option', 'Histoire')],
    'MH4': [('Option', 'Histoire')],
    'MH4W': [('Option', 'Histoire')],
    'MH6': [('Option', 'Histoire'), ('Option', 'Math')],
    'MH6W': [('Option', 'Histoire'), ('Option', 'Math')],
    
    # ------------------------------------------------------------
    # LANGUES MODERNES
    # ------------------------------------------------------------
    'ML': [('Option', 'Langues')],
    'ML4': [('Option', 'Langues')],
    'ML4W': [('Option', 'Langues')],
    'ML6': [('Option', 'Langues'), ('Option', 'Math')],
    'ML6W': [('Option', 'Langues'), ('Option', 'Math')],
    
    # ------------------------------------------------------------
    # COMMUNICATION
    # ------------------------------------------------------------
    'ME4': [('Option', 'Communication')],
    'ME4W': [('Option', 'Communication')],
    
    # ------------------------------------------------------------
    # MODERNE (GÉNÉRAL - pas d'option spécifique)
    # ------------------------------------------------------------
    # 'M', 'MW', 'MAI', etc. -> Pas de ligne d'option
}

# Liste des codes qui ne génèrent PAS de ligne d'option (uniquement EP, Philo, LM1-3)
CODES_SANS_OPTION = {'M', 'MW', 'MAI', 'MNI', 'MDI', 'MNDI'}

# ============================================================================
# FONCTION POUR VÉRIFIER LA COUVERTURE DES CODES
# ============================================================================
def verifier_couverture_codes(fichier_csv="EXP_ELEVE.txt"):
    """
    Analyse le fichier élèves pour trouver tous les codes d'option utilisés
    et vérifie lesquels ne sont pas couverts par le dictionnaire
    """
    print("\n" + "="*60)
    print("VÉRIFICATION DE COUVERTURE DES CODES D'OPTION")
    print("="*60)
    
    with open(fichier_csv, 'r', encoding='utf-16') as f:
        content = f.read()
        if content.startswith('\ufeff'):
            content = content[1:]
    
    reader = csv.reader(StringIO(content), delimiter=',')
    rows = list(reader)
    
    codes_trouves = set()
    codes_non_couverts = set()
    
    for row in rows[1:]:  # Skip header
        if len(row) > INDICES['OPT_LIB_5']:
            code = row[INDICES['OPT_LIB_5']].strip()
            if code:
                code_clean = code.strip().upper().strip('"\'')
                codes_trouves.add(code_clean)
                
                # Vérifier la couverture
                if (code_clean not in OPTION_DECOMPOSITIONS and 
                    code_clean not in CODES_SANS_OPTION):
                    codes_non_couverts.add(code_clean)
    
    print(f"Codes d'option trouvés dans le fichier: {len(codes_trouves)}")
    print("Liste complète:", sorted(codes_trouves))
    print()
    
    if codes_non_couverts:
        print(f"❌ Codes NON COUVERTS ({len(codes_non_couverts)}):")
        for code in sorted(codes_non_couverts):
            print(f"  - '{code}'")
        print("\n➡️  Veuillez ajouter ces codes au dictionnaire OPTION_DECOMPOSITIONS")
    else:
        print("✅ Tous les codes sont couverts par le dictionnaire!")
    
    print("="*60)
    
    return codes_non_couverts



# Indices fixes basés sur votre output
INDICES = {
    'NUMERO': 0,
    'NOM': 2,
    'PRENOM': 3,
    'SEXE': 9,
    'CLASSE': 27,
    'GROUPES': 28,
    'OPT_LIB_1': 46,
    'OPT_LIB_2': 48,
    'OPT_LIB_3': 50,
    'OPT_LIB_4': 52,
    'OPT_LIB_5': 54
}

# 1. Lire le fichier CSV correctement
print("\n1. Lecture du fichier élèves...")
with open('EXP_ELEVE.txt', 'r', encoding='utf-16') as f:
    content = f.read()
    if content.startswith('\ufeff'):
        content = content[1:]

reader = csv.reader(StringIO(content), delimiter=',')
rows = list(reader)

print(f"   {len(rows)} lignes lues (header + {len(rows)-1} élèves)")


# ============================================================================
# EXÉCUTION DE LA VÉRIFICATION AU DÉBUT DU SCRIPT
# ============================================================================
# Ajoutez cet appel après avoir défini INDICES et lu les rows:
"""
# Vérification initiale"""
codes_manquants = verifier_couverture_codes()

if codes_manquants:
    print("\n⚠️  Le script continuera mais certains codes ne seront pas correctement traités.")
    reponse = input("Voulez-vous quand même continuer? (oui/non): ")
    if reponse.lower() != 'oui':
        print("Arrêt du script. Veuillez compléter le dictionnaire.")
        exit(1)
        

# 2. Télécharger les sigles
print("\n2. Téléchargement des sigles d'options...")
url_sigles = "https://raw.githubusercontent.com/laumaq/gestion-projets-ecole/refs/heads/main/data/ExplicationSiglesOptions.csv"
try:
    response = requests.get(url_sigles)
    response.encoding = 'utf-8'
    sigles_content = response.text
except:
    # Fallback si pas de connexion
    print("   Impossible de télécharger, utilisation du fichier local si disponible")
    sigles_content = ""

SIGLES_DICT = {}
if sigles_content:
    sigles_reader = csv.reader(StringIO(sigles_content))
    next(sigles_reader)  # Skip header
    for row in sigles_reader:
        if len(row) >= 2:
            sigle = row[0].strip()
            signification = row[1].strip()
            SIGLES_DICT[sigle] = signification
    print(f"   {len(SIGLES_DICT)} sigles chargés")




# 3. Dictionnaire de conversion COMPLET

def normaliser_valeur(valeur):
    """Normalise une valeur avant conversion"""
    if not valeur:
        return ""
    
    val = valeur.strip().lower().strip('"\'')
    
    # Mapping spécifique pour les valeurs de philosophie
    # Gardez-les en minuscules pour la correspondance avec CONVERSION
    normalisations = {
        'rel cat': 'rel cat',
        'rel isl': 'rel isl', 
        'rel prot': 'rel prot',
        'o': 'o',
    }
    
    return normalisations.get(val, val.upper())  # Par défaut en majuscules





# ============================================================================
# FONCTION DE TRAITEMENT DES OPTIONS (à utiliser dans la boucle principale)
# ============================================================================
def traiter_option_principale(matricule, code_option, cursor):
    """
    Traite un code d'option et insère les décompositions dans la base
    Retourne le nombre d'options insérées
    """
    compteur = 0
    
    if not code_option:
        return 0
    
    # 1. Nettoyage du code
    code_clean = code_option.strip().upper().strip('"\'')
    
    # 2. Gestion spéciale: codes sans ligne d'option
    if code_clean in CODES_SANS_OPTION:
        return 0
    
    # 3. Si le code n'est pas dans notre dictionnaire, ALERTE
    if code_clean not in OPTION_DECOMPOSITIONS:
        # ALERTE VISUELLE CLAIRE
        print(f"\n⚠️  ⚠️  ⚠️  ALERTE: Code d'option non reconnu!")
        print(f"   Matricule: {matricule}")
        print(f"   Code: '{code_option}' (nettoyé: '{code_clean}')")
        print(f"   Ce code n'est pas dans le dictionnaire de décomposition.")
        print("   Veuillez compléter le dictionnaire OPTION_DECOMPOSITIONS.")
        print("   Pour l'instant, une ligne générique sera créée.")
        print("="*60)
        
        # Option générique en attendant
        cursor.execute('INSERT INTO eleves_options VALUES (NULL, ?, ?, ?)',
                     (matricule, 'Option', f"CODE NON RECONNU: {code_clean}"))
        return 1
    
    # 4. Décomposition normale
    decompositions = OPTION_DECOMPOSITIONS[code_clean]
    for type_opt, valeur_opt in decompositions:
        # Vérifier si pas déjà inséré (éviter doublons)
        cursor.execute('SELECT COUNT(*) FROM eleves_options WHERE matricule=? AND type_option=? AND valeur_option=?', 
                     (matricule, type_opt, valeur_opt))
        if cursor.fetchone()[0] == 0:
            cursor.execute('INSERT INTO eleves_options VALUES (NULL, ?, ?, ?)',
                         (matricule, type_opt, valeur_opt))
            compteur += 1
    
    return compteur

def decomposer_option_multiple(code):
    """Décompose les codes d'option qui contiennent plusieurs matières"""
    decompositions = {
        'LA6': ['Latin', 'Math', 'Sciences'],
        'LH4': ['Latin', 'Histoire'],
        # Ajoutez d'autres décompositions si nécessaire
    }
    return decompositions.get(code, [code])

# 4. Connexion BD
conn = sqlite3.connect('school_clean.db')
cursor = conn.cursor()

print("\n3. Réinitialisation de la base...")
cursor.execute("DROP TABLE IF EXISTS eleves")
cursor.execute("DROP TABLE IF EXISTS eleves_options")
cursor.execute("DROP TABLE IF EXISTS eleves_groupes")

cursor.execute("""
    CREATE TABLE eleves (
        matricule TEXT PRIMARY KEY,
        nom TEXT,
        prenom TEXT,
        classe TEXT,
        niveau INTEGER
    )
""")

cursor.execute("""
    CREATE TABLE eleves_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matricule TEXT,
        type_option TEXT,
        valeur_option TEXT
    )
""")

cursor.execute("""
    CREATE TABLE eleves_groupes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matricule TEXT,
        groupe_code TEXT
    )
""")

# 5. Traitement
print("\n4. Traitement des élèves...")
compteur_eleves = 0
compteur_options = 0

for i, row in enumerate(rows[1:], 1):  # Skip header
    if len(row) < 55:  # On a besoin au moins jusqu'à l'index 54
        continue
    
    try:
        # Récupérer les données avec les indices fixes
        matricule = row[INDICES['NUMERO']].strip()
        nom = row[INDICES['NOM']].strip()
        prenom = row[INDICES['PRENOM']].strip()
        chaine_classe = row[INDICES['CLASSE']].strip()
        chaine_groupes = row[INDICES['GROUPES']].strip() if len(row) > INDICES['GROUPES'] else ""
        
        if not matricule:
            continue
        
        # Classe et niveau
        classe_match = re.search(r'^(\d{1,2}PA[A-Z])[+\s<]', chaine_classe)
        classe = classe_match.group(1) if classe_match else ""
        niveau = int(classe[0]) if classe and classe[0].isdigit() else None
        
        # Insert élève
        cursor.execute('INSERT INTO eleves VALUES (?, ?, ?, ?, ?)', 
                       (matricule, nom, prenom, classe, niveau))
        
        # OPTIONS
        # 1. Éducation Physique (SEXE)
        if len(row) > INDICES['SEXE']:
            sexe = row[INDICES['SEXE']].strip()
            if sexe == 'G':
                cursor.execute('INSERT INTO eleves_options VALUES (NULL, ?, ?, ?)',
                             (matricule, 'EP', 'Garçon'))
                compteur_options += 1
            elif sexe == 'F':
                cursor.execute('INSERT INTO eleves_options VALUES (NULL, ?, ?, ?)',
                             (matricule, 'EP', 'Fille'))
                compteur_options += 1
            # Note: Si sexe est vide, on n'ajoute rien
        
        # 2. Philosophie (OPT_LIB_4)
        if len(row) > INDICES['OPT_LIB_4']:
            philo = row[INDICES['OPT_LIB_4']].strip()
            if philo:
                # Normaliser d'abord
                philo_normalisee = normaliser_valeur(philo)
                
                # Chercher dans l'ordre: CONVERSION puis SIGLES_DICT
                if philo_normalisee in CONVERSION:
                    valeur = CONVERSION[philo_normalisee]
                elif philo_normalisee in SIGLES_DICT:
                    valeur = SIGLES_DICT[philo_normalisee]
                else:
                    valeur = philo_normalisee
                
                cursor.execute('INSERT INTO eleves_options VALUES (NULL, ?, ?, ?)',
                             (matricule, 'Philo', valeur))
                compteur_options += 1
        
        # 3. Langues (OPT_LIB_1, 2, 3)
        for j, opt_type in enumerate(['LM1', 'LM2', 'LM3'], 1):
            idx = INDICES[f'OPT_LIB_{j}']
            if len(row) > idx:
                langue = row[idx].strip()
                if langue:
                    # Normaliser
                    langue_normalisee = normaliser_valeur(langue)
                    
                    # Chercher d'abord dans CONVERSION (pour A->Anglais, etc.)
                    if langue_normalisee in CONVERSION:
                        valeur = CONVERSION[langue_normalisee]
                    elif langue_normalisee in SIGLES_DICT:
                        valeur = SIGLES_DICT[langue_normalisee]
                    else:
                        valeur = langue_normalisee
                    
                    cursor.execute('INSERT INTO eleves_options VALUES (NULL, ?, ?, ?)',
                                 (matricule, opt_type, valeur))
                    compteur_options += 1
        
        # 4. Option principale (OPT_LIB_5)
        if len(row) > INDICES['OPT_LIB_5']:
            option_code = row[INDICES['OPT_LIB_5']].strip()
            if option_code:
                options_ajoutees = traiter_option_principale(matricule, option_code, cursor)
                compteur_options += options_ajoutees
        
        # Groupes
        if chaine_groupes:
            groupes = set(g.strip() for g in chaine_groupes.split('+') if g.strip())
            for groupe in groupes:
                cursor.execute('INSERT INTO eleves_groupes VALUES (NULL, ?, ?)',
                             (matricule, groupe))
        
        compteur_eleves += 1
        
    except Exception as e:
        print(f"   Erreur ligne {i}: {e}")
        continue

conn.commit()

# 6. Nettoyage des doublons
print("\n5. Nettoyage des doublons...")
cursor.execute("""
    DELETE FROM eleves_options 
    WHERE rowid NOT IN (
        SELECT MIN(rowid) 
        FROM eleves_options 
        GROUP BY matricule, type_option, valeur_option
    )
""")
doublons = cursor.rowcount
if doublons > 0:
    print(f"   {doublons} doublons supprimés")

# 7. Export
print(f"\n6. Export ({compteur_eleves} élèves, {compteur_options} options)...")

# Export CSV
cursor.execute("SELECT * FROM eleves ORDER BY matricule")
with open('eleves.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['matricule', 'nom', 'prenom', 'classe', 'niveau'])
    writer.writerows(cursor.fetchall())

cursor.execute("SELECT * FROM eleves_options ORDER BY matricule, type_option")
with open('eleves_options.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['id', 'matricule', 'type_option', 'valeur_option'])
    writer.writerows(cursor.fetchall())

cursor.execute("SELECT * FROM eleves_groupes ORDER BY matricule")
with open('eleves_groupes.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['id', 'matricule', 'groupe_code'])
    writer.writerows(cursor.fetchall())

# 8. Vérification DÉTAILLÉE
print("\n7. Vérification approfondie des élèves problématiques:")

test_matricules = ['1', '2', '8', '14', '16', '17', '19', '23', '24', '33']

print("\n" + "="*80)
for mat in test_matricules:
    print(f"\nÉlève {mat}:")
    
    # Infos de base
    cursor.execute("SELECT nom, prenom, classe FROM eleves WHERE matricule=?", (mat,))
    eleve_info = cursor.fetchone()
    if eleve_info:
        nom, prenom, classe = eleve_info
        print(f"  {prenom} {nom} - {classe}")
    else:
        print(f"  NON TROUVÉ!")
        continue
    
    # Options avec source
    print("  Options:")
    
    # SEXE (EP)
    if len(rows) > 1 and int(mat) < len(rows):
        row_idx = int(mat)  # Approximatif
        if row_idx < len(rows):
            row_data = rows[row_idx]
            if len(row_data) > INDICES['SEXE']:
                sexe_raw = row_data[INDICES['SEXE']].strip()
                print(f"    SEXE brut: '{sexe_raw}'")
    
    
    # OPT_LIB_1,2,3 (Langues)
    for j in range(1, 4):
        if len(rows) > 1 and int(mat) < len(rows):
            row_idx = int(mat)
            if row_idx < len(rows):
                row_data = rows[row_idx]
                idx = INDICES[f'OPT_LIB_{j}']
                if len(row_data) > idx:
                    langue_raw = row_data[idx].strip()
                    if langue_raw:
                        print(f"    OPT_LIB_{j} brut: '{langue_raw}'")
    
    # OPT_LIB_4 (Philo)
    if len(rows) > 1 and int(mat) < len(rows):
        row_idx = int(mat)
        if row_idx < len(rows):
            row_data = rows[row_idx]
            if len(row_data) > INDICES['OPT_LIB_4']:
                philo_raw = row_data[INDICES['OPT_LIB_4']].strip()
                print(f"    OPT_LIB_4 (Philo) brut: '{philo_raw}'")
    
    # OPT_LIB_5 (Option principale)
    if len(rows) > 1 and int(mat) < len(rows):
        row_idx = int(mat)
        if row_idx < len(rows):
            row_data = rows[row_idx]
            if len(row_data) > INDICES['OPT_LIB_5']:
                option_raw = row_data[INDICES['OPT_LIB_5']].strip()
                print(f"    OPT_LIB_5 (Option) brut: '{option_raw}'")
    
    # Options dans la base
    cursor.execute("""
        SELECT type_option, valeur_option 
        FROM eleves_options 
        WHERE matricule=? 
        ORDER BY CASE type_option 
            WHEN 'EP' THEN 1
            WHEN 'Philo' THEN 2
            WHEN 'LM1' THEN 3
            WHEN 'LM2' THEN 4
            WHEN 'LM3' THEN 5
            WHEN 'Option' THEN 6
            ELSE 7
        END
    """, (mat,))
    
    options = cursor.fetchall()
    if options:
        for typ, val in options:
            print(f"    {typ}: {val}")
    else:
        print("    Aucune option dans la base!")

print("\n" + "="*80)

# 9. Statistiques FINALES
print("\n8. Statistiques finales:")
cursor.execute("SELECT COUNT(*) FROM eleves")
total_eleves = cursor.fetchone()[0]
print(f"  Total élèves: {total_eleves}")

cursor.execute("SELECT COUNT(*) FROM eleves_options")
total_options = cursor.fetchone()[0]
print(f"  Total options: {total_options}")

print("\n  Répartition par type d'option:")
cursor.execute("""
    SELECT type_option, COUNT(*) as count
    FROM eleves_options 
    GROUP BY type_option 
    ORDER BY count DESC
""")
for typ, count in cursor.fetchall():
    print(f"    {typ}: {count}")

print("\n  Quelques exemples d'options:")
cursor.execute("""
    SELECT DISTINCT valeur_option, type_option
    FROM eleves_options
    WHERE valeur_option LIKE '%Religion%' OR valeur_option LIKE '%Morale%' OR valeur_option LIKE '%Garçon%' OR valeur_option LIKE '%Fille%'
    ORDER BY type_option, valeur_option
    LIMIT 10
""")
for val, typ in cursor.fetchall():
    print(f"    {typ}: {val}")

conn.close()

print("\n" + "="*80)
print("✅ Fichiers générés:")
print("   - eleves.csv")
print("   - eleves_options.csv")
print("   - eleves_groupes.csv")
print("\n⚠️  VÉRIFIEZ les élèves de test ci-dessus!")
print("="*80)