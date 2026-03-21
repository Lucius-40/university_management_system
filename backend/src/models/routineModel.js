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
            const clearQuery = 'DELETE FROM routine;';
            await this.db.query_executor(clearQuery);

            const insertQuery = `
                INSERT INTO routine (file_url)
                VALUES ($1)
                RETURNING file_url;
            `;
            const result = await this.db.query_executor(insertQuery, [fileUrl]);
            return result.rows[0] || null;
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
