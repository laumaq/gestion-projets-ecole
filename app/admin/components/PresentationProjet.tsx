// app/admin/components/PresentationProjet.tsx
'use client';

export default function PresentationProjet() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-800 leading-relaxed">
      <h1 className="text-3xl font-bold border-b-4 border-blue-600 pb-3 mb-8">
        📘 Portail Scolaire — État actuel et besoins
      </h1>

      <p className="text-lg text-gray-600 mb-8">
        Ce document explique simplement où en est le projet, ce qu'il faut
        acheter pour qu'il fonctionne bien, et combien de temps il faudra
        encore travailler.{' '}
        <strong>Aucune connaissance technique n'est nécessaire.</strong>
      </p>

      {/* ─────────────── SECTION 1 ─────────────── */}
      <h2 className="text-2xl font-semibold text-blue-600 mt-12 mb-4">
        📍 1. Où en est le projet aujourd'hui ?
      </h2>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-6 my-5">
        <h3 className="text-lg font-semibold mb-3">
          ✅ Ce qui est déjà construit et fonctionne
        </h3>
        <p className="mb-3">
          Le portail est <strong>en ligne</strong> et permet déjà de :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            🔐 <strong>Se connecter</strong> (professeurs et élèves avec un
            système d'identifiants uniques)
          </li>
          <li>
            📅 <strong>Consulter son horaire</strong> (les profs voient leurs
            cours, les élèves voient leurs cours et leurs groupes)
          </li>
          <li>
            ✈️ <strong>Gérer les voyages</strong> (inscriptions, hébergement,
            chambres, régime alimentaire, charte à signer)
          </li>
          <li>
            🧪 <strong>Faire des expériences scientifiques</strong> (les profs
            créent des expériences, les élèves saisissent des mesures en direct)
          </li>
          <li>
            🏙️ <strong>TFH</strong> (gestion et suivi des TFHs, synchronisations des infos entre élèves, collègues, coordination, externes, direction)
          </li>
          <li>
            📊 <strong>Tableaux de bord</strong> avec des outils de gestion pédagogiques
            (conseil de classe, outils scientifiques, etc.)
          </li>
        </ul>
        <p className="mt-4">
          Le système gère automatiquement <strong>~900 élèves</strong> et{' '}
          <strong>~100 membres du personnel</strong>. Il est déployé sur
          Internet et accessible depuis n'importe quel navigateur.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-6 my-5">
        <h3 className="text-lg font-semibold mb-3">
          ⚠️ Ce qui n'existe pas encore
        </h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Messagerie interne</strong> : aucun système de messages
            entre utilisateurs pour l'instant
          </li>
          <li>
            <strong>Gestion des absences</strong> : pas de suivi des absences
            ou des retards
          </li>
          <li>
            <strong>Planning visuel</strong> : l'agenda existe pour les cours,
            mais pas pour les événements, réunions, etc.
          </li>
          <li>
            <strong>Dépôt de documents</strong> : les profs ne peuvent pas
            partager de fichiers avec leurs élèves via le portail
          </li>
          <li>
            <strong>Sécurisation avancée</strong> : protection renforcée des
            données sensibles pas encore mise en place
          </li>
          <li>
            <strong>Applications mobiles</strong> : Android et iOS ne sont pas encore supportés, le portail est uniquement accessible via un navigateur
          </li>
        </ul>
      </div>

      {/* ─────────────── SECTION 2 ─────────────── */}
      <h2 className="text-2xl font-semibold text-blue-600 mt-12 mb-4">
        💰 2. Pourquoi faut-il payer pour que ça marche vraiment ?
      </h2>

      <p className="text-lg mb-6">
        Le projet utilise trois services qui fonctionnent{' '}
        <strong>gratuitement pour les tests</strong>, mais qui ont des limites
        trop basses pour notre école. Voici ce que ça implique
        concrètement.
      </p>

      {/* SUPABASE */}
      <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-6 my-5">
        <h3 className="text-lg font-semibold mb-3">
          🗄️ Option Pro Supabase —{' '}
          <span className="text-2xl font-bold text-blue-600">25 $/mois</span>
        </h3>
        <p className="mb-3">
          <strong>À quoi ça sert ?</strong> C'est le « disque dur » et la
          « mémoire » du portail. Toutes les données (élèves, notes, horaires,
          expériences, voyages...) sont stockées là.
        </p>

        <p className="font-semibold mb-2">
          Pourquoi le gratuit ne suffit pas :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            📦 <strong>Stockage limité à 500 Mo</strong> : c'est comme un petit
            sac. Les données de l'école vont vite le remplir.{' '}
            <span className="bg-amber-100 px-1.5 py-0.5 rounded">
              La version Pro offre 8 Go
            </span>
            , soit 16 fois plus.
          </li>
          <li>
            🚦 <strong>Trafic limité à 5 Go/mois</strong> : imaginez 1 100
            personnes qui consultent le portail plusieurs fois par jour. Ça
            sature très vite.{' '}
            <span className="bg-amber-100 px-1.5 py-0.5 rounded">
              La version Pro offre 250 Go
            </span>
            , soit 50 fois plus.
          </li>
          <li>
            😴{' '}
            <strong>
              Mise en pause automatique après 7 jours d'inactivité
            </strong>{' '}
            : pendant les vacances, si personne n'utilise le portail pendant une
            semaine, <strong>il se met en pause tout seul</strong>. À la
            rentrée, tout le monde tombe sur une erreur.{' '}
            <span className="bg-amber-100 px-1.5 py-0.5 rounded">
              La version Pro ne met JAMAIS en pause.
            </span>
          </li>
          <li>
            🔌 <strong>200 connexions simultanées maximum</strong> : si plus de
            200 personnes utilisent le portail en même temps, ça bloque.{' '}
            <span className="bg-amber-100 px-1.5 py-0.5 rounded">
              La version Pro monte à 500.
            </span>
          </li>
        </ul>
        <p className="mt-4">
          <strong>En résumé :</strong> sans Supabase Pro, le portail{' '}
          <strong>tombera en panne pendant les vacances</strong> et{' '}
          <strong>saturera dès qu'il y aura du monde</strong>.
        </p>
      </div>

      {/* VERCEL */}
      <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-6 my-5">
        <h3 className="text-lg font-semibold mb-3">
          🌐 Option Pro Vercel —{' '}
          <span className="text-2xl font-bold text-blue-600">20 $/mois</span>
        </h3>
        <p className="mb-3">
          <strong>À quoi ça sert ?</strong> C'est l'« afficheur » du portail.
          C'est ce qui permet à tout le monde de voir les pages du site sur
          Internet, rapidement et sans erreur.
        </p>

        <p className="font-semibold mb-2">
          Pourquoi le gratuit ne suffit pas :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            🚫 <strong>Usage commercial interdit</strong> : les règles de Vercel
            disent clairement que le plan gratuit est{' '}
            <strong>réservé aux projets personnels</strong>. Une école, c'est un
            usage professionnel.{' '}
            <span className="bg-amber-100 px-1.5 py-0.5 rounded">
              Si Vercel s'en aperçoit, il peut couper le portail
            </span>{' '}
            et il faudra attendre 30 jours pour le réactiver.
          </li>
          <li>
            📊 <strong>Analytics limités</strong> : le plan gratuit n'enregistre
            que 50 000 événements par mois. Avec 1 100 utilisateurs, c'est
            dépassé en quelques jours. Sans analytics, impossible de savoir si
            le portail fonctionne bien.
          </li>
          <li>
            💤 <strong>Pas de protection contre les abus</strong> : la version
            Pro permet de limiter automatiquement les tentatives d'intrusion ou
            les attaques.
          </li>
        </ul>
        <p className="mt-4">
          <strong>En résumé :</strong> sans Vercel Pro, vous{' '}
          <strong>risquez une coupure brutale</strong> pour non-respect des
          conditions d'utilisation.
        </p>
      </div>

      {/* MISTRAL */}
      <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-6 my-5">
        <h3 className="text-lg font-semibold mb-3">
          🤖 Option Pro Mistral —{' '}
          <span className="text-2xl font-bold text-blue-600">15 €/mois</span>
        </h3>
        <p className="mb-3">
          <strong>À quoi ça sert ?</strong> C'est l'« assistant intelligent » qui
          aide à écrire le code du portail. Il connaît le projet, peut proposer
          des corrections, et accélère le développement.
        </p>

        <p className="font-semibold mb-2">Pourquoi c'est utile :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            ⚡ <strong>Développement plus rapide</strong> : l'assistant comprend
            le code existant et peut ajouter des fonctionnalités (messagerie,
            absences...) beaucoup plus vite qu'un humain seul.
          </li>
          <li>
            🔧 <strong>Correction directe</strong> : il peut modifier le code
            directement, sans avoir à tout réécrire.
          </li>
          <li>
            🇪🇺 <strong>Solution européenne</strong> : les données restent en
            Europe, ce qui est important pour une école.
          </li>
        </ul>
        <p className="mt-4">
          <strong>En résumé :</strong> Mistral Pro, c'est l'outil qui permet de{' '}
          <strong>construire plus vite ce qui manque</strong> (messagerie,
          absences, planning). Sans lui, le développement prendra beaucoup plus
          de temps.
        </p>
      </div>

      {/* ─────────────── SECTION 3 ─────────────── */}
      <h2 className="text-2xl font-semibold text-blue-600 mt-12 mb-4">
        💵 3. Combien ça coûte au total ?
      </h2>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-6 my-5">
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span>
            <strong>Supabase Pro</strong> (base de données)
          </span>
          <span>
            <strong>25 $/mois</strong>
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span>
            <strong>Vercel Pro</strong> (hébergement du site)
          </span>
          <span>
            <strong>20 $/mois</strong>
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span>
            <strong>Mistral Pro</strong> (assistant de développement)
          </span>
          <span>
            <strong>15 €/mois</strong>
          </span>
        </div>
        <div className="flex justify-between pt-4 mt-4 border-t-2 border-blue-600">
          <span>
            <strong>Total mensuel</strong>
          </span>
          <span className="text-2xl font-bold text-blue-600">~60 €/mois</span>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Soit environ <strong>720 € par an</strong> pour faire fonctionner le
          portail de manière fiable pour 1 100 personnes.
        </p>
      </div>

      {/* ─────────────── SECTION 4 ─────────────── */}
      <h2 className="text-2xl font-semibold text-blue-600 mt-12 mb-4">
        ⏱️ 4. Combien de temps pour finir ce qui manque ?
      </h2>

      <p className="mb-6">
        Voici une estimation du temps nécessaire pour développer les{' '}
        <strong>fonctionnalités prioritaires</strong>. Ces estimations sont en
        « jours de travail » d'une personne à temps partiel (1/5 temps).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-5">
          <h3 className="text-lg font-semibold mb-2">💬 Messagerie interne</h3>
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Priorité haute
          </span>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Envoyer/recevoir des messages</li>
            <li>Notifications de base</li>
            <li>Discussion par groupe de cours</li>
          </ul>
          <p className="mt-3">
            <strong>Temps estimé :</strong> ~4 à 5 semaines
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-5">
          <h3 className="text-lg font-semibold mb-2">📋 Gestion des absences</h3>
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Priorité haute
          </span>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Déclaration d'absence par les profs</li>
            <li>Vue d'ensemble pour l'administration</li>
            <li>Historique par élève</li>
          </ul>
          <p className="mt-3">
            <strong>Temps estimé :</strong> ~4 à 5 semaines
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-5">
          <h3 className="text-lg font-semibold mb-2">
            📅 Planning / Agenda complet
          </h3>
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Priorité moyenne
          </span>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Ajout d'événements (réunions, activités)</li>
            <li>Vue partagée pour le personnel</li>
            <li>Rappels et alertes</li>
          </ul>
          <p className="mt-3">
            <strong>Temps estimé :</strong> ~5 à 6 semaines
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-600 p-5">
          <h3 className="text-lg font-semibold mb-2">
            🔒 Sécurisation de la plateforme
          </h3>
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Priorité haute
          </span>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Protection renforcée des données</li>
            <li>Gestion fine des accès</li>
            <li>Sauvegardes automatiques</li>
          </ul>
          <p className="mt-3">
            <strong>Temps estimé :</strong> ~4 semaines
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-6 my-6">
        <h3 className="text-lg font-semibold mb-2">
          📊 Total pour développer ce package de base
        </h3>
        <p>
          <strong>Environ 5 mois</strong> de travail à temps partiel, en
          utilisant l'assistant Mistral pour accélérer.
        </p>
        <p className="text-gray-600 text-sm mt-2">
          Sans l'assistant, comptez <strong>10 mois</strong>.
        </p>
      </div>

      <div className="mt-16 pt-6 border-t border-gray-300 text-gray-500 text-sm text-center">
        <p>Document de présentation — Portail Scolaire — 2026</p>
        <p>Pour toute question, contacter l'équipe technique du projet.</p>
      </div>
    </div>
  );
}