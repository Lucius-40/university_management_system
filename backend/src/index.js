const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config({path: path.resolve(__dirname, './.env')});

const app = express();
app.use(express.json());
app.use(cors());

// app.get('/', (req, res) => {
//     res.send('University backend running.');
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});

// Test DB connection after server starts
const tableModel = require('./models/tableModels');
(async () => {
    try {
        const res = await tableModel.testConnection();
        console.log(res);
    } catch (error) {
        console.error('Database connection failed:', error);
    }
})();



