const UserModel = require('../models/userModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserController {
    constructor() {
        this.userModel = new UserModel();
    }

    registerUser = async (req, res) => {
        try {
            const { name, email, password, role, ...otherDetails } = req.body;

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
                role
            });

            if (!newUser) {
                return res.status(500).json({ message: "Failed to create user." });
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
                user,
                profile: profileData
            });

        } catch (error) {
            console.error("Get Profile error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;
