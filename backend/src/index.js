const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

const authRouter = require('./routes/authRoutes.js')

dotenv.config({path: path.resolve(__dirname, '../.env')});
const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRouter);



