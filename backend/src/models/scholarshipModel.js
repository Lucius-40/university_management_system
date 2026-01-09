const DB_Connection = require('../database/db.js')

class ScholarshipModel{
    constructor(){
        this.db = DB_Connection.getInstance();
    }

    createScholarship = (payload) => {
        return this.db.run(
            'Create Scholarship',
            async () => {
                const {bank_account_id, name, requirements, status} = payload ;
                
                const query = `INSERT INTO scholarships (bank_account_id, name, requirements, status)
                                VALUES ($1, $2, $3, $4)
                                RETURNING *;`;
                const params = [bank_account_id, name, requirements, status];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        );
    }

    updateScholarship = (payload)=>{
        return this.db.run(
            'Update Scholarship info',
            async()=>{
                const {id,bank_account_id, name, requirements, status} = payload ;
                const query = `UPDATE scholarships
                                SET 
                                bank_account_id =$2,
                                name=$3,
                                requirements=$4,
                                status=$5
                                WHERE id=$1
                                RETURNING *;`;
                const params = [id,bank_account_id, name, requirements, status];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    deleteScholarship = (id)=>{
        return this.db.run(
            'Delete Scholarship by Id',
            async ()=>{
                const query = `DELETE FROM scholarships WHERE id=$1 RETURNING *;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    getScholarshipById= (id)=>{
        return this.db.run(
            'Get Scholarship by id',
            async ()=>{
                const query = `SELECT * FROM scholarships WHERE id=$1;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }

        )
    }
}

module.exports = ScholarshipModel ;