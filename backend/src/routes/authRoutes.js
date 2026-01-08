const express = require('express');
const CreateTables = require('../models/createTable.js');

const authRouter = express.Router();
const tableModel = new CreateTables();

// database initialization is just one function with kind of definition. So, I did not write this in any controller, rather, just defined it in here. I could define a function named database_init in any controller and then use that function in place of the async function.
authRouter.post('/init-db', async (req, res)=>{
    try {
        await tableModel.CreateTables();
        return res.status(200).json({
            success: true,
            message: 'Tables created successfully'
        })
    } catch (error) {
        console.error("Failed to create table, ", error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create table'
        })
    }
});

module.exports = authRouter;