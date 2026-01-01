const express = require('express');
const CreateTables = require('../models/createTable.js');

const authRouter = express.Router();
const tableModel = new CreateTables();

// database initialization is just one function with kind of definition. So, I did not write this in any controller, rather, just defined it in here. I could define a function named database_init in any controller and then use that function in place of the async function.
authRouter.post('/init-db', async ()=>{
    try {
        tableModel.CreateTables();
        console.log("Tables created successfully");
    } catch (error) {
        console.error("Failed to create table, ", error.message);
    }
});

module.exports = authRouter;