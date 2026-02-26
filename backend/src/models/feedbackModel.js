const DB_Connection = require("../database/db.js");

class FeedbackModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createFeedback = (payload) => {
        return this.db.run(
            'create_feedback',
            async () => {
                const { course_offering_id, teacher_id, csv_file_url, average_rating } = payload;
                const query = `
                    INSERT INTO feedback (course_offering_id, teacher_id, csv_file_url, average_rating)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *;
                `;
                const params = [course_offering_id, teacher_id, csv_file_url, average_rating];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllFeedback = () => {
        return this.db.run(
            'get_all_feedback',
            async () => {
                const query = `SELECT * FROM feedback;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getFeedbackById = (id) => {
        return this.db.run(
            'get_feedback_by_id',
            async () => {
                const query = `SELECT * FROM feedback WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateFeedback = (id, payload) => {
        return this.db.run(
            'update_feedback',
            async () => {
                const { course_offering_id, teacher_id, csv_file_url, average_rating } = payload;
                const query = `
                    UPDATE feedback
                    SET course_offering_id = $2, teacher_id = $3, csv_file_url = $4, average_rating = $5
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, course_offering_id, teacher_id, csv_file_url, average_rating];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteFeedback = (id) => {
        return this.db.run(
            'delete_feedback',
            async () => {
                const query = `DELETE FROM feedback WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = FeedbackModel;
