const express = require('express');
const PaymentController = require('../controllers/paymentController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const paymentController = new PaymentController();
const auth = new AuthenticateToken();

router.post('/dues', auth.authenticateToken, paymentController.createDue);
router.get('/dues', auth.authenticateToken, paymentController.getAllDues);
router.get('/dues/:id', auth.authenticateToken, paymentController.getDueById);
router.put('/dues/:id', auth.authenticateToken, paymentController.updateDue);
router.delete('/dues/:id', auth.authenticateToken, paymentController.deleteDue);

router.post('/rules', auth.authenticateToken, paymentController.createDueRule);
router.get('/rules', auth.authenticateToken, paymentController.getAllDueRules);
router.post('/rules/:rule_id/scopes', auth.authenticateToken, paymentController.createDueRuleScope);
router.post('/rules/:rule_id/amount-overrides', auth.authenticateToken, paymentController.createDueRuleAmountOverride);
router.get('/rules/:rule_id/preview', auth.authenticateToken, paymentController.previewDueRuleIssuance);
router.post('/rules/:rule_id/issue', auth.authenticateToken, paymentController.issueDueRuleNow);

router.post('/pay', auth.authenticateToken, paymentController.createStudentDuesPayment);
router.get('/student/:student_id', auth.authenticateToken, paymentController.getStudentDuesPayments);

module.exports = router;
