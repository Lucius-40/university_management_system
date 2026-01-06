const UserModel = require('../models/userModel.js');

class UserController{
    constructor(){
        const model = new UserModel();
    }
}

module.exports = UserController;