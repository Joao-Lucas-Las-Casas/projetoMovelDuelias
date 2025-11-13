const express = require('express');
const router = express.Router();
const db = require('../database/database');
const {requireAuth, requireAdmin} = require('../middlewares/auth-middleware');

router.get('/', async (req, res, next) => {
    try {
        const rows = await db.allAsync(
            `SELECT id,
                    nome,
                    descricao,
                    preco,
                    duracao,
                    duracaoMin,
                    icone,
                    ativo
             FROM servicos
             WHERE COALESCE(ativo, 1) = 1
             ORDER BY nome ASC`
        );
        res.json({success: true, services: rows});
    } catch (err) {
        console.error('❌ Erro GET /services:', err);
        res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

router.post('/admin', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const {nome, descricao, preco, duracao, duracaoMin, icone = 'cut', ativo = 1} = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({success: false, error: 'Nome é obrigatório'});
        }

        const result = await db.runAsync(
            `INSERT INTO servicos (nome, descricao, preco, duracao, duracaoMin, icone, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nome.trim(), descricao || '', preco || 0, duracao || 30, duracaoMin || duracao || 30, icone, ativo]
        );

        const created = await db.getAsync(`SELECT *
                                           FROM servicos
                                           WHERE id = ?`, [result.lastID]);
        res.json({success: true, service: created, message: 'Serviço criado com sucesso!'});
    } catch (err) {
        console.error('❌ Erro POST /admin/services:', err);
        res.status(500).json({success: false, error: 'Erro ao criar serviço'});
    }
});

router.put('/admin/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const {id} = req.params;
        const {nome, descricao, preco, duracao, duracaoMin, icone, ativo} = req.body;

        const current = await db.getAsync(`SELECT *
                                           FROM servicos
                                           WHERE id = ?`, [id]);
        if (!current) {
            return res.status(404).json({success: false, error: 'Serviço não encontrado'});
        }

        await db.runAsync(
            `UPDATE servicos
             SET nome = ?,
                 descricao = ?,
                 preco = ?,
                 duracao = ?,
                 duracaoMin = ?,
                 icone = ?,
                 ativo = ?
             WHERE id = ?`,
            [nome, descricao, preco, duracao, duracaoMin || duracao, icone, ativo, id]
        );

        const updated = await db.getAsync(`SELECT * FROM servicos WHERE id = ?`, [id]);
        res.json({success: true, service: updated, message: 'Serviço atualizado com sucesso!'});
    } catch (err) {
        console.error('❌ Erro PUT /admin/services/:id:', err);
        res.status(500).json({success: false, error: 'Erro ao atualizar serviço'});
    }
});

router.delete('/admin/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const {id} = req.params;

        const exists = await db.getAsync(`SELECT id FROM servicos WHERE id = ?`, [id]);
        if (!exists) {
            return res.status(404).json({success: false, error: 'Serviço não encontrado'});
        }

        await db.runAsync('DELETE FROM servicos WHERE id = ?', [id]);
        res.json({success: true, message: 'Serviço excluído com sucesso!'});
    } catch (err) {
        console.error('❌ Erro DELETE /admin/services/:id:', err);
        res.status(500).json({success: false, error: 'Erro ao excluir serviço'});
    }
});

module.exports = router;