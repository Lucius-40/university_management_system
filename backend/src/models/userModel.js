const DB_Connection = require('../database/db.js');

class UserModel{
    constructor(){
        db = DB_Connection.getInstance();
    }
}

module.exports = UserModel;