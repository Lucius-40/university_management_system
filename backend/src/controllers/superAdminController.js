const UserModel = require('../models/userModel.js');
const bcrypt = require('bcryptjs');

class SuperAdminController {
    constructor() {
        this.userModel = new UserModel();
    }

    createSuperAdmin = async (req, res) => {
        try {
            const { name, email, password, secret } = req.body;

            if (secret !== process.env.BOOTSTRAP_SECRET) {
                return res.status(403).json({ message: "Invalid secret key for Super Admin creation." });
            }
            
            const existingUser = await this.userModel.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: "Super Admin already exists with this email." });
            }

            const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUND) || 10);
            const password_hash = await bcrypt.hash(password, salt);

            const superAdminPayload = {
                name,
                email,
                password_hash,
                role: 'Admin',
                mobile_number: '0000000000', 
                mobile_banking_number: '0000000000', 
                present_address: 'University Admin Office',
                permanent_address: 'University Admin Office',
                birth_reg_number: 'ADMIN_BIRTH_REG',
                birth_date: new Date().toISOString(),
                nid_number: 'ADMIN_NID',
                emergency_contact_name: 'Admin Contact',
                emergency_contact_number: '0000000000',
                emergency_contact_relation: 'Official',
            };

            const newUser = await this.userModel.createUser(superAdminPayload);

            if (!newUser) {
                return res.status(500).json({ message: "Failed to create Super Admin." });
            }

            res.status(201).json({
                message: "Super Admin created successfully.",
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                }
            });

        } catch (error) {
            console.error("Create Super Admin error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SuperAdminController;
