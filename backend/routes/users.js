const express = require('express');
const router = express.Router();
const db = require('../database/database');
const {requireAuth, requireAdmin} = require('../middlewares/auth-middleware');

router.get('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const row = await db.getAsync(
            `SELECT u.id,
                    u.email,
                    u.tipoUsuario,
                    u.liberacao,
                    u.mudaSenha,
                    p.nome,
                    p.contato,
                    p.foto
             FROM usuarios u
                      LEFT JOIN perfis p ON p.userID = u.id
             WHERE u.id = ?`,
            [userId]
        );
        res.json({success: true, user: row});
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({success: false, error: 'Erro ao buscar dados do usuário'});
    }
});

router.put('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const {nome, contato, foto} = req.body;

        await db.runAsync(
            `INSERT INTO perfis (userID, nome, contato, foto)
             VALUES (?, ?, ?, ?) ON CONFLICT(userID) DO
            UPDATE SET
                nome = excluded.nome,
                contato = excluded.contato,
                foto = COALESCE (excluded.foto, perfis.foto)`,
            [userId, nome || null, contato || null, foto || null]
        );

        const row = await db.getAsync(
            `SELECT u.id,
                    u.email,
                    u.tipoUsuario,
                    u.liberacao,
                    u.mudaSenha,
                    p.nome,
                    p.contato,
                    p.foto
             FROM usuarios u
                      LEFT JOIN perfis p ON p.userID = u.id
             WHERE u.id = ?`,
            [userId]
        );

        res.json({success: true, user: row});
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({success: false, error: 'Erro ao atualizar perfil'});
    }
});

router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const users = await db.allAsync(`
            SELECT u.id,
                   u.email,
                   u.tipoUsuario,
                   u.liberacao,
                   u.mudaSenha,
                   p.nome,
                   p.contato,
                   p.foto
            FROM usuarios u
                     LEFT JOIN perfis p ON u.id = p.userID
            WHERE u.id <> 1
              AND u.id <> ?
            ORDER BY u.id
        `, [currentUserId]);
        res.json({success: true, users});
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({error: 'Erro ao buscar usuários'});
    }
});

router.put('/admin/:id/password', requireAuth, requireAdmin, async (req, res) => {
    try {
        const {novaSenha} = req.body;
        const userId = req.params.id;

        if (!novaSenha) {
            return res.status(400).json({error: 'Nova senha é obrigatória'});
        }

        if (novaSenha.length < 6) {
            return res.status(400).json({error: 'A senha deve ter pelo menos 6 caracteres'});
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(novaSenha, 10);

        await db.runAsync(
            'UPDATE usuarios SET senha = ?, mudaSenha = 1 WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({success: true, message: 'Senha alterada com sucesso'});
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({error: 'Erro ao alterar senha'});
    }
});

router.put('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const {liberacao, mudaSenha, tipoUsuario} = req.body;
        const userId = req.params.id;

        await db.runAsync(
            'UPDATE usuarios SET liberacao = ?, mudaSenha = ?, tipoUsuario = ? WHERE id = ?',
            [liberacao, mudaSenha, tipoUsuario, userId]
        );

        res.json({success: true, message: 'Usuário atualizado com sucesso'});
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({error: 'Erro ao atualizar usuário'});
    }
});

module.exports = router;