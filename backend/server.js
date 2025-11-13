require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const db = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'duelias_barbearia_jwt_secret_key_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'duelias_barbearia_refresh_secret_key_2024';

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, {recursive: true});
}

(async () => {
    try {
        const migrateBarbers = require('./database/migrateBarbers');
        await migrateBarbers();
        console.log('✅ migrateBarbers executado');
    } catch (e) {
        console.warn('⚠️ Não foi possível executar migrateBarbers:', e.message);
    }
})().catch(() => {
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
    storage,
    limits: {fileSize: 5 * 1024 * 1024},
    fileFilter: (req, file, cb) =>
        file.mimetype.startsWith('image/')
            ? cb(null, true)
            : cb(new Error('Apenas imagens são permitidas'), false)
});

app.use(cors({origin: '*', credentials: true}));
app.use(express.json({limit: '1mb'}));
app.use('/uploads', express.static('uploads'));
app.use('/api/local-images', express.static(path.join(__dirname, '../frontend/DueliasApp/src/assets')));

app.use((req, _res, next) => {
    console.log(`📨 ${req.method} ${req.path}`, {
        contentType: req.get('Content-Type'),
        userAgent: req.get('User-Agent')?.substring(0, 80),
        ts: new Date().toISOString(),
    });
    next();
});

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {error: 'Muitas tentativas de login. Tente novamente em 1 minuto.'},
    standardHeaders: true,
    legacyHeaders: false,
});

const {requireAuth, requireAdmin} = require('./middlewares/auth-middleware');

app.get('/api/health', (_req, res) => {
    res.json({success: true, message: 'Servidor está funcionando!', timestamp: new Date().toISOString()});
});

app.use('/api/auth', require('./routes/auth'));

const validateLoginBody = (req, res, next) => {
    const {email, senha} = req.body;
    if (!email || !senha) return res.status(400).json({error: 'E-mail e senha são obrigatórios'});
    if (typeof email !== 'string' || typeof senha !== 'string')
        return res.status(400).json({error: 'E-mail e senha devem ser strings'});
    if (email.length > 255 || senha.length > 255)
        return res.status(400).json({error: 'E-mail ou senha muito longos'});
    next();
};

app.post('/api/login', loginLimiter, validateLoginBody, async (req, res) => {
    try {
        const {email, senha} = req.body;

        const user = await db.getAsync('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (!user) return res.status(401).json({error: 'Credenciais inválidas'});

        const ok = await bcrypt.compare(senha, user.senha);
        if (!ok) return res.status(401).json({error: 'Credenciais inválidas'});

        const payload = {id: user.id, email: user.email, tipoUsuario: user.tipoUsuario};
        const accessToken = jwt.sign(payload, JWT_SECRET, {expiresIn: '2h'});
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {expiresIn: '30d'});

        const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000)
            .toISOString().slice(0, 19).replace('T', ' ');

        await db.runAsync(
            'INSERT INTO refresh_tokens (userID, token, expiresAt) VALUES (?, ?, ?)',
            [user.id, refreshToken, expiresAt]
        );

        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: {id: user.id, email: user.email, tipoUsuario: user.tipoUsuario}
        });
    } catch (error) {
        console.error('💥 Erro crítico no login:', error);
        res.status(500).json({error: 'Erro interno do servidor'});
    }
});

app.post('/api/auth/refresh', async (req, res) => {
    try {
        const {refreshToken} = req.body || {};
        if (!refreshToken) return res.status(400).json({error: 'Refresh token é obrigatório'});

        const record = await db.getAsync('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);
        if (!record) return res.status(403).json({error: 'Refresh token inválido'});

        jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({error: 'Refresh token inválido'});
            const payload = {id: decoded.id, email: decoded.email, tipoUsuario: decoded.tipoUsuario};
            const accessToken = jwt.sign(payload, JWT_SECRET, {expiresIn: '2h'});
            res.json({success: true, accessToken});
        });
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        res.status(500).json({error: 'Erro interno do servidor'});
    }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        const {refreshToken} = req.body || {};
        if (refreshToken) await db.runAsync('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
        res.json({success: true, message: 'Logout realizado com sucesso'});
    } catch {
        res.json({success: true, message: 'Logout realizado'});
    }
});

app.get('/api/auth/validate', requireAuth, (req, res) => {
    res.json({success: true, user: req.user});
});

console.log('🔄 Carregando rotas modulares...');

app.use('/api/services', require('./routes/services'));
app.use('/api/barbers', require('./routes/barbers'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/establishments', require('./routes/establishments'));

console.log('✅ Todas as rotas modulares carregadas');

app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const row = await db.getAsync(`
            SELECT u.id, u.email, u.tipoUsuario, u.mudaSenha, p.nome, p.contato, p.foto
            FROM usuarios u
            LEFT JOIN perfis p ON u.id = p.userID
            WHERE u.id = ?
        `, [userId]);

        if (!row) return res.status(404).json({error: 'Usuário não encontrado'});

        res.json({
            success: true,
            user: {
                id: row.id,
                email: row.email,
                nome: row.nome,
                contato: row.contato,
                tipoUsuario: row.tipoUsuario,
                mudaSenha: row.mudaSenha,
                foto: row.foto
            }
        });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({error: 'Erro ao buscar perfil'});
    }
});

app.put('/api/profile', requireAuth, upload.single('foto'), async (req, res) => {
    try {
        const userId = req.user.id;
        const {nome, contato} = req.body;
        const foto = req.file ? `/uploads/${req.file.filename}` : undefined;

        await db.runAsync(
            `INSERT OR REPLACE INTO perfis (userID, nome, contato, foto) VALUES (?, ?, ?, ?)`,
            [userId, nome, contato, foto]
        );

        res.json({success: true, message: 'Perfil atualizado com sucesso'});
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({error: 'Erro ao atualizar perfil'});
    }
});

app.use((req, res) => {
    res.status(404).json({success: false, error: 'Endpoint não encontrado'});
});

app.use((err, req, res, next) => {
    console.error('💥 Erro:', err.message);
    console.error('📋 Stack:', err.stack);

    const status = err.status || 500;
    const message = err.expose ? err.message : 'Erro interno do servidor';

    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {stack: err.stack})
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`✂️  Serviços: http://localhost:${PORT}/api/services`);
    console.log(`💈 Barbeiros: http://localhost:${PORT}/api/barbers`);
    console.log(`📅 Agendamentos: http://localhost:${PORT}/api/appointments`);
    console.log(`👥 Usuários: http://localhost:${PORT}/api/users`);
    console.log(`🏢 Estabelecimentos: http://localhost:${PORT}/api/establishments`);
});