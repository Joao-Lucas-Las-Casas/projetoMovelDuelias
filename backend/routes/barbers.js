const express = require('express');
const router = express.Router();
const db = require('../database/database');

const {requireAuth, requireAdmin} = require('../middlewares/auth-middleware');

const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
        if (typeof db.runAsync === 'function') {
            db.runAsync(sql, params).then(resolve).catch(reject);
        } else if (typeof db.get === 'function') {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({lastID: this.lastID, changes: this.changes});
            });
        } else {
            reject(new Error('Nenhum método db.run/db.runAsync disponível'));
        }
    });

const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
        if (typeof db.getAsync === 'function') {
            db.getAsync(sql, params).then(resolve).catch(reject);
        } else if (typeof db.get === 'function') {
            db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
        } else {
            reject(new Error('Nenhum método db.get/db.getAsync disponível'));
        }
    });

const all = (sql, params = []) =>
    new Promise((resolve, reject) => {
        if (typeof db.allAsync === 'function') {
            db.allAsync(sql, params).then(resolve).catch(reject);
        } else if (typeof db.all === 'function') {
            db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
        } else {
            reject(new Error('Nenhum método db.all/db.allAsync disponível'));
        }
    });

const parseEspecialidades = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        }
        return [];
    }
};

const serializeEspecialidades = (arr) => {
    try {
        if (!arr) return JSON.stringify([]);
        if (typeof arr === 'string') {
            const list = arr
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            return JSON.stringify(list);
        }
        return JSON.stringify(arr);
    } catch {
        return '[]';
    }
};

const buildFotoUrl = (req, foto) => {
    if (!foto) return null;
    if (foto.startsWith('http://') || foto.startsWith('https://')) return foto;
    const base = `${req.protocol}://${req.get('host')}`;
    const rel = foto.startsWith('/') ? foto : `/${foto}`;
    return `${base}${rel}`;
};

async function hasColumn(table, column) {
    try {
        const cols = await all(`PRAGMA table_info(${table})`);
        return cols.some(c => c.name === column);
    } catch {
        return false;
    }
}

router.get('/', async (req, res) => {
    try {
        let tableName;
        try {
            const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND (name='barbers' OR name='barbeiros')");
            if (tables.some(t => t.name === 'barbers')) {
                tableName = 'barbers';
            } else if (tables.some(t => t.name === 'barbeiros')) {
                tableName = 'barbeiros';
            } else {
                return res.json({success: true, data: []});
            }
        } catch {
            return res.json({success: true, data: []});
        }

        const selectCols = ['id', 'nome'];
        if (await hasColumn(tableName, 'foto')) selectCols.push('foto');
        if (await hasColumn(tableName, 'bio')) selectCols.push('bio');
        if (await hasColumn(tableName, 'especialidades')) selectCols.push('especialidades');

        let whereClause = '';
        if (await hasColumn(tableName, 'ativo')) {
            whereClause = 'WHERE ativo = 1';
        }

        const rows = await all(
            `SELECT ${selectCols.join(', ')}
             FROM ${tableName} ${whereClause}
             ORDER BY nome ASC`
        );

        const barbers = rows.map((b) => ({
            id: b.id,
            nome: b.nome,
            foto: buildFotoUrl(req, b.foto),
            bio: b.bio || null,
            especialidades: parseEspecialidades(b.especialidades),
            ativo: true,
        }));

        res.json({success: true, data: barbers});
    } catch (e) {
        console.error('[barbers] GET /barbers erro:', e);
        res.json({success: true, data: []});
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        let tableName;
        try {
            const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND (name='barbers' OR name='barbeiros')");
            if (tables.some(t => t.name === 'barbers')) {
                tableName = 'barbers';
            } else if (tables.some(t => t.name === 'barbeiros')) {
                tableName = 'barbeiros';
            } else {
                return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
            }
        } catch {
            return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
        }

        const selectCols = ['id', 'nome'];
        if (await hasColumn(tableName, 'foto')) selectCols.push('foto');
        if (await hasColumn(tableName, 'bio')) selectCols.push('bio');
        if (await hasColumn(tableName, 'especialidades')) selectCols.push('especialidades');

        const row = await get(
            `SELECT ${selectCols.join(', ')}
             FROM ${tableName}
             WHERE id = ?`,
            [id]
        );

        if (!row) {
            return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
        }

        const barber = {
            id: row.id,
            nome: row.nome,
            foto: buildFotoUrl(req, row.foto),
            bio: row.bio || null,
            especialidades: parseEspecialidades(row.especialidades),
            ativo: true,
        };

        res.json({success: true, data: barber});
    } catch (e) {
        console.error('[barbers] GET /barbers/:id erro:', e);
        res.status(500).json({success: false, error: 'Erro ao obter barbeiro'});
    }
});

router.get('/admin/barbers', requireAuth, requireAdmin, async (req, res) => {
    try {
        let tableName;
        try {
            const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND (name='barbers' OR name='barbeiros')");
            if (tables.some(t => t.name === 'barbers')) {
                tableName = 'barbers';
            } else if (tables.some(t => t.name === 'barbeiros')) {
                tableName = 'barbeiros';
            } else {
                return res.json({success: true, data: []});
            }
        } catch {
            return res.json({success: true, data: []});
        }

        const selectCols = ['id', 'nome'];
        if (await hasColumn(tableName, 'foto')) selectCols.push('foto');
        if (await hasColumn(tableName, 'bio')) selectCols.push('bio');
        if (await hasColumn(tableName, 'especialidades')) selectCols.push('especialidades');
        if (await hasColumn(tableName, 'ativo')) selectCols.push('ativo');

        const rows = await all(
            `SELECT ${selectCols.join(', ')}
             FROM ${tableName}
             ORDER BY nome ASC`
        );

        const barbers = rows.map((b) => ({
            id: b.id,
            nome: b.nome,
            foto: buildFotoUrl(req, b.foto),
            bio: b.bio || null,
            especialidades: parseEspecialidades(b.especialidades),
            ativo: b.ativo !== undefined ? Boolean(b.ativo) : true,
        }));

        res.json({success: true, data: barbers});
    } catch (e) {
        console.error('[barbers] GET /admin/barbers erro:', e);
        res.status(500).json({success: false, error: 'Erro ao listar barbeiros'});
    }
});

router.post('/admin', requireAuth, requireAdmin, async (req, res) => {
    try {
        let tableName;
        try {
            const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND (name='barbers' OR name='barbeiros')");
            if (tables.some(t => t.name === 'barbers')) {
                tableName = 'barbers';
            } else if (tables.some(t => t.name === 'barbeiros')) {
                tableName = 'barbeiros';
            } else {
                return res.status(500).json({success: false, error: 'Tabela de barbeiros não encontrada'});
            }
        } catch {
            return res.status(500).json({success: false, error: 'Tabela de barbeiros não encontrada'});
        }

        const {nome, foto, bio, especialidades, ativo} = req.body || {};
        if (!nome || !nome.trim()) {
            return res.status(400).json({success: false, error: 'Nome é obrigatório'});
        }

        const insertCols = ['nome'];
        const insertParams = [nome.trim()];
        const placeholders = ['?'];

        if (await hasColumn(tableName, 'foto')) {
            insertCols.push('foto');
            insertParams.push(foto || null);
            placeholders.push('?');
        }

        if (await hasColumn(tableName, 'bio')) {
            insertCols.push('bio');
            insertParams.push(bio || null);
            placeholders.push('?');
        }

        if (await hasColumn(tableName, 'especialidades')) {
            insertCols.push('especialidades');
            insertParams.push(serializeEspecialidades(especialidades));
            placeholders.push('?');
        }

        if (await hasColumn(tableName, 'ativo')) {
            insertCols.push('ativo');
            insertParams.push(typeof ativo === 'number' ? ativo : 1);
            placeholders.push('?');
        }

        const sql = `INSERT INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const result = await run(sql, insertParams);

        const selectCols = ['id', 'nome'];
        if (await hasColumn(tableName, 'foto')) selectCols.push('foto');
        if (await hasColumn(tableName, 'bio')) selectCols.push('bio');
        if (await hasColumn(tableName, 'especialidades')) selectCols.push('especialidades');

        const created = await get(
            `SELECT ${selectCols.join(', ')} FROM ${tableName} WHERE id = ?`,
            [result.lastID]
        );

        res.status(201).json({
            success: true,
            data: {
                id: created.id,
                nome: created.nome,
                foto: buildFotoUrl(req, created.foto),
                bio: created.bio || null,
                especialidades: parseEspecialidades(created.especialidades),
                ativo: true,
            },
        });
    } catch (e) {
        console.error('[barbers] POST /admin erro:', e);
        res.status(500).json({success: false, error: 'Erro ao criar barbeiro'});
    }
});

router.put('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        let tableName;
        try {
            const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND (name='barbers' OR name='barbeiros')");
            if (tables.some(t => t.name === 'barbers')) {
                tableName = 'barbers';
            } else if (tables.some(t => t.name === 'barbeiros')) {
                tableName = 'barbeiros';
            } else {
                return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
            }
        } catch {
            return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
        }

        const {nome, foto, bio, especialidades, ativo} = req.body || {};

        const current = await get(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
        if (!current) {
            return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
        }

        const updateCols = [];
        const updateParams = [];

        if (nome !== undefined) {
            updateCols.push('nome = ?');
            updateParams.push(nome.trim());
        }

        if (foto !== undefined && await hasColumn(tableName, 'foto')) {
            updateCols.push('foto = ?');
            updateParams.push(foto || null);
        }

        if (bio !== undefined && await hasColumn(tableName, 'bio')) {
            updateCols.push('bio = ?');
            updateParams.push(bio || null);
        }

        if (especialidades !== undefined && await hasColumn(tableName, 'especialidades')) {
            updateCols.push('especialidades = ?');
            updateParams.push(serializeEspecialidades(especialidades));
        }

        if (ativo !== undefined && await hasColumn(tableName, 'ativo')) {
            updateCols.push('ativo = ?');
            updateParams.push(ativo ? 1 : 0);
        }

        if (updateCols.length === 0) {
            return res.status(400).json({success: false, error: 'Nenhum campo para atualizar'});
        }

        updateParams.push(id);

        const sql = `UPDATE ${tableName} SET ${updateCols.join(', ')} WHERE id = ?`;
        await run(sql, updateParams);

        const selectCols = ['id', 'nome'];
        if (await hasColumn(tableName, 'foto')) selectCols.push('foto');
        if (await hasColumn(tableName, 'bio')) selectCols.push('bio');
        if (await hasColumn(tableName, 'especialidades')) selectCols.push('especialidades');
        if (await hasColumn(tableName, 'ativo')) selectCols.push('ativo');

        const updated = await get(
            `SELECT ${selectCols.join(', ')}
             FROM ${tableName}
             WHERE id = ?`,
            [id]
        );

        res.json({
            success: true,
            data: {
                id: updated.id,
                nome: updated.nome,
                foto: buildFotoUrl(req, updated.foto),
                bio: updated.bio || null,
                especialidades: parseEspecialidades(updated.especialidades),
                ativo: updated.ativo !== undefined ? Boolean(updated.ativo) : true,
            },
        });
    } catch (e) {
        console.error('[barbers] PUT /admin/:id erro:', e);
        res.status(500).json({success: false, error: 'Erro ao atualizar barbeiro'});
    }
});

router.delete('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        let tableName;
        try {
            const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND (name='barbers' OR name='barbeiros')");
            if (tables.some(t => t.name === 'barbers')) {
                tableName = 'barbers';
            } else if (tables.some(t => t.name === 'barbeiros')) {
                tableName = 'barbeiros';
            } else {
                return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
            }
        } catch {
            return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
        }

        const current = await get(`SELECT *
                                   FROM ${tableName}
                                   WHERE id = ?`, [id]);
        if (!current) {
            return res.status(404).json({success: false, error: 'Barbeiro não encontrado'});
        }

        if (await hasColumn(tableName, 'ativo')) {
            await run(`UPDATE ${tableName}
                       SET ativo = 0
                       WHERE id = ?`, [id]);
        } else {
            await run(`DELETE
                       FROM ${tableName}
                       WHERE id = ?`, [id]);
        }

        res.json({success: true, message: 'Barbeiro excluído com sucesso'});
    } catch (e) {
        console.error('[barbers] DELETE /admin/:id erro:', e);
        res.status(500).json({success: false, error: 'Erro ao excluir barbeiro'});
    }
});

module.exports = router;