const DB_Connection = require('../database/db.js')

class DepartmentModel{
    constructor(){
        this.db = DB_Connection.getInstance();
    }

    createDepartment = (payload) => {
        return this.db.run(
            'Create Department',
            async () => {
                const {building_id, bank_account_id, name} = payload ;
                
                const query = `INSERT INTO departments (building_id, bank_account_id, name)
                                VALUES ($1, $2, $3)
                                RETURNING *;`;
                const params = [building_id, bank_account_id, name];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        );
    }

    updateDepartment = (payload)=>{
        return this.db.run(
            'Update Department info',
            async()=>{
                const {id,building_id, bank_account_id, name} = payload ;
                const query = `UPDATE departments
                                SET building_id =$2,
                                bank_account_id =$3,
                                name=$4
                                WHERE id=$1
                                RETURNING *;`;
                const params = [id,building_id, bank_account_id, name];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    deleteDepartment = (id)=>{
        return this.db.run(
            'Delete Department by Id',
            async ()=>{
                const query = `DELETE FROM departments WHERE id=$1 RETURNING *;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    getDepartmentById= (id)=>{
        return this.db.run(
            'Get Department ny id',
            async ()=>{
                const query = `SELECT * FROM departments WHERE id=$1;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }

        )
    }
}

module.exports = DepartmentModel ;