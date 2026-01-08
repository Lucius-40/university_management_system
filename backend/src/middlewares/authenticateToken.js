const UserModel = require('../models/userModel.js');
const jwt = require('jsonwebtoken');

class AuthenticateToken{
    constructor(){
        this.userModel = new UserModel();
    }

    authenticateToken = async(req, res, next)=>{
        try {
            console.log("Authenticating users"); //TODO: Need to remove in production

            const authHeader = req.headers['authorization'] || req.headers['Authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            
            if(!token){
                return res.status(401).json({
                    success: false,
                    message: 'Access token required'
                });
            }

            console.log("Verifying token"); //TODO: Remove in production

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            const userId = decoded.sub || decoded.id;
            const user = await this.userModel.getUserById(userId);
            
            if(!user){
                return res.status(401).json({
                    success: false,
                    message: "User Not Found"
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
        
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token expired' 
                });
            }
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
    }
}

module.exports = AuthenticateToken;