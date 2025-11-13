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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../contexts/AuthContext';

const RegisterScreen = ({navigation}) => {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        contato: '',
        senha: '',
        confirmarSenha: '',
    });
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const {signUp} = useAuth();

    const handleInputChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleRegister = async () => {
        const {nome, email, contato, senha, confirmarSenha} = formData;

        if (!nome || !email || !contato || !senha || !confirmarSenha) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }
        if (!email.includes('@')) {
            Alert.alert('Erro', 'Por favor, insira um email válido');
            return;
        }

        const contatoLimpo = contato.replace(/\D/g, '');
        if (contatoLimpo.length !== 11) {
            Alert.alert('Erro', 'O WhatsApp deve ter 11 dígitos (DDD + telefone)');
            return;
        }
        if (senha.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }
        if (senha !== confirmarSenha) {
            Alert.alert('Erro', 'As senhas não coincidem');
            return;
        }

        setLoading(true);
        try {
            const result = await signUp({
                nome: nome.trim(),
                email: email.trim().toLowerCase(),
                contato: contatoLimpo,
                senha,
            });

            if (result.success) {
                Alert.alert('Sucesso', 'Conta criada! Faça login para continuar.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            setFormData({
                                nome: '',
                                email: '',
                                contato: '',
                                senha: '',
                                confirmarSenha: '',
                            });
                            navigation.navigate('Login');
                        },
                    },
                ]);
            } else {
                Alert.alert('Erro no Cadastro', result.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            Alert.alert('Erro', 'Ocorreu um erro inesperado ao criar a conta');
        } finally {
            setLoading(false);
        }
    };

    const formatContato = (text) => {
        const numbers = text.replace(/\D/g, '');
        const limited = numbers.substring(0, 11);
        if (limited.length <= 2) return limited;
        else if (limited.length <= 7)
            return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
        else
            return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.content}>
                            {/* Botão de voltar */}
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.navigate('Login')}
                            >
                                <Ionicons name="arrow-back" size={28} color="#d4af37"/>
                            </TouchableOpacity>

                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.title}>Criar Conta</Text>
                                <Text style={styles.subtitle}>Junte-se à nossa comunidade</Text>
                            </View>

                            {/* Formulário */}
                            <View style={styles.formContainer}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Nome Completo</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.nome}
                                        onChangeText={(text) => handleInputChange('nome', text)}
                                        placeholder="Digite seu nome completo"
                                        placeholderTextColor="#888"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.email}
                                        onChangeText={(text) => handleInputChange('email', text)}
                                        placeholder="Digite seu email"
                                        placeholderTextColor="#888"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>WhatsApp</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formatContato(formData.contato)}
                                        onChangeText={(text) =>
                                            handleInputChange('contato', text.replace(/\D/g, ''))
                                        }
                                        placeholder="(11) 99999-9999"
                                        placeholderTextColor="#888"
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Senha</Text>
                                    <View style={styles.passwordInputWrapper}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            value={formData.senha}
                                            onChangeText={(text) => handleInputChange('senha', text)}
                                            placeholder="Digite sua senha"
                                            placeholderTextColor="#888"
                                            secureTextEntry={!isPasswordVisible}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                        >
                                            <Ionicons
                                                name={isPasswordVisible ? 'eye-off' : 'eye'}
                                                size={24}
                                                color="#888"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Confirmar Senha</Text>
                                    <View style={styles.passwordInputWrapper}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            value={formData.confirmarSenha}
                                            onChangeText={(text) => handleInputChange('confirmarSenha', text)}
                                            placeholder="Confirme sua senha"
                                            placeholderTextColor="#888"
                                            secureTextEntry={!isConfirmPasswordVisible}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() =>
                                                setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                                            }
                                        >
                                            <Ionicons
                                                name={isConfirmPasswordVisible ? 'eye-off' : 'eye'}
                                                size={24}
                                                color="#888"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                                    onPress={handleRegister}
                                    disabled={loading}
                                >
                                    <Text style={styles.registerButtonText}>
                                        {loading ? 'Criando conta...' : 'Criar Conta'}
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
    container: {flex: 1},
    gradient: {flex: 1},
    keyboardView: {flex: 1},
    scrollContent: {flexGrow: 1},
    content: {paddingHorizontal: 30, paddingVertical: 40},
    backButton: {position: 'absolute', top: 20, left: 10, zIndex: 2},
    header: {alignItems: 'center', marginTop: 40, marginBottom: 30},
    title: {fontSize: 32, fontWeight: 'bold', color: '#fff'},
    subtitle: {fontSize: 16, color: '#ccc'},
    inputContainer: {marginBottom: 20},
    inputLabel: {fontSize: 16, color: '#d4af37', marginBottom: 8},
    input: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.2)',
    },
    passwordInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.2)',
    },
    passwordInput: {flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#fff'},
    eyeIcon: {padding: 10},
    registerButton: {
        backgroundColor: '#d4af37',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    registerButtonDisabled: {opacity: 0.6},
    registerButtonText: {color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', textAlign: 'center'},
});

export default RegisterScreen;