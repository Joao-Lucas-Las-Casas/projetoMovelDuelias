import api from '../config/api';

const listeners = new Set();
export const ServicesEvents = {
    on(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
    emit(payload) {
        listeners.forEach((fn) => {
            try {
                fn(payload);
            } catch {
            }
        });
    },
};

export const serviceService = {
    getServices: async () => {
        try {
            console.log('✂️ Buscando serviços...');
            const response = await api.get('/services');

            const services = response.data?.services || [];
            console.log(`✅ ${services.length} serviços carregados`);

            return {
                success: true,
                services: services,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao buscar serviços:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao carregar serviços',
                services: []
            };
        }
    },

    create: async (serviceData) => {
        try {
            console.log('➕ Criando serviço:', serviceData);

            const payload = {
                nome: serviceData.nome,
                descricao: serviceData.descricao || '',
                preco: serviceData.preco,
                duracao: serviceData.duracao,
                duracaoMin: serviceData.duracao,
                icone: serviceData.icone || 'cut'
            };

            const response = await api.post('/services/admin', payload);
            ServicesEvents.emit({type: 'changed'});

            return {
                success: true,
                service: response.data?.service || response.data,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao criar serviço:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao criar serviço'
            };
        }
    },

    update: async (serviceId, serviceData) => {
        try {
            console.log('✏️ Atualizando serviço:', serviceId, serviceData);

            const payload = {
                nome: serviceData.nome,
                descricao: serviceData.descricao || '',
                preco: serviceData.preco,
                duracao: serviceData.duracao,
                duracaoMin: serviceData.duracao,
                icone: serviceData.icone || 'cut'
            };

            const response = await api.put(`/services/admin/${serviceId}`, payload);
            ServicesEvents.emit({type: 'changed'});

            return {
                success: true,
                service: response.data?.service || response.data,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao atualizar serviço:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao atualizar serviço'
            };
        }
    },

    remove: async (serviceId) => {
        try {
            console.log('🗑️ Excluindo serviço:', serviceId);
            const response = await api.delete(`/services/admin/${serviceId}`);
            ServicesEvents.emit({type: 'changed'});

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Erro ao excluir serviço:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao excluir serviço'
            };
        }
    }
};

export default serviceService;