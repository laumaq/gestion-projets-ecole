'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      question: 'Comment me connecter pour la première fois ?',
      answer: 'Utilisez votre nom et l\'initiale de votre prénom. À la première connexion, vous créerez votre mot de passe qui sera enregistré pour les prochaines connexions.',
      category: 'connexion',
    },
    {
      question: 'Que faire si j\'ai oublié mon mot de passe ?',
      answer: 'Contactez l\'administrateur système pour réinitialiser votre mot de passe. Vous devrez ensuite en créer un nouveau à votre prochaine connexion.',
      category: 'connexion',
    },
    {
      question: 'Comment accéder aux différents outils ?',
      answer: 'Tous les outils sont accessibles depuis le tableau de bord. Les outils marqués comme "Actifs" sont disponibles. Les autres sont en cours de développement.',
      category: 'utilisation',
    },
    {
      question: 'Mes données sont-elles sécurisées ?',
      answer: 'Oui, toutes les données sont chiffrées et stockées de manière sécurisée. Chaque utilisateur n\'a accès qu\'aux fonctionnalités correspondant à son rôle.',
      category: 'securite',
    },
    {
      question: 'Comment signaler un problème technique ?',
      answer: 'Utilisez le formulaire de contact ci-dessous ou envoyez un email à support@ecole-tfh.fr en décrivant le problème rencontré.',
      category: 'support',
    },
    {
      question: 'Les outils fonctionnent-ils sur mobile ?',
      answer: 'Oui, le portail est responsive et s\'adapte à tous les écrans. Certaines fonctionnalités avancées peuvent être optimisées pour l\'ordinateur.',
      category: 'utilisation',
    },
    {
      question: 'Comment exporter mes données ?',
      answer: 'Chaque outil actif propose une fonction d\'export (généralement en bas à droite). Les formats disponibles sont PDF, Excel et CSV selon l\'outil.',
      category: 'utilisation',
    },
    {
      question: 'Qui contacter pour une nouvelle fonctionnalité ?',
      answer: 'Proposez vos idées via le formulaire de suggestions. L\'équipe technique les étudiera pour les futures versions.',
      category: 'support',
    },
  ];

  const categories = [
    { id: 'all', name: 'Toutes les catégories' },
    { id: 'connexion', name: 'Connexion' },
    { id: 'utilisation', name: 'Utilisation' },
    { id: 'securite', name: 'Sécurité' },
    { id: 'support', name: 'Support' },
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900">Centre d'aide</h1>
        <p className="text-gray-600 mt-2">
          Trouvez des réponses à vos questions et apprenez à utiliser le portail
        </p>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher dans l'aide..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg 
              className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filtres */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Questions fréquentes</h2>
          <p className="text-gray-600 mt-1">
            {filteredFaqs.length} questions trouvées
          </p>
        </div>

        <div className="divide-y">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition">
                <details className="group">
                  <summary className="flex justify-between items-center cursor-pointer list-none">
                    <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                    <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 pl-4 border-l-2 border-blue-500">
                    <p className="text-gray-600">{faq.answer}</p>
                    <span className="inline-block mt-2 px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {faq.category}
                    </span>
                  </div>
                </details>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun résultat trouvé</h3>
              <p className="text-gray-600">Essayez d'autres mots-clés ou consultez une autre catégorie</p>
            </div>
          )}
        </div>
      </div>

      {/* Formulaire de contact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Contactez-nous</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre nom
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Votre nom complet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre email
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@exemple.fr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sujet
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Problème technique</option>
                <option>Suggestion d'amélioration</option>
                <option>Demande de fonctionnalité</option>
                <option>Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Décrivez votre question ou problème..."
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Envoyer le message
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Support technique</h3>
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">📧</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Email de support</h4>
                <p className="text-gray-600">support@ecole-tfh.fr</p>
                <p className="text-sm text-gray-500">Réponse sous 24h</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600">🕐</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Disponibilité</h4>
                <p className="text-gray-600">Lundi au vendredi, 8h-17h</p>
                <p className="text-sm text-gray-500">Hors jours fériés</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600">🚨</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Urgences techniques</h4>
                <p className="text-gray-600">+33 1 23 45 67 89</p>
                <p className="text-sm text-gray-500">Problèmes empêchant l'utilisation</p>
              </div>
            </div>
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-2">Informations système</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Version du portail: 1.0.0</p>
                <p>Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}</p>
                <p>Navigateurs supportés: Chrome, Firefox, Safari, Edge</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
