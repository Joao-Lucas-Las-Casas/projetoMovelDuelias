const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'duelias_barbearia_jwt_secret_key_2024';

router.post('/login', (req, res) => {
    const {email, senha} = req.body;

    console.log('=== TENTATIVA DE LOGIN ===');
    console.log('Email:', email);

    if (!email || !senha) {
        return res.status(400).json({success: false, error: 'Email e senha são obrigatórios'});
    }

    db.get(`SELECT u.*, p.nome, p.contato
            FROM usuarios u
                     LEFT JOIN perfis p ON u.id = p.userID
            WHERE u.email = ?
              AND u.liberacao = 1`, [email], (err, user) => {
        if (err) {
            console.error('Erro no banco:', err);
            return res.status(500).json({success: false, error: 'Erro interno do servidor'});
        }

        if (!user) {
            console.log('Usuário não encontrado ou conta desativada');
            return res.status(401).json({success: false, error: 'Credenciais inválidas'});
        }

        console.log('Usuário encontrado:', user.id, user.email);

        const senhaValida = bcrypt.compareSync(senha, user.senha);
        console.log('Senha válida:', senhaValida);

        if (!senhaValida) {
            console.log('Senha inválida');
            return res.status(401).json({success: false, error: 'Credenciais inválidas'});
        }

        const token = jwt.sign({
            id: user.id,
            email: user.email,
            tipoUsuario: user.tipoUsuario
        }, JWT_SECRET, {expiresIn: '24h'});

        console.log('Login bem-sucedido para:', user.email);

        res.json({
            success: true,
            token: token,
            userId: user.id,
            tipoUsuario: user.tipoUsuario,
            mudaSenha: user.mudaSenha,
            user: {
                id: user.id, email: user.email, nome: user.nome, contato: user.contato, tipoUsuario: user.tipoUsuario
            }
        });
    });
});

router.post('/register', (req, res) => {
    const {email, senha, nome, contato} = req.body;

    console.log('=== TENTATIVA DE CADASTRO INTELIGENTE ===');
    console.log('Dados recebidos:', {email, nome, contato});

    if (!email || !senha || !nome || !contato) {
        console.log('❌ Campos faltando');
        return res.status(400).json({
            success: false, error: 'Todos os campos são obrigatórios'
        });
    }

    if (senha.length < 6) {
        console.log('❌ Senha muito curta');
        return res.status(400).json({
            success: false, error: 'A senha deve ter pelo menos 6 caracteres'
        });
    }

    const checkEmailQuery = `
        SELECT id, liberacao
        FROM usuarios
        WHERE email = ? LIMIT 1
    `;

    db.get(checkEmailQuery, [email], (err, existingUser) => {
        if (err) {
            console.error('❌ Erro ao verificar email:', err);
            return res.status(500).json({
                success: false, error: 'Erro interno do servidor'
            });
        }

        if (existingUser && existingUser.liberacao === 1) {
            console.log('❌ Email já está em uso por conta ativa:', email);
            return res.status(400).json({
                success: false, error: 'Este email já está cadastrado'
            });
        }

        if (existingUser && existingUser.liberacao === 0) {
            console.log('🔄 Reutilizando conta desativada para:', email);

            const hashedPassword = bcrypt.hashSync(senha, 10);

            db.run('UPDATE usuarios SET senha = ?, liberacao = 1, mudaSenha = 0 WHERE id = ?', [hashedPassword, existingUser.id], function (err) {
                if (err) {
                    console.error('❌ Erro ao reativar conta:', err);
                    return res.status(500).json({
                        success: false, error: 'Erro ao criar conta'
                    });
                }

                db.run('INSERT OR REPLACE INTO perfis (userID, nome, contato) VALUES (?, ?, ?)', [existingUser.id, nome, contato], function (err) {
                    if (err) {
                        console.error('❌ Erro ao criar perfil:', err);
                        return res.status(500).json({
                            success: false, error: 'Erro ao criar perfil'
                        });
                    }

                    console.log('🎉 Conta reativada com sucesso:', email);

                    res.status(201).json({
                        success: true,
                        message: 'Conta criada com sucesso! Faça login para continuar.',
                        userId: existingUser.id
                    });
                });
            });
        } else {
            console.log('🆕 Criando nova conta para:', email);

            const hashedPassword = bcrypt.hashSync(senha, 10);

            db.run('INSERT INTO usuarios (email, senha, tipoUsuario, liberacao) VALUES (?, ?, 0, 1)', [email, hashedPassword], function (err) {
                if (err) {
                    console.error('❌ Erro ao criar usuário:', err);
                    return res.status(500).json({
                        success: false, error: 'Erro ao criar usuário'
                    });
                }

                const userId = this.lastID;
                console.log('✅ Usuário criado com ID:', userId);

                db.run('INSERT INTO perfis (userID, nome, contato) VALUES (?, ?, ?)', [userId, nome, contato], function (err) {
                    if (err) {
                        console.error('❌ Erro ao criar perfil:', err);
                        return res.status(500).json({
                            success: false, error: 'Erro ao criar perfil'
                        });
                    }

                    console.log('✅ Perfil criado para usuário:', userId);

                    res.status(201).json({
                        success: true, message: 'Conta criada com sucesso! Faça login para continuar.', userId: userId
                    });

                    console.log('🎉 Cadastro concluído com sucesso para:', email);
                });
            });
        }
    });
});

router.post('/validate-token', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.json({valid: false});
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.json({valid: false});
        }

        const userId = decoded.id;

        const query = `
            SELECT u.id, u.email, u.tipoUsuario, u.liberacao, p.nome, p.contato
            FROM usuarios u
                     LEFT JOIN perfis p ON u.id = p.userID
            WHERE u.id = ?
              AND u.liberacao = 1
        `;

        db.get(query, [userId], (err, user) => {
            if (err || !user) {
                return res.json({valid: false});
            }

            res.json({
                valid: true, user: {
                    id: user.id,
                    email: user.email,
                    nome: user.nome,
                    contato: user.contato,
                    tipoUsuario: user.tipoUsuario
                }
            });
        });
    });
});

router.put('/change-password', async (req, res) => {
    try {
        console.log('=== TENTATIVA DE ALTERAÇÃO DE SENHA ===');

        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            return res.status(401).json({success: false, error: 'Token ausente'});
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(401).json({success: false, error: 'Token inválido'});
        }

        const userId = decoded.id;
        console.log('✅ Token válido para userId:', userId);

        if (!userId) {
            return res.status(401).json({success: false, error: 'Token inválido: ID não encontrado'});
        }

        const {oldPassword, newPassword} = req.body || {};
        if (!oldPassword || !newPassword) {
            return res.status(400).json({success: false, error: 'Senha atual e nova senha são obrigatórias'});
        }

        if (newPassword.length < 6) {
            return res.status(400).json({success: false, error: 'A nova senha deve ter pelo menos 6 caracteres'});
        }

        const row = await new Promise((resolve, reject) => {
            db.get('SELECT senha FROM usuarios WHERE id = ? AND liberacao = 1', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!row) {
            console.log('❌ Usuário não encontrado ou conta inativa');
            return res.status(404).json({success: false, error: 'Usuário não encontrado'});
        }

        console.log('👤 Usuário encontrado para alteração de senha');

        const isOldPasswordValid = bcrypt.compareSync(oldPassword, row.senha);
        if (!isOldPasswordValid) {
            console.log('❌ Senha atual incorreta');
            return res.status(400).json({success: false, error: 'Senha atual incorreta'});
        }

        console.log('✅ Senha atual válida');

        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

        await new Promise((resolve, reject) => {
            db.run('UPDATE usuarios SET senha = ? WHERE id = ?', [hashedNewPassword, userId], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ Senha alterada com sucesso para usuário ID:', userId);

        return res.json({
            success: true,
            message: 'Senha alterada com sucesso'
        });

    } catch (err) {
        console.error('💥 Erro no servidor (change-password):', err);
        return res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

router.delete('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({success: false, error: 'Token ausente'});

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch {
            return res.status(401).json({success: false, error: 'Token inválido'});
        }

        const userId = decoded.id;

        await new Promise((resolve, reject) => {
            db.run('UPDATE usuarios SET liberacao = 0 WHERE id = ?', [userId], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise((resolve, reject) => {
            db.run('DELETE FROM refresh_tokens WHERE userID = ?', [userId], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        return res.json({success: true});
    } catch (err) {
        console.error('💥 Erro ao excluir conta:', err);
        return res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const {email} = req.body || {};
        if (!email) {
            return res.status(400).json({success: false, error: 'E-mail é obrigatório'});
        }

        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Sempre responda sucesso para não expor e-mails
        if (!user) {
            return res.json({
                success: true,
                message: 'Se o e-mail existir, enviaremos instruções.'
            });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30) // 30min
            .toISOString().replace('T', ' ').slice(0, 19);

        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO password_resets (userID, token, expiresAt)
                 VALUES (?, ?, ?)`,
                [user.id, token, expiresAt],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Você pode enviar por e-mail. Aqui devolvemos o token para testes.
        res.json({
            success: true,
            message: 'Se o e-mail existir, enviaremos instruções.',
            debugToken: process.env.NODE_ENV === 'production' ? undefined : token
        });
    } catch (error) {
        console.error('💥 Erro em forgot-password:', error);
        res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const {token, newPassword} = req.body || {};
        if (!token || !newPassword) {
            return res.status(400).json({success: false, error: 'Token e nova senha são obrigatórios'});
        }

        const reset = await new Promise((resolve, reject) => {
            db.get(
                `SELECT pr.id, pr.userID, pr.expiresAt, pr.usedAt, u.id as uid
                 FROM password_resets pr
                          JOIN usuarios u ON u.id = pr.userID
                 WHERE pr.token = ?`,
                [token],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!reset || reset.usedAt) {
            return res.status(400).json({success: false, error: 'Token inválido ou já utilizado'});
        }

        const isExpired = new Date(reset.expiresAt) < new Date();
        if (isExpired) {
            return res.status(400).json({success: false, error: 'Token expirado'});
        }

        const hash = await bcrypt.hash(newPassword, 10);

        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE usuarios
                 SET senha = ?,
                     mudaSenha = 0
                 WHERE id = ?`,
                [hash, reset.userID],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        const usedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE password_resets
                 SET usedAt = ?
                 WHERE id = ?`,
                [usedAt, reset.id],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({success: true, message: 'Senha redefinida com sucesso.'});
    } catch (error) {
        console.error('💥 Erro em reset-password:', error);
        res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

module.exports = router;