const DB_Connection = require("../database/db.js");

class CourseModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createCourse = (payload) => {
        return this.db.run(
            'create_course',
            async () => {
                const { course_code, name, credit_hours, type, department_id } = payload;
                const query = `
                    INSERT INTO courses (course_code, name, credit_hours, type, department_id)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const params = [course_code, name, credit_hours, type, department_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllCourses = () => {
        return this.db.run(
            'get_all_courses',
            async () => {
                const query = `SELECT * FROM courses;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getCourseById = (id) => {
        return this.db.run(
            'get_course_by_id',
            async () => {
                const query = `SELECT * FROM courses WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateCourse = (id, payload) => {
        return this.db.run(
            'update_course',
            async () => {
                const { course_code, name, credit_hours, type, department_id } = payload;
                const query = `
                    UPDATE courses
                    SET course_code = $2, name = $3, credit_hours = $4, type = $5, department_id = $6
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, course_code, name, credit_hours, type, department_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteCourse = (id) => {
        return this.db.run(
            'delete_course',
            async () => {
                const query = `DELETE FROM courses WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    createCourseOffering = (payload) => {
        return this.db.run(
            'create_course_offering',
            async () => {
                const { term_id, course_id, max_capacity } = payload;
                const query = `
                    INSERT INTO course_offerings (term_id, course_id, max_capacity)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const params = [term_id, course_id, max_capacity];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
    
    getCourseOfferingById = (id) => {
        return this.db.run(
            'get_course_offering_by_id',
            async () => {
                const query = `SELECT * FROM course_offerings WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = CourseModel;
