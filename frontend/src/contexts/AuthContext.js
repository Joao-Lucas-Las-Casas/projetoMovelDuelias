import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const AuthContext = createContext(null);

function areUsersEqual(a, b) {
    if (!a || !b) return a === b;
    return (
        a.id === b.id &&
        a.email === b.email &&
        String(a.tipoUsuario) === String(b.tipoUsuario) &&
        (a.nome ?? '') === (b.nome ?? '') &&
        (a.contato ?? '') === (b.contato ?? '') &&
        (a.foto ?? '') === (b.foto ?? '')
    );
}

function safeSetUser(setter, next) {
    setter(prev => (areUsersEqual(prev, next) ? prev : next));
}

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isLoggingOutRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => () => {
        mountedRef.current = false;
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const token = await AsyncStorage.getItem('@accessToken');
                const userStr = await AsyncStorage.getItem('@user');
                if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    safeSetUser(setUser, userData);
                }
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        const id = api.interceptors.response.use(
            (res) => res,
            async (err) => {
                if (err?.response?.status === 401 && !isLoggingOutRef.current) {
                    setTimeout(() => logout(), 0);
                }
                throw err;
            }
        );
        return () => api.interceptors.response.eject(id);
    }, []);

    const updateUser = (newUserData) => {
        if (!mountedRef.current) return;
        setUser(prev => {
            const updated = {...prev, ...newUserData};
            if (areUsersEqual(prev, updated)) {
                return prev;
            }
            AsyncStorage.setItem('@user', JSON.stringify(updated));
            return updated;
        });
    };

    const updateAuthUser = (nextUser) => {
        if (!mountedRef.current) return;
        safeSetUser(setUser, nextUser);
        AsyncStorage.setItem('@user', JSON.stringify(nextUser));
    };

    const signIn = async (email, senha) => {
        try {
            const response = await api.post('/auth/login', {email, senha});
            const data = response.data;
            const token = data.token || data.accessToken;

            if (!data?.success || !token) {
                return {success: false, error: data?.error || 'Falha no login'};
            }

            const userData = {
                id: data.user?.id ?? data.userId,
                email: data.user?.email ?? email,
                nome: data.user?.nome ?? '',
                contato: data.user?.contato ?? '',
                tipoUsuario: data.user?.tipoUsuario ?? data.tipoUsuario ?? 0,
                liberacao: data.user?.liberacao ?? data.liberacao ?? 1,
                mudaSenha: data.user?.mudaSenha ?? data.mudaSenha ?? 0
            };

            await AsyncStorage.setItem('@accessToken', token);
            await AsyncStorage.setItem('@user', JSON.stringify(userData));
            api.defaults.headers.common.Authorization = `Bearer ${token}`;

            if (mountedRef.current) safeSetUser(setUser, userData);

            console.log('🔍 Usuário no contexto:', userData);

            return {success: true, user: userData, token};
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return {success: false, error: error?.response?.data?.error || 'Falha no login'};
        }
    };

    const signUp = async ({nome, email, contato, senha}) => {
        try {
            const response = await api.post('/auth/register', {nome, email, contato, senha});
            const data = response.data;

            if (data?.success) {
                try {
                    await api.post('/profile', {
                        nome: nome,
                        contato: contato,
                    });
                    console.log('✅ Perfil criado automaticamente para novo usuário');
                } catch (profileError) {
                    console.log('⚠️ Perfil não criado automaticamente:', profileError.message);
                }

                return {success: true};
            }

            return {success: false, error: data?.error || 'Falha no cadastro'};
        } catch (error) {
            console.error('❌ Erro no signUp:', error);
            return {success: false, error: error?.response?.data?.error || 'Erro ao cadastrar usuário'};
        }
    };

    const forgotPassword = async (email) => {
        try {
            const {data} = await api.post('/auth/forgot-password', {email});
            return {
                success: !!data?.success,
                token: data?.debugToken,
                message: data?.message || 'Se o e-mail existir, enviaremos instruções.',
            };
        } catch (error) {
            console.error('❌ Erro no forgotPassword:', error);
            return {
                success: false,
                error: error?.response?.data?.error || 'Falha ao solicitar redefinição de senha.',
            };
        }
    };

    const resetPassword = async (token, newPassword) => {
        try {
            const {data} = await api.post('/auth/reset-password', {token, newPassword});
            return {
                success: !!data?.success,
                message: data?.message || 'Senha redefinida com sucesso.',
            };
        } catch (error) {
            console.error('❌ Erro no resetPassword:', error);
            return {
                success: false,
                error: error?.response?.data?.error || 'Falha ao redefinir senha.',
            };
        }
    };

    const updateProfile = async (payload) => {
        try {
            const response = await api.put('/profile', payload);
            if (response.data?.success) {
                const merged = {...(user || {}), ...payload};
                await AsyncStorage.setItem('@user', JSON.stringify(merged));
                if (mountedRef.current) safeSetUser(setUser, merged);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Erro ao atualizar perfil:', error);
            return false;
        }
    };

    const changePassword = async (current, next) => {
        try {
            await api.put('/auth/change-password', {oldPassword: current, newPassword: next});
            return {success: true};
        } catch (error) {
            console.error('❌ Erro ao alterar senha:', error);
            let msg = 'Não foi possível alterar a senha.';
            if (error?.response?.status === 401) msg = 'Senha atual incorreta.';
            if (error?.response?.status === 400) msg = error.response.data?.error || msg;
            return {success: false, error: msg};
        }
    };

    const logout = async () => {
        if (isLoggingOutRef.current) return;

        console.log('🚪 Iniciando logout...');
        isLoggingOutRef.current = true;

        try {
            await AsyncStorage.multiRemove(['@accessToken', '@user', '@refreshToken']);
            console.log('✅ Tokens removidos do AsyncStorage');

            delete api.defaults.headers.common.Authorization;
            console.log('✅ Header de autorização removido');

            if (mountedRef.current) {
                safeSetUser(setUser, null);
                console.log('✅ Estados limpos - usuário definido como null');
            }

            console.log('✅ Logout concluído com sucesso');
        } catch (error) {
            console.log('❌ Erro durante logout:', error);
        } finally {
            isLoggingOutRef.current = false;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signIn,
                signUp,
                forgotPassword,
                resetPassword,
                logout,
                updateProfile,
                changePassword,
                updateUser,
                updateAuthUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);