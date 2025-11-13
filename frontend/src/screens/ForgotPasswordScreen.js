import React, {useState} from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../contexts/AuthContext';

function ForgotPasswordScreen({navigation}) {
    const {forgotPassword, resetPassword} = useAuth();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleForgot = async () => {
        if (!email) return Alert.alert('Erro', 'Informe seu e-mail.');
        setLoading(true);
        const res = await forgotPassword(email.trim());
        setLoading(false);
        if (res.success) {
            if (res.token) setToken(res.token); // debug token local
            Alert.alert('Código enviado', res.message);
            setStep(2);
        } else {
            Alert.alert('Erro', res.error || 'Falha ao enviar instruções.');
        }
    };

    const handleReset = async () => {
        if (!token || !newPassword || !confirmPassword)
            return Alert.alert('Erro', 'Preencha todos os campos.');

        if (newPassword !== confirmPassword)
            return Alert.alert('Erro', 'As senhas não coincidem.');

        setLoading(true);
        const res = await resetPassword(token.trim(), newPassword);
        setLoading(false);

        if (res.success) {
            Alert.alert('Sucesso', 'Senha redefinida com sucesso!', [
                {text: 'OK', onPress: () => navigation.replace('Login')},
            ]);
        } else {
            Alert.alert('Erro', res.error || 'Falha ao redefinir senha.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={{flex: 1}}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={28} color="#d4af37"/>
                        </TouchableOpacity>

                        <Text style={styles.title}>
                            {step === 1 ? 'Recuperar Senha' : 'Redefinir Senha'}
                        </Text>

                        {step === 1 ? (
                            <>
                                <Text style={styles.label}>E-mail</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="seuemail@exemplo.com"
                                    placeholderTextColor="#888"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <TouchableOpacity
                                    style={[styles.button, loading && {opacity: 0.5}]}
                                    onPress={handleForgot}
                                    disabled={loading}>
                                    {loading ? <ActivityIndicator color="#000"/> :
                                        <Text style={styles.buttonText}>Enviar código</Text>}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.label}>Código recebido</Text>
                                <TextInput
                                    style={styles.input}
                                    value={token}
                                    onChangeText={setToken}
                                    placeholder="Cole o código"
                                    placeholderTextColor="#888"
                                    autoCapitalize="none"
                                />

                                <Text style={styles.label}>Nova senha</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Nova senha"
                                    placeholderTextColor="#888"
                                    secureTextEntry
                                />

                                <Text style={styles.label}>Confirmar senha</Text>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirmar nova senha"
                                    placeholderTextColor="#888"
                                    secureTextEntry
                                />

                                <TouchableOpacity
                                    style={[styles.button, loading && {opacity: 0.5}]}
                                    onPress={handleReset}
                                    disabled={loading}>
                                    {loading ? <ActivityIndicator color="#000"/> :
                                        <Text style={styles.buttonText}>Redefinir</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.link} onPress={() => setStep(1)}>
                                    <Text style={styles.linkText}>Solicitar novo código</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        padding: 32,
        paddingTop: 80,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    label: {
        color: '#d4af37',
        fontSize: 16,
        marginBottom: 6
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: 14,
        color: '#fff',
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.2)',
    },
    button: {
        backgroundColor: '#d4af37',
        borderRadius: 10,
        padding: 14,
        marginTop: 10
    },
    buttonText: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#1a1a1a',
        fontSize: 16
    },
    link: {
        marginTop: 10,
        alignItems: 'center'
    },
    linkText: {
        color: '#d4af37',
        fontSize: 14
    },
});

export default ForgotPasswordScreen;