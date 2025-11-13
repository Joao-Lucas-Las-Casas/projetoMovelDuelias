import React, {useState, useEffect, useCallback} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';

import {serviceService, ServicesEvents} from '../services/serviceService';
import ServiceIcon from '../components/ServiceIcon';

const ServicesScreen = ({navigation}) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadServices = async () => {
        try {
            setLoading(true);
            const res = await serviceService.getServices();

            if (res?.success) {
                const data = Array.isArray(res.data) ? res.data :
                    Array.isArray(res.services) ? res.services :
                        Array.isArray(res) ? res : [];
                setServices(data);
            } else {
                setServices([]);
                console.log('⚠️ Nenhum serviço encontrado');
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            Alert.alert('Erro', 'Não foi possível carregar os serviços');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadServices();
        }, [])
    );

    useEffect(() => {
        const unsubscribe = ServicesEvents.on(() => {
            loadServices();
        });

        return unsubscribe;
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadServices();
    }, []);

    const handleBookService = (service) => {
        navigation.navigate('Agendar', {
            selectedService: {
                id: service.id,
                name: service.nome,
                price: service.preco,
                duration: service.duracao,
                icone: service.icone
            }
        });
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#d4af37"/>
                        <Text style={styles.loadingText}>Carregando serviços...</Text>
                    </View>
                </LinearGradient>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#d4af37']}
                            tintColor="#d4af37"
                        />
                    }
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.welcomeContainer}>
                                <Text style={styles.welcomeText}>
                                    Nossos Serviços
                                </Text>
                                <Text style={styles.subtitle}>
                                    Escolha o serviço ideal para você
                                </Text>
                            </View>
                        </View>

                        {/* Serviços */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <ServiceIcon iconKey="scissors" size={22}/>
                                <Text style={styles.sectionTitle}>Serviços Disponíveis</Text>
                            </View>

                            {services.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <ServiceIcon iconKey="scissors" size={64}/>
                                    <Text style={styles.emptyStateText}>Nenhum serviço disponível</Text>
                                    <Text style={styles.emptyStateSubtext}>
                                        Aguarde novos serviços serem cadastrados
                                    </Text>
                                </View>
                            ) : (
                                services.map((service) => (
                                    <View key={service.id} style={styles.serviceCard}>
                                        <View style={styles.serviceHeader}>
                                            <View style={styles.serviceIconContainer}>
                                                {/* ✅ CORREÇÃO: Fallback seguro */}
                                                <ServiceIcon
                                                    iconKey={service.icone || 'scissors'}
                                                    size={28}
                                                />
                                            </View>
                                            <View style={styles.serviceInfo}>
                                                <Text style={styles.serviceName}>{service.nome}</Text>
                                                <Text style={styles.serviceDescription}>
                                                    {service.descricao || 'Sem descrição'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.serviceDetails}>
                                            <View style={styles.detailRow}>
                                                <Ionicons name="time-outline" size={16} color="#d4af37"/>
                                                <Text style={styles.detailLabel}>Duração:</Text>
                                                <Text
                                                    style={styles.detailValue}>{service.duracao || service.duracaoMin || '--'} minutos</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Ionicons name="cash-outline" size={16} color="#d4af37"/>
                                                <Text style={styles.detailLabel}>Preço:</Text>
                                                <Text
                                                    style={styles.priceValue}>R$ {Number(service.preco || 0).toFixed(2).replace('.', ',')}</Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.bookButton}
                                            onPress={() => handleBookService(service)}
                                        >
                                            <Ionicons name="calendar" size={20} color="#1a1a1a"/>
                                            <Text style={styles.bookButtonText}>Agendar Agora</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
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
    },
    gradient: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
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
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center',
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#d4af37',
        marginLeft: 8,
    },
    serviceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    serviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    serviceIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 5,
    },
    serviceDescription: {
        fontSize: 14,
        color: '#cccccc',
        lineHeight: 20,
    },
    serviceDetails: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#cccccc',
        marginRight: 8,
        width: 70,
    },
    detailValue: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 18,
        color: '#d4af37',
        fontWeight: 'bold',
    },
    bookButton: {
        backgroundColor: '#d4af37',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#d4af37',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    bookButtonText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#d4af37',
        marginTop: 16,
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#888',
        marginTop: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
});

export default ServicesScreen;