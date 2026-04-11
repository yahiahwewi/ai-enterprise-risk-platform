import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

const sections = {
  fr: [
    {
      id: 'overview',
      icon: 'dashboard',
      title: 'Vue d\'ensemble du projet',
      content: [
        { type: 'p', text: 'Tac-Tic ERM est une plateforme intelligente de gestion des risques d\'entreprise (Enterprise Risk Management) propulsée par l\'intelligence artificielle. Elle permet aux entreprises de centraliser, analyser et anticiper leurs risques financiers en temps réel.' },
        { type: 'p', text: 'La plateforme combine un backend Node.js/Express avec une base MongoDB, un frontend React moderne, et un microservice Python/FastAPI pour l\'analyse ML avancée.' },
        { type: 'features', items: [
          'Analyse de risque en temps réel avec scoring 0-100',
          'Détection d\'anomalies par IA (Z-Score + Isolation Forest)',
          'Prévisions de trésorerie à 30 et 60 jours',
          'Moteur de décision automatisé (OK → Action Immédiate)',
          'Tableau de bord exécutif avec visualisations interactives',
          'Système de notification intelligent',
        ]},
      ],
    },
    {
      id: 'roles',
      icon: 'people',
      title: 'Rôles & Permissions',
      content: [
        { type: 'role', name: 'Propriétaire (Business Owner)', desc: 'Accès complet : tableau de bord stratégique, rapports IA, décisions, gestion d\'équipe, toutes les données financières. C\'est le décideur principal.', color: 'blue' },
        { type: 'role', name: 'Comptable (Accountant)', desc: 'Gère les transactions (revenus/dépenses) et les factures (création, suivi, marquage payé/en retard). Données limitées à son périmètre.', color: 'green' },
        { type: 'role', name: 'Directeur Financier (Finance Manager)', desc: 'Gère les prêts et les actifs de l\'entreprise. Accès aux KPI financiers : ratio dette/actifs, amortissement, échéances mensuelles.', color: 'yellow' },
        { type: 'role', name: 'Administrateur (Admin)', desc: 'Gestion de la plateforme : vue de tous les utilisateurs, statistiques globales, journal d\'activité système.', color: 'red' },
      ],
    },
    {
      id: 'ai',
      icon: 'auto_awesome',
      title: 'Intelligence Artificielle',
      content: [
        { type: 'p', text: 'Le moteur IA analyse 4 dimensions de risque avec des pondérations calibrées :' },
        { type: 'metrics', items: [
          { name: 'Risque de trésorerie', weight: '35%', desc: 'Ratio dépenses/revenus et flux de trésorerie net' },
          { name: 'Risque de facturation', weight: '25%', desc: 'Taux de factures impayées et en retard' },
          { name: 'Risque d\'endettement', weight: '25%', desc: 'Ratio dette/actifs et niveau de levier' },
          { name: 'Charge de prêts', weight: '15%', desc: 'Poids des échéances mensuelles sur les revenus' },
        ]},
        { type: 'p', text: 'Le microservice Python (AiModule) utilise un modèle GradientBoosting entraîné sur 1500 échantillons synthétiques réalistes. Il fournit : scoring de risque ML, détection d\'anomalies, prévisions de trésorerie, et recommandations automatiques.' },
      ],
    },
    {
      id: 'decision',
      icon: 'gavel',
      title: 'Moteur de Décision',
      content: [
        { type: 'p', text: 'Le moteur de décision convertit le score de risque en actions business concrètes :' },
        { type: 'decisions', items: [
          { level: 'OK', range: '0-24', color: 'green', desc: 'Santé financière solide. Continuer la stratégie actuelle.' },
          { level: 'Surveiller', range: '25-49', color: 'yellow', desc: 'Risque modéré. Certains indicateurs nécessitent attention.' },
          { level: 'Action Requise', range: '50-74', color: 'orange', desc: 'Risque élevé. Mesures correctives dans les 2-4 semaines.' },
          { level: 'Action Immédiate', range: '75-100', color: 'red', desc: 'Risque critique. Intervention exécutive urgente requise.' },
        ]},
      ],
    },
    {
      id: 'features',
      icon: 'widgets',
      title: 'Fonctionnalités',
      content: [
        { type: 'grid', items: [
          { icon: 'receipt_long', title: 'Transactions', desc: 'Enregistrement des revenus et dépenses avec catégorisation et suivi chronologique.' },
          { icon: 'description', title: 'Factures', desc: 'Gestion complète : création, suivi des statuts (payée, en attente, en retard), alertes automatiques.' },
          { icon: 'account_balance', title: 'Prêts', desc: 'Suivi des emprunts : montant, taux, durée, échéances mensuelles, stress test.' },
          { icon: 'inventory_2', title: 'Actifs', desc: 'Inventaire des actifs avec calcul d\'amortissement et projection de valeur sur 5 ans.' },
          { icon: 'notifications', title: 'Notifications', desc: 'Alertes intelligentes : risque élevé, factures en retard, trésorerie négative, anomalies.' },
          { icon: 'history', title: 'Journal d\'activité', desc: 'Traçabilité complète de toutes les actions : qui a fait quoi et quand.' },
        ]},
      ],
    },
    {
      id: 'tech',
      icon: 'code',
      title: 'Architecture technique',
      content: [
        { type: 'p', text: 'Stack technologique complète :' },
        { type: 'tech', items: [
          { name: 'Frontend', tech: 'React 18, Tailwind CSS, Recharts, React Router' },
          { name: 'Backend API', tech: 'Node.js, Express.js, MongoDB, Mongoose' },
          { name: 'Sécurité', tech: 'JWT, bcrypt, Helmet, express-validator, rate limiting' },
          { name: 'IA / ML', tech: 'Python FastAPI, scikit-learn, GradientBoosting, Isolation Forest' },
        ]},
      ],
    },
    {
      id: 'faq',
      icon: 'help',
      title: 'FAQ',
      content: [
        { type: 'faq', items: [
          { q: 'Comment l\'IA calcule-t-elle le score de risque ?', a: 'Le modèle GradientBoosting analyse 10 features financières (ratio de dépenses, marge nette, ratio d\'endettement, etc.) et produit un score 0-100. Le modèle a été entraîné sur 1500 échantillons avec un R² de 0.92 (92% de précision).' },
          { q: 'Les données sont-elles sécurisées ?', a: 'Oui. Authentification JWT, mots de passe hashés (bcrypt), validation des entrées, rate limiting, headers de sécurité (Helmet), et isolation des données par entreprise (companyId).' },
          { q: 'Puis-je exporter des rapports ?', a: 'Les données sont accessibles via l\'API REST. L\'export PDF/Excel est prévu dans une version future.' },
          { q: 'Comment ajouter un nouveau membre ?', a: 'Le propriétaire peut inviter des comptables ou directeurs financiers via la page Équipe. Chaque membre reçoit un accès limité à son rôle.' },
          { q: 'L\'IA peut-elle être réentraînée ?', a: 'Oui. Le microservice Python expose un endpoint POST /ai/train qui relance le pipeline d\'entraînement complet. Les feedbacks utilisateurs peuvent enrichir le dataset.' },
        ]},
      ],
    },
  ],
  en: [
    {
      id: 'overview',
      icon: 'dashboard',
      title: 'Project Overview',
      content: [
        { type: 'p', text: 'Tac-Tic ERM is an intelligent Enterprise Risk Management platform powered by artificial intelligence. It enables companies to centralize, analyze, and anticipate financial risks in real time.' },
        { type: 'p', text: 'The platform combines a Node.js/Express backend with MongoDB, a modern React frontend, and a Python/FastAPI microservice for advanced ML analysis.' },
        { type: 'features', items: [
          'Real-time risk analysis with 0-100 scoring',
          'AI anomaly detection (Z-Score + Isolation Forest)',
          'Cash flow forecasting at 30 and 60 days',
          'Automated decision engine (OK → Immediate Action)',
          'Executive dashboard with interactive visualizations',
          'Intelligent notification system',
        ]},
      ],
    },
    {
      id: 'roles',
      icon: 'people',
      title: 'Roles & Permissions',
      content: [
        { type: 'role', name: 'Business Owner', desc: 'Full access: strategic dashboard, AI reports, decisions, team management, all financial data. The primary decision maker.', color: 'blue' },
        { type: 'role', name: 'Accountant', desc: 'Manages transactions (income/expenses) and invoices (creation, tracking, paid/late marking). Data limited to their scope.', color: 'green' },
        { type: 'role', name: 'Finance Manager', desc: 'Manages loans and company assets. Access to financial KPIs: debt-to-asset ratio, depreciation, monthly payments.', color: 'yellow' },
        { type: 'role', name: 'Administrator', desc: 'Platform management: view all users, global statistics, system activity log.', color: 'red' },
      ],
    },
    {
      id: 'ai',
      icon: 'auto_awesome',
      title: 'Artificial Intelligence',
      content: [
        { type: 'p', text: 'The AI engine analyzes 4 risk dimensions with calibrated weights:' },
        { type: 'metrics', items: [
          { name: 'Cash Flow Risk', weight: '35%', desc: 'Expense-to-revenue ratio and net cash flow' },
          { name: 'Invoice Risk', weight: '25%', desc: 'Unpaid and late invoice rates' },
          { name: 'Debt Risk', weight: '25%', desc: 'Debt-to-asset ratio and leverage level' },
          { name: 'Loan Burden', weight: '15%', desc: 'Monthly payment weight on income' },
        ]},
        { type: 'p', text: 'The Python microservice (AiModule) uses a GradientBoosting model trained on 1500 realistic synthetic samples. It provides: ML risk scoring, anomaly detection, cash flow forecasting, and automatic recommendations.' },
      ],
    },
    {
      id: 'decision',
      icon: 'gavel',
      title: 'Decision Engine',
      content: [
        { type: 'p', text: 'The decision engine converts risk scores into concrete business actions:' },
        { type: 'decisions', items: [
          { level: 'OK', range: '0-24', color: 'green', desc: 'Strong financial health. Continue current strategy.' },
          { level: 'Monitor', range: '25-49', color: 'yellow', desc: 'Moderate risk. Some indicators need attention.' },
          { level: 'Action Required', range: '50-74', color: 'orange', desc: 'Elevated risk. Corrective measures within 2-4 weeks.' },
          { level: 'Immediate Action', range: '75-100', color: 'red', desc: 'Critical risk. Urgent executive intervention required.' },
        ]},
      ],
    },
    {
      id: 'features',
      icon: 'widgets',
      title: 'Features',
      content: [
        { type: 'grid', items: [
          { icon: 'receipt_long', title: 'Transactions', desc: 'Record income and expenses with categorization and chronological tracking.' },
          { icon: 'description', title: 'Invoices', desc: 'Full management: creation, status tracking (paid, pending, late), automatic alerts.' },
          { icon: 'account_balance', title: 'Loans', desc: 'Loan tracking: amount, rate, duration, monthly payments, stress test.' },
          { icon: 'inventory_2', title: 'Assets', desc: 'Asset inventory with depreciation calculation and 5-year value projection.' },
          { icon: 'notifications', title: 'Notifications', desc: 'Smart alerts: high risk, overdue invoices, negative cash flow, anomalies.' },
          { icon: 'history', title: 'Activity Log', desc: 'Complete traceability of all actions: who did what and when.' },
        ]},
      ],
    },
    {
      id: 'tech',
      icon: 'code',
      title: 'Technical Architecture',
      content: [
        { type: 'p', text: 'Complete technology stack:' },
        { type: 'tech', items: [
          { name: 'Frontend', tech: 'React 18, Tailwind CSS, Recharts, React Router' },
          { name: 'Backend API', tech: 'Node.js, Express.js, MongoDB, Mongoose' },
          { name: 'Security', tech: 'JWT, bcrypt, Helmet, express-validator, rate limiting' },
          { name: 'AI / ML', tech: 'Python FastAPI, scikit-learn, GradientBoosting, Isolation Forest' },
        ]},
      ],
    },
    {
      id: 'faq',
      icon: 'help',
      title: 'FAQ',
      content: [
        { type: 'faq', items: [
          { q: 'How does the AI calculate the risk score?', a: 'The GradientBoosting model analyzes 10 financial features (expense ratio, net margin, debt ratio, etc.) and produces a 0-100 score. Trained on 1500 samples with R² of 0.92 (92% accuracy).' },
          { q: 'Is data secure?', a: 'Yes. JWT authentication, hashed passwords (bcrypt), input validation, rate limiting, security headers (Helmet), and data isolation per company (companyId).' },
          { q: 'Can I export reports?', a: 'Data is accessible via REST API. PDF/Excel export is planned for a future version.' },
          { q: 'How do I add a team member?', a: 'The owner can invite accountants or finance managers via the Team page. Each member gets role-limited access.' },
          { q: 'Can the AI be retrained?', a: 'Yes. The Python microservice exposes POST /ai/train which reruns the full training pipeline. User feedback can enrich the dataset.' },
        ]},
      ],
    },
  ],
};

const colorMap = { blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700', yellow: 'bg-amber-100 text-amber-700', orange: 'bg-orange-100 text-orange-700', red: 'bg-red-100 text-red-700' };

function RenderContent({ block }) {
  if (block.type === 'p') return <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{block.text}</p>;

  if (block.type === 'features') return (
    <ul className="space-y-2 mb-4">
      {block.items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">check_circle</span>
          {item}
        </li>
      ))}
    </ul>
  );

  if (block.type === 'role') return (
    <div className="flex gap-4 p-4 bg-surface-container-low dark:bg-slate-700/50 rounded-xl mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[block.color]}`}>
        <span className="material-symbols-outlined text-[20px]">person</span>
      </div>
      <div>
        <h4 className="text-sm font-bold text-on-surface dark:text-slate-200 mb-0.5">{block.name}</h4>
        <p className="text-xs text-on-surface-variant leading-relaxed">{block.desc}</p>
      </div>
    </div>
  );

  if (block.type === 'metrics') return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      {block.items.map((m, i) => (
        <div key={i} className="p-4 bg-surface-container-low dark:bg-slate-700/50 rounded-xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold text-on-surface dark:text-slate-200">{m.name}</span>
            <span className="text-xs font-bold text-primary bg-primary-fixed dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{m.weight}</span>
          </div>
          <p className="text-xs text-on-surface-variant">{m.desc}</p>
        </div>
      ))}
    </div>
  );

  if (block.type === 'decisions') return (
    <div className="space-y-2 mb-4">
      {block.items.map((d, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${d.color === 'green' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : d.color === 'yellow' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : d.color === 'orange' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-red-500 bg-red-50 dark:bg-red-900/10'}`}>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${colorMap[d.color]}`}>{d.range}</span>
          <div>
            <span className="text-sm font-bold text-on-surface dark:text-slate-200">{d.level}</span>
            <span className="text-xs text-on-surface-variant ml-2">{d.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  if (block.type === 'grid') return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {block.items.map((item, i) => (
        <div key={i} className="p-4 bg-surface-container-low dark:bg-slate-700/50 rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all">
          <span className="material-symbols-outlined text-primary p-2 bg-white dark:bg-slate-800 rounded-lg mb-3 inline-block">{item.icon}</span>
          <h4 className="text-sm font-bold text-on-surface dark:text-slate-200 mb-1">{item.title}</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  );

  if (block.type === 'tech') return (
    <div className="space-y-2 mb-4">
      {block.items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-low dark:bg-slate-700/50 rounded-xl">
          <span className="text-xs font-bold text-primary bg-primary-fixed dark:bg-blue-900/30 px-2.5 py-1 rounded-lg min-w-[100px] text-center">{item.name}</span>
          <span className="text-xs text-on-surface-variant">{item.tech}</span>
        </div>
      ))}
    </div>
  );

  if (block.type === 'faq') return (
    <div className="space-y-3 mb-4">
      {block.items.map((item, i) => (
        <details key={i} className="group bg-surface-container-low dark:bg-slate-700/50 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors">
            <span className="text-sm font-bold text-on-surface dark:text-slate-200 pr-4">{item.q}</span>
            <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform text-[20px] shrink-0">expand_more</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-xs text-on-surface-variant leading-relaxed">{item.a}</p>
          </div>
        </details>
      ))}
    </div>
  );

  return null;
}

export default function About() {
  const { lang, setLang } = useLang();
  const [activeSection, setActiveSection] = useState('overview');
  const data = sections[lang] || sections.fr;

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-container-lowest dark:bg-slate-900 h-screen fixed left-0 top-0 flex flex-col py-6 border-r border-surface-container-high dark:border-slate-800">
        <div className="px-6 mb-8">
          <Link to="/login" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-4">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="text-xs font-bold">{lang === 'fr' ? 'Retour' : 'Back'}</span>
          </Link>
          <img src="/logo.png" alt="Tac-Tic" className="h-8 mb-3" />
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{lang === 'fr' ? 'Documentation & FAQ' : 'Documentation & FAQ'}</p>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-0.5">
          {data.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left mx-2 px-4 py-2.5 flex items-center gap-3 rounded-lg transition-colors text-sm font-medium ${
                activeSection === section.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
              <span className="truncate">{section.title}</span>
            </button>
          ))}
        </nav>

        <div className="px-6 mt-auto space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{lang === 'fr' ? 'Langue' : 'Language'}</p>
            <div className="flex gap-1">
              <button onClick={() => setLang('fr')} className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${lang === 'fr' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>FR</button>
              <button onClick={() => setLang('en')} className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${lang === 'en' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>EN</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 py-12 px-10">
        <div className="max-w-4xl mx-auto">
          {data.filter((s) => s.id === activeSection).map((section) => (
            <div key={section.id}>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-primary-fixed dark:bg-blue-900/30 rounded-xl">
                  <span className="material-symbols-outlined text-primary text-[24px]">{section.icon}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold font-headline text-on-surface dark:text-slate-100">{section.title}</h1>
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">Tac-Tic ERM Platform</p>
                </div>
              </div>
              {section.content.map((block, i) => (
                <RenderContent key={i} block={block} />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
