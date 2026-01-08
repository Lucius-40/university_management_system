const UserModel = require('../models/userModel.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { runWithLogging } = require('../utils/runWithLogging.js');

class UserController{
    constructor(){
        this.model = new UserModel();
        this.salt_round = process.env.SALT_ROUND;
    }

    register = (req, res)=>{
        return runWithLogging(
            'register', 
            async()=>{
                const {
                    role, name, mobile_number, email, password, mobile_banking_number = null, bank_acc_number = null,  nid_number = null, passport_num = null
                    } = req.body;

                if(!name || !mobile_number || !email){
                    return res.status(400).json({
                        success: false,
                        message: 'name, mobile number or email not found'
                    });
                }

                if(!mobile_banking_number && !bank_acc_number){
                    return res.status(400).json({
                        success: false,
                        message: 'Either mobile banking number or bank account should be provided'
                    });
                }

                if(!nid_number && !passport_num){
                    return res.status(400).json({
                        success: false,
                        message: 'Either NID number or Passport Number should be provided'
                    }); 
                }

                if(!password){
                    return res.status(400).json({
                        success: false,
                        message: 'Password must be provided'
                    })
                }

                const saltRound = Number(this.salt_round);
                const password_hash = await bcrypt.hash(password, saltRound);
                const userPayload = {
                    name, 
                    mobile_number, 
                    email, 
                    password_hash, 
                    mobile_banking_number, 
                    bank_acc_number,  
                    nid_number, 
                    passport_num
                }
                const newUser = await this.model.createUser(userPayload);

                if(!newUser){
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create new user'
                    });
                }
                
                if(!role){
                    return res.status(400).json({
                        success: false,
                        message: "Role required"
                    });
                }

                let roleUserData = null;
                try{
                    if(role == 'student'){
                        const {
                            roll,
                            term_id,
                            section_id,
                            department_id,
                            hall_id
                        } = req.body;

                        if(!roll || !term_id || !section_id || !department_id || !hall_id){
                            return res.status(400).json({
                                success: false,
                                message: 'roll, term_id, section_id, department_id and hall_id are required for student'
                            })
                        }

                        const studentPayload = {userId: newUser.id, roll, term_id, section_id, department_id, hall_id};
                        roleUserData = await this.model.createRoleData(role, studentPayload);
                    }else if(role == 'teacher'){
                        const {
                            employee_id,
                            department_id,
                            appointment,
                            official_mail,
                            security_clearance
                        } = req.body;

                        if(!employee_id || !department_id || !appointment || !official_mail){
                            return res.status(400).json({
                                success: false,
                                message: 'employee_id, department_id, appointment and official_mail are required for teacher'
                            })
                        }

                        const teacherPayload = {userId: newUser.id, employee_id, department_id, appointment, official_mail, security_clearance};
                        roleUserData = await this.model.createRoleData(role, teacherPayload);
                    }else{
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid role'
                        });
                    }
                }catch(error){
                    await this.model.deleteUser({id: newUser.id});
                    throw error;
                }

                return res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    user: {...newUser, ...roleUserData}
                });
            }
        )
    }

    login = (req, res)=>{
        return runWithLogging(
            'login',
            async()=>{
                const {
                    role,
                    identifier,
                    password
                } = req.body;

                if(!role || !identifier || !password){
                    return res.status(400).json({
                        success: false,
                        message: 'role, identifier and password are required'
                    })
                }

                let user = null;
                if(role==='student'){
                    user = await this.model.getStudentProfile(identifier);
                }
                else if(role === 'teacher'){
                    user = await this.model.getTeacherProfile(identifier);
                }
                else{
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid role'
                    });
                }
                
                if(!user){
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid Credentials'
                    });
                }

                const match = await bcrypt.compare(password, user.password_hash);

                if(!match){
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid Credentials'
                    })
                }

                // update the refresh token in users table, we will access this token from now on.
                const accessToken = jwt.sign(
                    { role: role },
                    process.env.ACCESS_TOKEN_SECRET,
                    { subject: String(user.id), expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
                );

                const refreshToken = jwt.sign(
                    { type: 'refresh', role: role },
                    process.env.ACCESS_TOKEN_SECRET,
                    { subject: String(user.id), expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
                );

                await this.model.updateRefreshToken(user.id, refreshToken);

                return res.status(200).json({
                    success: true,
                    message: 'Login Successful',
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    user: user
                })
            }
        )
    }

    logout = (req, res)=>{
        return runWithLogging(
            'logout',
            async()=>{
                const {userId} = req.params;
                if(!userId){
                    return res.status(400).json({
                        success: false,
                        message: 'User param required'
                    })
                }

                await this.model.clearRefreshToken(userId);
                return res.status(200).json({
                    success: true,
                    message: 'Logged out successfully'
                })
            }
        )
    }

    verifyToken = (req, res)=>{
        return runWithLogging(
            'verify_token',
            async()=>{
                return res.status(200).json({
                    success: true,
                    user: req.user
                });
            }
        )
    }
    
}

module.exports = UserController;