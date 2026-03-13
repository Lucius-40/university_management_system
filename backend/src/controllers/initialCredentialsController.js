const InitialCredentialsModel = require('../models/initialCredentialsModel.js');

class InitialCredentialsController {
    constructor() {
        this.initialCredentialsModel = new InitialCredentialsModel();
    }

    getAllCredentials = async (req, res) => {
        try {
            const credentials = await this.initialCredentialsModel.getAllCredentials();
            res.status(200).json(credentials);
        } catch (error) {
            console.error("Get All Credentials error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    getCredentialByUserId = async (req, res) => {
        try {
            const credential = await this.initialCredentialsModel.getCredentialByUserId(req.params.userId);
            if (!credential) {
                return res.status(404).json({ message: "Credential not found" });
            }
            res.status(200).json(credential);
        } catch (error) {
            console.error("Get Credential By User Id error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    markAsChanged = async (req, res) => {
        try {
            // Also ensure only the user themselves can do this
            const userId = req.user.id;
            const credential = await this.initialCredentialsModel.markAsChanged(userId);
            if (!credential) {
                return res.status(404).json({ message: "Credential not found" });
            }
            res.status(200).json({ message: "Credential marked as changed successfully", credential });
        } catch (error) {
            console.error("Mark Credential As Changed error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = InitialCredentialsController;