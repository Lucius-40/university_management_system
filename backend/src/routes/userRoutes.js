const express = require('express');
const multer = require('multer');
const UserController = require('../controllers/userController');
const AuthenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const userController = new UserController();
const auth = new AuthenticateToken();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', auth.authenticateToken, userController.logoutUser);
router.get('/profile', auth.authenticateToken, userController.getUserProfile);
router.get('/profile/:role/:id', auth.authenticateToken, userController.getUserProfileByRole);
router.post('/:id/profile-image', auth.authenticateToken, upload.single('file'), userController.uploadProfileImage);
router.delete('/:id/profile-image', auth.authenticateToken, userController.deleteProfileImage);
router.put('/:id', auth.authenticateToken, userController.updateUserProfile);
router.put('/:id/reset-password', auth.authenticateToken, userController.resetPassword);
router.get('/inspect', auth.authenticateToken, userController.getEntityInspectData);

module.exports = router;
