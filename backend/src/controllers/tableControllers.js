const tableModel = require('../models/tableModels');

const initializeDatabase = async (req, res) => {
    try {
        await tableModel.initalizeTables();
        res.status(200).json({ 
            message: "Database tables initialized successfully.",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Database initialization failed:", error);
        res.status(500).json({ 
            error: "Failed to initialize database tables.",
            details: error.message 
        });
    }
};

module.exports = { initializeDatabase };
