import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

const pageHelp = {
  fr: {
    '/dashboard': { title: 'Tableau de bord', icon: 'dashboard', description: 'Vue d\'ensemble de votre rôle. Les données affichées dépendent de vos permissions.', tips: ['Les KPIs se mettent à jour en temps réel', 'Cliquez sur un indicateur pour plus de détails', 'Le score de risque est recalculé à chaque consultation'] },
    '/risk-report': { title: 'Analyse de Risque IA', icon: 'assessment', description: 'Évaluation complète des risques financiers par l\'intelligence artificielle. Score global 0-100 basé sur 4 dimensions.', tips: ['Cash Flow (35%) — ratio dépenses/revenus', 'Factures (25%) — taux d\'impayés et retards', 'Dette (25%) — ratio dette/actifs', 'Charge de prêts (15%) — échéances vs revenus'] },
    '/final-decision': { title: 'Décision IA', icon: 'auto_awesome', description: 'Le moteur de décision convertit le score de risque en actions business concrètes.', tips: ['OK (0-24) — situation favorable', 'Surveiller (25-49) — attention requise', 'Action Requise (50-74) — intervention sous 2-4 semaines', 'Action Immédiate (75-100) — urgence critique'] },
    '/executive': { title: 'Vue Exécutive', icon: 'monitoring', description: 'Dashboard stratégique en lecture seule. Conçu pour les réunions de direction.', tips: ['Score de risque + Indice de santé côte à côte', 'Causes principales du risque avec points de contribution', 'Prévisions 30/60 jours'] },
    '/simulate': { title: 'Simulation de Scénario', icon: 'science', description: 'Simulez l\'impact de changements sur votre profil de risque avec les curseurs.', tips: ['Variation des dépenses : -50% à +100%', 'Factures en retard supplémentaires : 0 à 10', 'Hausse du taux d\'intérêt : 0% à +10%'] },
    '/transactions': { title: 'Transactions', icon: 'receipt_long', description: 'Gérez les revenus et dépenses de l\'entreprise. Chaque transaction suit un workflow.', tips: ['Cliquez sur une transaction pour voir les détails', 'Les catégories sont prédéfinies et traduites', 'Le bouton PDF génère un reçu professionnel', 'Les règles métier peuvent bloquer certaines transactions'] },
    '/invoices': { title: 'Factures', icon: 'description', description: 'Créez et suivez les factures clients. Les factures en retard sont détectées automatiquement.', tips: ['Filtrez par statut : Payées / En attente / En retard', 'Cliquez pour voir les détails et actions', 'Téléchargez chaque facture en PDF (format tunisien)', 'Les factures > 10 000 TND nécessitent une approbation'] },
    '/loans': { title: 'Prêts', icon: 'account_balance', description: 'Suivez les prêts de l\'entreprise avec taux, durée et échéances mensuelles.', tips: ['Les prêts > 100 000 TND nécessitent une approbation', 'Le stress test simule une hausse des taux', 'Les échéances impactent le score de risque'] },
    '/assets': { title: 'Actifs', icon: 'inventory_2', description: 'Inventaire des actifs avec calcul d\'amortissement annuel.', tips: ['Le taux d\'amortissement est en % par an', 'La projection montre la valeur future sur 5 ans', 'Le ratio dette/actifs affecte le score de risque'] },
    '/approvals': { title: 'Approbations', icon: 'pending_actions', description: 'Validez ou refusez les éléments qui dépassent les seuils définis par les règles métier.', tips: ['Les règles sont configurées par l\'administrateur', 'Approuver passe l\'élément en statut "approuvé"', 'Rejeter bloque l\'élément avec une raison'] },
    '/reports': { title: 'Rapports PDF', icon: 'picture_as_pdf', description: 'Générez et téléchargez des rapports exécutifs professionnels.', tips: ['Rapport mensuel : 7 pages (couverture, KPIs, IA, prévisions)', 'Rapport de décision IA', 'Historique avec versioning', 'Génération automatique le 1er de chaque mois'] },
    '/team': { title: 'Équipe', icon: 'people', description: 'Invitez des membres (comptable ou directeur financier). Les invités sont auto-approuvés.', tips: ['Seuls les rôles Comptable et Finance sont disponibles', 'L\'invité reçoit un mot de passe temporaire', 'Les membres partagent toutes les données Tac-Tic'] },
    '/activity': { title: 'Journal d\'activité', icon: 'history', description: 'Traçabilité complète de toutes les actions effectuées dans le système.', tips: ['Qui a fait quoi et quand', 'Toutes les créations, modifications et suppressions', 'Pagination avec chargement progressif'] },
    '/settings': { title: 'Paramètres', icon: 'settings', description: 'Gérez les catégories prédéfinies et les clients utilisés dans les formulaires.', tips: ['Onglets : Catégories / Clients', 'Chaque élément a un libellé FR et EN', 'Modification et suppression en ligne'] },
    '/users': { title: 'Gestion des utilisateurs', icon: 'group', description: 'Approuvez ou refusez les demandes d\'accès. Gérez tous les utilisateurs.', tips: ['Les nouveaux inscrits sont en attente d\'approbation', 'Approuver active le compte immédiatement', 'Refuser bloque définitivement l\'accès'] },
    '/extract-invoice': { title: 'Import Facture IA', icon: 'document_scanner', description: 'Importez un PDF de facture — l\'IA extrait automatiquement les données (client, montant, dates, TVA).', tips: ['Glissez-déposez ou parcourez pour sélectionner un PDF', 'L\'IA détecte les champs avec un score de confiance', 'Les champs à faible confiance sont surlignés en orange', 'Vérifiez et modifiez avant de confirmer', 'Détection de doublons automatique'] },
  },
  en: {
    '/dashboard': { title: 'Dashboard', icon: 'dashboard', description: 'Overview based on your role. Displayed data depends on your permissions.', tips: ['KPIs update in real time', 'Click an indicator for more details', 'Risk score recalculates on each view'] },
    '/risk-report': { title: 'AI Risk Analysis', icon: 'assessment', description: 'Comprehensive AI-powered financial risk assessment. Global score 0-100 across 4 dimensions.', tips: ['Cash Flow (35%) — expense-to-income ratio', 'Invoices (25%) — unpaid and late rates', 'Debt (25%) — debt-to-asset ratio', 'Loan Burden (15%) — payments vs income'] },
    '/final-decision': { title: 'AI Decision', icon: 'auto_awesome', description: 'The decision engine converts risk scores into concrete business actions.', tips: ['OK (0-24) — favorable situation', 'Monitor (25-49) — attention needed', 'Action Required (50-74) — intervene within 2-4 weeks', 'Immediate Action (75-100) — critical urgency'] },
    '/executive': { title: 'Executive View', icon: 'monitoring', description: 'Read-only strategic dashboard. Designed for board meetings.', tips: ['Risk score + Health index side by side', 'Root causes with contribution points', '30/60-day forecasts'] },
    '/simulate': { title: 'Scenario Simulation', icon: 'science', description: 'Simulate how changes would impact your risk profile using sliders.', tips: ['Expense change: -50% to +100%', 'Additional late invoices: 0 to 10', 'Interest rate increase: 0% to +10%'] },
    '/transactions': { title: 'Transactions', icon: 'receipt_long', description: 'Manage company income and expenses. Each transaction follows a workflow.', tips: ['Click a transaction to see details', 'Categories are predefined and translated', 'PDF button generates a professional receipt', 'Business rules may block certain transactions'] },
    '/invoices': { title: 'Invoices', icon: 'description', description: 'Create and track client invoices. Overdue invoices are detected automatically.', tips: ['Filter by status: Paid / Pending / Late', 'Click to see details and actions', 'Download each invoice as PDF (Tunisian format)', 'Invoices > 10,000 TND require approval'] },
    '/loans': { title: 'Loans', icon: 'account_balance', description: 'Track company loans with rate, duration, and monthly payments.', tips: ['Loans > 100,000 TND require approval', 'Stress test simulates rate increases', 'Payments impact the risk score'] },
    '/assets': { title: 'Assets', icon: 'inventory_2', description: 'Asset inventory with annual depreciation calculation.', tips: ['Depreciation rate is in % per year', 'Projection shows value over 5 years', 'Debt-to-asset ratio affects risk score'] },
    '/approvals': { title: 'Approvals', icon: 'pending_actions', description: 'Validate or reject items that exceed thresholds defined by business rules.', tips: ['Rules are configured by the administrator', 'Approving sets the item to "approved" status', 'Rejecting blocks the item with a reason'] },
    '/reports': { title: 'PDF Reports', icon: 'picture_as_pdf', description: 'Generate and download professional executive reports.', tips: ['Monthly report: 7 pages (cover, KPIs, AI, forecasts)', 'AI decision report', 'History with versioning', 'Auto-generated on the 1st of each month'] },
    '/team': { title: 'Team', icon: 'people', description: 'Invite members (accountant or finance manager). Invitees are auto-approved.', tips: ['Only Accountant and Finance roles available', 'Invitee gets a temporary password', 'Members share all Tac-Tic data'] },
    '/activity': { title: 'Activity Log', icon: 'history', description: 'Complete traceability of all actions performed in the system.', tips: ['Who did what and when', 'All creates, updates, and deletes', 'Pagination with progressive loading'] },
    '/settings': { title: 'Settings', icon: 'settings', description: 'Manage predefined categories and clients used in forms.', tips: ['Tabs: Categories / Clients', 'Each item has FR and EN labels', 'Inline edit and delete'] },
    '/users': { title: 'User Management', icon: 'group', description: 'Approve or reject access requests. Manage all users.', tips: ['New signups are pending approval', 'Approving activates the account immediately', 'Rejecting permanently blocks access'] },
    '/extract-invoice': { title: 'AI Invoice Import', icon: 'document_scanner', description: 'Upload an invoice PDF — AI automatically extracts data (client, amount, dates, VAT).', tips: ['Drag & drop or browse to select a PDF', 'AI detects fields with confidence scores', 'Low-confidence fields are highlighted in orange', 'Review and edit before confirming', 'Automatic duplicate detection'] },
  },
};

export default function TopNavbar() {
  const { t, lang } = useLang();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  const currentPath = location.pathname;
  const helpData = pageHelp[lang]?.[currentPath] || pageHelp.fr[currentPath];
  const fallback = { title: lang === 'fr' ? 'Aide' : 'Help', icon: 'help', description: lang === 'fr' ? 'Aucune aide disponible pour cette page.' : 'No help available for this page.', tips: [] };
  const help = helpData || fallback;

  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 flex justify-between items-center px-8"
            style={{ background: '#faf7f2', borderBottom: '1px solid #e5ddce' }}>
      <div className="flex items-center gap-6 flex-1">
        {/* Editorial masthead */}
        <div className="small-caps text-[#0b1f33]" style={{ letterSpacing: '0.2em', fontWeight: 700 }}>
          {lang === 'fr' ? 'EXECUTIVE RISK EDITORIAL' : 'EXECUTIVE RISK EDITORIAL'}
        </div>
        {/* Slim search */}
        <div className="relative max-w-md flex-1 hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8672] text-[18px]">search</span>
          <input className="w-full rounded-full py-1.5 pl-10 pr-4 text-sm transition-all"
                 style={{ background: '#ffffff', border: '1px solid #e5ddce', color: '#0b1f33' }}
                 placeholder={lang === 'fr' ? 'Rechercher des risques...' : 'Search risks...'}
                 type="text" />
        </div>
      </div>
      <div className="flex items-center gap-3 relative">
        {/* AI report chip */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md"
             style={{ background: '#ffffff', border: '1px solid #efe8dc' }}>
          <span className="small-caps text-[#6b7280]">
            {lang === 'fr' ? 'Rapport IA' : 'AI Report'} #{new Date().getTime().toString().slice(-3)}
          </span>
          <span className="editorial-badge-ai">AI</span>
        </div>
        <button onClick={() => setHelpOpen(!helpOpen)}
                className={`p-1.5 rounded-md transition-colors hover:bg-[#efe8dc] ${helpOpen ? 'bg-[#efe8dc]' : ''}`}
                style={{ color: '#6b7280' }}>
          <span className="material-symbols-outlined text-[20px]">help</span>
        </button>

        {/* Help panel */}
        {helpOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setHelpOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-[360px] bg-surface-container-lowest dark:bg-slate-800 rounded-xl shadow-xl border border-surface-container-high dark:border-slate-700 z-40 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-surface-container-high dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 bg-primary-fixed dark:bg-blue-900/30 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-[20px]">{help.icon}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold font-headline text-on-surface dark:text-slate-200">{help.title}</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{lang === 'fr' ? 'Guide de la page' : 'Page guide'}</p>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 border-b border-surface-container-high dark:border-slate-700">
                <p className="text-xs text-on-surface-variant leading-relaxed">{help.description}</p>
              </div>

              {/* Tips */}
              {help.tips.length > 0 && (
                <div className="p-4">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    {lang === 'fr' ? 'Conseils' : 'Tips'}
                  </p>
                  <div className="space-y-2">
                    {help.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-[14px] mt-0.5 shrink-0">check_circle</span>
                        <span className="text-xs text-on-surface dark:text-slate-300 leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
