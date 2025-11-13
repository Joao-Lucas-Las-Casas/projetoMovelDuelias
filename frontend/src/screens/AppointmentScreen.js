import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    Alert, Platform, ActivityIndicator, useWindowDimensions, Image
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {serviceService} from '../services/serviceService';
import {establishmentService} from '../services/establishmentService';
import {appointmentService} from '../services/appointmentService';
import {useAuth} from '../contexts/AuthContext';
import {useFocusEffect} from '@react-navigation/native';
import {barberService, BarbersEvents} from '../services/barberService';

const barberImages = {
    'Carlos Lima': 'https://static.vecteezy.com/ti/fotos-gratis/t2/5889815-atraente-jovem-com-cabelo-escuro-e-moderno-penteado-vestindo-roupas-casuais-ao-ar-livre-foto.jpg',
    'Ricardo Alves': 'https://cdn.pixabay.com/photo/2016/11/21/12/42/beard-1845166_640.jpg',
};

const getBarberImage = (barber) => {
    const name = barber?.nome || '';
    return barberImages[name] ? {uri: barberImages[name]} : null;
};

const AppointmentScreen = ({navigation, route}) => {
    const {user} = useAuth();
    const {width} = useWindowDimensions();
    const mountedRef = useRef(true);

    const [services, setServices] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedEstablishment, setSelectedEstablishment] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);
    const [isDateSelected, setIsDateSelected] = useState(false);
    const [userAppointments, setUserAppointments] = useState([]);
    const [imageErrors, setImageErrors] = useState({});

    const [barbers, setBarbers] = useState([]);
    const [selectedBarber, setSelectedBarber] = useState(null);
    const [loadingBarbers, setLoadingBarbers] = useState(false);

    useEffect(() => {
        mountedRef.current = true;

        const unsubscribeBarbers = BarbersEvents.on('changed', () => {
            console.log('🔄 Evento: Atualizando barbeiros no Agendamento');
            if (mountedRef.current) {
                loadBarbers();
            }
        });

        return () => {
            mountedRef.current = false;
            unsubscribeBarbers?.();
        };
    }, []);

    const responsiveValues = useMemo(() => {
        const isSmallScreen = width < 375;
        const isMediumScreen = width >= 375 && width < 768;
        const responsiveFont = (s, m, l) => (isSmallScreen ? s : isMediumScreen ? m : l);
        const responsivePadding = (s, m, l) => (isSmallScreen ? s : isMediumScreen ? m : l);
        const responsiveMargin = (s, m, l) => (isSmallScreen ? s : isMediumScreen ? m : l);
        const getCardWidth = () => width - (responsivePadding(15, 20, 25) * 2);
        return {font: responsiveFont, padding: responsivePadding, margin: responsiveMargin, cardWidth: getCardWidth};
    }, [width]);

    const safeSetState = useCallback((setter, value) => {
        if (mountedRef.current) setter(value);
    }, []);

    const handleImageError = useCallback((barberId) => {
        safeSetState(setImageErrors, prev => ({
            ...prev,
            [barberId]: true
        }));
    }, [safeSetState]);

    const loadBarbers = useCallback(async () => {
        try {
            setLoadingBarbers(true);
            const res = await barberService.getBarbers();
            const list = Array.isArray(res?.data) ? res.data :
                Array.isArray(res?.barbers) ? res.barbers : [];

            if (mountedRef.current) {
                setBarbers(Array.isArray(list) ? list : []);
                if (route.params?.selectedBarber) {
                    setSelectedBarber(route.params.selectedBarber);
                }
            }
        } catch (e) {
            console.warn('Falha ao carregar barbeiros:', e?.message);
            if (mountedRef.current) {
                setBarbers([]);
            }
        } finally {
            if (mountedRef.current) {
                setLoadingBarbers(false);
            }
        }
    }, [route.params?.selectedBarber]);

    useEffect(() => {
        loadBarbers();
    }, [loadBarbers]);

    useFocusEffect(
        useCallback(() => {
            loadBarbers();
            return () => {
            };
        }, [loadBarbers])
    );

    const generateAllTimeSlots = useCallback(() => {
        const slots = [];
        const startHour = 9, endHour = 18;
        for (let hour = startHour; hour <= endHour; hour++) {
            for (const minute of ['00', '30']) {
                if (hour === endHour && minute === '30') {
                    slots.push({time: '18:30', isAvailable: true});
                    break;
                }
                const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
                slots.push({time: timeString, isAvailable: true});
            }
        }
        return slots;
    }, []);

    const formatDateToYMD = useCallback((date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const isTimeSlotBookedByUser = useCallback((timeSlot) => {
        if (!userAppointments.length) return false;
        const selectedDateString = selectedDate.toISOString().split('T')[0];
        return userAppointments.some(appointment => {
            const d = appointment.date || appointment.startTime?.split('T')[0];
            if (d !== selectedDateString) return false;
            const t = appointment.time || appointment.startTime?.split('T')[1]?.substring(0, 5);
            return t === timeSlot && appointment.status !== 'cancelado';
        });
    }, [userAppointments, selectedDate]);

    const isPastTodaySlot = useCallback((timeStr) => {
        try {
            if (!selectedDate || !timeStr) return false;

            const now = new Date();
            const sel = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
            );

            const isSameDay =
                now.getFullYear() === sel.getFullYear() &&
                now.getMonth() === sel.getMonth() &&
                now.getDate() === sel.getDate();

            if (!isSameDay) return false;

            const [hh, mm] = timeStr.split(':').map(Number);
            if (Number.isNaN(hh) || Number.isNaN(mm)) return false;

            const slotTime = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                hh,
                mm
            ).getTime();

            const nowTime = now.getTime();

            return slotTime <= nowTime;
        } catch {
            return false;
        }
    }, [selectedDate]);

    const loadUserAppointments = useCallback(async () => {
        if (!user?.id || !mountedRef.current) return;
        try {
            const appointments = await appointmentService.getUserAppointments(user.id);
            safeSetState(setUserAppointments, Array.isArray(appointments) ? appointments : []);
        } catch (_error) {
            console.log('Não foi possível carregar agendamentos do usuário');
        }
    }, [user?.id, safeSetState]);

    const resetForNewAppointment = useCallback(() => {
        if (!mountedRef.current) return;
        if (route.params?.selectedService) {
            safeSetState(setSelectedService, route.params.selectedService);
        } else {
            safeSetState(setSelectedService, services.length > 0 ? services[0] : null);
        }
        if (route.params?.selectedBarber) {
            safeSetState(setSelectedBarber, route.params.selectedBarber);
        } else {
            safeSetState(setSelectedBarber, null);
        }
        safeSetState(setSelectedEstablishment, null);
        safeSetState(setSelectedSlot, null);
        safeSetState(setSelectedDate, new Date());
        safeSetState(setIsDateSelected, false);
    }, [route.params?.selectedService, route.params?.selectedBarber, services, safeSetState]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                safeSetState(setSelectedBarber, null);
                safeSetState(setSelectedSlot, null);
            };
        }, [safeSetState])
    );

    const prevServiceIdRef = useRef(null);
    useEffect(() => {
        const newService = route.params?.selectedService;
        const newId = newService?.id || newService?.ID || null;

        if (newId && prevServiceIdRef.current !== newId) {
            safeSetState(setSelectedService, newService);
            safeSetState(setSelectedBarber, null);
            safeSetState(setSelectedSlot, null);
            safeSetState(setAvailableSlots, []);
            prevServiceIdRef.current = newId;
        }
    }, [route.params?.selectedService, safeSetState]);

    useEffect(() => {
        if (route.params?.selectedBarber && mountedRef.current) {
            safeSetState(setSelectedBarber, route.params.selectedBarber);
        }
    }, [route.params?.selectedBarber, safeSetState]);

    useEffect(() => {
        if (user?.id) loadUserAppointments();
    }, [user?.id, loadUserAppointments]);

    const extractDataFromResponse = useCallback((response, dataType = 'general') => {
        if (!response) return [];
        if (dataType === 'slots') {
            if (response?.data?.availableSlots && Array.isArray(response.data.availableSlots)) return response.data.availableSlots;
            if (Array.isArray(response.availableSlots)) return response.availableSlots;
            if (Array.isArray(response.data)) return response.data;
        }
        if (response?.data) {
            if (Array.isArray(response.data.services)) return response.data.services;
            if (Array.isArray(response.data.establishments)) return response.data.establishments;
            if (Array.isArray(response.data.barbers)) return response.data.barbers;
            if (Array.isArray(response.data)) return response.data;
        }
        if (Array.isArray(response)) return response;
        return [];
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadInitialData = async () => {
            try {
                safeSetState(setLoading, true);
                safeSetState(setError, null);

                const [servicesResponse, establishmentsResponse] = await Promise.all([
                    serviceService.getServices(),
                    establishmentService.getEstablishments()
                ]);

                if (!mounted) return;
                const servicesData = extractDataFromResponse(servicesResponse, 'services');
                const establishmentsData = extractDataFromResponse(establishmentsResponse, 'establishments');

                safeSetState(setServices, Array.isArray(servicesData) ? servicesData : []);
                safeSetState(setEstablishments, Array.isArray(establishmentsData) ? establishmentsData : []);

                if (!route.params?.selectedService) {
                    safeSetState(setSelectedService, Array.isArray(servicesData) && servicesData.length > 0 ? servicesData[0] : null);
                }
                safeSetState(setSelectedEstablishment, null);
                safeSetState(setIsDateSelected, false);

                await Promise.all([loadUserAppointments(), loadBarbers()]);
            } catch (error) {
                if (mounted) {
                    console.error('Error loading data:', error);
                    safeSetState(setError, error.message || 'Não foi possível carregar os dados.');
                }
            } finally {
                if (mounted) safeSetState(setLoading, false);
            }
        };
        loadInitialData();
        return () => {
            mounted = false;
        };
    }, [route.params?.selectedService, loadUserAppointments, extractDataFromResponse, loadBarbers, safeSetState]);

    const markAvailableSlots = useCallback((allSlots, availableSlotsFromAPI) => {
        if (!availableSlotsFromAPI || availableSlotsFromAPI.length === 0) {
            return allSlots.map(slot => {
                const booked = isTimeSlotBookedByUser(slot.time);
                const pastToday = isPastTodaySlot(slot.time);
                return {
                    ...slot,
                    isBookedByUser: booked,
                    isAvailable: !booked && !pastToday,
                };
            });
        }

        return allSlots.map(slot => {
            const inApi = availableSlotsFromAPI.includes(slot.time);
            const booked = isTimeSlotBookedByUser(slot.time);
            const pastToday = isPastTodaySlot(slot.time);
            return {
                ...slot,
                isAvailable: inApi && !booked && !pastToday,
                isBookedByUser: booked,
            };
        });
    }, [isTimeSlotBookedByUser, isPastTodaySlot]);

    useEffect(() => {
        let mounted = true;
        let timeoutId;

        const loadAvailableSlots = async () => {
            if (!mounted) return;

            if (!selectedService || !selectedDate) {
                safeSetState(setAvailableSlots, []);
                return;
            }

            try {
                safeSetState(setLoadingSlots, true);

                const allSlots = generateAllTimeSlots();

                timeoutId = setTimeout(async () => {
                    const dateString = formatDateToYMD(selectedDate);

                    console.log('🕒 Buscando slots com:', {
                        serviceId: selectedService.id,
                        date: dateString,
                        barberId: selectedBarber?.id
                    });

                    const slotsResponse = await appointmentService.getAvailableSlots(
                        selectedService.id,
                        dateString,
                        selectedBarber?.id
                    );

                    if (!mounted) return;

                    const availableSlotsFromAPI = extractDataFromResponse(slotsResponse, 'slots');
                    const slotsWithAvailability = markAvailableSlots(allSlots, availableSlotsFromAPI);

                    safeSetState(setAvailableSlots, slotsWithAvailability);

                    if (selectedSlot) {
                        const currentSlot = slotsWithAvailability.find(slot => slot.time === selectedSlot);
                        if (!currentSlot || !currentSlot.isAvailable) {
                            safeSetState(setSelectedSlot, null);
                        }
                    }
                }, 300);
            } catch (_error) {
                if (mounted) {
                    console.error('Error loading slots');
                    const all = generateAllTimeSlots();
                    const slotsWithUserBookings = all.map(slot => {
                        const booked = isTimeSlotBookedByUser(slot.time);
                        const pastToday = isPastTodaySlot(slot.time);
                        return {
                            ...slot,
                            isAvailable: !booked && !pastToday,
                            isBookedByUser: booked
                        };
                    });
                    safeSetState(setAvailableSlots, slotsWithUserBookings);
                }
            } finally {
                if (mounted) safeSetState(setLoadingSlots, false);
            }
        };

        loadAvailableSlots();
        return () => {
            mounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [
        selectedService,
        selectedDate,
        selectedBarber,
        userAppointments,
        generateAllTimeSlots,
        isTimeSlotBookedByUser,
        selectedSlot,
        extractDataFromResponse,
        markAvailableSlots,
        safeSetState,
        isPastTodaySlot,
        formatDateToYMD
    ]);

    const handleDateChange = useCallback((event, date) => {
        safeSetState(setShowDatePicker, Platform.OS === 'ios');
        if (date && mountedRef.current) {
            safeSetState(setSelectedDate, date);
            if (date.toDateString() !== selectedDate.toDateString()) {
                safeSetState(setSelectedSlot, null);
            }
            safeSetState(setIsDateSelected, true);
        }
    }, [selectedDate, safeSetState]);

    const formatDate = useCallback((date) => {
        return date.toLocaleDateString('pt-BR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
    }, []);

    const formatTime = useCallback((time) => (time?.substring(0, 5) || ''), []);

    const handleEstablishmentSelect = useCallback((establishment) => {
        if (!mountedRef.current) return;
        if (selectedEstablishment?.id === establishment.id) {
            safeSetState(setSelectedEstablishment, null);
        } else {
            safeSetState(setSelectedEstablishment, establishment);
        }
    }, [selectedEstablishment, safeSetState]);

    const handleBarberSelect = useCallback((barber) => {
        if (!mountedRef.current) return;
        if (selectedBarber?.id === barber.id) {
            safeSetState(setSelectedBarber, null);
        } else {
            safeSetState(setSelectedBarber, barber);
        }
        safeSetState(setSelectedSlot, null);
    }, [selectedBarber, safeSetState]);

    const handleTimeSlotSelect = useCallback((slotTime, isAvailable) => {
        if (!mountedRef.current || !isAvailable) return;
        if (selectedSlot === slotTime) safeSetState(setSelectedSlot, null);
        else safeSetState(setSelectedSlot, slotTime);
    }, [selectedSlot, safeSetState]);

    const handleConfirmAppointment = useCallback(async () => {
        if (!mountedRef.current) return;
        if (!selectedService || !selectedEstablishment || !selectedBarber || !selectedSlot) {
            Alert.alert('Atenção', 'Preencha serviço, estabelecimento, barbeiro e horário.');
            return;
        }
        const selectedTimeSlot = availableSlots.find(slot => slot.time === selectedSlot);
        if (!selectedTimeSlot || !selectedTimeSlot.isAvailable) {
            Alert.alert('Horário Indisponível', 'Este horário não está mais disponível. Selecione outro.');
            safeSetState(setSelectedSlot, null);
            return;
        }

        try {
            safeSetState(setLoading, true);
            const appointmentData = {
                userId: user.id,
                serviceId: selectedService.id,
                establishmentId: selectedEstablishment.id,
                barberId: selectedBarber.id,
                date: selectedDate.toISOString().split('T')[0],
                time: selectedSlot,
                status: 'confirmed'
            };
            await appointmentService.createAppointment(appointmentData);
            await loadUserAppointments();
            if (mountedRef.current) {
                Alert.alert('Sucesso', 'Agendamento realizado com sucesso!', [
                    {
                        text: 'OK',
                        onPress: () => {
                            resetForNewAppointment();
                            navigation.navigate('Início');
                        }
                    }
                ]);
            }
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            let msg = error.response?.data?.error || error.message || 'Não foi possível realizar o agendamento.';
            if (mountedRef.current) Alert.alert('Erro', msg);
        } finally {
            if (mountedRef.current) safeSetState(setLoading, false);
        }
    }, [
        selectedService, selectedEstablishment, selectedBarber, selectedSlot,
        availableSlots, user, selectedDate, loadUserAppointments, resetForNewAppointment, safeSetState, navigation
    ]);

    const renderTimeSlot = useCallback((slot, index) => {
        const slotTime = slot.time;
        const isAvailable = slot.isAvailable;
        const isBookedByUser = slot.isBookedByUser;
        return (
            <TouchableOpacity
                key={slotTime || index}
                style={[
                    styles.timeSlot,
                    {width: width * 0.18, height: 50, margin: 4},
                    selectedSlot === slotTime && styles.timeSlotSelected,
                    !isAvailable && styles.timeSlotDisabled,
                    isBookedByUser && styles.timeSlotBookedByUser
                ]}
                onPress={() => handleTimeSlotSelect(slotTime, isAvailable)}
                disabled={!isAvailable}
            >
                <Text style={[
                    styles.timeSlotText,
                    selectedSlot === slotTime && styles.timeSlotTextSelected,
                    !isAvailable && styles.timeSlotTextDisabled,
                    isBookedByUser && styles.timeSlotTextBookedByUser
                ]}>
                    {formatTime(slotTime)}
                </Text>
                {!isAvailable && !isBookedByUser && (
                    <Ionicons name="close-circle" size={16} color="#dc3545" style={styles.slotIcon}/>)}
                {isBookedByUser && (<Ionicons name="person-circle" size={16} color="#FFA500" style={styles.slotIcon}/>)}
                {selectedSlot === slotTime && isAvailable && (
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" style={styles.slotIcon}/>)}
            </TouchableOpacity>
        );
    }, [width, selectedSlot, handleTimeSlotSelect, formatTime]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#d4af37"/>
                        <Text style={styles.loadingText}>Carregando...</Text>
                    </View>
                </LinearGradient>
            </SafeAreaView>
        );
    }
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={() => {
                        }}>
                            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
                            contentContainerStyle={[styles.contentContainer, {padding: responsiveValues.padding(15, 20, 25)}]}>
                    <View style={[styles.header, {marginBottom: responsiveValues.margin(20, 30, 40)}]}>
                        <View style={styles.welcomeContainer}>
                            <Text style={[styles.welcomeText, {fontSize: responsiveValues.font(22, 28, 32)}]}>Agendar
                                Serviço</Text>
                            <Text style={[styles.subtitle, {fontSize: responsiveValues.font(12, 16, 18)}]}>Selecione
                                estabelecimento, barbeiro, data e horário</Text>
                        </View>
                    </View>

                    {selectedService && (
                        <View style={[styles.section, {marginBottom: responsiveValues.margin(15, 20, 25)}]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="cut" size={22} color="#d4af37"/>
                                <Text style={[styles.sectionTitle, {fontSize: responsiveValues.font(16, 18, 20)}]}>Serviço
                                    Selecionado</Text>
                            </View>
                            <View style={[styles.card, {
                                width: responsiveValues.cardWidth(),
                                padding: responsiveValues.padding(12, 15, 18)
                            }, styles.selectedCard]}>
                                <View style={styles.serviceHeader}>
                                    <View style={styles.serviceIcon}><Ionicons name="cut" size={24}
                                                                               color="#d4af37"/></View>
                                    <View style={styles.serviceInfo}>
                                        <Text style={[styles.cardTitle, {fontSize: responsiveValues.font(16, 18, 20)}]}>
                                            {typeof selectedService === 'object'
                                                ? selectedService.name || selectedService.nome
                                                : selectedService || 'Serviço selecionado'}
                                        </Text>
                                        <Text style={styles.selectedCardText}>
                                            R$ {typeof selectedService === 'object'
                                            ? selectedService.price || selectedService.preco
                                            : '0'}
                                        </Text>
                                        <Text style={styles.cardText}>
                                            Duração: {typeof selectedService === 'object'
                                            ? selectedService.duration || selectedService.duracao
                                            : '0'} minutos
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.cardText}>
                                    {typeof selectedService === 'object'
                                        ? selectedService.description || selectedService.descricao || 'Serviço profissional de barbearia'
                                        : 'Serviço profissional de barbearia'}
                                </Text>
                                <TouchableOpacity style={styles.changeServiceButton}
                                                  onPress={() => navigation.navigate('Serviços')}>
                                    <Ionicons name="swap-horizontal" size={16} color="#d4af37"/>
                                    <Text
                                        style={styles.changeServiceButtonText}>{route.params?.selectedService ? 'Trocar Serviço' : 'Alterar Serviço'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={[styles.section, {marginBottom: responsiveValues.margin(15, 20, 25)}]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="business" size={22} color="#d4af37"/>
                            <Text
                                style={[styles.sectionTitle, {fontSize: responsiveValues.font(16, 18, 20)}]}>Estabelecimentos</Text>
                        </View>
                        {Array.isArray(establishments) && establishments.length > 0 ? (
                            <View style={styles.verticalContainer}>
                                {establishments.map((est, idx) => (
                                    <TouchableOpacity
                                        key={est.id || idx}
                                        style={[styles.card, {
                                            width: responsiveValues.cardWidth(),
                                            padding: responsiveValues.padding(12, 15, 18),
                                            marginBottom: 12
                                        }, selectedEstablishment?.id === est.id && styles.selectedCard]}
                                        onPress={() => handleEstablishmentSelect(est)}
                                    >
                                        <View style={styles.establishmentHeader}>
                                            <View style={styles.establishmentIcon}><Ionicons name="location" size={20}
                                                                                             color="#d4af37"/></View>
                                            <View style={styles.establishmentInfo}>
                                                <Text
                                                    style={[styles.cardTitle, {fontSize: responsiveValues.font(16, 18, 20)}]}>{est.name || est.nome}</Text>
                                                <Text style={styles.cardText}>{est.address || est.endereco}</Text>
                                                <Text style={styles.cardText}>{est.contact || est.contato}</Text>
                                            </View>
                                        </View>
                                        {selectedEstablishment?.id === est.id && (
                                            <View style={styles.selectedIndicator}>
                                                <Ionicons name="checkmark-circle" size={16} color="#d4af37"/>
                                                <Text style={styles.selectedIndicatorText}>Selecionado</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.noDataContainer}>
                                <Ionicons name="business-outline" size={32} color="#666"/>
                                <Text style={styles.noDataText}>Nenhum estabelecimento disponível</Text>
                            </View>
                        )}
                    </View>

                    <View style={[styles.section, {marginBottom: responsiveValues.margin(15, 20, 25)}]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people" size={22} color="#d4af37"/>
                            <Text
                                style={[styles.sectionTitle, {fontSize: responsiveValues.font(16, 18, 20)}]}>Barbeiros</Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {loadingBarbers ? (
                                <View style={[styles.barberCard, {width: width * 0.7, alignItems: 'center'}]}>
                                    <Text style={{color: '#ccc'}}>Carregando barbeiros...</Text>
                                </View>
                            ) : (Array.isArray(barbers) && barbers.length > 0) ? (
                                barbers.map((b) => {
                                    const barberImage = getBarberImage(b);
                                    return (
                                        <TouchableOpacity
                                            key={b.id}
                                            style={[styles.barberCard, selectedBarber?.id === b.id && styles.selectedCard]}
                                            onPress={() => handleBarberSelect(b)}
                                            activeOpacity={0.9}
                                        >
                                            <View style={styles.barberHeader}>
                                                {barberImage ? (
                                                    <Image
                                                        source={barberImage}
                                                        style={styles.barberPhoto}
                                                        onError={() => handleImageError(b.id)}
                                                    />
                                                ) : (
                                                    <View style={styles.barberPhotoPlaceholder}>
                                                        <Ionicons name="person" size={44} color="#d4af37"/>
                                                    </View>
                                                )}
                                                <View style={{flex: 1}}>
                                                    <Text style={styles.barberName}>{b.nome}</Text>
                                                    {!!b.especialidades?.length && (
                                                        <Text
                                                            style={styles.barberSpecs}>{b.especialidades.join(' • ')}</Text>
                                                    )}
                                                </View>
                                            </View>
                                            {!!b.bio && <Text style={styles.barberBio}>{b.bio}</Text>}
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <View style={[styles.barberCard, {width: width * 0.7}]}>
                                    <Text style={{color: '#ccc'}}>Nenhum barbeiro cadastrado</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    <View style={[styles.section, {marginBottom: responsiveValues.margin(15, 20, 25)}]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="calendar" size={22} color="#d4af37"/>
                            <Text
                                style={[styles.sectionTitle, {fontSize: responsiveValues.font(16, 18, 20)}]}>Data</Text>
                        </View>
                        <TouchableOpacity style={[styles.card, {
                            width: responsiveValues.cardWidth(),
                            padding: responsiveValues.padding(12, 15, 18)
                        }, isDateSelected && styles.selectedCard]}
                                          onPress={() => safeSetState(setShowDatePicker, true)}>
                            <View style={styles.dateSelector}>
                                <Ionicons name="calendar-outline" size={24} color="#d4af37"/>
                                <Text
                                    style={[styles.dateText, isDateSelected && styles.selectedDateText]}>{formatDate(selectedDate)}</Text>
                            </View>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker value={selectedDate} mode="date" onChange={handleDateChange}
                                            minimumDate={new Date()}/>
                        )}
                    </View>

                    <View style={[styles.section, {marginBottom: responsiveValues.margin(15, 20, 25)}]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="time" size={22} color="#d4af37"/>
                            <Text style={[styles.sectionTitle, {fontSize: responsiveValues.font(16, 18, 20)}]}>Horários
                                Disponíveis (09:00 - 18:30)</Text>
                        </View>

                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}><View style={[styles.legendColor, styles.legendAvailable]}/><Text
                                style={styles.legendText}>Disponível</Text></View>
                            <View style={styles.legendItem}><View
                                style={[styles.legendColor, styles.legendBooked]}/><Text style={styles.legendText}>Seu
                                agendamento</Text></View>
                            <View style={styles.legendItem}><View
                                style={[styles.legendColor, styles.legendUnavailable]}/><Text
                                style={styles.legendText}>Indisponível</Text></View>
                        </View>

                        {loadingSlots ? (
                            <View style={styles.loadingSlotsContainer}>
                                <ActivityIndicator size="small" color="#d4af37"/>
                                <Text style={styles.loadingText}>Carregando horários...</Text>
                            </View>
                        ) : (
                            <View style={styles.timeSlotsContainer}>
                                {availableSlots.map(renderTimeSlot)}
                            </View>
                        )}
                    </View>

                    <View style={[styles.section, {marginBottom: responsiveValues.margin(20, 30, 40)}]}>
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                {
                                    width: responsiveValues.cardWidth(),
                                    paddingVertical: responsiveValues.padding(14, 16, 18)
                                },
                                (!selectedService || !selectedEstablishment || !selectedBarber || !selectedSlot) && styles.confirmButtonDisabled
                            ]}
                            onPress={handleConfirmAppointment}
                            disabled={!selectedService || !selectedEstablishment || !selectedBarber || !selectedSlot || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff"/>
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                                    <Text style={styles.confirmButtonText}>Confirmar Agendamento</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#0f0f0f'},
    gradient: {flex: 1},
    scrollView: {flex: 1},
    contentContainer: {paddingBottom: 40},
    header: {alignItems: 'center', marginTop: 20},
    welcomeContainer: {alignItems: 'center'},
    welcomeText: {color: '#fff', fontWeight: 'bold', textAlign: 'center'},
    subtitle: {color: '#ccc', textAlign: 'center', marginTop: 8},
    section: {width: '100%'},
    sectionHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
    sectionTitle: {color: '#fff', fontWeight: '600', marginLeft: 8},
    card: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    selectedCard: {borderColor: '#d4af37', backgroundColor: '#1f1f1f'},
    cardTitle: {color: '#fff', fontWeight: '600', marginBottom: 4},
    cardText: {color: '#ccc', fontSize: 14},
    selectedCardText: {color: '#d4af37', fontWeight: '600', fontSize: 16, marginBottom: 4},
    serviceHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8},
    serviceIcon: {marginRight: 12, marginTop: 2},
    serviceInfo: {flex: 1},
    changeServiceButton: {flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start'},
    changeServiceButtonText: {color: '#d4af37', marginLeft: 4, fontSize: 14},
    verticalContainer: {alignItems: 'center'},
    establishmentHeader: {flexDirection: 'row', alignItems: 'flex-start'},
    establishmentIcon: {marginRight: 12, marginTop: 2},
    establishmentInfo: {flex: 1},
    selectedIndicator: {flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start'},
    selectedIndicatorText: {color: '#d4af37', marginLeft: 4, fontSize: 14},
    noDataContainer: {alignItems: 'center', padding: 20},
    noDataText: {color: '#666', marginTop: 8, textAlign: 'center'},
    barberCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        padding: 15,
        marginRight: 12,
        width: 280,
    },
    barberHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8},
    barberPhoto: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
        backgroundColor: '#2a2a2a',
    },
    barberPhotoPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
        backgroundColor: '#2a2a2a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    barberName: {color: '#fff', fontWeight: '600', fontSize: 16, marginBottom: 4},
    barberSpecs: {color: '#d4af37', fontSize: 12},
    barberBio: {color: '#ccc', fontSize: 12, marginTop: 4},
    dateSelector: {flexDirection: 'row', alignItems: 'center'},
    dateText: {color: '#ccc', fontSize: 16, marginLeft: 12, flex: 1},
    selectedDateText: {color: '#d4af37', fontWeight: '600'},
    legendContainer: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, flexWrap: 'wrap'},
    legendItem: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, marginVertical: 2},
    legendColor: {width: 12, height: 12, borderRadius: 6, marginRight: 4},
    legendAvailable: {backgroundColor: '#28a745'},
    legendBooked: {backgroundColor: '#FFA500'},
    legendUnavailable: {backgroundColor: '#dc3545'},
    legendText: {color: '#ccc', fontSize: 12},
    loadingSlotsContainer: {alignItems: 'center', padding: 20},
    timeSlotsContainer: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center'},
    timeSlot: {
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeSlotSelected: {borderColor: '#d4af37', backgroundColor: '#1f1f1f'},
    timeSlotDisabled: {borderColor: '#dc3545', backgroundColor: '#2a1a1a'},
    timeSlotBookedByUser: {borderColor: '#FFA500', backgroundColor: '#2a2a1a'},
    timeSlotText: {color: '#ccc', fontSize: 14, fontWeight: '500'},
    timeSlotTextSelected: {color: '#d4af37', fontWeight: '600'},
    timeSlotTextDisabled: {color: '#666'},
    timeSlotTextBookedByUser: {color: '#FFA500'},
    slotIcon: {position: 'absolute', top: 4, right: 4},
    confirmButton: {
        backgroundColor: '#d4af37',
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#d4af37',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmButtonDisabled: {backgroundColor: '#666', shadowOpacity: 0},
    confirmButtonText: {color: '#000', fontWeight: 'bold', fontSize: 16, marginLeft: 8},
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    loadingText: {color: '#ccc', marginTop: 12},
    errorContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20},
    errorText: {color: '#dc3545', textAlign: 'center', marginBottom: 20, fontSize: 16},
    retryButton: {backgroundColor: '#d4af37', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8},
    retryButtonText: {color: '#000', fontWeight: 'bold'},
});

export default AppointmentScreen;