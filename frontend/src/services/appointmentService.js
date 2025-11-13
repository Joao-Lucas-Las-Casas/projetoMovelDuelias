import api from '../config/api';

export const appointmentService = {
    async createAppointment(appointmentData) {
        try {
            console.log('➕ Criando agendamento:', appointmentData);
            const response = await api.post('/appointments', appointmentData);

            return {
                success: true,
                appointment: response.data?.appointment || response.data,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao criar agendamento:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao criar agendamento'
            };
        }
    },

    async getUserAppointments(userId = 0) {
        try {
            console.log('📅 Buscando agendamentos para usuário:', userId);

            let response;
            if (userId > 0) {
                response = await api.get(`/appointments/user/${userId}`);
            } else {
                response = await api.get('/appointments');
            }

            return {
                success: true,
                appointments: response.data?.appointments || [],
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao buscar agendamentos:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao carregar agendamentos',
                appointments: []
            };
        }
    },

    async getAllAppointments() {
        try {
            console.log('📅 Buscando todos os agendamentos');
            const response = await api.get('/appointments');

            return {
                success: true,
                appointments: response.data?.appointments || [],
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao buscar todos os agendamentos:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao carregar agendamentos',
                appointments: []
            };
        }
    },

    async getAdminAppointments() {
        try {
            console.log('📋 Buscando agendamentos para admin');
            const {data} = await api.get('/appointments/admin/appointments');
            return data?.appointments || [];
        } catch (error) {
            console.error('❌ Erro ao buscar agendamentos admin:', error);
            throw error;
        }
    },

    async adminUpdateStatus(id, status) {
        try {
            console.log('✏️ Atualizando status do agendamento:', id, status);
            const {data} = await api.put(`/appointments/admin/${id}/status`, {status});
            return data;
        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error);
            throw error;
        }
    },

    async adminDelete(id) {
        try {
            console.log('🗑️ Excluindo agendamento admin:', id);
            const {data} = await api.delete(`/appointments/admin/appointments/${id}`);
            return data;
        } catch (error) {
            console.error('❌ Erro ao excluir agendamento:', error);
            throw error;
        }
    },

    async cancelAppointment(appointmentId) {
        try {
            console.log('❌ Cancelando agendamento:', appointmentId);
            const response = await api.put(`/appointments/${appointmentId}/cancel`);

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao cancelar agendamento:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao cancelar agendamento'
            };
        }
    },

    async deleteAppointment(appointmentId) {
        try {
            console.log('🗑️ Excluindo agendamento:', appointmentId);
            const response = await api.delete(`/appointments/${appointmentId}`);

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao excluir agendamento:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao excluir agendamento'
            };
        }
    },

    async getAvailableSlots(serviceId, date, barberId = null) {
        try {
            console.log('🕒 Buscando horários disponíveis:', {serviceId, date, barberId});

            const params = {serviceId, date};
            if (barberId) {
                params.barberId = barberId;
            }

            const response = await api.get(`/appointments/available-slots`, {
                params: params
            });

            return {
                success: true,
                slots: response.data?.slots || [],
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao buscar horários disponíveis:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao buscar horários disponíveis',
                slots: []
            };
        }
    }
};

export default appointmentService;