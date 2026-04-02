const express = require('express');
const multer = require('multer');
const UserController = require('../controllers/userController');
const AuthenticateToken = require('../middlewares/authenticateToken');
const {
	validateParamId,
	validateUserProfileUpdate,
	validateUserRegister,
} = require('../middlewares/requestValidation');

const router = express.Router();
const userController = new UserController();
const auth = new AuthenticateToken();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/register', validateUserRegister, userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', auth.authenticateToken, userController.logoutUser);
router.get('/profile', auth.authenticateToken, userController.getUserProfile);
router.get('/profile/:role/:id', auth.authenticateToken, userController.getUserProfileByRole);
router.post('/:id/profile-image', auth.authenticateToken, validateParamId('id'), upload.single('file'), userController.uploadProfileImage);
router.delete('/:id/profile-image', auth.authenticateToken, validateParamId('id'), userController.deleteProfileImage);
router.put('/:id', auth.authenticateToken, validateParamId('id'), validateUserProfileUpdate, userController.updateUserProfile);
router.put('/:id/reset-password', auth.authenticateToken, validateParamId('id'), userController.resetPassword);
router.get('/inspect', auth.authenticateToken, userController.getEntityInspectData);

module.exports = router;
