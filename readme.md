# Gestion des Projets - École

Application web pour gérer les projets et activités scolaires avec calcul d'impact sur les cours.

## 🚀 Déploiement sur Vercel

### Étape 1 : Créer le repository GitHub

1. Va sur [GitHub](https://github.com) et connecte-toi
2. Clique sur le bouton **"New"** (ou le + en haut à droite → New repository)
3. Nomme ton repo (ex: `gestion-projets-ecole`)
4. Laisse-le en **Public** (ou Private si tu préfères)
5. Clique sur **"Create repository"**

### Étape 2 : Uploader les fichiers

Dans la page de ton nouveau repo vide :

1. Clique sur **"uploading an existing file"**
2. Glisse-dépose TOUS les fichiers de ce projet (ou clique pour les sélectionner)
3. Écris un message de commit (ex: "Initial commit")
4. Clique sur **"Commit changes"**

### Étape 3 : Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec ton compte GitHub
2. Clique sur **"Add New Project"**
3. Sélectionne ton repository `gestion-projets-ecole`
4. Vercel va détecter automatiquement que c'est un projet Vite
5. Laisse les paramètres par défaut et clique sur **"Deploy"**
6. Attends 1-2 minutes que le déploiement se termine

### Étape 4 : Tester

Une fois déployé, Vercel te donnera une URL (genre `https://gestion-projets-ecole.vercel.app`). Clique dessus et teste l'application !

## 📁 Structure des fichiers

Voici comment organiser tes fichiers :

```
gestion-projets-ecole/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
└── README.md
```

## 🔧 Développement local (optionnel)

Si tu veux tester en local avant de déployer :

```bash
npm install
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## 📝 Notes

- La base de données Supabase est déjà configurée dans le code
- L'authentification se fait par nom + initiale (auto-création de compte)
- Les données de démo sont déjà dans Supabase

## 🆘 Problèmes ?

Si le déploiement échoue :
- Vérifie que tous les fichiers sont bien uploadés
- Vérifie que la structure des dossiers est correcte (notamment le dossier `src/`)
- Regarde les logs d'erreur dans Vercel