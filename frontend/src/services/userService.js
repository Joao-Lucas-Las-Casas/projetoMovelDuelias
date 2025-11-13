import api from '../config/api';

export const userService = {
    async getAll() {
        console.log('GET /users/admin');
        try {
            const {data} = await api.get('/users/admin');
            return data?.users ?? [];
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            throw error;
        }
    },

    async update(id, payload) {
        console.log(`PUT /users/admin/${id}`, payload);
        try {
            const {data} = await api.put(`/users/admin/${id}`, payload);
            return data;
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    },

    async setPassword(id, novaSenha) {
        console.log(`PUT /users/admin/${id}/password`);
        try {
            const {data} = await api.put(`/users/admin/${id}/password`, {novaSenha});
            return data;
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            throw error;
        }
    },

    async getMe() {
        console.log('GET /users/me');
        try {
            const {data} = await api.get('/users/me');
            return data?.user ?? null;
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            throw error;
        }
    },

    async updateMe(payload) {
        console.log('PUT /users/me', payload);
        try {
            const {data} = await api.put('/users/me', payload);
            return data?.user ?? null;
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    },

    async setRole(id, tipoUsuario) {
        console.log(`Definindo role ${tipoUsuario} para usuário ${id}`);
        try {
            const {data} = await api.put(`/users/admin/${id}`, {
                tipoUsuario,
                liberacao: 1,
                mudaSenha: 0
            });
            return data;
        } catch (error) {
            console.error('Erro ao alterar role do usuário:', error);
            throw error;
        }
    },

    async toggleBlock(id, liberacao) {
        console.log(`${liberacao ? 'Desbloqueando' : 'Bloqueando'} usuário ${id}`);
        try {
            const {data} = await api.put(`/users/admin/${id}`, {
                liberacao,
                mudaSenha: 0,
                tipoUsuario: 0
            });
            return data;
        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            throw error;
        }
    }
};