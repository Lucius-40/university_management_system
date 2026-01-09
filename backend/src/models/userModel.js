const DB_Connection = require('../database/db.js');

class UserModel{
    constructor(){
        this.db = DB_Connection.getInstance();
    }

    createUser = (payload)=>{
        return this.db.run(
            'create_user', 
            async()=>{
                const {
                    name, mobile_number, email, password_hash, mobile_banking_number = null, bank_acc_number = null, present_address = null, permanent_address = null, birth_reg_num = null, dob = null, nid_number = null, passport_num = null, role
                } = payload;

                const query = `
                    INSERT INTO users
                        (name, mobile_number, email, password_hash, mobile_banking_number, bank_account_number, present_address, permanent_address, birth_registration_number, date_of_birth, nid_number, passport_number)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *;
                `;

                const params = [name, mobile_number, email, password_hash, mobile_banking_number, bank_acc_number, present_address, permanent_address, birth_reg_num, dob, nid_number, passport_num];

                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    createRoleData = (role, payload)=>{
        return this.db.run(
            'create_role_data',
            async()=>{
                if(role == 'student'){
                    const {
                        userId,
                        roll,
                        term_id,
                        section_id,
                        department_id,
                        hall_id
                    } = payload;

                    const query = `
                        INSERT INTO students
                        (id, term_id, section_id, department_id, hall_id, roll)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *;
                    `;

                    const params = [userId, term_id, section_id, department_id, hall_id, roll]

                    const result = await this.db.query_executor(query, params);
                    return result.rows[0] || null;
                } else if (role == 'teacher'){
                    const {
                        userId,
                        employee_id,
                        department_id,
                        appointment,
                        official_mail,
                        security_clearance = 0
                    } = payload;

                    const query = `
                        INSERT INTO teachers
                        (id, employee_id, department_id, appointment, official_mail, security_clearance)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *;
                    `;

                    const params = [userId, employee_id, department_id, appointment, official_mail, security_clearance]

                    const result = await this.db.query_executor(query, params);
                    return result.rows[0] || null;
                }
                else{
                    return null;
                }
            }
        )
    }

    updateUser = (payload)=>{
        return this.db.run(
            'update_user',
            async()=>{
                const {
                    id, name, mobile_number, email, mobile_banking_number = null, bank_acc_number = null, present_address = null, permanent_address = null, birth_reg_num = null, dob = null, nid_number = null, passport_num = null
                } = payload;

                const query = `
                    UPDATE users
                        SET
                            name=$2,
                            mobile_number=$3, 
                            email=$4, 
                            mobile_banking_number=$5, 
                            bank_account_number=$6, 
                            present_address=$7, 
                            permanent_address=$8, 
                            birth_registration_number=$9, 
                            date_of_birth=$10, 
                            nid_number=$11, 
                            passport_number=$12
                        WHERE id = $1
                    RETURNING *;
                `;

                const params = [id, name, mobile_number, email, mobile_banking_number, bank_acc_number, present_address, permanent_address, birth_reg_num, dob, nid_number, passport_num];

                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        )
    }

    deleteUser = (payload)=>{
        return this.db.run(
            'delete_user',
            async()=>{
                const {id} = payload;
                
                const query = `
                    DELETE FROM users
                    WHERE id = $1
                    RETURNING *;
                `;

                const params = [id]
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        )
    }

    getUserById = (id)=>{
        return this.db.run(
            'get_user_by_id',
            async()=>{
                const query = `
                    SELECT *
                    FROM users
                    WHERE id = $1
                `;
                
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        )
    }

    getUserByName = (name)=>{
        return this.db.run(
            'get_user_by_name',
            async()=>{
                const query = `
                    SELECT *
                    FROM users
                    WHERE name = $1
                `;
                
                const params = [name];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        )
    }

    getUserByEmail = (email)=>{
        return this.db.run(
            'get_user_by_email',
            async()=>{
                const query = `
                    SELECT *
                    FROM users
                    WHERE email = $1
                `;
                
                const params = [email];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        )
    }

    getStudentProfile = (idnetifier)=>{
        return this.db.run(
           'get_student_user',
           async()=>{
                const query = `
                    SELECT 
                        u.id,
                        u.name,
                        u.mobile_number,
                        u.email,
                        u.password_hash,
                        u.mobile_banking_number,
                        u.bank_account_number,
                        u.present_address,
                        u.permanent_address,
                        u.birth_registration_number,
                        u.date_of_birth,
                        u.nid_number,
                        u.passport_number,
                        s.roll,
                        t.term_number,
                        t.started_on,
                        sec.id as section_id,
                        sec.name as section_name,
                        dept.id as department_id,
                        dept.name as department_name,
                        h.id as hall_id,
                        h.name as hall_name,
                        s.status
                    FROM students s
                    JOIN users as u ON u.id=s.id
                    JOIN terms as t ON t.id=s.term_id
                    JOIN sections as sec ON sec.id=s.section_id
                    JOIN departments as dept ON dept.id=s.department_id
                    JOIN halls as h ON h.id=s.hall_id
                    WHERE s.roll=$1
                `;

                const params = [idnetifier];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
           } 
        )
    }

    getTeacherProfile = (idnetifier)=>{
        return this.db.run(
           'get_teacher_user',
           async()=>{
                const query = `
                    SELECT 
                        u.id,
                        u.name,
                        u.mobile_number,
                        u.email,
                        u.password_hash,
                        u.mobile_banking_number,
                        u.bank_account_number,
                        u.present_address,
                        u.permanent_address,
                        u.birth_registration_number,
                        u.date_of_birth,
                        u.nid_number,
                        u.passport_number,
                        u.refresh_token,
                        teach.employee_id,
                        teach.appointment,
                        teach.official_mail,
                        dept.id as department_id,
                        dept.name as department_name
                    FROM teachers teach
                    JOIN users as u ON u.id=teach.id
                    JOIN departments as dept ON dept.id=teach.department_id
                    WHERE teach.employee_id=$1
                `;

                const params = [idnetifier];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
           } 
        )
    }

    updateRefreshToken = (userId, refreshToken)=>{
        return this.db.run(
            'update_refresh_token',
            async()=>{
                const query = `
                    UPDATE users 
                    SET refresh_token = $2, updated_at = NOW()
                    WHERE id = $1
                    RETURNING *
                    `;
                const params = [userId, refreshToken];
                const result = await this.db.query_executor(query, params);
                return result.rows[0] || null;
            }
        )
    }

    findByRefreshToken = (refreshToken)=>{
        return this.db.run(
            'find_by_refresh_token',
            async()=>{
                const query = `
                    SELECT *
                    FROM users 
                    WHERE refresh_token = $1 
                `;
                
                const params = [refreshToken];
                const result = await this.db.query_executor(query, params);
                return result.rows[0] || null;
            }
        )
    }

    clearRefreshToken = (userId)=>{
        return this.db.run(
            'clear_refresh_token',
            async()=>{
                const query = `
                    UPDATE users 
                    SET refresh_token = NULL, updated_at = NOW()
                    WHERE id = $1
                    RETURNING id
                `;
                const params = [userId];
                const result = await this.db.query_executor(query, params);
                return result.rows[0] || null;
            }
        )
    }
//     CREATE TABLE IF NOT EXISTS emergency_contacts (
//     id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
//     user_id INTEGER NOT NULL,
//     name VARCHAR(100) NOT NULL,
//     relation VARCHAR(50) NOT NULL,
//     mobile_number VARCHAR(15) NOT NULL,
//     address TEXT NOT NULL,
//     CONSTRAINT fk_emergency_contacts_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
// );

    createEmergencyContact = (payload)=>{
        return this.db.run(
            'Create Emergency cnt',
            async () => {
                const {user_id, name, relation, mobile_number, address} = payload ;
                
                const query = `INSERT INTO emergency_contacts (user_id, name, relation, mobile_number, address)
                                VALUES ($1, $2, $3, $4, $5)
                                RETURNING *;`;
                const params = [user_id, name, relation, mobile_number, address];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        );
    }

    updateEmergencyContact = (payload)=>{
        return this.db.run(
            'Update Emergency contact info',
            async()=>{
                const {id,user_id, name, relation, mobile_number, address} = payload ;
                const query = `UPDATE emergency_contacts
                                SET user_id =$2,
                                relation =$4,
                                name=$3,
                                mobile_number=$5,
                                address =$6
                                WHERE id=$1
                                RETURNING *;`;
                const params = [id,user_id, name, relation, mobile_number, address];
                const res = await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    deleteEmergencyContact = (id)=>{
        return this.db.run(
            'Delete Emergency cnt by Id',
            async ()=>{
                const query = `DELETE FROM emergency_contacts WHERE id=$1 RETURNING *;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }
        )
    }

    getEmergencyContactById= (id)=>{
        return this.db.run(
            'Get Emergency cnt ny id',
            async ()=>{
                const query = `SELECT * FROM emergency_contacts WHERE id=$1;`;
                const params = [id];
                const res =  await this.db.query_executor(query, params);
                return res.rows[0];
            }

        )
    }
}

module.exports = UserModel;