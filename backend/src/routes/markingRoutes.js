const express = require('express');
const multer = require('multer');
const MarkingController = require('../controllers/markingController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const markingController = new MarkingController();
const auth = new AuthenticateToken();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/teacher/contexts', auth.authenticateToken, markingController.getTeacherMarkingContexts);
router.get('/teacher/workspace', auth.authenticateToken, markingController.getTeacherMarkingWorkspace);
router.post('/teacher/manual', auth.authenticateToken, markingController.submitTeacherManualMarks);
router.post('/teacher/csv', auth.authenticateToken, upload.single('file'), markingController.uploadTeacherMarksCsv);

router.post('/', auth.authenticateToken, markingController.createMarkingComponent);
router.get('/', auth.authenticateToken, markingController.getAllMarkingComponents);
router.get('/:id', auth.authenticateToken, markingController.getMarkingComponentById);
router.put('/:id', auth.authenticateToken, markingController.updateMarkingComponent);
router.delete('/:id', auth.authenticateToken, markingController.deleteMarkingComponent);

module.exports = router;
