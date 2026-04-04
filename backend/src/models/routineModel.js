const DB_Connection = require('../database/db.js');

class RoutineModel {
    constructor() {
        this.db = DB_Connection.getInstance();
    }

    getCurrentRoutine = () => {
        return this.db.run('get_current_routine', async () => {
            await this.ensureRoutineTable();
            const query = `
                SELECT file_url
                FROM routine
                LIMIT 1;
            `;
            const result = await this.db.query_executor(query);
            return result.rows[0] || null;
        });
    }

    replaceRoutine = (fileUrl) => {
        return this.db.run('replace_routine', async () => {
            await this.ensureRoutineTable();
            const client = await this.db.pool.connect();
            try {
                await client.query('BEGIN');

                const clearQuery = 'DELETE FROM routine;';
                await client.query(clearQuery);

                const insertQuery = `
                    INSERT INTO routine (file_url)
                    VALUES ($1)
                    RETURNING file_url;
                `;
                const result = await client.query(insertQuery, [fileUrl]);

                await client.query('COMMIT');
                return result.rows[0] || null;
            } catch (error) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('Replace routine rollback failed:', rollbackError.message);
                }
                throw error;
            } finally {
                client.release();
            }
        });
    }

    ensureRoutineTable = async () => {
        const query = `
            CREATE TABLE IF NOT EXISTS routine (
                file_url TEXT
            );
        `;
        await this.db.query_executor(query);
    }
}

module.exports = RoutineModel;
