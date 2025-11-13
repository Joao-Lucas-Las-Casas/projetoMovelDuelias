import api, {setAuthToken} from '../config/api';

export const authService = {
    async login({email, senha}) {
        const {data} = await api.post('/auth/login', {email, senha});
        const token = data.token || data.accessToken;
        return {success: !!(data?.success && token), data, token};
    },

    async register({nome, email, contato, senha}) {
        const {data} = await api.post('/auth/register', {nome, email, contato, senha});
        return {success: !!data?.success, data};
    },

    async forgotPassword(email) {
        const {data} = await api.post('/auth/forgot-password', {email});
        return {success: !!data?.success, data};
    },

    async resetPassword(token, newPassword) {
        const {data} = await api.post('/auth/reset-password', {token, newPassword});
        return {success: !!data?.success, data};
    },

    async changePassword(oldPassword, newPassword) {
        const {data} = await api.put('/auth/change-password', {oldPassword, newPassword});
        return {success: !!data?.success, data};
    },

    async validateToken() {
        const {data} = await api.post('/auth/validate-token');
        return data;
    },

    clearAuthHeader() {
        setAuthToken(null);
    }
};

export default authService;
