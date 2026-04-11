/**
 * Rule Engine — evaluates business rules against entities and triggers actions.
 *
 * Flow: Entity created/updated → evaluateRules() → returns triggered actions
 * Actions: require_approval (blocks entity), notify (sends notification), block (prevents save)
 */

const Rule = require('../models/Rule');
const ApprovalRequest = require('../models/ApprovalRequest');
const { createNotification } = require('./notificationService');
const User = require('../models/User');

const operators = {
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
};

async function evaluateRules(entityType, entity, userId) {
  const rules = await Rule.find({ entityType, active: true });
  const triggered = [];

  for (const rule of rules) {
    const fieldValue = entity[rule.condition.field];
    const op = operators[rule.condition.operator];
    if (op && op(fieldValue, rule.condition.value)) {
      triggered.push({ rule, action: rule.action });
    }
  }

  return triggered;
}

async function applyRuleActions(entityType, entity, entityId, triggeredRules, userId) {
  let requiresApproval = false;

  for (const { rule, action } of triggeredRules) {
    if (action === 'require_approval') {
      requiresApproval = true;

      // Create approval request with default chain: accountant → owner
      const steps = [
        { role: 'owner', order: 1, status: 'pending' },
      ];

      await ApprovalRequest.create({
        entityType,
        entityId,
        triggeredRule: rule.name,
        currentStep: 0,
        status: 'pending',
        steps,
        requestedBy: userId,
      });

      // Notify approvers
      const owners = await User.find({ role: 'owner', status: 'approved' }).select('_id');
      for (const owner of owners) {
        await createNotification({
          userId: owner._id,
          type: 'system',
          title: 'Approbation requise',
          message: `${entityType} de ${entity.amount?.toLocaleString()} TND nécessite votre approbation (Règle: ${rule.name})`,
          severity: 'warning',
          metadata: { entityType, entityId, ruleId: rule._id },
        });
      }
    }

    if (action === 'notify') {
      const owners = await User.find({ role: 'owner', status: 'approved' }).select('_id');
      for (const owner of owners) {
        await createNotification({
          userId: owner._id,
          type: 'system',
          title: 'Alerte règle déclenchée',
          message: `${rule.name}: ${entityType} de ${entity.amount?.toLocaleString()} TND — ${rule.description || ''}`,
          severity: 'info',
          metadata: { entityType, entityId, ruleId: rule._id },
        });
      }
    }
  }

  return { requiresApproval };
}

module.exports = { evaluateRules, applyRuleActions };
