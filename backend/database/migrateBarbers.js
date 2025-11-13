let db = require('./database');

const getAsync = (...args) => (
    typeof db.getAsync === 'function'
        ? db.getAsync(...args)
        : new Promise((resolve, reject) => db.get(...args, (err, row) => err ? reject(err) : resolve(row)))
);

const runAsync = (...args) => (
    typeof db.runAsync === 'function'
        ? db.runAsync(...args)
        : new Promise((resolve, reject) => db.run(...args, function (err) {
            err ? reject(err) : resolve(this);
        }))
);

const allAsync = (...args) => (
    typeof db.allAsync === 'function'
        ? db.allAsync(...args)
        : new Promise((resolve, reject) => db.all(...args, (err, rows) => err ? reject(err) : resolve(rows)))
);

async function tableExists(name) {
    const row = await getAsync(
        `SELECT name
         FROM sqlite_master
         WHERE type = 'table'
           AND name = ?`,
        [name]
    );
    return !!row;
}

async function ensureTable() {
    const exists = await tableExists('barbeiros');
    if (!exists) {
        await runAsync(`
            CREATE TABLE IF NOT EXISTS barbeiros
            (
                id
                INTEGER
                PRIMARY
                KEY
                AUTOINCREMENT,
                nome
                TEXT
                NOT
                NULL,
                bio
                TEXT,
                foto
                TEXT,
                ativo
                INTEGER
                DEFAULT
                1,
                especialidades
                TEXT
            )
        `);
    } else {
        const cols = await allAsync(`PRAGMA table_info(barbeiros)`);
        const hasEspecialidades = cols.some(c => c.name === 'especialidades');
        if (!hasEspecialidades) {
            await runAsync(`ALTER TABLE barbeiros
                ADD COLUMN especialidades TEXT`);
        }
    }
}

async function seedIfEmpty() {
    const row = await getAsync(`SELECT COUNT(*) AS total
                                FROM barbeiros`);
    if (!row || Number(row.total) === 0) {
        await runAsync(
            `INSERT INTO barbeiros (nome, bio, foto, ativo, especialidades)
             VALUES (?, ?, ?, ?, ?)`,
            [
                'Barbeiro Padrão',
                'Profissional experiente.',
                null,
                1,
                JSON.stringify(['corte clássico', 'barba', 'degradê']),
            ]
        );
    }
}

async function migrateBarbers() {
    await ensureTable();
    await seedIfEmpty();
    return true;
}

module.exports = migrateBarbers;