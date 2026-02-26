const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const tableModel = require('./models/tableModels');

dotenv.config({path: path.resolve(__dirname, './.env')});

const app = express();
app.use(express.json());
app.use(cors());



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});



(async () => {
    try {
        const res = await tableModel.testConnection();
        console.log(res);
    } catch (error) {
        console.error('Database connection failed:', error);
    }
})();



