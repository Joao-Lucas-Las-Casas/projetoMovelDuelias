const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'duelias_barbearia_jwt_secret_key_2024';

function getToken(req) {
    const h = req.headers;
    const fromBearer = h.authorization || h.Authorization;
    if (fromBearer && fromBearer.startsWith('Bearer ')) {
        return fromBearer.slice(7);
    }
    return h['x-access-token'] || null;
}

function requireAuth(req, res, next) {
    try {
        const token = getToken(req);
        if (!token) {
            const err = new Error('Não autenticado');
            err.status = 401;
            err.expose = true;
            throw err;
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Verificar se usuário está bloqueado
        if (req.user.liberacao === 0) {
            return res.status(403).json({error: 'Usuário bloqueado'});
        }

        next();
    } catch (e) {
        e.status = e.status || 401;
        e.expose = true;
        next(e);
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || Number(req.user.tipoUsuario) !== 1) {
        return res.status(403).json({error: 'Acesso negado. Apenas administradores.'});
    }
    next();
}

module.exports = {requireAuth, requireAdmin};