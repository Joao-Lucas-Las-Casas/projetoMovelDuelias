import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseURL = () => {
    if (__DEV__) {
        return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

let isRedirecting = false;

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('🔑 Token definido nos headers');
    } else {
        delete api.defaults.headers.common['Authorization'];
        console.log('🔑 Token removido dos headers');
    }
};

api.interceptors.request.use(
    async (config) => {
        try {
            console.log(`🌐 Fazendo requisição: ${config.method?.toUpperCase()} ${config.url}`);
            const token = await AsyncStorage.getItem('@accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log('🔑 Token adicionado à requisição:', token.substring(0, 20) + '...'); // Log parcial do token
            } else {
                console.log('⚠️ Nenhum token encontrado para a requisição');
            }
        } catch (error) {
            console.warn('❌ Erro ao adicionar token:', error);
        }
        return config;
    },
    (error) => {
        console.log('❌ Erro na configuração da requisição:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        console.log(`✅ Resposta recebida: ${response.status} ${response.config.url}`);
        return response;
    },
    async (error) => {
        console.log('❌ Erro na API:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            code: error.code
        });

        if (error.message === 'Network Error') {
            console.log('🌐 ERRO DE REDE: Verifique:');
            console.log('1. Backend está rodando?');
            console.log('2. URL correta?', api.defaults.baseURL);
            console.log('3. Servidor acessível?');
        }

        if (error.response?.status === 401 && !isRedirecting) {
            isRedirecting = true;
            console.log('🔐 Token expirado ou inválido - limpando dados locais');

            try {
                const hasToken = await AsyncStorage.getItem('@accessToken');
                if (hasToken) {
                    await AsyncStorage.multiRemove(['@user', '@accessToken', '@refreshToken']);
                    console.log('🗑️ Dados de autenticação removidos (token expirado)');
                    delete api.defaults.headers.common['Authorization'];
                }
            } catch (storageError) {
                console.warn('Erro ao limpar storage:', storageError);
            } finally {
                setTimeout(() => {
                    isRedirecting = false;
                }, 1000);
            }
        }

        return Promise.reject(error);
    }
);

export default api;