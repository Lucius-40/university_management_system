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
                    name, mobile_number, email, password_hash, role, mobile_banking_number = null, bank_account_number = null, present_address = null, permanent_address = null, birth_reg_number = null, birth_date = null, nid_number = null, passport_number = null, emergency_contact_name, emergency_contact_number, emergency_contact_relation
                } = payload;

                const query = `
                    INSERT INTO users
                        (name, mobile_number, email, password_hash, role, mobile_banking_number, bank_account_number, present_address, permanent_address, birth_reg_number, birth_date, nid_number, passport_number, emergency_contact_name, emergency_contact_number, emergency_contact_relation)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                    RETURNING *;
                `;

                const params = [
                    name, mobile_number, email, password_hash, role || 'student',
                    mobile_banking_number, bank_account_number, present_address, permanent_address, birth_reg_number, birth_date, nid_number, passport_number, emergency_contact_name, emergency_contact_number, emergency_contact_relation
                ];

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
                        roll_number,
                        current_term,
                        department_id,
                        official_mail,
                        status
                    } = payload;

                    const query = `
                        INSERT INTO students
                        (user_id, roll_number, official_mail, status, current_term)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING *;
                    `;

                    const params = [userId, roll_number, official_mail, status, current_term]

                    const result = await this.db.query_executor(query, params);
                    return result.rows[0] || null;
                } else if (role == 'teacher'){
                    const {
                        userId,
                        department_id,
                        appointment,
                        official_mail
                    } = payload;

                    const query = `
                        INSERT INTO teachers
                        (user_id, department_id, appointment, official_mail)
                        VALUES ($1, $2, $3, $4)
                        RETURNING *;
                    `;

                    const params = [userId, department_id, appointment, official_mail]

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
                    id, name, mobile_number, email, mobile_banking_number = null, bank_account_number = null, present_address = null, permanent_address = null, birth_reg_number = null, birth_date = null, nid_number = null, passport_number = null, emergency_contact_name, emergency_contact_number, emergency_contact_relation
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
                            birth_reg_number=$9, 
                            birth_date=$10, 
                            nid_number=$11, 
                            passport_number=$12,
                            emergency_contact_name=$13,
                            emergency_contact_number=$14,
                            emergency_contact_relation=$15
                        WHERE id = $1
                    RETURNING *;
                `;

                const params = [id, name, mobile_number, email, mobile_banking_number, bank_account_number, present_address, permanent_address, birth_reg_number, birth_date, nid_number, passport_number, emergency_contact_name, emergency_contact_number, emergency_contact_relation];

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
                        u.mobile_banking_number,
                        u.bank_account_number,
                        u.present_address,
                        u.permanent_address,
                        u.birth_reg_number,
                        u.birth_date,
                        u.nid_number,
                        u.passport_number,
                        u.emergency_contact_name,
                        u.emergency_contact_number,
                        u.emergency_contact_relation,
                        s.roll_number,
                        t.term_number,
                        t.start_date as term_start_date,
                        s.status
                    FROM students s
                    JOIN users as u ON u.id=s.user_id
                    LEFT JOIN terms as t ON t.id=s.current_term
                    WHERE s.roll_number=$1
                `;

                const params = [idnetifier];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
           } 
        )
    }

    getStudentProfileByUserId = (userId)=>{
        return this.db.run(
           'get_student_user_by_user_id',
           async()=>{
                const query = `
                    SELECT 
                        u.id,
                        u.name,
                        u.mobile_number,
                        u.email,
                        u.mobile_banking_number,
                        u.bank_account_number,
                        u.present_address,
                        u.permanent_address,
                        u.birth_reg_number,
                        u.birth_date,
                        u.nid_number,
                        u.passport_number,
                        u.emergency_contact_name,
                        u.emergency_contact_number,
                        u.emergency_contact_relation,
                        s.roll_number,
                        s.official_mail,
                        s.status,
                        t.id as term_id,
                        t.term_number,
                        t.start_date as term_start_date,
                        d.id as department_id,
                        d.code as department_code,
                        d.name as department_name
                    FROM students s
                    JOIN users u ON u.id = s.user_id
                    LEFT JOIN terms t ON t.id = s.current_term
                    LEFT JOIN departments d ON d.id = t.department_id
                    WHERE s.user_id = $1
                `;

                const params = [userId];
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
                        u.mobile_banking_number,
                        u.bank_account_number,
                        u.present_address,
                        u.permanent_address,
                        u.birth_reg_number,
                        u.birth_date,
                        u.nid_number,
                        u.passport_number,
                        u.emergency_contact_name,
                        u.emergency_contact_number,
                        u.emergency_contact_relation,
                        teach.appointment,
                        teach.official_mail,
                        dept.id as department_id,
                        dept.name as department_name
                    FROM teachers teach
                    JOIN users as u ON u.id=teach.user_id
                    JOIN departments as dept ON dept.id=teach.department_id
                    WHERE teach.user_id=$1
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
                    SET refresh_token = $2
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
                    SET refresh_token = NULL
                    WHERE id = $1
                    RETURNING id
                `;
                const params = [userId];
                const result = await this.db.query_executor(query, params);
                return result.rows[0] || null;
            }
        )
    }

    getEntityInspectData = (filters = {}) => {
        return this.db.run(
            'get_entity_inspect_data',
            async () => {
                const { identity, department, batch, term, section } = filters;

                const params = [];
                const whereClauses = [];

                if (identity) {
                    params.push(String(identity).toLowerCase());
                    whereClauses.push(`x.identity = $${params.length}`);
                }

                if (department) {
                    params.push(String(department).toUpperCase());
                    whereClauses.push(`x.department_code = $${params.length}`);
                }

                if (batch) {
                    params.push(String(batch));
                    whereClauses.push(`x.identity <> 'student' OR x.batch = $${params.length}`);
                }

                if (term) {
                    params.push(Number(term));
                    whereClauses.push(`x.identity <> 'student' OR x.term_id = $${params.length}`);
                }

                if (section) {
                    params.push(`%${String(section)}%`);
                    whereClauses.push(`x.identity <> 'student' OR COALESCE(x.section_names, '') ILIKE $${params.length}`);
                }

                const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

                const query = `
                    WITH student_sections_agg AS (
                        SELECT
                            ss.student_id,
                            STRING_AGG(DISTINCT ss.section_name, ', ' ORDER BY ss.section_name) AS section_names
                        FROM student_sections ss
                        GROUP BY ss.student_id
                    ),
                    combined AS (
                        SELECT
                            'student'::text AS identity,
                            u.id AS user_id,
                            u.name AS full_name,
                            u.email AS personal_email,
                            u.mobile_number,
                            u.present_address,
                            u.permanent_address,
                            u.birth_date,
                            s.roll_number,
                            SUBSTRING(s.roll_number FROM 1 FOR 3) AS roll_department_code,
                            SUBSTRING(s.roll_number FROM 4 FOR 4) AS batch,
                            SUBSTRING(s.roll_number FROM 8 FOR 3) AS roll_serial,
                            s.official_mail,
                            s.status AS student_status,
                            NULL::text AS appointment,
                            t.id AS term_id,
                            t.term_number,
                            COALESCE(d.code, SUBSTRING(s.roll_number FROM 1 FOR 3)) AS department_code,
                            d.name AS department_name,
                            ssa.section_names
                        FROM students s
                        JOIN users u ON u.id = s.user_id
                        LEFT JOIN terms t ON t.id = s.current_term
                        LEFT JOIN departments d ON d.id = t.department_id
                        LEFT JOIN student_sections_agg ssa ON ssa.student_id = s.user_id

                        UNION ALL

                        SELECT
                            'teacher'::text AS identity,
                            u.id AS user_id,
                            u.name AS full_name,
                            u.email AS personal_email,
                            u.mobile_number,
                            u.present_address,
                            u.permanent_address,
                            u.birth_date,
                            NULL::text AS roll_number,
                            NULL::text AS roll_department_code,
                            NULL::text AS batch,
                            NULL::text AS roll_serial,
                            t.official_mail,
                            NULL::student_status_enum AS student_status,
                            t.appointment::text AS appointment,
                            NULL::int AS term_id,
                            NULL::int AS term_number,
                            d.code AS department_code,
                            d.name AS department_name,
                            NULL::text AS section_names
                        FROM teachers t
                        JOIN users u ON u.id = t.user_id
                        LEFT JOIN departments d ON d.id = t.department_id
                    )
                    SELECT *
                    FROM combined x
                    ${whereSql}
                    ORDER BY
                        CASE WHEN x.identity = 'student' THEN 0 ELSE 1 END,
                        x.department_code NULLS LAST,
                        x.term_number NULLS LAST,
                        x.roll_number NULLS LAST,
                        x.full_name ASC;
                `;

                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }
}

module.exports = UserModel;