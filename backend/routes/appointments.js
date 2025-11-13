const express = require('express');
const router = express.Router();
const db = require('../database/database');

const {requireAuth, requireAdmin} = require('../middlewares/auth-middleware');

router.use(requireAuth);

router.get('/admin/appointments', requireAdmin, async (req, res) => {
    try {
        console.log('📋 Buscando agendamentos para admin');

        const sql = `
            SELECT a.id,
                   a.userID                              AS userId,
                   a.barberId,
                   a.servicoID                           AS serviceId,
                   STRFTIME('%Y-%m-%d %H:%M:%S', a.data) AS dateTime,
                   CASE
                       WHEN LOWER(a.status) IN ('cancelado', 'canceled') THEN 'cancelado'
                       WHEN LOWER(a.status) IN ('finalizado', 'finalized') THEN 'finalizado'
                       WHEN datetime(a.data) <= datetime('now', 'localtime') THEN 'finalizado'
                       ELSE 'agendado'
                       END                               AS status,
                   a.observacoes,
                   a.createdAt                           as created_at,
                   s.nome                                AS servicoNome,
                   s.preco                               AS servicoPreco,
                   s.duracao                             AS servicoDuracao,
                   b.nome                                AS barbeiroNome,
                   b.foto                                AS barbeiroFoto,
                   COALESCE(p.nome, u.email)             AS clienteNome,
                   u.email                               AS clienteEmail
            FROM agendamentos a
                     JOIN servicos s ON a.servicoID = s.id
                     JOIN usuarios u ON a.userID = u.id
                     LEFT JOIN (SELECT userID, MAX(nome) AS nome
                                FROM perfis
                                GROUP BY userID) p ON p.userID = u.id
                     LEFT JOIN barbeiros b ON a.barberId = b.id
            ORDER BY a.data DESC
        `;

        const rows = await db.allAsync(sql);
        console.log(`✅ Encontrados ${rows.length} agendamentos para admin`);
        return res.json({success: true, appointments: rows});
    } catch (err) {
        console.error('❌ GET /admin/appointments:', err);
        return res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

router.put('/admin/appointments/:id', requireAdmin, async (req, res) => {
    try {
        const {id} = req.params;
        const {status} = req.body;

        await db.runAsync(
            `UPDATE agendamentos SET status = ? WHERE id = ?`,
            [status, id]
        );

        return res.json({success: true, message: 'Status atualizado com sucesso'});
    } catch (err) {
        console.error('❌ PUT /admin/appointments/:id:', err);
        return res.status(500).json({success: false, error: 'Erro ao atualizar agendamento'});
    }
});

router.put('/admin/:id/status', requireAdmin, async (req, res) => {
    try {
        const {id} = req.params;
        const {status} = req.body;

        console.log(`🔄 Atualizando status do agendamento ${id} para: ${status}`);

        if (!status) {
            return res.status(400).json({success: false, error: 'Status é obrigatório'});
        }

        const existing = await db.getAsync(
            `SELECT id
             FROM agendamentos
             WHERE id = ?`,
            [id]
        );

        if (!existing) {
            return res.status(404).json({success: false, error: 'Agendamento não encontrado'});
        }

        await db.runAsync(
            `UPDATE agendamentos SET status = ? WHERE id = ?`,
            [status, id]
        );

        console.log(`✅ Status do agendamento ${id} atualizado para: ${status}`);

        return res.json({
            success: true,
            message: 'Status atualizado com sucesso',
            appointment: {id, status}
        });

    } catch (err) {
        console.error('❌ PUT /admin/:id/status:', err);
        return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar status do agendamento'
        });
    }
});

router.delete('/admin/appointments/:id', requireAdmin, async (req, res) => {
    try {
        const {id} = req.params;

        await db.runAsync(`DELETE
                           FROM agendamentos
                           WHERE id = ?`, [id]);
        return res.json({success: true, message: 'Agendamento excluído com sucesso'});
    } catch (err) {
        console.error('❌ DELETE /admin/appointments/:id:', err);
        return res.status(500).json({success: false, error: 'Erro ao excluir agendamento'});
    }
});

router.get('/', async (req, res) => {
    try {
        const isAdmin = (req.user?.tipoUsuario === 1 || req.user?.tipoUsuario === '1');

        const SELECT_BASE = `
          SELECT 
            a.id,
            a.userID as userId,
            a.barberId,
            a.servicoID as serviceId,
            a.data as dateTime,
            a.status,
            a.observacoes,
            s.nome as servicoNome,
            s.preco as servicoPreco,
            b.nome as barbeiroNome
          FROM agendamentos a
          LEFT JOIN servicos s ON a.servicoID = s.id
          LEFT JOIN barbeiros b ON a.barberId = b.id
        `;

        const rows = isAdmin
            ? await db.allAsync(`${SELECT_BASE} ORDER BY a.data DESC`)
            : await db.allAsync(`${SELECT_BASE} WHERE a.userID = ? ORDER BY a.data DESC`, [req.user.id]);

        return res.json({success: true, appointments: rows});
    } catch (err) {
        console.error('❌ GET /appointments:', err);
        return res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

router.get('/user/:userId', async (req, res) => {
    try {
        const {userId} = req.params;
        const isAdmin = (req.user?.tipoUsuario === 1 || req.user?.tipoUsuario === '1');

        if (!isAdmin && String(req.user.id) !== String(userId)) {
            return res.status(403).json({success: false, error: 'Acesso negado'});
        }

        const SELECT_BASE = `
            SELECT a.id,
                   a.userID    as userId,
                   a.barberId,
                   a.servicoID as serviceId,
                   a.data      as dateTime,
                   a.status,
                   a.observacoes,
                   s.nome      as servicoNome,
                   s.preco     as servicoPreco,
                   b.nome      as barbeiroNome
            FROM agendamentos a
                     LEFT JOIN servicos s ON a.servicoID = s.id
                     LEFT JOIN barbeiros b ON a.barberId = b.id
        `;

        const rows = await db.allAsync(
            `${SELECT_BASE} WHERE a.userID = ? ORDER BY a.data DESC`,
            [userId]
        );
        return res.json({success: true, appointments: rows});
    } catch (err) {
        console.error('❌ GET /appointments/user/:userId:', err);
        return res.status(500).json({success: false, error: 'Erro interno do servidor'});
    }
});

router.get('/available-slots', async (req, res) => {
    try {
        const {serviceId, date, barberId} = req.query;

        console.log('📅 Buscando horários disponíveis:', {serviceId, date, barberId});

        if (!serviceId || !date) {
            return res.status(400).json({
                success: false,
                error: 'serviceId e date são obrigatórios'
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Formato de data inválido. Use YYYY-MM-DD'
            });
        }

        let query = `
            SELECT data
            FROM agendamentos
            WHERE DATE (data) = ?
              AND status NOT IN ('cancelado'
                , 'canceled')
        `;
        let params = [date];

        if (barberId) {
            query += ' AND barberId = ?';
            params.push(barberId);
        }

        const existingAppointments = await db.allAsync(query, params);

        const occupiedSlots = existingAppointments.map(apt => {
            const dateObj = new Date(apt.data);
            return dateObj.toTimeString().slice(0, 5);
        });

        const allSlots = [];
        const startHour = 9, endHour = 18;

        for (let hour = startHour; hour <= endHour; hour++) {
            for (const minute of ['00', '30']) {
                if (hour === endHour && minute === '30') {
                    allSlots.push('18:30');
                    break;
                }
                const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
                allSlots.push(timeString);
            }
        }

        const availableSlots = allSlots.filter(slot => !occupiedSlots.includes(slot));

        console.log('✅ Horários disponíveis encontrados:', availableSlots.length);
        console.log('📊 Ocupados:', occupiedSlots);

        return res.json({
            success: true,
            availableSlots: availableSlots,
            serviceId,
            date,
            barberId,
            occupied: occupiedSlots,
            totalAvailable: availableSlots.length
        });

    } catch (err) {
        console.error('❌ GET /appointments/available-slots:', err);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar horários disponíveis'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            userId,
            barberId,
            serviceId,
            date,
            time,
            observacoes = '',
            status = 'agendado'
        } = req.body;

        const ownerId = userId ?? req.user.id;

        if (!serviceId || !date || !time) {
            return res.status(400).json({success: false, error: 'Serviço, data e horário são obrigatórios'});
        }

        const dateTime = `${date} ${time}:00`;

        const now = new Date();
        const when = new Date(dateTime.replace(' ', 'T'));
        if (when < now) {
            return res.status(400).json({
                success: false,
                error: 'Não é possível agendar no passado'
            });
        }

        const conflict = await db.getAsync(
            `SELECT id FROM agendamentos WHERE barberId = ? AND data = ?`,
            [barberId, dateTime]
        );
        if (conflict) {
            return res.status(409).json({
                success: false,
                error: 'Horário já reservado para este barbeiro'
            });
        }

        const result = await db.runAsync(
            `INSERT INTO agendamentos (userID, barberId, servicoID, data, status, observacoes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ownerId, barberId, serviceId, dateTime, status, observacoes]
        );

        const [newAppointment] = await db.allAsync(`
            SELECT a.id,
                   a.userID    as userId,
                   a.barberId,
                   a.servicoID as serviceId,
                   a.data      as dateTime,
                   a.status,
                   a.observacoes,
                   s.nome      as servicoNome,
                   s.preco     as servicoPreco,
                   b.nome      as barbeiroNome
            FROM agendamentos a
                     LEFT JOIN servicos s ON a.servicoID = s.id
                     LEFT JOIN barbeiros b ON a.barberId = b.id
            WHERE a.id = ?
        `, [result.lastID]);

        return res.json({
            success: true,
            id: result.lastID,
            appointment: newAppointment
        });
    } catch (err) {
        console.error('❌ POST /appointments:', err);
        return res.status(500).json({success: false, error: 'Erro ao criar agendamento'});
    }
});

router.put('/:id/cancel', async (req, res) => {
    try {
        const {id} = req.params;
        const isAdmin = (req.user?.tipoUsuario === 1 || req.user?.tipoUsuario === '1');

        if (!isAdmin) {
            const row = await db.getAsync(`SELECT userID FROM agendamentos WHERE id = ?`, [id]);
            if (!row) return res.status(404).json({success: false, error: 'Agendamento não encontrado'});
            if (String(row.userID) !== String(req.user.id)) {
                return res.status(403).json({success: false, error: 'Acesso negado'});
            }
        }

        await db.runAsync(
            `UPDATE agendamentos
             SET status = 'cancelado'
             WHERE id = ?`,
            [id]
        );

        return res.json({success: true, message: 'Agendamento cancelado com sucesso'});
    } catch (err) {
        console.error('❌ PUT /appointments/:id/cancel:', err);
        return res.status(500).json({success: false, error: 'Erro ao cancelar agendamento'});
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const {id} = req.params;
        const {status} = req.body;

        if (!status) {
            return res.status(400).json({success: false, error: 'Status é obrigatório'});
        }

        await db.runAsync(
            `UPDATE agendamentos
             SET status = ?
             WHERE id = ?`,
            [status, id]
        );

        return res.json({success: true, message: 'Status atualizado com sucesso'});
    } catch (err) {
        console.error('❌ PUT /appointments/:id/status:', err);
        return res.status(500).json({success: false, error: 'Erro ao atualizar status'});
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {id} = req.params;
        const isAdmin = (req.user?.tipoUsuario === 1 || req.user?.tipoUsuario === '1');

        if (!isAdmin) {
            const row = await db.getAsync(`SELECT userID
                                           FROM agendamentos
                                           WHERE id = ?`, [id]);
            if (!row) return res.status(404).json({success: false, error: 'Agendamento não encontrado'});
            if (String(row.userID) !== String(req.user.id)) {
                return res.status(403).json({success: false, error: 'Acesso negado'});
            }
        }

        const {barberId, serviceId, date, time, status, observacoes} = req.body;

        let dateTime = null;
        if (date && time) {
            dateTime = `${date} ${time}:00`;
        }

        await db.runAsync(
            `UPDATE agendamentos
             SET barberId    = COALESCE(?, barberId),
                 servicoID   = COALESCE(?, servicoID),
                 data        = COALESCE(?, data),
                 status      = COALESCE(?, status),
                 observacoes = COALESCE(?, observacoes)
             WHERE id = ?`,
            [barberId, serviceId, dateTime, status, observacoes, id]
        );

        return res.json({success: true});
    } catch (err) {
        console.error('❌ PUT /appointments/:id:', err);
        return res.status(500).json({success: false, error: 'Erro ao atualizar agendamento'});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const {id} = req.params;
        const isAdmin = (req.user?.tipoUsuario === 1 || req.user?.tipoUsuario === '1');

        if (!isAdmin) {
            const row = await db.getAsync(`SELECT userID
                                           FROM agendamentos
                                           WHERE id = ?`, [id]);
            if (!row) return res.status(404).json({success: false, error: 'Agendamento não encontrado'});
            if (String(row.userID) !== String(req.user.id)) {
                return res.status(403).json({success: false, error: 'Acesso negado'});
            }
        }

        await db.runAsync(`DELETE
                           FROM agendamentos
                           WHERE id = ?`, [id]);
        return res.json({success: true});
    } catch (err) {
        console.error('❌ DELETE /appointments/:id:', err);
        return res.status(500).json({success: false, error: 'Erro ao excluir agendamento'});
    }
});

module.exports = router;