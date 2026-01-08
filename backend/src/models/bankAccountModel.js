const DB_Connection = require('../database/db.js');


class BankAccountModel {
    constructor(){
        this.db = DB_Connection.getInstance();
    }

    createAccount = (payload) => {
        return this.db.run(
            'Create Bank Account',
            async () => {
                const {id, account_number, account_type, balance, status} = payload ;
                
                const query = `INSERT INTO bank_accounts (id, account_number, account_type, balance, status)
                                VALUES ($1, $2, $3, $4, $5)
                                RETURNING *;`;
                const params = [id, account_number, account_type, balance, status];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        );
    }

    updateBankAccount = (payload)=>{
        return this.db.run(
            'Update bank account',
            async()=>{
                const {id, account_number, account_type, balance, status} = payload ;
                const query = `UPDATE bank_accounts 
                                SET account_number =$2,
                                account_type=$3,
                                balance=$4,
                                status=$5
                                WHERE id=$1
                                RETURNING *;`;
                const params = [id, account_number, account_type, balance, status];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }
}

module.exports = BankAccountModel;