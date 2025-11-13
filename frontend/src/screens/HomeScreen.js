import React, {useState, useEffect, useCallback} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Dimensions,
    FlatList,
    Image,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../contexts/AuthContext';
import {useFocusEffect} from '@react-navigation/native';
import {barberService, BarbersEvents} from '../services/barberService';
import {appointmentService} from '../services/appointmentService';

const {width} = Dimensions.get('window');

const barberImages = {
    'Carlos Lima': 'https://static.vecteezy.com/ti/fotos-gratis/t2/5889815-atraente-jovem-com-cabelo-escuro-e-moderno-penteado-vestindo-roupas-casuais-ao-ar-livre-foto.jpg',
    'Ricardo Alves': 'https://cdn.pixabay.com/photo/2016/11/21/12/42/beard-1845166_640.jpg',
};

const getBarberImage = (barberName) => {
    return barberImages[barberName] ? {uri: barberImages[barberName]} : null;
};

function toDate(d, t) {
    if (!d && !t) return null;
    if (d && t) return new Date(`${d}T${t}:00`);
    return new Date((d || t || '').replace(' ', 'T'));
}

function normalizeAppointment(a) {
    const start =
        a.dateTime
            ? toDate(a.dateTime)
            : toDate(a.date, a.time);

    return {
        id: a.id,
        status: (a.status || '').toLowerCase(),
        start,
        serviceName: a.servicoNome || a.serviceName || a.servico?.nome || 'Serviço',
        servicePrice: Number(a.servicoPreco ?? a.preco ?? a.servico?.preco ?? 0),
        barberName: a.barbeiroNome || a.barberName || a.barbeiro?.nome || a.barber?.nome || null,
        barberId: a.barberId || a.barbeiroId || null,
        originalData: a
    };
}

const HomeScreen = ({navigation}) => {
    const {user} = useAuth();

    const [refreshing, setRefreshing] = useState(false);

    const [barbers, setBarbers] = useState([]);
    const [loadingBarbers, setLoadingBarbers] = useState(true);
    const [loadingAppointments, setLoadingAppointments] = useState(true);

    const [nextAppointment, setNextAppointment] = useState(null);

    const [establishmentInfo] = useState({
        name: 'Barbearia Duelias',
        address: 'Rua Principal, 123 - Centro',
        phone: '(11) 9999-9999',
        whatsapp: '(11) 98888-8888',
        hours: {
            tuesday: {open: '09:00', close: '19:00', closed: false},
            wednesday: {open: '09:00', close: '19:00', closed: false},
            thursday: {open: '09:00', close: '19:00', closed: false},
            friday: {open: '09:00', close: '19:00', closed: false},
            saturday: {open: '09:00', close: '19:00', closed: false},
            sunday: {open: '00:00', close: '00:00', closed: true},
            monday: {open: '00:00', close: '00:00', closed: true},
        },
    });

    const loadBarbers = async () => {
        try {
            setLoadingBarbers(true);
            const res = await barberService.getBarbers();
            const list = Array.isArray(res?.data) ? res.data :
                Array.isArray(res?.barbers) ? res.barbers : [];
            setBarbers(list);
        } catch (error) {
            console.error('❌ Erro ao carregar barbeiros:', error?.response?.data || error.message);
            setBarbers([]);
        } finally {
            setLoadingBarbers(false);
        }
    };

    const loadNextAppointment = useCallback(async () => {
        try {
            setLoadingAppointments(true);
            const userId = user?.id;

            if (!userId) {
                setNextAppointment(null);
                return;
            }

            console.log('🔄 Buscando agendamentos para usuário:', userId);

            const res = await appointmentService.getUserAppointments(userId);
            const list = res?.appointments || res?.data?.appointments || res?.data || [];

            console.log('📦 Agendamentos brutos recebidos:', list);

            const normalized = (Array.isArray(list) ? list : [])
                .map(normalizeAppointment)
                .filter(a => a.start instanceof Date && !isNaN(a.start))
                .filter(a => a.status !== 'cancelled' && a.status !== 'cancelado' && a.status !== 'canceled');

            console.log('🔄 Agendamentos normalizados:', normalized);

            const now = new Date();

            const futureOnly = normalized.filter(a => a.start >= now);
            const pastOnly = normalized.filter(a => a.start < now);

            futureOnly.sort((a, b) => a.start - b.start);

            setNextAppointment(futureOnly[0] || null);

            console.log('✅ Próximo agendamento:', futureOnly[0]);
            console.log('📊 Futuros:', futureOnly.length, 'Passados:', pastOnly.length);

        } catch (error) {
            console.error('❌ Erro ao carregar próximo agendamento:', error);
            setNextAppointment(null);
        } finally {
            setLoadingAppointments(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadNextAppointment();
        loadBarbers();

        const unsubscribeBarbers = BarbersEvents.on('changed', () => {
            console.log('🔄 Evento: Atualizando barbeiros na Home');
            loadBarbers();
        });

        return () => {
            unsubscribeBarbers?.();
        };
    }, [loadNextAppointment]);

    useFocusEffect(
        useCallback(() => {
            loadNextAppointment();
            loadBarbers();
        }, [loadNextAppointment])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadNextAppointment(), loadBarbers()]);
        setRefreshing(false);
    }, [loadNextAppointment]);

    const formatDate = (date) => {
        if (!date) return 'Data não definida';
        try {
            return date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Data inválida';
        }
    };

    const resolveBarberName = (apt) => {
        if (!apt) return '';
        if (apt.barberName) return apt.barberName;

        if (apt.originalData?.barberName) return apt.originalData.barberName;
        if (apt.originalData?.barbeiroNome) return apt.originalData.barbeiroNome;

        if (apt.barberId && Array.isArray(barbers)) {
            const found = barbers.find((b) => Number(b.id) === Number(apt.barberId));
            if (found?.nome) return found.nome;
        }

        return '';
    };

    const renderScheduleItem = (day, schedule) => {
        const dayNames = {
            monday: 'Segunda-feira',
            tuesday: 'Terça-feira',
            wednesday: 'Quarta-feira',
            thursday: 'Quinta-feira',
            friday: 'Sexta-feira',
            saturday: 'Sábado',
            sunday: 'Domingo',
        };

        return (
            <View key={day} style={[styles.scheduleItem, schedule.closed && styles.closedDay]}>
                <Text style={[styles.scheduleDay, schedule.closed && styles.closedDayText]}>
                    {dayNames[day]}
                </Text>
                {schedule.closed ? (
                    <Text style={styles.scheduleClosed}>FECHADO</Text>
                ) : (
                    <Text style={styles.scheduleHours}>{schedule.open} - {schedule.close}</Text>
                )}
            </View>
        );
    };

    const getOrderedSchedule = () => {
        const daysOrder = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'monday'];
        return daysOrder.map((day) => [day, establishmentInfo.hours[day]]);
    };

    const renderBarberItem = ({item}) => {
        const barberName = item?.nome || 'Barbeiro';
        const imageSource = getBarberImage(barberName);

        return (
            <TouchableOpacity
                style={styles.barberCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Agendar', {selectedBarber: item})}
            >
                <View style={styles.barberAvatarContainer}>
                    {imageSource ? (
                        <Image
                            source={imageSource}
                            style={styles.barberAvatar}
                            onError={(e) => {
                                console.log('❌ Erro ao carregar imagem online:', barberName, e.nativeEvent.error);
                            }}
                        />
                    ) : (
                        <View style={styles.defaultAvatar}>
                            <Ionicons name="person" size={64} color="#d4af37"/>
                        </View>
                    )}
                </View>
                <Text numberOfLines={1} style={styles.barberName}>
                    {barberName}
                </Text>
                {Array.isArray(item?.especialidades) && item.especialidades.length > 0 ? (
                    <Text numberOfLines={1} style={styles.barberTag}>
                        {item.especialidades[0]}
                    </Text>
                ) : (
                    <Text style={styles.barberTagSecondary}>Especialista</Text>
                )}
            </TouchableOpacity>
        );
    };

    const barberNameForNext = resolveBarberName(nextAppointment);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor="#0f0f0f"
                translucent={false}
            />
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#d4af37']}
                            tintColor="#d4af37"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <View style={styles.welcomeContainer}>
                                <Text style={styles.welcomeText}>
                                    Olá, {user?.perfil?.nome || user?.nome || 'usuário'}! 👋
                                </Text>
                                <Text style={styles.subtitle}>É um prazer tê-lo de volta!</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="people" size={22} color="#d4af37"/>
                                <Text style={styles.sectionTitle}>Nossos Barbeiros</Text>
                            </View>

                            <View style={styles.card}>
                                {loadingBarbers ? (
                                    <ActivityIndicator size="small" color="#d4af37" style={{marginVertical: 8}}/>
                                ) : (
                                    <FlatList
                                        horizontal
                                        data={barbers}
                                        keyExtractor={(item) => String(item.id)}
                                        renderItem={renderBarberItem}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{paddingRight: 6}}
                                        ListEmptyComponent={
                                            <Text style={{color: '#bbb', textAlign: 'center', padding: 20}}>
                                                Nenhum barbeiro disponível no momento.
                                            </Text>
                                        }
                                    />
                                )}
                            </View>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="calendar" size={22} color="#d4af37"/>
                                <Text style={styles.sectionTitle}>Próximo Agendamento</Text>
                            </View>
                            <View style={styles.card}>
                                {loadingAppointments ? (
                                    <View style={styles.noAppointment}>
                                        <ActivityIndicator size="large" color="#d4af37"/>
                                        <Text style={styles.noAppointmentText}>Carregando agendamentos...</Text>
                                    </View>
                                ) : nextAppointment ? (
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('MyAppointments')}
                                        style={styles.appointmentContainer}
                                    >
                                        <View style={styles.appointmentIcon}>
                                            <Ionicons name="time" size={24} color="#d4af37"/>
                                        </View>
                                        <View style={styles.appointmentInfo}>
                                            <Text style={styles.appointmentDate}>
                                                {formatDate(nextAppointment.start)}
                                            </Text>

                                            <Text style={styles.appointmentService}>
                                                {nextAppointment.serviceName}
                                            </Text>

                                            {Boolean(barberNameForNext) && (
                                                <View
                                                    style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                                                    <Ionicons name="person" size={14} color="#d4af37"
                                                              style={{marginRight: 6}}/>
                                                    <Text style={styles.appointmentBarber}>
                                                        {barberNameForNext}
                                                    </Text>
                                                </View>
                                            )}

                                            <Text style={styles.appointmentPrice}>
                                                R$ {nextAppointment.servicePrice.toFixed(2).replace('.', ',')}
                                            </Text>

                                            <Text style={styles.appointmentStatus}>
                                                Status:{' '}
                                                <Text style={[
                                                    styles.statusText,
                                                    nextAppointment.status === 'confirmed' || nextAppointment.status === 'confirmado'
                                                        ? styles.statusConfirmed
                                                        : styles.statusPending
                                                ]}>
                                                    {nextAppointment.status === 'confirmed' || nextAppointment.status === 'confirmado'
                                                        ? 'Confirmado'
                                                        : (nextAppointment.status || 'Confirmado')}
                                                </Text>
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.noAppointment}>
                                        <Ionicons name="calendar-outline" size={48} color="#666"/>
                                        <Text style={styles.noAppointmentText}>Nenhum agendamento futuro</Text>
                                        <Text style={styles.noAppointmentSubtext}>
                                            Que tal agendar um horário?
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.scheduleButton}
                                    onPress={() => navigation.navigate('Serviços')}
                                >
                                    <Ionicons name="add-circle" size={20} color="#1a1a1a"/>
                                    <Text style={styles.scheduleButtonText}>Fazer Agendamento</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.historyTextButton}
                                onPress={() => navigation.navigate('MyAppointments')}
                            >
                                <Text style={styles.historyText}>Histórico</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="flash" size={22} color="#d4af37"/>
                                <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                            </View>
                            <View style={styles.quickActions}>
                                <TouchableOpacity
                                    style={styles.quickAction}
                                    onPress={() => navigation.navigate('Agendar')}
                                >
                                    <View
                                        style={[
                                            styles.quickActionIcon,
                                            {backgroundColor: 'rgba(212, 175, 55, 0.2)'},
                                        ]}
                                    >
                                        <Ionicons name="calendar" size={24} color="#d4af37"/>
                                    </View>
                                    <Text style={styles.quickActionText}>Agendar</Text>
                                    <Text style={styles.quickActionSubtext}>Novo horário</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.quickAction}
                                    onPress={() => navigation.navigate('Serviços')}
                                >
                                    <View
                                        style={[
                                            styles.quickActionIcon,
                                            {backgroundColor: 'rgba(212, 175, 55, 0.2)'},
                                        ]}
                                    >
                                        <Ionicons name="cut" size={24} color="#d4af37"/>
                                    </View>
                                    <Text style={styles.quickActionText}>Serviços</Text>
                                    <Text style={styles.quickActionSubtext}>Ver preços</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.quickAction}
                                    onPress={() => navigation.navigate('Perfil')}
                                >
                                    <View
                                        style={[
                                            styles.quickActionIcon,
                                            {backgroundColor: 'rgba(212, 175, 55, 0.2)'},
                                        ]}
                                    >
                                        <Ionicons name="person" size={24} color="#d4af37"/>
                                    </View>
                                    <Text style={styles.quickActionText}>Perfil</Text>
                                    <Text style={styles.quickActionSubtext}>Minha conta</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="business" size={22} color="#d4af37"/>
                                <Text style={styles.sectionTitle}>Nossa Barbearia</Text>
                            </View>
                            <View style={styles.card}>
                                <View style={styles.infoItem}>
                                    <Ionicons name="location" size={18} color="#d4af37"/>
                                    <Text style={styles.infoText}>{establishmentInfo.address}</Text>
                                </View>

                                <View style={styles.infoItem}>
                                    <Ionicons name="call" size={18} color="#d4af37"/>
                                    <Text style={styles.infoText}>{establishmentInfo.phone}</Text>
                                </View>

                                <View style={styles.infoItem}>
                                    <Ionicons name="logo-whatsapp" size={18} color="#25D366"/>
                                    <Text style={styles.infoText}>{establishmentInfo.whatsapp}</Text>
                                </View>

                                <View style={styles.scheduleSection}>
                                    <Text style={styles.scheduleTitle}>Horário de Funcionamento</Text>
                                    {getOrderedSchedule().map(([day, schedule]) => renderScheduleItem(day, schedule))}
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    gradient: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#0f0f0f',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },

    header: {
        marginBottom: 30,
    },
    welcomeContainer: {
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center'
    },

    section: {marginBottom: 30},
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#d4af37',
        marginLeft: 8
    },

    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },

    barberCard: {
        width: 120,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 10,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.15)',
    },
    barberAvatarContainer: {
        width: '100%',
        height: 80,
        borderRadius: 10,
        marginBottom: 8,
        backgroundColor: '#222',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    barberAvatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    defaultAvatar: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    barberName: {color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center'},
    barberTag: {color: '#b7b7b7', fontSize: 12, marginTop: 2, textAlign: 'center'},
    barberTagSecondary: {color: '#9a9a9a', fontSize: 12, marginTop: 2, textAlign: 'center'},

    appointmentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 8,
        borderRadius: 8,
    },
    appointmentIcon: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginRight: 15,
    },
    appointmentInfo: {flex: 1},
    appointmentDate: {fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4, textTransform: 'capitalize'},
    appointmentService: {fontSize: 14, color: '#d4af37', marginBottom: 4, fontWeight: '500'},
    appointmentBarber: {fontSize: 13, color: '#e7e7e7', marginBottom: 4},
    appointmentPrice: {fontSize: 14, color: '#d4af37', fontWeight: '700', marginBottom: 4},

    appointmentStatus: {fontSize: 12, color: '#888'},
    statusText: {fontWeight: '500'},
    statusConfirmed: {color: '#4CAF50'},
    statusPending: {color: '#4CAF50'},

    noAppointment: {alignItems: 'center', paddingVertical: 20, marginBottom: 10},
    noAppointmentText: {fontSize: 16, color: '#888', marginTop: 12, textAlign: 'center', fontWeight: '500'},
    noAppointmentSubtext: {fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center'},

    scheduleButton: {
        backgroundColor: '#d4af37', paddingVertical: 14, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
        shadowColor: '#d4af37', shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    scheduleButtonText: {color: '#1a1a1a', fontSize: 16, fontWeight: 'bold', marginLeft: 8},

    historyTextButton: {
        alignSelf: 'flex-start',
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 5,
    },
    historyText: {
        color: '#d4af37',
        fontSize: 16,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },

    quickActions: {flexDirection: 'row', justifyContent: 'space-between'},
    quickAction: {
        flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12, padding: 15, alignItems: 'center', marginHorizontal: 5,
        borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.15)',
    },
    quickActionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    quickActionText: {fontSize: 14, fontWeight: 'bold', color: '#ffffff', textAlign: 'center'},
    quickActionSubtext: {fontSize: 12, color: '#888', textAlign: 'center', marginTop: 4},

    infoItem: {flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8},
    infoText: {fontSize: 14, color: '#ffffff', marginLeft: 12, flex: 1},

    scheduleSection: {marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)'},
    scheduleTitle: {fontSize: 16, fontWeight: 'bold', color: '#d4af37', marginBottom: 12},
    scheduleItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    closedDay: {opacity: 0.6},
    scheduleDay: {fontSize: 14, color: '#ffffff', flex: 1},
    closedDayText: {color: '#888'},
    scheduleHours: {fontSize: 14, color: '#4CAF50', fontWeight: '500'},
    scheduleClosed: {fontSize: 14, color: '#f44336', fontWeight: '500'},
});

export default HomeScreen;