const DB_Connection = require('../database/db.js');


class BankAccountModel {
    constructor(){
        this.db = DB_Connection.getInstance();
    }

    createAccount = (payload) => {
        return this.db.run(
            'Create Bank Account',
            async () => {
                const {account_number, account_type, balance, status} = payload ;
                
                const query = `INSERT INTO bank_accounts
                                    (account_number, account_type, balance, status)
                                    VALUES ($1, $2, $3, $4)
                                RETURNING *;`;
                const params = [account_number, account_type, balance, status];
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

    deleteBankAccount = (id)=>{
        return this.db.run(
            'Delete Bank Account by Id',
            async ()=>{
                const query = `DELETE FROM bank_accounts WHERE id=$1 RETURNING *;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    getAccountById= (id)=>{
        return this.db.run(
            'Get Account by id',
            async ()=>{
                const query = `SELECT * FROM bank_accounts WHERE id=$1;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }

        )
    }


}

module.exports = BankAccountModel;