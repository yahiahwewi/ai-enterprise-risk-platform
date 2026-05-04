/**
 * About.js — Editorial landing page / public documentation.
 * Complete rewrite: cream palette, Playfair serif display, sprint timeline,
 * live stats, and modern interactive sections.
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLang } from '../context/LanguageContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ═════════════════════════════════════════════════════════════════════
// CONTENT
// ═════════════════════════════════════════════════════════════════════
const CONTENT = {
  fr: {
    heroKicker: 'PLATEFORME ERM FINTECH — PROPULSÉE PAR L\'IA',
    heroTitle: 'Tac-Tic ERM',
    heroTag: 'Anticiper les risques. Certifier les décisions.',
    heroBody: 'Une plateforme unifiée qui conjugue intelligence artificielle, certification cryptographique et workflow automatisé pour les PME et institutions financières de la région MENA.',
    ctaDemo: 'Se connecter à la démo',
    ctaVerify: 'Vérifier un rapport',
    statsTitle: 'Chiffres clés',
    stats: [
      { value: '6', label: 'Rôles spécialisés',  hint: 'RBAC granulaire' },
      { value: '48', label: 'Permissions dynamiques', hint: 'Personnalisables' },
      { value: '10', label: 'Modules métier',     hint: 'Intégrés' },
      { value: '100 %',  label: 'Détection tampering', hint: 'Via SHA-256' },
    ],
    pillarsTitle: 'Trois piliers différenciants',
    pillars: [
      { icon: 'psychology',   title: 'Intelligence prédictive', body: 'Score de risque 0–100 calculé en temps réel sur quatre dimensions financières pondérées. Copilot conversationnel, simulation à sept leviers et prévisions à 30/60 jours.' },
      { icon: 'verified',     title: 'Certification juridique', body: 'Signature RSA-SHA256 + horodatage RFC 3161 via DigiCert TSA. Vérification publique par ID ou par upload. Chaque facture protégée par empreinte SHA-256 détectant toute altération.' },
      { icon: 'search_insights', title: 'Investigation forensique', body: 'Mode enquête dédié à l\'Auditor : rattachement polymorphe d\'entités, chronologie typée, clôture avec dossier PDF signé et opposable en justice.' },
    ],
    rolesTitle: 'Six profils, un RBAC dynamique',
    rolesSub: 'Chaque rôle dispose d\'un espace de travail taillé sur mesure, avec des permissions désormais configurables à chaud via le panneau Admin.',
    roles: [
      { id: 'admin',      name: 'Admin',      icon: 'shield_person', tag: 'Gouvernance',
        scope: 'Utilisateurs · Règles · Permissions · Audit',
        desc:  'Approuve les inscriptions, configure les règles métier, supervise les journaux d\'audit, gère le panneau de permissions dynamique.' },
      { id: 'owner',      name: 'Owner',      icon: 'workspace_premium', tag: 'Décision stratégique',
        scope: 'Dashboard exécutif · Copilot IA · Simulation · Stratégie',
        desc:  'Vision stratégique consolidée, décisions finales, dialogue avec le copilot, simulation de scénarios, acquittement des alertes critiques.' },
      { id: 'accountant', name: 'Accountant', icon: 'receipt_long', tag: 'Opérations financières',
        scope: 'Factures · Transactions · Import IA',
        desc:  'Saisie quotidienne des factures et transactions avec empreinte SHA-256 automatique. Extraction par IA (OCR) d\'invoices scannées.' },
      { id: 'finance',    name: 'Finance',    icon: 'account_balance', tag: 'Gestion de trésorerie',
        scope: 'Prêts · Actifs · Stress test',
        desc:  'Suivi des prêts, amortissements, actifs et stress-tests financiers. Calcul des ratios dette/actifs et des mensualités.' },
      { id: 'analyst',    name: 'Analyst',    icon: 'insights', tag: 'Analyse des risques',
        scope: 'Workbench · Mémos IA · Matrice 5×5 · Escalade',
        desc:  'Espace de travail dédié avec IA drafter, mémos structurés en 4 sections, matrice 5×5 colorée, escalade critique instantanée vers l\'Owner.' },
      { id: 'auditor',    name: 'Auditor',    icon: 'fact_check', tag: 'Contrôle & Forensique',
        scope: 'Lecture seule · Investigations · Intégrité',
        desc:  'Mode audit en lecture seule sur tout le système. Conduite d\'investigations forensiques avec export PDF signé opposable.' },
    ],
    timelineTitle: 'Six sprints, deux releases et un enrichissement',
    timeline: [
      { sprint: 'Sprint 1', focus: 'Authentification & RBAC',   hl: 'Infrastructure sécurité · JWT · bcrypt salt 12' },
      { sprint: 'Sprint 2', focus: 'Gestion des risques & scoring IA', hl: 'Score 0–100 · Matrice 5×5 interactive' },
      { sprint: 'Sprint 3', focus: 'Opérations financières',    hl: 'Factures SHA-256 · Indice de santé A–F' },
      { sprint: 'Sprint 4', focus: 'Règles, workflow & certification', hl: 'RSA-2048 · TSA RFC 3161 · Page publique' },
      { sprint: 'Sprint 5', focus: 'IA avancée & vue exécutive', hl: 'Copilot · Simulation 7 leviers · Calendrier fiscal' },
      { sprint: 'Sprint 6', focus: 'Enrichissements pro',       hl: 'Analyst · Auditor · Investigations · Dark Mode' },
    ],
    aiTitle: 'Moteur d\'Intelligence Artificielle',
    aiIntro: 'Le moteur de scoring s\'appuie sur quatre dimensions financières pondérées, calibrées par itérations sur des jeux de données sectoriels.',
    dimensions: [
      { name: 'Trésorerie',         w: 35, desc: 'Ratio entrées/sorties, tendance sur 90 jours, détection de soldes négatifs récurrents.' },
      { name: 'Factures',           w: 25, desc: 'Taux de factures impayées, montant en retard, âge moyen des créances.' },
      { name: 'Endettement',        w: 25, desc: 'Ratio dette/actifs, évolution du stock de dette, capacité de remboursement.' },
      { name: 'Charge d\'emprunt',  w: 15, desc: 'Poids des mensualités sur les flux, taux d\'intérêt moyen pondéré.' },
    ],
    decisionTitle: 'Tiers de décision',
    decisions: [
      { level: 'OK',            range: '0–24',   color: 'green',  desc: 'Santé financière solide. Stratégie courante maintenue.' },
      { level: 'Surveiller',    range: '25–49',  color: 'amber',  desc: 'Risque modéré. Certains indicateurs demandent attention.' },
      { level: 'Action requise',range: '50–74',  color: 'orange', desc: 'Risque élevé. Mesures correctives en 2 à 4 semaines.' },
      { level: 'Action immédiate',range: '75–100', color: 'red',  desc: 'Risque critique. Intervention exécutive urgente requise.' },
    ],
    securityTitle: 'Chaîne de confiance cryptographique',
    securitySub: 'Chaque rapport signé suit un pipeline en sept étapes qui garantit l\'intégrité, l\'authenticité et la preuve d\'existence à une date certaine.',
    securitySteps: [
      'Génération du contenu PDF par Puppeteer',
      'Ajout de la page de vérification + QR code',
      'Calcul du hash SHA-256 du fichier final',
      'Signature RSA-2048 de l\'empreinte',
      'Requête TSA DigiCert au format DER ASN.1',
      'Stockage token TSA + timestamp',
      'Publication sur la page publique /verify/:id',
    ],
    stackTitle: 'Architecture technique',
    stack: [
      { layer: 'Frontend',      list: 'React 18 · Tailwind · Recharts · Playfair Display · IBM Plex Sans' },
      { layer: 'Backend API',   list: 'Node.js · Express · JWT · Helmet · Rate Limiter · Multer' },
      { layer: 'Services IA',   list: 'aiService · ruleEngine · copilot · scenarioEngine · memoDrafter' },
      { layer: 'Cryptographie', list: 'node-forge · pdf-lib · DigiCert TSA · certs X.509 auto-générés' },
      { layer: 'Données',       list: 'MongoDB · Mongoose · 14 collections · indexes optimisés' },
      { layer: 'AI Module',     list: 'Python · FastAPI · scikit-learn · GradientBoosting · Isolation Forest' },
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      { q: 'Comment la plateforme détecte-t-elle une facture modifiée ?',
        a: 'À la création, un hash SHA-256 est calculé sur 7 champs critiques (client, montant, dates, référence, description, catégorie). À chaque lecture, le hash est recalculé et comparé. Toute divergence — même un seul caractère modifié — déclenche une alerte et liste les champs altérés.' },
      { q: 'Les rapports certifiés ont-ils valeur juridique ?',
        a: 'Oui. Le pipeline combine une signature RSA-SHA256 (sur clé 2048 bits) et un horodatage qualifié conforme au RFC 3161 délivré par DigiCert TSA. Cette double garantie est reconnue par le règlement eIDAS comme équivalente à une signature manuscrite.' },
      { q: 'Le copilot envoie-t-il mes données à OpenAI ou Anthropic ?',
        a: 'Non. Le copilot est un routeur sémantique déterministe implémenté en JavaScript. Il détecte l\'intention par mots-clés et dirige vers le service backend adéquat. Aucune requête n\'est envoyée à un fournisseur de LLM externe. Vos données financières restent sur votre infrastructure.' },
      { q: 'Puis-je personnaliser les permissions par rôle ?',
        a: 'Absolument. Le panneau /permissions (réservé à l\'Admin et au Owner) expose 48 permissions dynamiques regroupées en 10 modules. Les toggles sont appliqués instantanément, sans redéploiement.' },
      { q: 'Comment escalader une alerte critique à la direction ?',
        a: 'L\'analyste enregistre un mémo avec la gravité "Critique". Un bandeau rouge pulsant apparaît automatiquement sur toutes les pages de l\'Owner, accompagné d\'une notification à priorité 100. L\'acquittement ferme la boucle avec retour à l\'analyste.' },
    ],
    contactTitle: 'Projet & auteur',
    contactAuthor: 'Yahya Houaoui',
    contactRole: 'Étudiant Ingénieur — ESPRIT',
    contactSchool: 'École Supérieure Privée d\'Ingénierie et de Technologies',
    contactCompany: 'Stage de Projet de Fin d\'Études · 2025–2026',
    footerMsg: 'Documentation publique · Tac-Tic ERM © 2026',
  },
  en: {
    heroKicker: 'AI-POWERED ERM FINTECH PLATFORM',
    heroTitle: 'Tac-Tic ERM',
    heroTag: 'Anticipate risks. Certify decisions.',
    heroBody: 'A unified platform combining artificial intelligence, cryptographic certification, and automated workflow for SMEs and financial institutions across the MENA region.',
    ctaDemo: 'Access the demo',
    ctaVerify: 'Verify a report',
    statsTitle: 'Key figures',
    stats: [
      { value: '6',    label: 'Specialised roles', hint: 'Granular RBAC' },
      { value: '48',   label: 'Dynamic permissions', hint: 'Customisable' },
      { value: '10',   label: 'Business modules', hint: 'Integrated' },
      { value: '100 %',label: 'Tamper detection',  hint: 'Via SHA-256' },
    ],
    pillarsTitle: 'Three differentiating pillars',
    pillars: [
      { icon: 'psychology',      title: 'Predictive intelligence', body: 'Real-time 0–100 risk score across four weighted financial dimensions. Conversational copilot, 7-lever scenario simulation and 30/60-day forecasts.' },
      { icon: 'verified',        title: 'Legal certification',     body: 'RSA-SHA256 signing + RFC 3161 timestamp via DigiCert TSA. Public verification by ID or upload. Each invoice protected by SHA-256 fingerprint detecting any alteration.' },
      { icon: 'search_insights', title: 'Forensic investigation', body: 'Dedicated enquiry mode for the Auditor: polymorphic entity linking, typed timeline, closure with legally opposable signed PDF dossier.' },
    ],
    rolesTitle: 'Six profiles, dynamic RBAC',
    rolesSub: 'Each role has a tailor-made workspace, with permissions now hot-configurable through the Admin panel.',
    roles: [
      { id: 'admin',      name: 'Admin',      icon: 'shield_person', tag: 'Governance',
        scope: 'Users · Rules · Permissions · Audit',
        desc:  'Approves signups, configures business rules, supervises audit logs, manages the dynamic permissions panel.' },
      { id: 'owner',      name: 'Owner',      icon: 'workspace_premium', tag: 'Strategic decisions',
        scope: 'Executive dashboard · AI Copilot · Simulation · Strategy',
        desc:  'Consolidated strategic view, final decisions, copilot dialogue, scenario simulation, critical alert acknowledgement.' },
      { id: 'accountant', name: 'Accountant', icon: 'receipt_long', tag: 'Financial operations',
        scope: 'Invoices · Transactions · AI import',
        desc:  'Day-to-day invoice and transaction entry with automatic SHA-256 fingerprint. AI-based OCR extraction of scanned invoices.' },
      { id: 'finance',    name: 'Finance',    icon: 'account_balance', tag: 'Treasury management',
        scope: 'Loans · Assets · Stress test',
        desc:  'Loan and asset tracking, amortisation schedules, financial stress-tests. Debt-to-asset ratio and monthly payment computation.' },
      { id: 'analyst',    name: 'Analyst',    icon: 'insights', tag: 'Risk analysis',
        scope: 'Workbench · AI memos · 5×5 matrix · Escalation',
        desc:  'Dedicated workspace with AI drafter, 4-section structured memos, colour-coded 5×5 matrix, instant critical escalation to the Owner.' },
      { id: 'auditor',    name: 'Auditor',    icon: 'fact_check', tag: 'Audit & forensics',
        scope: 'Read-only · Investigations · Integrity',
        desc:  'System-wide read-only audit mode. Runs forensic investigations with legally opposable signed PDF exports.' },
    ],
    timelineTitle: 'Six sprints, two releases and one enrichment',
    timeline: [
      { sprint: 'Sprint 1', focus: 'Authentication & RBAC',     hl: 'Security infrastructure · JWT · bcrypt salt 12' },
      { sprint: 'Sprint 2', focus: 'Risk management & AI scoring', hl: '0–100 score · interactive 5×5 matrix' },
      { sprint: 'Sprint 3', focus: 'Financial operations',       hl: 'SHA-256 invoices · health index A–F' },
      { sprint: 'Sprint 4', focus: 'Rules, workflow & certification', hl: 'RSA-2048 · TSA RFC 3161 · public verify page' },
      { sprint: 'Sprint 5', focus: 'Advanced AI & executive view', hl: 'Copilot · 7-lever simulation · fiscal calendar' },
      { sprint: 'Sprint 6', focus: 'Pro enrichments',            hl: 'Analyst · Auditor · Investigations · Dark Mode' },
    ],
    aiTitle: 'Artificial Intelligence Engine',
    aiIntro: 'The scoring engine rests on four weighted financial dimensions, calibrated iteratively on sector-specific datasets.',
    dimensions: [
      { name: 'Cash flow',    w: 35, desc: 'Inflow/outflow ratio, 90-day trend, detection of recurring negative balances.' },
      { name: 'Invoices',     w: 25, desc: 'Unpaid rate, overdue amount, average receivables age.' },
      { name: 'Debt',         w: 25, desc: 'Debt-to-asset ratio, debt stock evolution, repayment capacity.' },
      { name: 'Loan burden',  w: 15, desc: 'Monthly payment weight on cash flow, weighted average interest rate.' },
    ],
    decisionTitle: 'Decision tiers',
    decisions: [
      { level: 'OK',               range: '0–24',   color: 'green',  desc: 'Strong financial health. Keep current strategy.' },
      { level: 'Monitor',          range: '25–49',  color: 'amber',  desc: 'Moderate risk. Some indicators need attention.' },
      { level: 'Action required',  range: '50–74',  color: 'orange', desc: 'Elevated risk. Corrective measures within 2–4 weeks.' },
      { level: 'Immediate action', range: '75–100', color: 'red',    desc: 'Critical risk. Urgent executive intervention required.' },
    ],
    securityTitle: 'Cryptographic chain of trust',
    securitySub: 'Each signed report goes through a seven-step pipeline guaranteeing integrity, authenticity, and proof of existence at a certain date.',
    securitySteps: [
      'Generate PDF content via Puppeteer',
      'Append verification page with QR code',
      'Compute SHA-256 hash of the final file',
      'Sign hash with RSA-2048 key',
      'Request DigiCert TSA in DER ASN.1 format',
      'Persist TSA token + timestamp',
      'Publish on public /verify/:id page',
    ],
    stackTitle: 'Technical architecture',
    stack: [
      { layer: 'Frontend',       list: 'React 18 · Tailwind · Recharts · Playfair Display · IBM Plex Sans' },
      { layer: 'Backend API',    list: 'Node.js · Express · JWT · Helmet · Rate Limiter · Multer' },
      { layer: 'AI services',    list: 'aiService · ruleEngine · copilot · scenarioEngine · memoDrafter' },
      { layer: 'Cryptography',   list: 'node-forge · pdf-lib · DigiCert TSA · auto-generated X.509 certs' },
      { layer: 'Data',           list: 'MongoDB · Mongoose · 14 collections · optimised indexes' },
      { layer: 'AI Module',      list: 'Python · FastAPI · scikit-learn · GradientBoosting · Isolation Forest' },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'How does the platform detect a modified invoice?',
        a: 'On creation, a SHA-256 hash is computed over 7 critical fields (client, amount, dates, reference, description, category). On every read the hash is recomputed and compared. Any mismatch — even a single character changed — raises an alert and lists the altered fields.' },
      { q: 'Do certified reports have legal value?',
        a: 'Yes. The pipeline combines an RSA-SHA256 signature (2048-bit key) and a qualified timestamp compliant with RFC 3161 issued by DigiCert TSA. This double guarantee is recognised by the eIDAS regulation as equivalent to a handwritten signature.' },
      { q: 'Does the copilot send my data to OpenAI or Anthropic?',
        a: 'No. The copilot is a deterministic semantic router implemented in JavaScript. It detects intent by keywords and dispatches to the appropriate backend service. No request is sent to an external LLM provider. Your financial data stays on your infrastructure.' },
      { q: 'Can I customise permissions per role?',
        a: 'Absolutely. The /permissions panel (Admin and Owner only) exposes 48 dynamic permissions grouped in 10 modules. Toggles apply instantly, no redeployment needed.' },
      { q: 'How do I escalate a critical alert to management?',
        a: 'The analyst saves a memo with "Critical" severity. A pulsing red banner automatically appears on every Owner page, along with a priority-100 notification. Acknowledging closes the loop with a return notification to the analyst.' },
    ],
    contactTitle: 'Project & author',
    contactAuthor: 'Yahya Houaoui',
    contactRole: 'Engineering student — ESPRIT',
    contactSchool: 'Private Higher School of Engineering and Technologies',
    contactCompany: 'Final Year Project internship · 2025–2026',
    footerMsg: 'Public documentation · Tac-Tic ERM © 2026',
  },
};

const ROLE_ACCENT = {
  admin:      '#0b1f33',
  owner:      '#b8860b',
  accountant: '#006666',
  finance:    '#0e7690',
  analyst:    '#5b21b6',
  auditor:    '#7f1d1d',
};

const DECISION_COLORS = {
  green:  { bg: '#e8f5e9', fg: '#0d7a4a', bar: '#0d7a4a' },
  amber:  { bg: '#fff8e1', fg: '#a47700', bar: '#d4a017' },
  orange: { bg: '#fff4e5', fg: '#c46320', bar: '#d97706' },
  red:    { bg: '#fbe9ec', fg: '#c8102e', bar: '#c8102e' },
};

// ═════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function About() {
  const { lang, setLang } = useLang();
  const c = CONTENT[lang] || CONTENT.fr;
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={{ background: '#f6f2ea', color: '#0b1f33', minHeight: '100vh' }}
         className="font-body">
      <TopBar lang={lang} setLang={setLang} c={c} />

      {/* ───────── HERO ───────── */}
      <Hero c={c} />

      {/* ───────── LIVE STATS ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <SectionTitle kicker={c.statsTitle} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {c.stats.map((s, i) => <StatTile key={i} {...s} delay={i * 60} />)}
        </div>
      </section>

      {/* ───────── PILLARS ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <SectionTitle kicker={c.pillarsTitle} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          {c.pillars.map((p, i) => <PillarCard key={i} {...p} />)}
        </div>
      </section>

      {/* ───────── ROLES ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <SectionTitle kicker={c.rolesTitle} sub={c.rolesSub} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {c.roles.map((r) => <RoleCard key={r.id} r={r} />)}
        </div>
      </section>

      {/* ───────── TIMELINE ───────── */}
      <section style={{ background: '#faf7f2', borderTop: '1px solid #e5ddce', borderBottom: '1px solid #e5ddce' }}>
        <div className="max-w-6xl mx-auto px-6 py-14">
          <SectionTitle kicker={c.timelineTitle} />
          <Timeline items={c.timeline} />
        </div>
      </section>

      {/* ───────── AI ENGINE ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <SectionTitle kicker={c.aiTitle} sub={c.aiIntro} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="space-y-3">
            {c.dimensions.map((d) => <DimensionBar key={d.name} {...d} />)}
          </div>
          <div>
            <h4 className="font-editorial text-[20px] font-bold text-[#0b1f33] mb-3"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
              {c.decisionTitle}
            </h4>
            <div className="space-y-2">
              {c.decisions.map((d) => <DecisionRow key={d.level} {...d} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── SECURITY ───────── */}
      <section style={{ background: '#0b1f33', color: '#f6f2ea' }}
               className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="small-caps mb-2" style={{ color: '#b8860b', letterSpacing: '0.22em' }}>
            {lang === 'fr' ? 'SIGNATURE NUMÉRIQUE' : 'DIGITAL SIGNATURE'}
          </div>
          <h2 className="font-editorial text-[32px] md:text-[40px] font-black leading-tight mb-3"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            {c.securityTitle}
          </h2>
          <p className="text-[14px] text-[#e5ddce] max-w-3xl mb-10 leading-relaxed">
            {c.securitySub}
          </p>
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.securitySteps.map((step, i) => (
              <li key={i} className="flex gap-3 p-4 rounded-lg"
                  style={{ background: 'rgba(246, 242, 234, 0.06)',
                           border: '1px solid rgba(184, 134, 11, 0.25)' }}>
                <span className="font-editorial text-[28px] font-black leading-none shrink-0"
                      style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#b8860b' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[13px] text-[#f6f2ea] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── STACK ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <SectionTitle kicker={c.stackTitle} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {c.stack.map((s, i) => <StackRow key={i} layer={s.layer} list={s.list} />)}
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section style={{ background: '#faf7f2', borderTop: '1px solid #e5ddce' }}>
        <div className="max-w-3xl mx-auto px-6 py-14">
          <SectionTitle kicker={c.faqTitle} />
          <div className="space-y-3 mt-6">
            {c.faq.map((f, i) => (
              <FaqItem
                key={i}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                q={f.q}
                a={f.a}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CONTACT / AUTHOR ───────── */}
      <section className="max-w-4xl mx-auto px-6 py-14 text-center">
        <div className="small-caps mb-2" style={{ color: '#8b8672', letterSpacing: '0.22em' }}>
          {c.contactTitle}
        </div>
        <h2 className="font-editorial text-[42px] font-black text-[#0b1f33] mb-1"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          {c.contactAuthor}
        </h2>
        <p className="text-[15px] text-[#4a5568] font-semibold">{c.contactRole}</p>
        <p className="text-[12px] text-[#8b8672] italic mt-1">{c.contactSchool}</p>
        <p className="text-[11px] small-caps text-[#b8860b] mt-3"
           style={{ letterSpacing: '0.16em' }}>
          {c.contactCompany}
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/login" className="editorial-btn-primary text-[13px] inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">login</span>
            {c.ctaDemo}
          </Link>
          <Link to="/verify-upload" className="editorial-btn-ghost text-[13px] inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            {c.ctaVerify}
          </Link>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer style={{ background: '#0b1f33', color: '#8b8672' }}
              className="text-center py-6 text-[11px] small-caps"
              >
        <span style={{ letterSpacing: '0.18em' }}>{c.footerMsg}</span>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════

function TopBar({ lang, setLang, c }) {
  return (
    <header className="sticky top-0 z-30"
            style={{ background: 'rgba(246, 242, 234, 0.88)',
                     backdropFilter: 'blur(14px)',
                     borderBottom: '1px solid #e5ddce' }}>
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="font-editorial text-[22px] font-black text-[#0b1f33] tracking-tight"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          Tac-Tic <span style={{ color: '#b8860b' }}>ERM</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[12px] font-semibold text-[#4a5568]">
          <a href="#pillars" className="hover:text-[#0b1f33]">{lang === 'fr' ? 'Produit' : 'Product'}</a>
          <a href="#roles"   className="hover:text-[#0b1f33]">{lang === 'fr' ? 'Rôles' : 'Roles'}</a>
          <a href="#ai"      className="hover:text-[#0b1f33]">{lang === 'fr' ? 'IA' : 'AI'}</a>
          <a href="#security"className="hover:text-[#0b1f33]">{lang === 'fr' ? 'Sécurité' : 'Security'}</a>
          <a href="#faq"     className="hover:text-[#0b1f33]">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang('fr')}
                  className="small-caps px-2 py-1 rounded-md"
                  style={{ background: lang === 'fr' ? '#002b4c' : 'transparent',
                           color: lang === 'fr' ? '#fff' : '#6b7280', fontSize: 10 }}>FR</button>
          <button onClick={() => setLang('en')}
                  className="small-caps px-2 py-1 rounded-md"
                  style={{ background: lang === 'en' ? '#002b4c' : 'transparent',
                           color: lang === 'en' ? '#fff' : '#6b7280', fontSize: 10 }}>EN</button>
          <Link to="/login" className="editorial-btn-primary text-[12px] ml-1 !py-2 !px-4">
            {lang === 'fr' ? 'Démo' : 'Demo'}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ c }) {
  return (
    <section className="relative overflow-hidden"
             style={{ background: '#0b1f33' }}>
      {/* Decorative gradients */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
           style={{
             backgroundImage:
               'radial-gradient(ellipse 80% 50% at 10% 0%, rgba(184,134,11,0.22), transparent 60%),' +
               'radial-gradient(ellipse 50% 60% at 95% 100%, rgba(91,33,182,0.25), transparent 60%)',
           }} />
      <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="small-caps mb-4" style={{ color: '#b8860b', letterSpacing: '0.22em' }}>
          {c.heroKicker}
        </div>
        <h1 className="font-editorial font-black text-white leading-none"
            style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(56px, 8vw, 104px)' }}>
          {c.heroTitle}
        </h1>
        <p className="font-editorial italic mt-3 text-[#e5ddce]"
           style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(22px, 2.5vw, 34px)' }}>
          {c.heroTag}
        </p>
        <p className="max-w-2xl mt-6 text-[15px] md:text-[16px] text-[#f6f2ea] leading-relaxed">
          {c.heroBody}
        </p>
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <Link to="/login"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-[1px]"
                style={{ background: '#b8860b', color: '#0b1f33',
                         boxShadow: '0 8px 24px -10px rgba(184,134,11,0.5)' }}>
            <span className="material-symbols-outlined text-[18px]">login</span>
            {c.ctaDemo}
          </Link>
          <Link to="/verify-upload"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-[14px]"
                style={{ background: 'transparent', color: '#f6f2ea', border: '1px solid rgba(246,242,234,0.3)' }}>
            <span className="material-symbols-outlined text-[18px]">verified</span>
            {c.ctaVerify}
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ kicker, sub }) {
  return (
    <div className="mb-2">
      <h2 className="font-editorial text-[30px] md:text-[36px] font-black leading-tight text-[#0b1f33]"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
        {kicker}
      </h2>
      {sub && <p className="text-[14px] text-[#4a5568] max-w-3xl mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}

function StatTile({ value, label, hint, delay = 0 }) {
  // Animate numeric stats on mount
  const [display, setDisplay] = useState(value);
  const numeric = /^\d/.test(String(value));
  useEffect(() => {
    if (!numeric) return;
    const target = parseInt(String(value).replace(/\D/g, ''), 10);
    if (!Number.isFinite(target)) return;
    const duration = 1000;
    const start = performance.now() + delay;
    let raf;
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(eased * target);
      setDisplay(String(value).replace(/^\d+/, String(cur)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay, numeric]);

  return (
    <div className="editorial-card p-5 text-center">
      <div className="font-editorial text-[44px] md:text-[52px] font-black leading-none text-[#0b1f33]"
           style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
        {display}
      </div>
      <div className="small-caps mt-2" style={{ color: '#8b8672' }}>{label}</div>
      <div className="text-[11px] text-[#6b7280] italic mt-1">{hint}</div>
    </div>
  );
}

function PillarCard({ icon, title, body }) {
  return (
    <article className="editorial-card p-6 h-full flex flex-col">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
           style={{ background: '#0b1f33' }}>
        <span className="material-symbols-outlined text-[26px]" style={{ color: '#b8860b' }}>{icon}</span>
      </div>
      <h3 className="font-editorial text-[22px] font-bold text-[#0b1f33] leading-tight mb-2"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
        {title}
      </h3>
      <p className="text-[13px] text-[#4a5568] leading-relaxed flex-1">{body}</p>
    </article>
  );
}

function RoleCard({ r }) {
  const accent = ROLE_ACCENT[r.id] || '#0b1f33';
  return (
    <article className="editorial-card p-5 relative overflow-hidden group transition-transform hover:-translate-y-[2px]"
             style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: `${accent}14` }}>
          <span className="material-symbols-outlined text-[22px]" style={{ color: accent }}>{r.icon}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-editorial text-[20px] font-bold text-[#0b1f33] leading-none"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
              {r.name}
            </h3>
            <span className="small-caps text-[9px] px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}14`, color: accent, letterSpacing: '0.12em' }}>
              {r.tag}
            </span>
          </div>
          <div className="small-caps mt-1" style={{ color: '#8b8672' }}>{r.scope}</div>
        </div>
      </div>
      <p className="text-[12.5px] text-[#4a5568] leading-relaxed mt-3">{r.desc}</p>
    </article>
  );
}

function Timeline({ items }) {
  return (
    <ol className="relative mt-8 pl-6 md:pl-0">
      <div className="absolute left-2 md:left-1/2 top-0 bottom-0 w-[2px]"
           style={{ background: '#e5ddce' }} />
      {items.map((item, i) => {
        const left = i % 2 === 0;
        return (
          <li key={i} className="relative mb-8 md:mb-10 md:grid md:grid-cols-2 md:gap-8">
            {/* Dot */}
            <div className="absolute left-2 md:left-1/2 top-2 -translate-x-1/2 w-3 h-3 rounded-full"
                 style={{ background: i === items.length - 1 ? '#b8860b' : '#0b1f33',
                          boxShadow: '0 0 0 4px #f6f2ea' }} />
            <div className={`pl-8 md:pl-0 ${left ? 'md:pr-10 md:text-right' : 'md:col-start-2 md:pl-10'}`}>
              <div className="small-caps" style={{ color: '#b8860b' }}>{item.sprint}</div>
              <h4 className="font-editorial text-[22px] font-bold text-[#0b1f33] mt-1 leading-snug"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                {item.focus}
              </h4>
              <p className="text-[12px] text-[#4a5568] mt-1 italic">{item.hl}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DimensionBar({ name, w, desc }) {
  return (
    <div className="editorial-card p-4">
      <div className="flex items-end justify-between mb-2">
        <span className="font-semibold text-[14px] text-[#0b1f33]">{name}</span>
        <span className="font-editorial text-[22px] font-black"
              style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#b8860b' }}>
          {w}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#e5ddce' }}>
        <div className="h-full rounded-full transition-[width] duration-700"
             style={{ width: `${w * 2.5}%`, background: '#0b1f33' }} />
      </div>
      <p className="text-[11.5px] text-[#6b7280] leading-relaxed italic">{desc}</p>
    </div>
  );
}

function DecisionRow({ level, range, color, desc }) {
  const palette = DECISION_COLORS[color] || DECISION_COLORS.green;
  return (
    <div className="editorial-card p-3 flex items-center gap-3"
         style={{ borderLeft: `4px solid ${palette.bar}` }}>
      <span className="small-caps px-2 py-1 rounded-full text-[10px]"
            style={{ background: palette.bg, color: palette.fg, letterSpacing: '0.12em' }}>
        {range}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-[13px] text-[#0b1f33]">{level}</div>
        <div className="text-[11px] text-[#6b7280] leading-snug">{desc}</div>
      </div>
    </div>
  );
}

function StackRow({ layer, list }) {
  return (
    <div className="editorial-card p-4 flex items-start gap-4">
      <span className="small-caps px-3 py-1 rounded-md shrink-0 self-start"
            style={{ background: '#0b1f33', color: '#b8860b', letterSpacing: '0.14em', fontSize: 10 }}>
        {layer}
      </span>
      <span className="text-[12.5px] text-[#4a5568] leading-relaxed">{list}</span>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div className="editorial-card overflow-hidden">
      <button onClick={onToggle}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#faf7f2] transition-colors">
        <span className="font-semibold text-[14px] text-[#0b1f33]">{q}</span>
        <span className="material-symbols-outlined text-[20px] transition-transform"
              style={{ color: '#b8860b', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 text-[12.5px] text-[#4a5568] leading-relaxed"
             style={{ borderTop: '1px solid #efe8dc' }}>
          <div className="pt-3">{a}</div>
        </div>
      )}
    </div>
  );
}
