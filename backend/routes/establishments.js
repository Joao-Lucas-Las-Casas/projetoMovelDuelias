const express = require('express');
const db = require('../database/database');
const router = express.Router();

router.get('/', (req, res) => {
    const query = 'SELECT * FROM estabelecimentos WHERE ativo = 1 ORDER BY id';

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({error: 'Erro interno do servidor'});
        }

        const establishments = rows.map(row => ({
            id: row.id,
            nome: row.nome,
            endereco: row.endereco,
            contato: row.contato
        }));

        res.json(establishments);
    });
});

router.get('/:id', (req, res) => {
    const establishmentId = parseInt(req.params.id);

    db.get('SELECT * FROM estabelecimentos WHERE id = ? AND ativo = 1', [establishmentId], (err, row) => {
        if (err) {
            return res.status(500).json({error: 'Erro interno do servidor'});
        }

        if (!row) {
            return res.status(404).json({error: 'Estabelecimento não encontrado'});
        }

        res.json({
            id: row.id,
            nome: row.nome,
            endereco: row.endereco,
            contato: row.contato
        });
    });
});

module.exports = router;