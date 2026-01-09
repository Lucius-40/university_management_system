const DB_Connection = require('../database/db.js');

class BuildingModel{
    constructor(){
        this.db = DB_Connection.getInstance();
    }

    createBuilding = (payload) => {
        return this.db.run(
            'Create Building',
            async () => {
                const {name , location} = payload ;
                
                const query = `INSERT INTO buildings (name , location)
                                VALUES ($1, $2)
                                RETURNING *;`;
                const params = [name , location];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        );
    }

    updateBuilding = (payload)=>{
        return this.db.run(
            'Update Building info',
            async()=>{
                const {id, name, location} = payload ;
                const query = `UPDATE buildings 
                                SET name =$2,
                                location =$3
                                WHERE id=$1
                                RETURNING *;`;
                const params = [id, name, location];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    deleteBuilding = (id)=>{
        return this.db.run(
            'Delete Building by Id',
            async ()=>{
                const query = `DELETE FROM buildings WHERE id=$1 RETURNING *;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    getBuildingById= (id)=>{
        return this.db.run(
            'Get building id',
            async ()=>{
                const query = `SELECT * FROM buildings WHERE id=$1;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }

        )
    }
}

module.exports = BuildingModel ;