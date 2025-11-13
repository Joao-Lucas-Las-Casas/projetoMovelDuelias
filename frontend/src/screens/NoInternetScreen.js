import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

const NoInternetScreen = ({onRetry}) => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const checkInitialConnection = async () => {
            const netInfoState = await NetInfo.fetch();
            setIsConnected(netInfoState.isConnected);
        };

        checkInitialConnection();

        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            if (state.isConnected && onRetry) {
                onRetry();
            }
        });

        return () => {
            unsubscribe();
        };
    }, [onRetry]);

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        }
    };

    if (isConnected) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="wifi-outline" size={80} color="#666"/>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Sem Conexão com a Internet</Text>
                        <Text style={styles.message}>
                            Verifique sua conexão Wi-Fi ou dados móveis e tente novamente.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRetry}
                    >
                        <Ionicons name="refresh" size={20} color="#1a1a1a"/>
                        <Text style={styles.retryText}>Tentar Novamente</Text>
                    </TouchableOpacity>

                    <View style={styles.tipsCard}>
                        <View style={styles.tipsHeader}>
                            <Ionicons name="bulb-outline" size={20} color="#d4af37"/>
                            <Text style={styles.tipsTitle}>Dicas para resolver</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#d4af37"/>
                            <Text style={styles.tip}>Verifique se o Wi-Fi está ativado</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#d4af37"/>
                            <Text style={styles.tip}>Ative os dados móveis</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#d4af37"/>
                            <Text style={styles.tip}>Reinicie o roteador</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#d4af37"/>
                            <Text style={styles.tip}>Saia do modo avião</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    iconContainer: {
        marginBottom: 30,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center',
        lineHeight: 24,
    },
    retryButton: {
        backgroundColor: '#d4af37',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#d4af37',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    retryText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    tipsCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        width: '100%',
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d4af37',
        marginLeft: 8,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tip: {
        fontSize: 14,
        color: '#cccccc',
        marginLeft: 8,
        flex: 1,
    },
});

export default NoInternetScreen;