const ActivityLog = require('../models/ActivityLog');

/**
 * Factory that returns middleware to log activity after a successful response.
 * Controllers must set res.locals.createdEntityId for POST operations.
 */
function logActivity(action, entityType) {
  return (req, res, next) => {
    // Store original json method to intercept
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = res.locals.createdEntityId || req.params.id;
        if (entityId) {
          // Build human-readable details
          let details = `${action} ${entityType}`;
          if (body && typeof body === 'object') {
            if (entityType === 'transaction' && body.type) {
              details = `Created ${body.type} transaction of $${body.amount?.toLocaleString()} in ${body.category}`;
            } else if (entityType === 'invoice' && action === 'created') {
              details = `Created invoice of $${body.amount?.toLocaleString()} for ${body.clientName}`;
            } else if (entityType === 'invoice' && action === 'status_changed') {
              details = `Updated invoice for ${body.clientName} to ${body.status}`;
            } else if (entityType === 'loan') {
              details = `Added loan of $${body.amount?.toLocaleString()} at ${body.interestRate}%`;
            } else if (entityType === 'asset') {
              details = `Added asset "${body.name}" valued at $${body.value?.toLocaleString()}`;
            } else if (entityType === 'user') {
              details = `Invited ${body.name} as ${body.role}`;
            }
          }

          ActivityLog.create({
            userId: req.user._id,
            companyId: req.user.companyId,
            action,
            entityType,
            entityId,
            details,
          }).catch(() => {}); // Fire-and-forget
        }
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = logActivity;
