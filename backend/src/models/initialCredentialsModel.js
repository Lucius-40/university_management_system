const DB_Connection = require("../database/db.js");

class InitialCredentialsModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    createCredential = (user_id, user_name, raw_password) => {
        return this.db.run(
            'create_initial_credential',
            async () => {
                const query = `
                    INSERT INTO initial_credentials (user_id, user_name, raw_password)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const params = [user_id, user_name, raw_password];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    getAllCredentials = () => {
        return this.db.run(
            'get_all_initial_credentials',
            async () => {
                const query = `
                    SELECT
                        ic.id,
                        ic.user_id,
                        ic.user_name,
                        ic.has_changed,
                        u.email,
                        u.role
                    FROM initial_credentials ic
                    JOIN users u ON ic.user_id = u.id
                    ORDER BY id DESC;
                `;
                const result = await this.db.query_executor(query);
                return result.rows;
            }
        );
    }

    getCredentialByUserId = (user_id) => {
        return this.db.run(
            'get_initial_credential_by_user_id',
            async () => {
                const query = `SELECT * FROM initial_credentials WHERE user_id = $1;`;
                const params = [user_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }

    markAsChanged = (user_id) => {
        return this.db.run(
            'mark_initial_credential_changed',
            async () => {
                const query = `
                    UPDATE initial_credentials
                    SET has_changed = TRUE
                    WHERE user_id = $1
                    RETURNING *;
                `;
                const params = [user_id];
                const result = await this.db.query_executor(query, params);
                return result.rows[0];
            }
        );
    }
}

module.exports = InitialCredentialsModel;