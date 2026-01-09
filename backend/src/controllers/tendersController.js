const { runWithLogging } = require('../utils/runWithLogging.js');
const TendersModel = require('../models/tendersModel.js');

class TendersController{
    constructor(){
        this.model = new TendersModel();
    }

    create = (req, res)=>{
        return runWithLogging(
            'Create tender from controller',
            async ()=>{
                const {tender_name, contractor, contract_value, reference, leader_name, start_date, end_date, status} = req.body;
                if(!tender_name || !contractor || !contract_value || !reference || !leader_name || !start_date || !end_date || !status){
                    return res.status(400).json({
                        success: false,
                        message: 'All fields are required'
                    });
                }

                const payload = {tender_name, contractor, contract_value, reference, leader_name, start_date, end_date, status};
                const newTender = await this.model.createTender(payload);
                if(!newTender){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to create tender'
                    });
                }

                return res.status(201).json({
                    success: true,
                    message: 'Tender created !',
                    data: newTender
                });
            }
        );
    }

    update = (req, res)=>{
        return runWithLogging(
            'update tender from controller',
            async ()=>{
                const {id, tender_name, contractor, contract_value, reference, leader_name, start_date, end_date, status} = req.body;
                if(!id || !tender_name || !contractor || !contract_value || !reference || !leader_name || !start_date || !end_date || !status){
                    return res.status(400).json({
                        success: false,
                        message: 'All fields including id are required'
                    });
                }

                const payload = {id, tender_name, contractor, contract_value, reference, leader_name, start_date, end_date, status};
                const updatedTender = await this.model.updateTender(payload);
                if(!updatedTender){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to update tender'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Tender updated !'
                });
            }
        );
    }

    delete = (req, res)=>{
        return runWithLogging(
            'Delete tender from controller',
            async ()=>{
                const {id} = req.params;
                if(!id){
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                const response = await this.model.deleteTender(id);
                if(!response){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to delete tender'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Tender deleted !'
                });
            }
        );
    }

    getById = (req, res)=>{
        return runWithLogging(
            'Get tender by id from controller',
            async ()=>{
                const {id} = req.params;
                if(!id){
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                const tender = await this.model.getTenderById(id);
                if(!tender){
                    return res.status(404).json({
                        success: false,
                        message: 'tender not found'
                    });
                }

                return res.status(200).json({
                    success: true,
                    data: tender
                });
            }
        );
    }
}

module.exports = TendersController;