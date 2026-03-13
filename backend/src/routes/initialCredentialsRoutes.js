const express = require('express');
const InitialCredentialsController = require('../controllers/initialCredentialsController.js');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const initialCredentialsController = new InitialCredentialsController();
const auth = new AuthenticateToken();

// Routes for initial credentials
router.get('/', auth.authenticateToken, initialCredentialsController.getAllCredentials);
router.get('/:userId', auth.authenticateToken, initialCredentialsController.getCredentialByUserId);

// This endpoint should be a PUT and will pull userId from token or params
router.put('/mark-changed', auth.authenticateToken, initialCredentialsController.markAsChanged);

module.exports = router;