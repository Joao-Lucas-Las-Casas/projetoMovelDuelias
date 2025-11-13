import api from '../config/api';

class BarberEventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);

        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in barber event listener for ${event}:`, error);
                }
            });
        }
    }

    removeAllListeners(event) {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
}

export const BarbersEvents = new BarberEventEmitter();

export const barberService = {
    getBarbers: async () => {
        try {
            console.log('👨 Buscando barbeiros');
            const response = await api.get('/barbers');

            const barbersData = response.data?.data || response.data?.barbers || response.data || [];

            return {
                success: true,
                data: Array.isArray(barbersData) ? barbersData : [],
                barbers: Array.isArray(barbersData) ? barbersData : []
            };
        } catch (error) {
            console.error('❌ Erro ao buscar barbeiros:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao carregar barbeiros',
                data: [],
                barbers: []
            };
        }
    },

    create: async (barberData) => {
        try {
            console.log('➕ Criando barbeiro:', barberData);
            const response = await api.post('/barbers/admin', barberData);
            BarbersEvents.emit('changed');

            return {
                success: true,
                data: response.data?.data || response.data,
                barber: response.data?.data || response.data
            };
        } catch (error) {
            console.error('❌ Erro ao criar barbeiro:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao criar barbeiro'
            };
        }
    },

    update: async (barberId, barberData) => {
        try {
            console.log('✏️ Atualizando barbeiro:', barberId, barberData);
            const response = await api.put(`/barbers/admin/${barberId}`, barberData);
            BarbersEvents.emit('changed');

            return {
                success: true,
                data: response.data?.data || response.data,
                barber: response.data?.data || response.data
            };
        } catch (error) {
            console.error('❌ Erro ao atualizar barbeiro:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao atualizar barbeiro'
            };
        }
    },

    remove: async (barberId) => {
        try {
            console.log('🗑️ Excluindo barbeiro:', barberId);
            const response = await api.delete(`/barbers/admin/${barberId}`);
            BarbersEvents.emit('changed');

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao excluir barbeiro:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao excluir barbeiro'
            };
        }
    }
};

export default barberService;