/**
 * memoDrafter.js
 * Deterministic AI-style drafter for the Analyst memo.
 * Consumes the live `/ai/risk-report` and `/ai/health-index` payloads and
 * produces a 4-section draft (Contexte / Observations / Causes / Recommandations)
 * plus a suggested severity, localised in FR or EN.
 */

const DOMAIN_LABEL = {
  cashFlow:   { fr: 'trésorerie',            en: 'cash flow'    },
  invoices:   { fr: 'factures',              en: 'invoices'     },
  debt:       { fr: 'endettement',           en: 'debt'         },
  loanBurden: { fr: 'charge d\'emprunt',     en: 'loan burden'  },
};

// Higher score = more risk (platform convention)
const scoreLevel = (s) => {
  if (s === undefined || s === null) return null;
  if (s >= 75) return 'critical';
  if (s >= 50) return 'high';
  if (s >= 25) return 'moderate';
  return 'low';
};

const LEVEL_LABEL = {
  fr: { low: 'faible', moderate: 'modéré', high: 'élevé', critical: 'critique' },
  en: { low: 'low',    moderate: 'moderate', high: 'high',  critical: 'critical' },
};

const SEVERITY_FOR_LEVEL = {
  low: 'info',
  moderate: 'watch',
  high: 'alert',
  critical: 'critical',
};

const fmt = (n, lang) => typeof n === 'number'
  ? n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 })
  : String(n ?? '—');

const todayStr = (lang) => new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * Main drafter.
 * @param {object}   report  — payload from GET /ai/risk-report
 * @param {object}   health  — payload from GET /ai/health-index
 * @param {'fr'|'en'} lang
 * @returns {{ severity: string, sections: { contexte, observations, causes, recommandations } }}
 */
export function draftMemo(report, health, lang = 'fr') {
  const L = lang === 'fr';
  const score = report?.globalScore;
  const level = report?.level || scoreLevel(score);
  const breakdown = report?.breakdown || {};
  const lateCount = Array.isArray(report?.lateInvoicesList) ? report.lateInvoicesList.length : 0;
  const anomalies = Array.isArray(report?.anomalies) ? report.anomalies : [];
  const rootCauses = Array.isArray(report?.rootCauses) ? report.rootCauses : [];
  const metrics = report?.metrics || {};

  // Rank domains by score (highest = most risky) and label them
  const rankedDomains = Object.entries(breakdown)
    .map(([key, v]) => ({
      key,
      score: v?.score ?? 0,
      weight: v?.weight,
      label: DOMAIN_LABEL[key]?.[L ? 'fr' : 'en'] || key,
      level: scoreLevel(v?.score),
    }))
    .sort((a, b) => b.score - a.score);

  const topRisk = rankedDomains[0];
  const secondRisk = rankedDomains[1];

  const healthLine = health?.grade
    ? (L
        ? `L'indice de santé financière est ${fmt(health.score, lang)}/100 (note ${health.grade}).`
        : `Financial health index stands at ${fmt(health.score, lang)}/100 (grade ${health.grade}).`)
    : '';

  // ───────────────────────── CONTEXTE ─────────────────────────
  const contexte = (L
    ? [
        `Analyse réalisée le ${todayStr(lang)} sur la base du dernier scoring IA.`,
        score !== undefined && score !== null
          ? `Le score global de risque s'établit à ${fmt(score, lang)}/100, classé comme ${LEVEL_LABEL.fr[level] || '—'}.`
          : null,
        healthLine || null,
        `Périmètre couvert : quatre dimensions financières (${Object.values(DOMAIN_LABEL).map((d) => d.fr).join(', ')}).`,
      ]
    : [
        `Analysis performed on ${todayStr(lang)} based on the latest AI scoring.`,
        score !== undefined && score !== null
          ? `The global risk score is ${fmt(score, lang)}/100, classified as ${LEVEL_LABEL.en[level] || '—'}.`
          : null,
        healthLine || null,
        `Scope: four financial dimensions (${Object.values(DOMAIN_LABEL).map((d) => d.en).join(', ')}).`,
      ]
  ).filter(Boolean).join(' ');

  // ───────────────────────── OBSERVATIONS ─────────────────────
  const observations = (L
    ? [
        rankedDomains.length
          ? `Répartition par domaine : ${rankedDomains.map((d) => `${d.label} ${fmt(d.score, lang)}/100`).join(' · ')}.`
          : null,
        topRisk && topRisk.score >= 50
          ? `Le domaine le plus exposé est ${topRisk.label} (${fmt(topRisk.score, lang)}/100), de niveau ${LEVEL_LABEL.fr[topRisk.level] || '—'}.`
          : `Aucun domaine ne dépasse le seuil d'alerte (≥ 50/100).`,
        lateCount > 0 ? `${lateCount} facture${lateCount > 1 ? 's' : ''} en retard identifiée${lateCount > 1 ? 's' : ''} à ce jour.` : null,
        anomalies.length ? `${anomalies.length} anomalie${anomalies.length > 1 ? 's' : ''} détectée${anomalies.length > 1 ? 's' : ''} par le moteur statistique.` : null,
        metrics?.cashFlow !== undefined ? `Flux de trésorerie net courant : ${fmt(metrics.cashFlow, lang)} TND.` : null,
      ]
    : [
        rankedDomains.length
          ? `Per-domain breakdown: ${rankedDomains.map((d) => `${d.label} ${fmt(d.score, lang)}/100`).join(' · ')}.`
          : null,
        topRisk && topRisk.score >= 50
          ? `The most exposed area is ${topRisk.label} (${fmt(topRisk.score, lang)}/100), rated ${LEVEL_LABEL.en[topRisk.level] || '—'}.`
          : `No domain exceeds the alert threshold (≥ 50/100).`,
        lateCount > 0 ? `${lateCount} late invoice${lateCount > 1 ? 's' : ''} identified to date.` : null,
        anomalies.length ? `${anomalies.length} anomal${anomalies.length > 1 ? 'ies' : 'y'} flagged by the statistical engine.` : null,
        metrics?.cashFlow !== undefined ? `Current net cash flow: ${fmt(metrics.cashFlow, lang)} TND.` : null,
      ]
  ).filter(Boolean).join(' ');

  // ───────────────────────── CAUSES PROBABLES ─────────────────
  const causeHints = L
    ? {
        cashFlow:   `Déséquilibre entre encaissements et décaissements, délais de paiement clients rallongés, dépenses non récurrentes.`,
        invoices:   `Accumulation de factures impayées, clients défaillants, absence de politique de relance systématique.`,
        debt:       `Ratio d'endettement élevé, refinancement tardif, dégradation du service de la dette.`,
        loanBurden: `Part des remboursements trop élevée dans les flux mensuels, taux d'intérêt défavorables.`,
      }
    : {
        cashFlow:   `Mismatch between inflows and outflows, lengthened customer payment terms, non-recurring expenses.`,
        invoices:   `Build-up of unpaid invoices, defaulting clients, lack of a systematic dunning policy.`,
        debt:       `High debt-to-asset ratio, delayed refinancing, debt service deterioration.`,
        loanBurden: `Repayments take too large a share of monthly cash flows, unfavourable interest rates.`,
      };

  const causesParts = [];
  if (rootCauses.length) {
    causesParts.push(
      L
        ? `D'après l'analyse des causes racines : ${rootCauses.slice(0, 3).map((c) => (typeof c === 'string' ? c : c.label || c.cause || JSON.stringify(c))).join(' ; ')}.`
        : `From root-cause analysis: ${rootCauses.slice(0, 3).map((c) => (typeof c === 'string' ? c : c.label || c.cause || JSON.stringify(c))).join('; ')}.`
    );
  }
  rankedDomains.slice(0, 2).forEach((d) => {
    if (d.score >= 50 && causeHints[d.key]) {
      causesParts.push((L ? `Pour la ${d.label} : ` : `For ${d.label}: `) + causeHints[d.key]);
    }
  });
  if (!causesParts.length) {
    causesParts.push(L
      ? `Aucune cause majeure détectée. L'équilibre financier reste maîtrisé sur l'ensemble des dimensions.`
      : `No major cause detected. Financial balance remains under control across all dimensions.`);
  }
  const causes = causesParts.join(' ');

  // ───────────────────────── RECOMMANDATIONS ──────────────────
  const recos = [];
  if (level === 'critical') {
    recos.push(L
      ? `Convoquer un comité de direction exceptionnel sous 48 h afin d'arbitrer les priorités.`
      : `Convene an emergency executive committee within 48 h to arbitrate priorities.`);
  }
  if (topRisk?.key === 'cashFlow' && topRisk.score >= 50) {
    recos.push(L
      ? `Mettre en place un plan de trésorerie à 30/60 jours et geler les dépenses non essentielles.`
      : `Implement a 30/60-day cash plan and freeze non-essential spending.`);
  }
  if (topRisk?.key === 'invoices' && topRisk.score >= 50) {
    recos.push(L
      ? `Lancer une campagne de relance des factures en retard et segmenter les clients à risque.`
      : `Launch a dunning campaign on late invoices and segment high-risk customers.`);
  }
  if (topRisk?.key === 'debt' && topRisk.score >= 50) {
    recos.push(L
      ? `Engager une renégociation de la dette avec les établissements bancaires partenaires.`
      : `Engage in debt renegotiation with partner banking institutions.`);
  }
  if (topRisk?.key === 'loanBurden' && topRisk.score >= 50) {
    recos.push(L
      ? `Étudier un rééchelonnement des prêts ou un refinancement à taux plus favorable.`
      : `Study loan rescheduling or refinancing at a more favourable rate.`);
  }
  if (lateCount >= 3) {
    recos.push(L
      ? `Prioriser l'encaissement des ${lateCount} factures en retard dans la prochaine quinzaine.`
      : `Prioritise collection of the ${lateCount} late invoices within the next two weeks.`);
  }
  if (anomalies.length) {
    recos.push(L
      ? `Investiguer les ${anomalies.length} anomalie${anomalies.length > 1 ? 's' : ''} remontée${anomalies.length > 1 ? 's' : ''} par le moteur statistique.`
      : `Investigate the ${anomalies.length} anomal${anomalies.length > 1 ? 'ies' : 'y'} flagged by the statistical engine.`);
  }
  if (!recos.length) {
    recos.push(L
      ? `Maintenir le pilotage actuel et poursuivre le suivi hebdomadaire du score IA.`
      : `Maintain the current pilotage and continue the weekly AI score monitoring.`);
  }
  recos.push(L
    ? `Présenter les actions priorisées au prochain comité exécutif avec indicateurs de suivi mesurables.`
    : `Present prioritised actions at the next executive committee with measurable follow-up indicators.`);
  const recommandations = recos.map((r, i) => `${i + 1}. ${r}`).join('\n');

  return {
    severity: SEVERITY_FOR_LEVEL[level] || 'info',
    sections: { contexte, observations, causes, recommandations },
  };
}
