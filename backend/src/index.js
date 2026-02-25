const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
dotenv.config({path: path.resolve(__dirname, './.env')});

const TableModel = require('./models/tableModels.js');
const tableRouter = require('./routes/createTableRoute.js');
const userRoutes = require('./routes/userRoutes.js');
const departmentRoutes = require('./routes/departmentRoutes.js');
const termRoutes = require('./routes/termRoutes.js');
const teacherRoutes = require('./routes/teacherRoutes.js');
const studentRoutes = require('./routes/studentRoutes.js');
const courseRoutes = require('./routes/courseRoutes.js');
const sectionRoutes = require('./routes/sectionRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js');
const markingRoutes = require('./routes/markingRoutes.js');
const feedbackRoutes = require('./routes/feedbackRoutes.js');
const superAdminRoutes = require('./routes/superAdminRoutes.js');


const app = express();
app.use(express.json());
app.use(cors());


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});

app.use('/api/table', tableRouter);
app.use('/api/users', userRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/markings', markingRoutes);
app.use('/api/feedbacks', feedbackRoutes);

// create table for once at the start, never run this again. request on this url: '/api/table/create-tables', lol





