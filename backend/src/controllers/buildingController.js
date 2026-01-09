const { runWithLogging } = require('../utils/runWithLogging.js');
const BuildingModel = require('../models/buildingModel.js');


class BuildingController{
    constructor(){
        this.model = new BuildingModel();
    }

    create = (req, res)=>{
        return runWithLogging(
            'Create building from controller',
            async ()=>{
                const {name, location} = req.body ;
                if(!name || !location){
                    return res.status(400).json({
                        success: false,
                        message: 'name and location are required'
                    });
                }

                const payload = {name, location};
                const newBuilding = await this.model.createBuilding(payload) ;
                if(!newBuilding){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to create building'
                    });
                }

                return res.status(201).json({
                        success: true,
                        message: 'Building created !',
                        data : newBuilding
                    });
                
            }
        )
    }

    update = (req, res)=>{
        return runWithLogging(
            'update building from controller',
            async ()=>{
                const {id, name, location} = req.body ;
                if(!id || !name || !location){
                    return res.status(400).json({
                        success: false,
                        message: 'id, name and location are required'
                    });
                }

                const payload = {id, name, location};
                const updatedBuilding = await this.model.updateBuilding(payload) ;
                if(!updatedBuilding){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to update building'
                    });
                }

                return res.status(200).json({
                        success: true,
                        message: 'Building updated !'
                    });
            }
        )
    }

    delete = (req, res)=>{
        return runWithLogging(
            'Delete building from controller',
            async ()=>{
                const {id} = req.params ;
                if(!id){
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                const response = await this.model.deleteBuilding(id) ;
                if(!response){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to delete building'
                    });
                }

                return res.status(200).json({
                        success: true,
                        message: 'Building deleted !'
                    });
                
            }
        )
    }

    getById = (req, res)=>{
        return runWithLogging(
            'Get building by id from controller',
            async ()=>{
                const {id} = req.params ;
                if(!id){
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                const building = await this.model.getBuildingById(id) ;
                if(!building){
                    return res.status(404).json({
                        success: false,
                        message: 'building not found'
                    });
                }

                return res.status(200).json({
                        success: true,
                        data: building
                    });
            }
        )
    }
    
}

module.exports = BuildingController;