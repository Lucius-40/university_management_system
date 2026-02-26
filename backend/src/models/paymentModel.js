const DB_Connection = require("../database/db.js");

class PaymentModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createDue = (payload) => {
        return this.db.run(
            'create_due',
            async () => {
                const { name, amount, bank_account_number } = payload;
                const query = `
                    INSERT INTO dues (name, amount, bank_account_number)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const params = [name, amount, bank_account_number];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllDues = () => {
        return this.db.run(
            'get_all_dues',
            async () => {
                const query = `SELECT * FROM dues;`;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getDueById = (id) => {
        return this.db.run(
            'get_due_by_id',
            async () => {
                const query = `SELECT * FROM dues WHERE id = $1;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    updateDue = (id, payload) => {
        return this.db.run(
            'update_due',
            async () => {
                const { name, amount, bank_account_number } = payload;
                const query = `
                    UPDATE dues
                    SET name = $2, amount = $3, bank_account_number = $4
                    WHERE id = $1
                    RETURNING *;
                `;
                const params = [id, name, amount, bank_account_number];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    deleteDue = (id) => {
        return this.db.run(
            'delete_due',
            async () => {
                const query = `DELETE FROM dues WHERE id = $1 RETURNING *;`;
                const params = [id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    createStudentDuesPayment = (payload) => {
        return this.db.run(
            'create_student_dues_payment',
            async () => {
                const { student_id, due_id, amount_paid, paid_at, payment_method, mobile_banking_number, status, deadline } = payload;
                const query = `
                    INSERT INTO student_dues_payment (student_id, due_id, amount_paid, paid_at, payment_method, mobile_banking_number, status, deadline)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *;
                `;
                const params = [student_id, due_id, amount_paid, paid_at, payment_method, mobile_banking_number, status, deadline];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getStudentDuesPayments = (student_id) => {
        return this.db.run(
            'get_student_dues_payments',
            async () => {
                const query = `SELECT * FROM student_dues_payment WHERE student_id = $1;`;
                const params = [student_id];
                const result = await this.db.query_executor(query, params);
                return result.rows;
            }
        );
    }
}

module.exports = PaymentModel;
