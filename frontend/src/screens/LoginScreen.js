import React, {useState} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../contexts/AuthContext';

const LoginScreen = ({navigation}) => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const {signIn} = useAuth();

    const handleLogin = async () => {
        if (submitting) return;

        if (!email || !senha) {
            Alert.alert('Erro', 'Por favor, preencha email e senha.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Erro', 'Por favor, insira um email válido.');
            return;
        }

        setSubmitting(true);

        try {
            console.log('🔑 Iniciando login para:', email);
            const result = await signIn(email.trim().toLowerCase(), senha);

            console.log('✅ RESPOSTA LOGIN COMPLETA:', result);
            console.log('🔍 Dados do usuário:', result.user);
            console.log('🔍 Tipo de usuário:', result.user?.tipoUsuario);
            console.log('🔍 Muda senha:', result.mudaSenha);

            if (result?.success) {
                const userType = result.user?.tipoUsuario;
                const isAdmin = userType === 1 || userType === '1';
                const mudaSenha = result.mudaSenha === 1 || result.mudaSenha === true;

                console.log('🎯 Tipo de usuário detectado:', userType);
                console.log('🎯 É admin?', isAdmin);
                console.log('🎯 Precisa mudar senha?', mudaSenha);

                if (mudaSenha) {
                    console.log('🔄 REDIRECIONANDO PARA MUDANÇA DE SENHA');
                    setSubmitting(false);
                    navigation.navigate('ChangePassword', {firstLogin: true});
                    return;
                }

                console.log('✅ Login bem-sucedido - navegação automática pelo key dinâmica');

            } else {
                console.log('❌ Login falhou:', result?.error);
                Alert.alert(
                    'Falha no login',
                    result?.error || 'Verifique suas credenciais e tente novamente.'
                );
            }
        } catch (error) {
            console.log('💥 Erro inesperado no login:', error);
            Alert.alert(
                'Erro',
                'Ocorreu um erro inesperado ao tentar entrar. Tente novamente.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegister = () => {
        navigation.navigate('Register');
    };

    const handleForgotPassword = () => {
        navigation.navigate('ForgotPassword');
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.content}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.title}>Entrar</Text>
                                <Text style={styles.subtitle}>
                                    É um prazer tê-lo de volta!
                                </Text>
                            </View>

                            {/* Logo */}
                            <View style={styles.logoContainer}>
                                <View style={styles.logoPlaceholder}>
                                    <Ionicons name="cut" size={40} color="#1a1a1a"/>
                                    <Text style={styles.logoText}>DUELIAS</Text>
                                </View>
                            </View>

                            {/* Form */}
                            <View style={styles.formContainer}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Digite seu email"
                                        placeholderTextColor="#888"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="email"
                                        importantForAutofill="yes"
                                        textContentType="emailAddress"
                                        editable={!submitting}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Senha</Text>
                                    <View style={styles.passwordInputWrapper}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            value={senha}
                                            onChangeText={setSenha}
                                            placeholder="Digite sua senha"
                                            placeholderTextColor="#888"
                                            secureTextEntry={!isPasswordVisible}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            autoComplete="password"
                                            importantForAutofill="yes"
                                            textContentType="password"
                                            editable={!submitting}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                            disabled={submitting}
                                        >
                                            <Ionicons
                                                name={isPasswordVisible ? 'eye-off' : 'eye'}
                                                size={24}
                                                color="#888"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.forgotPasswordButton, submitting && styles.buttonDisabled]}
                                    onPress={handleForgotPassword}
                                    disabled={submitting}
                                >
                                    <Text style={styles.forgotPasswordText}>
                                        Esqueceu sua senha?
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
                                    onPress={handleLogin}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#1a1a1a"/>
                                    ) : (
                                        <Text style={styles.loginButtonText}>
                                            Entrar
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Não tem uma conta?</Text>
                                <TouchableOpacity
                                    onPress={handleRegister}
                                    disabled={submitting}
                                >
                                    <Text style={[styles.footerLink, submitting && styles.buttonDisabled]}>
                                        Criar conta
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 30,
        paddingVertical: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#d4af37',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#d4af37',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 3,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    logoText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
        letterSpacing: 2,
        marginTop: 8,
    },
    formContainer: {
        marginVertical: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        color: '#d4af37',
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    passwordInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#ffffff',
    },
    eyeIcon: {
        padding: 10,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: 30,
        padding: 5,
    },
    forgotPasswordText: {
        color: '#d4af37',
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: '#d4af37',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#d4af37',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        minHeight: 52,
        justifyContent: 'center',
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#1a1a1a',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        paddingVertical: 10,
    },
    footerText: {
        color: '#cccccc',
        fontSize: 16,
        marginRight: 5,
    },
    footerLink: {
        color: '#d4af37',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default LoginScreen;