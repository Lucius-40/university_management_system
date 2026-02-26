const express = require('express');
const SuperAdminController = require('../controllers/superAdminController');

const router = express.Router();
const superAdminController = new SuperAdminController();

router.post('/create', superAdminController.createSuperAdmin);

module.exports = router;
