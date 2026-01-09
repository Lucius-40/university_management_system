const DB_Connection = require('../database/db.js')

class TendersModel{
    constructor(){
        this.db = DB_Connection.getInstance();
    }

    createTender = (payload) => {
        return this.db.run(
            'Create Tender',
            async () => {
                const {tender_name ,contractor,contract_value,reference,leader_name,start_date,end_date,status} = payload ;
                
                const query = `INSERT INTO tenders (tender_name ,contractor,contract_value,reference,leader_name,start_date,end_date,status)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                RETURNING *;`;
                const params = [tender_name ,contractor,contract_value,reference,leader_name,start_date,end_date,status];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        );
    }

    updateTender = (payload)=>{
        return this.db.run(
            'Update Tender info',
            async()=>{
                const {id,tender_name ,contractor,contract_value,reference,leader_name,start_date,end_date,status} = payload ;
                const query = `UPDATE tenders 
                                SET tender_name =$2,
                                contractor =$3,
                                contract_value=$4,
                                reference=$5,
                                leader_name=$6,
                                start_date=$7,
                                end_date=$8,
                                status=$9
                                WHERE id=$1
                                RETURNING *;`;
                const params = [id,tender_name ,contractor,contract_value,reference,leader_name,start_date,end_date,status];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    deleteTender = (id)=>{
        return this.db.run(
            'Delete tender by Id',
            async ()=>{
                const query = `DELETE FROM tenders WHERE id=$1 RETURNING *;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    getTenderById= (id)=>{
        return this.db.run(
            'Get tender ny id',
            async ()=>{
                const query = `SELECT * FROM tenders WHERE id=$1;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }

        )
    }
}

module.exports = TendersModel ;