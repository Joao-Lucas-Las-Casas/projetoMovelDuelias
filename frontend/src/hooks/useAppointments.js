import {useState, useCallback, useEffect} from 'react';
import {Alert} from 'react-native';
import {useAuth} from '../contexts/AuthContext';
import api from '../config/api';

export const useAppointments = () => {
    const {user} = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchAppointments = useCallback(async (isRefreshing = false) => {
        try {
            if (isRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError(null);

            if (!user) {
                console.log('❌ Usuário não autenticado');
                setAppointments([]);
                return;
            }

            console.log('🔄 Buscando agendamentos...');

            const response = await api.get(`/appointments/user/${user.id}`);

            console.log('✅ Resposta da API:', response.data);

            let appointmentsList = [];

            if (Array.isArray(response.data?.appointments)) {
                appointmentsList = response.data.appointments;
            } else if (Array.isArray(response.data?.agendamentos)) {
                appointmentsList = response.data.agendamentos;
            } else if (Array.isArray(response.data)) {
                appointmentsList = response.data;
            }

            const processedAppointments = appointmentsList.map(apt => {
                const dateTime = apt.dateTime || apt.data;
                const dateObj = dateTime ? new Date(dateTime) : new Date();

                return {
                    id: apt.id || apt._id,
                    servicoNome: apt.servicoNome || apt.servico_nome || apt.servico?.nome || 'Serviço não especificado',
                    servicoPreco: apt.servicoPreco ?? apt.servico_preco ?? apt.servico?.preco ?? 0,
                    data: dateTime,
                    dataFormatada: dateObj.toLocaleDateString('pt-BR'),
                    hora: dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
                    status: apt.status || 'confirmado',
                    barbeiroNome: apt.barbeiroNome || apt.barbeiro_nome || apt.barberName || 'Barbeiro não especificado',
                    barberId: apt.barberId || apt.barbeiroId,
                    observacoes: apt.observacoes || '',
                    rawData: apt,
                };
            });

            console.log(`📅 ${processedAppointments.length} agendamentos processados`);
            setAppointments(processedAppointments);

        } catch (err) {
            console.error('❌ Erro ao buscar agendamentos:', err);
            setError(err.message || 'Erro ao carregar agendamentos');
            setAppointments([]);

            if (!isRefreshing) {
                Alert.alert('Erro', 'Não foi possível carregar os agendamentos');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    const refetch = useCallback(() => {
        return fetchAppointments(false);
    }, [fetchAppointments]);

    const refresh = useCallback(() => {
        return fetchAppointments(true);
    }, [fetchAppointments]);

    const cancelAppointment = useCallback(async (appointmentId) => {
        try {
            console.log(`🔄 Cancelando agendamento ${appointmentId}...`);
            const response = await api.put(`/appointments/${appointmentId}/cancel`);

            if (response.data?.success) {
                setAppointments(prev =>
                    prev.map(apt =>
                        apt.id === appointmentId
                            ? {...apt, status: 'cancelado'}
                            : apt
                    )
                );
                Alert.alert('Sucesso', 'Agendamento cancelado com sucesso');
                return true;
            }
            throw new Error('Falha ao cancelar agendamento');
        } catch (err) {
            console.error('❌ Erro ao cancelar agendamento:', err);
            Alert.alert('Erro', 'Não foi possível cancelar o agendamento');
            throw err;
        }
    }, []);

    const deleteAppointment = useCallback(async (appointmentId) => {
        try {
            console.log(`🗑️ Deletando agendamento ${appointmentId}...`);
            const response = await api.delete(`/appointments/${appointmentId}`);

            if (response.data?.success) {
                setAppointments(prev =>
                    prev.filter(apt => apt.id !== appointmentId)
                );
                Alert.alert('Sucesso', 'Agendamento excluído com sucesso');
                return true;
            }
            throw new Error('Falha ao deletar agendamento');
        } catch (err) {
            console.error('❌ Erro ao deletar agendamento:', err);
            Alert.alert('Erro', 'Não foi possível excluir o agendamento');
            throw err;
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchAppointments();
        }
    }, [user, fetchAppointments]);

    return {
        appointments,
        loading,
        refreshing,
        error,
        refetch,
        refresh,
        cancelAppointment,
        deleteAppointment,
    };
};