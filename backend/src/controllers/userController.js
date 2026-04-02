const UserModel = require('../models/userModel.js');
const InitialCredentialsModel = require('../models/initialCredentialsModel.js');
const cloudinary = require('../utils/cloudinary.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserController {
    constructor() {
        this.userModel = new UserModel();
        this.initialCredentialsModel = new InitialCredentialsModel();
    }

    isSystemOrAdminRole = (role) => {
        const normalizedRole = String(role || '').toLowerCase();
        return normalizedRole === 'system' || normalizedRole === 'admin';
    }

    canManageUser = (requester, requestedId) => {
        if (!requester || !Number.isInteger(Number(requestedId))) {
            return false;
        }

        const requesterId = Number(requester.id);
        const targetId = Number(requestedId);
        return this.isSystemOrAdminRole(requester.role) || requesterId === targetId;
    }

    isCloudinaryConfigured = () => {
        return (
            Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
            Boolean(process.env.CLOUDINARY_API_KEY) &&
            Boolean(process.env.CLOUDINARY_API_SECRET)
        );
    }

    sanitizeSensitiveFields = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        const sanitized = { ...obj };
        delete sanitized.password_hash;
        delete sanitized.refresh_token;
        return sanitized;
    }

    registerUser = async (req, res) => {
        try {
            const payload = req.validatedBody || req.body || {};
            const { name, email, password, role, ...otherDetails } = payload;

            const existingUser = await this.userModel.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: "User with this email already exists." });
            }

            const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUND));
            const password_hash = await bcrypt.hash(password, salt);

            const newUser = await this.userModel.createUser({
                name,
                email,
                password_hash,
                role,
                ...otherDetails
            });

            if (!newUser) {
                return res.status(500).json({ message: "Failed to create user." });
            }

            try {
                await this.initialCredentialsModel.createCredential(newUser.id, name, password);
            } catch (credError) {
                console.error("Failed to save initial credentials:", credError);
            }

            try {
                await this.userModel.createRoleData(role, { user_id: newUser.id, ...otherDetails });
            } catch (roleError) {
                console.error("Failed to create role data:", roleError);
                return res.status(201).json({ message: "User created but failed to initialize role details.", user: newUser });
            }

            res.status(201).json({ message: "User registered successfully.", user: newUser });

        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    loginUser = async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await this.userModel.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ message: "Invalid credentials." });
            }

            const accessToken = jwt.sign(
                { id: user.id, role: user.role, email: user.email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET, 
                { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
            );

            await this.userModel.updateRefreshToken(user.id, refreshToken);

            res.status(200).json({
                message: "Login successful.",
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    refreshToken = async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) return res.status(401).json({ message: "Refresh Token required." });

            const user = await this.userModel.findByRefreshToken(token);
            if (!user) return res.status(403).json({ message: "Invalid Refresh Token." });

            jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) return res.status(403).json({ message: "Invalid Refresh Token." });

                const accessToken = jwt.sign(
                    { id: user.id, role: user.role, email: user.email },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
                );

                res.json({ accessToken });
            });

        } catch (error) {
            console.error("Refresh token error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    logoutUser = async (req, res) => {
        try {
            const userId = req.user ? req.user.id : req.body.userId; 

            if (!userId) {
               return res.status(400).json({message: "User ID required for logout."});
            }
            
            await this.userModel.clearRefreshToken(userId);
            res.status(204).json({ message: "Logged out successfully." });

        } catch (error) {
             console.error("Logout error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getUserProfile = async (req, res) => {
        try {
            const userId = req.user.id; 
            const user = await this.userModel.getUserById(userId);

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            let profileData = null;
            if (user.role === 'Student') {
                profileData = await this.userModel.getStudentProfile(userId);
            } else if (user.role === 'Teacher' || user.role === 'Admin') { 
                profileData = await this.userModel.getTeacherProfile(userId);
            }

             res.status(200).json({
                user: this.sanitizeSensitiveFields(user),
                profile: this.sanitizeSensitiveFields(profileData)
            });

        } catch (error) {
            console.error("Get Profile error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getUserProfileByRole = async (req, res) => {
        try {
            const { role, id } = req.params;
            const normalizedRole = String(role || "").toLowerCase();

            let profileData = null;

            if (normalizedRole === "student") {
                profileData = await this.userModel.getStudentProfileByUserId(id);
            } else if (normalizedRole === "teacher") {
                profileData = await this.userModel.getTeacherProfile(id);
            } else {
                return res.status(400).json({ message: "Unsupported role." });
            }

            if (!profileData) {
                return res.status(404).json({ message: "Profile not found." });
            }

            res.status(200).json({
                role: normalizedRole,
                profile: this.sanitizeSensitiveFields(profileData)
            });
        } catch (error) {
            console.error("Get Profile By Role error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    updateUserProfile = async (req, res) => {
        try {
            const requestedId = Number(req.validatedParams?.id || req.params.id);

            const requester = req.user;
            if (!this.canManageUser(requester, requestedId)) {
                return res.status(403).json({ message: "You are not allowed to update this profile." });
            }

            const existingUser = await this.userModel.getUserById(requestedId);
            if (!existingUser) {
                return res.status(404).json({ message: "User not found." });
            }

            const allowedFields = [
                "name",
                "mobile_number",
                "email",
                "mobile_banking_number",
                "bank_account_number",
                "present_address",
                "permanent_address",
                "birth_reg_number",
                "birth_date",
                "nid_number",
                "passport_number",
                "emergency_contact_name",
                "emergency_contact_number",
                "emergency_contact_relation",
            ];

            const mergedPayload = { id: requestedId };
            for (const field of allowedFields) {
                if (Object.prototype.hasOwnProperty.call(req.validatedBody || {}, field)) {
                    mergedPayload[field] = req.validatedBody[field];
                } else {
                    mergedPayload[field] = existingUser[field] ?? null;
                }
            }

            const updatedUser = await this.userModel.updateUser(mergedPayload);
            if (!updatedUser) {
                return res.status(404).json({ message: "User not found." });
            }

            res.status(200).json({
                message: "Profile updated successfully.",
                user: this.sanitizeSensitiveFields(updatedUser),
            });
        } catch (error) {
            console.error("Update User Profile error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    message: "A user with this email already exists.",
                });
            }

            if (error.code === "23514") {
                return res.status(400).json({
                    message: error.message,
                });
            }

            res.status(500).json({ error: error.message });
        }
    }

    resetPassword = async (req, res) => {
        try {
            const requestedId = Number(req.validatedParams?.id || req.params.id);

            const requester = req.user;
            const isSystemOrAdmin = this.isSystemOrAdminRole(requester?.role);
            if (!this.canManageUser(requester, requestedId)) {
                return res.status(403).json({ message: "You are not allowed to reset this password." });
            }

            const { currentPassword, newPassword, confirmPassword } = req.body || {};

            if (!newPassword || !confirmPassword) {
                return res.status(400).json({ message: "newPassword and confirmPassword are required." });
            }

            if (String(newPassword) !== String(confirmPassword)) {
                return res.status(400).json({ message: "New password and confirm password do not match." });
            }

            if (String(newPassword).length < 8) {
                return res.status(400).json({ message: "New password must be at least 8 characters long." });
            }

            const existingUser = await this.userModel.getUserById(requestedId);
            if (!existingUser) {
                return res.status(404).json({ message: "User not found." });
            }

            if (!isSystemOrAdmin) {
                if (!currentPassword) {
                    return res.status(400).json({ message: "currentPassword is required." });
                }

                const isCurrentPasswordValid = await bcrypt.compare(String(currentPassword), existingUser.password_hash);
                if (!isCurrentPasswordValid) {
                    return res.status(401).json({ message: "Current password is incorrect." });
                }
            }

            const isSamePassword = await bcrypt.compare(String(newPassword), existingUser.password_hash);
            if (isSamePassword) {
                return res.status(400).json({ message: "New password must be different from current password." });
            }

            const saltRounds = parseInt(process.env.SALT_ROUND || '10', 10);
            const newPasswordHash = await bcrypt.hash(String(newPassword), await bcrypt.genSalt(saltRounds));

            await this.userModel.resetPasswordByProcedure(requestedId, newPasswordHash);

            try {
                await this.initialCredentialsModel.markAsChanged(requestedId);
            } catch (innerError) {
                console.error("Could not mark initial credentials as changed:", innerError.message);
            }

            return res.status(200).json({ message: "Password reset successfully." });
        } catch (error) {
            console.error("Reset Password error:", error);

            if (error.code === 'P0002') {
                return res.status(404).json({ message: "User not found." });
            }

            return res.status(500).json({ error: error.message });
        }
    }

    uploadProfileImage = async (req, res) => {
        try {
            const requestedId = Number(req.validatedParams?.id || req.params.id);

            if (!this.canManageUser(req.user, requestedId)) {
                return res.status(403).json({ message: 'You are not allowed to update this profile image.' });
            }

            const existingUser = await this.userModel.getUserById(requestedId);
            if (!existingUser) {
                return res.status(404).json({ message: 'User not found.' });
            }

            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ message: 'Image file is required.' });
            }

            const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
            if (!allowedMimeTypes.has(String(req.file.mimetype || '').toLowerCase())) {
                return res.status(400).json({
                    message: 'Only JPG, PNG, and WEBP images are allowed.',
                });
            }

            if (!this.isCloudinaryConfigured()) {
                return res.status(500).json({
                    message: 'Cloudinary is not configured in backend environment.',
                });
            }

            const publicId = `user_${requestedId}`;
            const uploaded = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'university/profile-images',
                        public_id: publicId,
                        overwrite: true,
                        resource_type: 'image',
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        return resolve(result);
                    }
                );

                stream.end(req.file.buffer);
            });

            if (!uploaded?.secure_url) {
                return res.status(502).json({
                    message: 'Profile image upload did not return a valid URL.',
                });
            }

            const updatedUser = await this.userModel.updateProfileImageUrl(requestedId, uploaded.secure_url);
            return res.status(200).json({
                message: 'Profile image updated successfully.',
                user: this.sanitizeSensitiveFields(updatedUser),
            });
        } catch (error) {
            console.error('Upload profile image error:', error);
            if (error?.http_code) {
                return res.status(502).json({
                    message: error.message || 'Cloudinary upload failed.',
                });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    deleteProfileImage = async (req, res) => {
        try {
            const requestedId = Number(req.validatedParams?.id || req.params.id);

            if (!this.canManageUser(req.user, requestedId)) {
                return res.status(403).json({ message: 'You are not allowed to remove this profile image.' });
            }

            const existingUser = await this.userModel.getUserById(requestedId);
            if (!existingUser) {
                return res.status(404).json({ message: 'User not found.' });
            }

            if (this.isCloudinaryConfigured()) {
                const publicId = `university/profile-images/user_${requestedId}`;
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
                } catch (cloudinaryError) {
                    console.warn('Cloudinary delete profile image warning:', cloudinaryError?.message || cloudinaryError);
                }
            }

            const updatedUser = await this.userModel.updateProfileImageUrl(requestedId, null);

            return res.status(200).json({
                message: 'Profile image removed successfully.',
                user: this.sanitizeSensitiveFields(updatedUser),
            });
        } catch (error) {
            console.error('Delete profile image error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    getEntityInspectData = async (req, res) => {
        try {
            const filters = {
                identity: req.query.identity,
                department: req.query.department,
                batch: req.query.batch,
                term: req.query.term,
                section: req.query.section,
            };

            const data = await this.userModel.getEntityInspectData(filters);
            res.status(200).json(data);
        } catch (error) {
            console.error("Get Entity Inspect Data error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;
