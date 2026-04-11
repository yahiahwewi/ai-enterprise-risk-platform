const ApprovalRequest = require('../models/ApprovalRequest');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');

const entityModels = { transaction: Transaction, invoice: Invoice, loan: Loan };

// GET /api/approvals/pending — pending approvals for current user's role
exports.getPendingApprovals = async (req, res) => {
  try {
    const approvals = await ApprovalRequest.find({
      status: 'pending',
      'steps.role': req.user.role,
    }).populate('requestedBy', 'name role').sort({ createdAt: -1 });

    // Enrich with entity data
    const enriched = await Promise.all(approvals.map(async (a) => {
      const Model = entityModels[a.entityType];
      const entity = Model ? await Model.findById(a.entityId) : null;
      return { ...a.toObject(), entity };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/approvals — all approvals (admin/owner)
exports.getAllApprovals = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const approvals = await ApprovalRequest.find(filter)
      .populate('requestedBy', 'name role')
      .sort({ createdAt: -1 }).limit(50);
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/approvals/:id/approve
exports.approveStep = async (req, res) => {
  try {
    const approval = await ApprovalRequest.findById(req.params.id);
    if (!approval) return res.status(404).json({ message: 'Approval not found' });
    if (approval.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

    const step = approval.steps[approval.currentStep];
    if (!step) return res.status(400).json({ message: 'No pending step' });
    if (step.role !== req.user.role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your turn to approve' });
    }

    // Approve current step
    step.status = 'approved';
    step.userId = req.user._id;
    step.date = new Date();
    step.comment = req.body.comment || '';

    // Check if all steps done
    if (approval.currentStep >= approval.steps.length - 1) {
      approval.status = 'approved';
      // Update the entity's workflow status
      const Model = entityModels[approval.entityType];
      if (Model) {
        await Model.findByIdAndUpdate(approval.entityId, {
          workflowStatus: 'approved',
          approvedBy: req.user._id,
          approvalDate: new Date(),
        });
      }
    } else {
      approval.currentStep += 1;
    }

    await approval.save();
    res.json({ message: 'Approved', approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/approvals/:id/reject
exports.rejectStep = async (req, res) => {
  try {
    const approval = await ApprovalRequest.findById(req.params.id);
    if (!approval) return res.status(404).json({ message: 'Approval not found' });
    if (approval.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

    const step = approval.steps[approval.currentStep];
    step.status = 'rejected';
    step.userId = req.user._id;
    step.date = new Date();
    step.comment = req.body.reason || '';

    approval.status = 'rejected';

    // Update entity
    const Model = entityModels[approval.entityType];
    if (Model) {
      await Model.findByIdAndUpdate(approval.entityId, {
        workflowStatus: 'rejected',
        rejectionReason: req.body.reason || '',
      });
    }

    await approval.save();
    res.json({ message: 'Rejected', approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
