import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useAppointments} from '../hooks/useAppointments';
import useNetworkStatus from '../hooks/useNetworkStatus';
import {useFocusEffect} from '@react-navigation/native';
import api from '../config/api';

const MyAppointmentsScreen = ({navigation}) => {
    const {isConnected} = useNetworkStatus();

    const {
        appointments,
        loading,
        refreshing,
        refetch,
        cancelAppointment,
        deleteAppointment,
    } = useAppointments();

    const [barbers, setBarbers] = useState([]);

    const [cancellingId, setCancellingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const safeAppointments = Array.isArray(appointments) ? appointments : [];

    const loadBarbers = useCallback(async () => {
        try {
            const {data} = await api.get('/barbers');
            const list = Array.isArray(data?.barbers) ? data.barbers : [];
            setBarbers(list);
        } catch (e) {
            console.warn('Erro ao carregar barbeiros:', e?.message || e);
            setBarbers([]);
        }
    }, []);

    useEffect(() => {
        loadBarbers();
    }, [loadBarbers]);

    const resolveBarberName = (apt) => {
        if (!apt) return '';

        if (apt.rawData?.barbeiroNome) return String(apt.rawData.barbeiroNome);

        if (apt.barbeiroNome) return String(apt.barbeiroNome);

        if (apt.barber?.nome) return String(apt.barber.nome);

        const idTop = apt.barberId ?? apt.barberID;
        if (idTop && Array.isArray(barbers) && barbers.length > 0) {
            const found = barbers.find((b) => Number(b.id) === Number(idTop));
            if (found?.nome) return String(found.nome);
        }

        const idRaw = apt.rawData?.barberId ?? apt.rawData?.barberID;
        if (idRaw && Array.isArray(barbers) && barbers.length > 0) {
            const found = barbers.find((b) => Number(b.id) === Number(idRaw));
            if (found?.nome) return String(found.nome);
        }

        return '';
    };

    const refetchRef = useRef(refetch);
    useEffect(() => {
        refetchRef.current = refetch;
    }, [refetch]);

    const onRefresh = useCallback(async () => {
        await refetchRef.current?.();
        await loadBarbers();
    }, [loadBarbers]);

    useFocusEffect(
        useCallback(() => {
            refetchRef.current?.();
        }, [])
    );

    const isPastAppointment = (dateString) => {
        try {
            if (!dateString) return false;
            const appointmentDate = new Date(dateString);
            if (isNaN(appointmentDate.getTime())) return false;
            return appointmentDate < new Date();
        } catch {
            return false;
        }
    };

    const canDeleteFromHistory = (apt) => {
        const status = apt?.status?.toLowerCase();
        const passed = isPastAppointment(apt?.startTime || apt?.data);
        return status === 'cancelado' || status === 'finalizado' || passed;
    };

    const formatDateTime = (dateString) => {
        try {
            if (!dateString) return 'Data inválida';
            const date = new Date(dateString);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Data inválida';
        }
    };

    const getStatusStyle = (appointment) => {
        const status = appointment?.status?.toLowerCase();
        const isPast = isPastAppointment(appointment?.startTime || appointment?.data);
        if (isPast && status !== 'cancelado') return styles.statusFinished;
        switch (status) {
            case 'agendado':
                return styles.statusScheduled;
            case 'confirmed':
                return styles.statusConfirmed;
            case 'cancelado':
                return styles.statusCancelled;
            case 'finalizado':
                return styles.statusFinished;
            case 'pendente':
                return styles.statusPending;
            default:
                return styles.statusDefault;
        }
    };

    const getStatusText = (appointment) => {
        const status = appointment?.status?.toLowerCase();
        const isPast = isPastAppointment(appointment?.startTime || appointment?.data);
        if (isPast && status !== 'cancelado') return 'Finalizado';
        switch (status) {
            case 'agendado':
                return 'Agendado';
            case 'confirmed':
                return 'Confirmado';
            case 'cancelado':
                return 'Cancelado';
            case 'finalizado':
                return 'Finalizado';
            default:
                return status || 'Desconhecido';
        }
    };

    const handleCancelAppointment = async (appointmentId) => {
        if (!isConnected)
            return Alert.alert('Sem Internet', 'Conecte-se para cancelar.');
        Alert.alert('Cancelar Agendamento', 'Deseja realmente cancelar?', [
            {text: 'Não', style: 'cancel'},
            {
                text: 'Sim',
                style: 'destructive',
                onPress: async () => {
                    setCancellingId(appointmentId);
                    try {
                        await cancelAppointment(appointmentId);
                        Alert.alert('Sucesso', 'Agendamento cancelado!');
                    } catch {
                        Alert.alert('Erro', 'Não foi possível cancelar.');
                    } finally {
                        setCancellingId(null);
                    }
                },
            },
        ]);
    };

    const handleDeleteAppointment = async (appointmentId, apt) => {
        if (!isConnected)
            return Alert.alert('Sem Internet', 'Conecte-se para apagar.');
        if (!canDeleteFromHistory(apt))
            return Alert.alert(
                'Não permitido',
                'Só pode apagar cancelados, finalizados ou passados.'
            );

        Alert.alert('Apagar Histórico', 'Deseja remover este agendamento?', [
            {text: 'Cancelar', style: 'cancel'},
            {
                text: 'Apagar',
                style: 'destructive',
                onPress: async () => {
                    setDeletingId(appointmentId);
                    try {
                        await deleteAppointment(appointmentId);
                    } catch {
                        Alert.alert('Erro', 'Falha ao apagar.');
                    } finally {
                        setDeletingId(null);
                    }
                },
            },
        ]);
    };

    if (loading && safeAppointments.length === 0)
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']}
                    style={styles.gradient}
                >
                    <View style={styles.styledHeader}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButtonStyled}
                        >
                            <Ionicons name="arrow-back" size={22} color="#D4AF37"/>
                        </TouchableOpacity>

                        <View style={styles.headerTitleCenter}>
                            <Text style={styles.headerTitleText}>
                                Meus Agendamentos
                            </Text>
                            <Text style={styles.headerSubtitleText}>
                                Visualize e gerencie seus horários
                            </Text>
                        </View>
                    </View>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#d4af37"/>
                        <Text style={styles.loadingText}>Carregando...</Text>
                    </View>
                </LinearGradient>
            </SafeAreaView>
        );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']}
                style={styles.gradient}
            >
                <View style={styles.styledHeader}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButtonStyled}
                    >
                        <Ionicons name="arrow-back" size={22} color="#D4AF37"/>
                    </TouchableOpacity>

                    <View style={styles.headerTitleCenter}>
                        <Text style={styles.headerTitleText}>
                            Meus Agendamentos
                        </Text>
                        <Text style={styles.headerSubtitleText}>
                            Visualize e gerencie seus horários
                        </Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={!!refreshing}
                            onRefresh={onRefresh}
                            colors={['#d4af37']}
                            tintColor="#d4af37"
                        />
                    }
                >
                    <View style={styles.content}>
                        {safeAppointments.length === 0 ? (
                            <View style={styles.card}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={48}
                                    color="#666"
                                    style={{alignSelf: 'center'}}
                                />
                                <Text style={styles.noAppointmentsText}>
                                    Nenhum agendamento encontrado
                                </Text>
                            </View>
                        ) : (
                            safeAppointments.map((appointment) => {
                                const key =
                                    appointment?.id?.toString() || Math.random().toString();
                                const dateLabel = formatDateTime(
                                    appointment?.startTime || appointment?.data
                                );
                                const deletable = canDeleteFromHistory(appointment);
                                const barberName = resolveBarberName(appointment);
                                const statusText = getStatusText(appointment);
                                const isConfirmed = statusText === 'Confirmado' || statusText === 'Agendado';
                                const canCancel = isConfirmed && !isPastAppointment(appointment?.startTime || appointment?.data);

                                return (
                                    <View key={key} style={styles.appointmentCard}>
                                        <View style={styles.appointmentHeader}>
                                            <View style={styles.serviceInfo}>
                                                <Text style={styles.serviceName}>
                                                    {appointment?.service?.nome ||
                                                        appointment?.servicoNome ||
                                                        'Serviço não especificado'}
                                                </Text>
                                                <Text style={styles.appointmentDate}>{dateLabel}</Text>

                                                {!!barberName && (
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name="person"
                                                            size={14}
                                                            color="#d4af37"
                                                            style={{marginRight: 6}}
                                                        />
                                                        <Text style={styles.barberName}>{barberName}</Text>
                                                    </View>
                                                )}

                                                {appointment?.servicoPreco || appointment?.service?.preco ? (
                                                    <View style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        marginTop: 4
                                                    }}>
                                                        <Ionicons
                                                            name="cash-outline"
                                                            size={14}
                                                            color="#d4af37"
                                                            style={{marginRight: 6}}
                                                        />
                                                        <Text style={styles.priceText}>
                                                            R$ {appointment?.servicoPreco || appointment?.service?.preco}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                            <View
                                                style={[styles.statusBadge, getStatusStyle(appointment)]}
                                            >
                                                <Text style={styles.statusText}>
                                                    {statusText}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.actionsRow}>
                                            {canCancel ? (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.cancelButton,
                                                        cancellingId === appointment?.id && styles.buttonDisabled,
                                                    ]}
                                                    onPress={() => handleCancelAppointment(appointment?.id)}
                                                    disabled={cancellingId === appointment?.id}
                                                >
                                                    {cancellingId === appointment?.id ? (
                                                        <ActivityIndicator size="small" color="#fff"/>
                                                    ) : (
                                                        <>
                                                            <Ionicons name="close-circle-outline" size={16}
                                                                      color="#fff"/>
                                                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            ) : deletable ? (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.deleteButton,
                                                        deletingId === appointment?.id && styles.buttonDisabled,
                                                    ]}
                                                    onPress={() => handleDeleteAppointment(appointment?.id, appointment)}
                                                    disabled={deletingId === appointment?.id}
                                                >
                                                    {deletingId === appointment?.id ? (
                                                        <ActivityIndicator size="small" color="#fff"/>
                                                    ) : (
                                                        <>
                                                            <Ionicons name="trash-outline" size={16} color="#fff"/>
                                                            <Text style={styles.deleteButtonText}>Apagar</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    gradient: {flex: 1},
    scrollView: {flex: 1},
    content: {padding: 20, paddingBottom: 40},

    styledHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111',
        paddingHorizontal: 20,
        paddingTop: 45,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    backButtonStyled: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1c1c1c',
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    headerTitleCenter: {
        flex: 1,
        alignItems: 'center',
        marginRight: 40,
    },
    headerTitleText: {
        color: '#D4AF37',
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    headerSubtitleText: {
        color: '#bbb',
        fontSize: 13,
        marginTop: 2,
        fontStyle: 'italic',
    },

    appointmentCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.2)',
    },

    appointmentHeader: {flexDirection: 'row', justifyContent: 'space-between'},

    serviceInfo: {flex: 1, paddingRight: 8},
    serviceName: {fontSize: 18, fontWeight: 'bold', color: '#fff'},
    appointmentDate: {color: '#ccc', marginBottom: 4},
    barberName: {color: '#d4af37', fontSize: 14, fontWeight: '500'},

    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    statusText: {color: '#fff', fontSize: 12},
    statusScheduled: {backgroundColor: '#28a745'},
    statusConfirmed: {backgroundColor: '#28a745'},
    statusCancelled: {backgroundColor: '#dc3545'},
    statusFinished: {backgroundColor: '#FF6B35'},
    statusPending: {backgroundColor: '#ffc107'},
    statusDefault: {backgroundColor: '#6c757d'},

    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 10,
        marginTop: 10,
    },

    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#c62828',
        padding: 10,
        borderRadius: 8,
        gap: 6,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 3.5,
        elevation: 3,
    },
    cancelButtonText: {color: '#fff', fontWeight: '600', fontSize: 15},

    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#555',
        padding: 10,
        borderRadius: 8,
        gap: 6,
    },
    deleteButtonText: {color: '#fff', fontWeight: '600', fontSize: 15},

    buttonDisabled: {opacity: 0.6},

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
    },
    loadingText: {color: '#d4af37', marginTop: 16},

    card: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 20,
        borderRadius: 16,
        marginTop: 20,
    },
    noAppointmentsText: {color: '#999', textAlign: 'center', marginTop: 12},
    priceText: {
        color: '#d4af37',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default MyAppointmentsScreen;