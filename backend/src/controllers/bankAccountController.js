const BankAccountModel = require('../models/bankAccountModel.js');
const { runWithLogging } = require('../utils/runWithLogging.js');


class BankAccountController{
    constructor(){
        this.model = new BankAccountModel();   
    }

    create = (req, res)=>{
        return runWithLogging(
            'Create bank account from controller',
            async ()=>{
                const {id, account_number, account_type, balance, status} = req.body ;
                if(!id || !account_number){
                    return res.status(400).json({
                        success: false,
                        message: 'id or bank_account_number not found'
                    });
                }

                const payload = {id, account_number, account_type, balance, status};
                const newAccount = await this.model.createAccount(payload) ;
                if(! newAccount){
                    return res.status(500).json({
                        success: false,
                        message: 'failed t create account'
                    });
                }

                return res.status(201).json({
                        success: true,
                        message: 'Account created !'
                    });
                
            }
        )
    }


    delete = (req, res)=>{
        return runWithLogging(
            'Delete bank account from controller',
            async ()=>{
                const {id} = req.params ;
                if(!id){
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                
                const response = await this.model.deleteBankAccount(id) ;
                if(! response){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to delete account'
                    });
                }

                return res.status(200).json({
                        success: true,
                        message: 'Account deleted !'
                    });
                
            }
        )
    }

    update = (req, res)=>{
        return runWithLogging(
            'update bank account from controller',
            async ()=>{
                const {id, account_number, account_type, balance, status} = req.body ;
                if(!id || !account_number){
                    return res.status(400).json({
                        success: false,
                        message: 'id/account_number not found'
                    });
                }

                const payload = {id, account_number, account_type, balance, status};
                const updatedAccount = await this.model.updateBankAccount(payload) ;
                if(!updatedAccount){
                    return res.status(500).json({
                        success: false,
                        message: 'failed to update account'
                    });
                }

                return res.status(200).json({
                        success: true,
                        message: 'Account updated !'
                    });
            }
        )
    }


    getById = (req, res)=>{
        return runWithLogging(
            'Get bank account by id from controller',
            async ()=>{
                const {id} = req.params ;
                if(!id){
                    return res.status(400).json({
                        success: false,
                        message: 'id not found'
                    });
                }

                const account = await this.model.getAccountById(id) ;
                if(!account){
                    return res.status(404).json({
                        success: false,
                        message: 'account not found'
                    });
                }

                return res.status(200).json({
                        success: true,
                        data: account
                    });
            }
        )
    }
    
}

module.exports = BankAccountController;