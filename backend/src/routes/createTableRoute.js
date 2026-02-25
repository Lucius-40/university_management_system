const TableModel = require('../models/tableModels.js');
const express = require('express');

const tables = new TableModel();
const tableRouter = express.Router();

tableRouter.get('/create-tables', tables.initalizeTables);

module.exports = tableRouter;