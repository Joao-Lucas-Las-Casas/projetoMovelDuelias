import React, {useState, useEffect, useRef} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {userService} from '../services/userService';

const ProfileScreen = ({navigation}) => {
    const {user, logout, updateProfile, changePassword, updateUser, updateAuthUser} = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [contato, setContato] = useState('');
    const [foto, setFoto] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [loadingLogout, setLoadingLogout] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const userData = await userService.getMe();
            if (userData && mountedRef.current) {
                setNome(userData?.nome || '');
                setEmail(userData?.email || '');
                setContato(userData?.contato || '');
                setFoto(userData?.foto || null);

                if (updateAuthUser && userData?.id === user?.id) {
                    const currentUserJson = JSON.stringify(user);
                    const newUserJson = JSON.stringify(userData);

                    if (currentUserJson !== newUserJson) {
                        console.log('🔄 Atualizando contexto com dados frescos do servidor');
                        updateAuthUser(userData);
                    }
                }
            }
        } catch (error) {
            console.log('❌ Erro ao carregar dados do usuário:', error);
        }
    };

    const formatContato = (value) => {
        const v = (value || '').replace(/\D/g, '').slice(0, 11);
        if (v.length <= 2) return v;
        if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
        return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    };

    const getTipoUsuario = () => {
        if (user?.tipoUsuario === 1) return 'Administrador';
        return 'Usuário';
    };

    const pickImage = async () => {
        if (!isEditing) {
            Alert.alert('Atenção', 'Clique em "Editar Perfil" para alterar sua foto.');
            return;
        }

        try {
            const {status: galleryStatus} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            const {status: cameraStatus} = await ImagePicker.requestCameraPermissionsAsync();

            if (galleryStatus !== 'granted' || cameraStatus !== 'granted') {
                Alert.alert(
                    'Permissão necessária',
                    'Precisamos de acesso à sua câmera e galeria para alterar a foto de perfil.'
                );
                return;
            }

            Alert.alert(
                'Alterar Foto',
                'Escolha uma opção:',
                [
                    {
                        text: 'Tirar Foto',
                        onPress: () => takePhoto(),
                        style: 'default'
                    },
                    {
                        text: 'Escolher da Galeria',
                        onPress: () => openGallery(),
                        style: 'default'
                    },
                    {
                        text: 'Cancelar',
                        style: 'cancel'
                    }
                ]
            );

        } catch (error) {
            console.log('❌ Erro ao solicitar permissões:', error);
            Alert.alert('Erro', 'Não foi possível acessar a câmera ou galeria.');
        }
    };

    const takePhoto = async () => {
        try {
            console.log('📸 Abrindo câmera...');

            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const selectedImage = result.assets[0];
                console.log('🖼️ Nova foto tirada:', selectedImage.uri);
                setFoto(selectedImage.uri);
                await savePhotoToProfile(selectedImage.uri);
            }

        } catch (error) {
            console.log('❌ Erro ao tirar foto:', error);
            Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
        }
    };

    const openGallery = async () => {
        try {
            console.log('🖼️ Abrindo galeria...');

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const selectedImage = result.assets[0];
                console.log('🖼️ Nova imagem selecionada:', selectedImage.uri);
                setFoto(selectedImage.uri);
                await savePhotoToProfile(selectedImage.uri);
            }

        } catch (error) {
            console.log('❌ Erro ao abrir galeria:', error);
            Alert.alert('Erro', 'Não foi possível acessar a galeria. Tente novamente.');
        }
    };

    const savePhotoToProfile = async (imageUri) => {
        try {
            console.log('💾 Salvando foto no perfil...');

            const payload = {
                nome: nome || user?.nome || '',
                contato: contato || user?.contato || '',
                foto: imageUri
            };

            console.log('🌐 Chamando userService.updateMe para salvar foto...');
            const savedUser = await userService.updateMe(payload);

            if (savedUser) {
                console.log('✅ Foto salva com sucesso no perfil');

                await AsyncStorage.setItem('userData', JSON.stringify(savedUser));

                if (updateAuthUser) {
                    updateAuthUser(savedUser);
                }

                Alert.alert('Sucesso', 'Foto atualizada com sucesso!');
            } else {
                throw new Error('Falha ao salvar foto no perfil');
            }

        } catch (error) {
            console.log('❌ Erro ao salvar foto:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            Alert.alert(
                'Atenção',
                'Foto alterada localmente, mas houve um problema ao salvar no servidor.'
            );
        }
    };

    const handleSaveProfile = async () => {
        console.log('💾 Iniciando salvamento do perfil...');

        if (!nome.trim()) {
            Alert.alert('Erro', 'Por favor, informe seu nome completo.');
            return;
        }

        try {
            setLoading(true);
            const payload = {nome, contato, foto};

            console.log('🌐 Chamando userService.updateMe para atualizar perfil...');
            const savedUser = await userService.updateMe(payload);

            if (savedUser) {
                await AsyncStorage.setItem('userData', JSON.stringify(savedUser));

                if (updateAuthUser) {
                    updateAuthUser(savedUser);
                }

                setIsEditing(false);
                Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
            } else {
                throw new Error('Falha ao atualizar perfil');
            }
        } catch (error) {
            console.log('❌ Erro ao salvar perfil:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            let errorMessage = 'Não foi possível salvar seu perfil.';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            Alert.alert('Erro', errorMessage);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            Alert.alert('Atenção', 'Preencha todos os campos de senha.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            Alert.alert('Atenção', 'As senhas novas não conferem.');
            return;
        }

        if (currentPassword === newPassword) {
            Alert.alert('Atenção', 'A nova senha não pode ser igual à senha atual.');
            return;
        }

        try {
            setPasswordLoading(true);

            console.log('🔄 Iniciando alteração permanente de senha...');
            const result = await changePassword(currentPassword, newPassword);

            if (result.success) {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');

                Alert.alert(
                    'Sucesso',
                    'Senha alterada permanentemente com sucesso!',
                    [{text: 'OK', onPress: () => console.log('✅ Usuário confirmou alteração de senha')}]
                );

                console.log('🎉 Senha alterada - mudança PERMANENTE confirmada');

            } else {
                Alert.alert('Erro', result.error || 'Não foi possível alterar a senha.');
            }

        } catch (error) {
            console.log('❌ Erro inesperado ao alterar senha:', error);
            Alert.alert('Erro', 'Ocorreu um erro inesperado ao alterar a senha.');
        } finally {
            if (mountedRef.current) {
                setPasswordLoading(false);
            }
        }
    };

    const handleSignOut = async () => {
        if (loadingLogout) return;

        try {
            setLoadingLogout(true);
            console.log('🚪 Chamando logout do AuthContext...');

            await logout();

            console.log('✅ Logout realizado - navegação automática pelo key dinâmica');
        } catch (error) {
            console.log('❌ Erro ao fazer logout:', error);
            if (mountedRef.current) {
                Alert.alert('Erro', 'Não foi possível sair da conta.');
            }
        } finally {
            if (mountedRef.current) {
                setLoadingLogout(false);
            }
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setDeleteLoading(true);

            console.log('🗑️ Iniciando exclusão de conta...');
            const response = await api.delete('/profile');

            console.log('✅ Conta excluída com sucesso:', response.data);
            Alert.alert('Conta excluída', 'Sua conta foi removida com sucesso.');

            await handleSignOut();

        } catch (error) {
            console.log('❌ Erro ao excluir conta:', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message
            });

            let errorMessage = 'Não foi possível excluir sua conta.';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            Alert.alert('Erro', errorMessage);
        } finally {
            if (mountedRef.current) {
                setDeleteLoading(false);
                setShowDeleteModal(false);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoid}
                >
                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        <View style={styles.content}>
                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.welcomeContainer}>
                                    <Text style={styles.welcomeText}>Meu Perfil</Text>
                                    <Text style={styles.subtitle}>Gerencie suas informações pessoais</Text>
                                </View>
                            </View>

                            {/* Informações do Perfil */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="person" size={22} color="#d4af37"/>
                                    <Text style={styles.sectionTitle}>Informações Pessoais</Text>
                                </View>

                                <View style={styles.card}>
                                    <TouchableOpacity
                                        onPress={pickImage}
                                        disabled={!isEditing}
                                        style={styles.avatarContainer}
                                        activeOpacity={0.7}
                                    >
                                        {foto ? (
                                            <Image
                                                source={{uri: foto}}
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View style={styles.avatar}>
                                                <View style={styles.iconContainer}>
                                                    <Ionicons name="person" size={100} color="#888"/>
                                                </View>
                                            </View>
                                        )}

                                        {isEditing && (
                                            <View style={styles.editPhotoBadge}>
                                                <Ionicons name="camera" size={16} color="#1a1a1a"/>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    {isEditing && (
                                        <Text style={styles.photoHintText}>
                                            Clique na foto para alterar
                                        </Text>
                                    )}

                                    <Text style={styles.userName}>{user?.nome || 'Nome do Usuário'}</Text>
                                    <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>

                                    <View style={styles.infoSection}>
                                        <Text style={styles.inputLabel}>Nome Completo</Text>
                                        {isEditing ? (
                                            <TextInput
                                                style={styles.input}
                                                value={nome}
                                                onChangeText={setNome}
                                                placeholder="Digite seu nome completo"
                                                placeholderTextColor="#888"
                                            />
                                        ) : (
                                            <Text style={styles.infoValue}>{user?.nome || 'Não informado'}</Text>
                                        )}
                                    </View>

                                    <View style={styles.infoSection}>
                                        <Text style={styles.inputLabel}>Email</Text>
                                        {isEditing ? (
                                            <TextInput
                                                style={[styles.input, {opacity: 0.6}]}
                                                value={email}
                                                editable={false}
                                                selectTextOnFocus={false}
                                                placeholder="Seu email (não pode ser alterado)"
                                                placeholderTextColor="#888"
                                            />
                                        ) : (
                                            <Text style={styles.infoValue}>{user?.email || 'Não informado'}</Text>
                                        )}
                                    </View>

                                    <View style={styles.infoSection}>
                                        <Text style={styles.inputLabel}>Contato (WhatsApp)</Text>
                                        {isEditing ? (
                                            <TextInput
                                                style={styles.input}
                                                value={formatContato(contato)}
                                                onChangeText={(text) => {
                                                    const numbers = text.replace(/\D/g, '');
                                                    setContato(numbers);
                                                }}
                                                placeholder="(00) 00000-0000"
                                                placeholderTextColor="#888"
                                                keyboardType="phone-pad"
                                                maxLength={15}
                                            />
                                        ) : (
                                            <Text style={styles.infoValue}>
                                                {user?.contato ? formatContato(user.contato) : 'Não informado'}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={styles.infoSection}>
                                        <Text style={styles.inputLabel}>Tipo de Usuário</Text>
                                        <Text style={styles.infoValue}>{getTipoUsuario()}</Text>
                                    </View>

                                    {isEditing ? (
                                        <View style={styles.editActions}>
                                            <TouchableOpacity
                                                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                                                onPress={() => {
                                                    setIsEditing(false);
                                                    setNome(user?.nome || '');
                                                    setContato(user?.contato || '');
                                                    setFoto(user?.foto || null);
                                                }}
                                                disabled={loading}
                                            >
                                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.saveButton, loading && styles.buttonDisabled]}
                                                onPress={handleSaveProfile}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator size="small" color="#ffffff"/>
                                                ) : (
                                                    <Text style={styles.saveButtonText}>Salvar</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => setIsEditing(true)}
                                        >
                                            <Ionicons name="create-outline" size={20} color="#1a1a1a"/>
                                            <Text style={styles.editButtonText}>Editar Perfil</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Alteração de Senha */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="lock-closed" size={22} color="#d4af37"/>
                                    <Text style={styles.sectionTitle}>Alterar Senha</Text>
                                </View>

                                <View style={styles.card}>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Senha Atual</Text>
                                        <View style={styles.passwordInputWrapper}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                value={currentPassword}
                                                onChangeText={setCurrentPassword}
                                                secureTextEntry={!showCurrentPassword}
                                                placeholder="Digite sua senha atual"
                                                placeholderTextColor="#888"
                                            />
                                            <TouchableOpacity
                                                style={styles.eyeIcon}
                                                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                <Ionicons name={showCurrentPassword ? 'eye-off' : 'eye'} size={20}
                                                          color="#888"/>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Nova Senha</Text>
                                        <View style={styles.passwordInputWrapper}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                value={newPassword}
                                                onChangeText={setNewPassword}
                                                secureTextEntry={!showNewPassword}
                                                placeholder="Digite sua nova senha"
                                                placeholderTextColor="#888"
                                            />
                                            <TouchableOpacity
                                                style={styles.eyeIcon}
                                                onPress={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20}
                                                          color="#888"/>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
                                        <View style={styles.passwordInputWrapper}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                value={confirmNewPassword}
                                                onChangeText={setConfirmNewPassword}
                                                secureTextEntry={!showConfirmNewPassword}
                                                placeholder="Confirme sua nova senha"
                                                placeholderTextColor="#888"
                                            />
                                            <TouchableOpacity
                                                style={styles.eyeIcon}
                                                onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                            >
                                                <Ionicons name={showConfirmNewPassword ? 'eye-off' : 'eye'} size={20}
                                                          color="#888"/>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.changePasswordButton, (passwordLoading || loading) && styles.buttonDisabled]}
                                        onPress={handleChangePassword}
                                        disabled={passwordLoading || loading}
                                    >
                                        {passwordLoading ? (
                                            <ActivityIndicator size="small" color="#1a1a1a"/>
                                        ) : (
                                            <Text style={styles.changePasswordButtonText}>Salvar Nova Senha</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Sair - SEM CARD AO REDOR */}
                            <View style={styles.section}>
                                <TouchableOpacity
                                    style={[styles.logoutButton, loadingLogout && styles.buttonDisabled]}
                                    onPress={handleSignOut}
                                    disabled={loadingLogout}
                                >
                                    {loadingLogout ? (
                                        <ActivityIndicator size="small" color="#1a1a1a"/>
                                    ) : (
                                        <>
                                            <Ionicons name="log-out-outline" size={24} color="#1a1a1a"/>
                                            <Text style={styles.logoutButtonText}>Sair da conta</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Excluir conta - SEM CARD AO REDOR */}
                            <View style={styles.section}>
                                <Text style={styles.dangerText}>Ao excluir sua conta, seus dados serão removidos.</Text>
                                <TouchableOpacity
                                    style={[styles.deleteAccountButton, deleteLoading && styles.buttonDisabled]}
                                    onPress={() => setShowDeleteModal(true)}
                                >
                                    <Ionicons name="trash-outline" size={24} color="#fff"/>
                                    <Text style={styles.deleteAccountButtonText}>Excluir Minha Conta</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>

            {/* Modal de confirmação de exclusão */}
            <Modal
                transparent
                visible={showDeleteModal}
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="warning" size={48} color="#d4af37"/>
                        </View>

                        <Text style={styles.modalTitle}>Excluir Conta Permanentemente</Text>

                        <Text style={styles.modalDesc}>
                            Esta ação <Text style={styles.highlight}>não pode ser desfeita</Text>. Todos os seus dados,
                            agendamentos e histórico serão permanentemente removidos do sistema.
                        </Text>

                        <View style={styles.modalWarning}>
                            <Ionicons name="information-circle" size={16} color="#d4af37"/>
                            <Text style={styles.modalWarningText}>
                                Você perderá acesso imediato à sua conta
                            </Text>
                        </View>

                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnOutline]}
                                onPress={() => setShowDeleteModal(false)}
                                disabled={deleteLoading}
                            >
                                <Text style={[styles.modalBtnText, styles.modalBtnTextOutline]}>Manter Conta</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnDanger]}
                                onPress={handleDeleteAccount}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <ActivityIndicator size="small" color="#ffffff"/>
                                ) : (
                                    <>
                                        <Ionicons name="trash-outline" size={18} color="#ffffff"/>
                                        <Text style={styles.modalBtnText}>Excluir Conta</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    gradient: {flex: 1},
    keyboardAvoid: {flex: 1},
    scrollView: {flex: 1},
    content: {padding: 20, paddingBottom: 40},

    header: {marginBottom: 30},
    welcomeContainer: {alignItems: 'center'},
    welcomeText: {fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, textAlign: 'center'},
    subtitle: {fontSize: 16, color: '#cccccc', textAlign: 'center'},

    section: {marginBottom: 30},
    sectionHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 15},
    sectionTitle: {fontSize: 20, fontWeight: 'bold', color: '#d4af37', marginLeft: 8},

    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        alignItems: 'center',
    },

    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
        alignItems: 'center',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#ccc',
        borderWidth: 3,
        borderColor: '#d4af37',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    iconContainer: {
        marginTop: -10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editPhotoBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#d4af37',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1a1a1a',
    },
    photoHintText: {
        fontSize: 12,
        color: '#d4af37',
        marginBottom: 10,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    userName: {fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 4},
    userEmail: {fontSize: 14, color: '#cccccc', marginBottom: 20},

    infoSection: {width: '100%', marginBottom: 15},
    inputLabel: {fontSize: 14, fontWeight: '600', color: '#d4af37', marginBottom: 6},
    infoValue: {fontSize: 16, color: '#ffffff', paddingVertical: 8},

    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },

    editActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        width: '100%'
    },
    cancelButton: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#d4af37',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    cancelButtonText: {
        color: '#d4af37',
        fontWeight: 'bold',
        fontSize: 16,
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#d4af37',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    saveButtonText: {
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: 16,
    },

    editButton: {
        flexDirection: 'row',
        backgroundColor: '#d4af37',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        marginTop: 10,
        minHeight: 52,
    },
    editButtonText: {
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: 16,
    },

    inputContainer: {width: '100%', marginBottom: 15},
    passwordInputWrapper: {position: 'relative'},
    passwordInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
        paddingRight: 45,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    eyeIcon: {position: 'absolute', right: 12, top: 12},

    changePasswordButton: {
        backgroundColor: '#d4af37',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        minHeight: 52,
    },
    changePasswordButtonText: {
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: 16,
    },

    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#d4af37',
        borderRadius: 10,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 58,
    },
    logoutButtonText: {
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: 16
    },

    deleteAccountButton: {
        flexDirection: 'row',
        backgroundColor: '#D32F2F',
        borderRadius: 10,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
        minHeight: 58,
    },
    deleteAccountButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16
    },

    dangerText: {
        fontSize: 12,
        color: '#ff6b6b',
        textAlign: 'center',
        marginBottom: 8,
    },

    buttonDisabled: {opacity: 0.6},

    // Modal styles
    centeredView: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#2a2a2a',
        borderRadius: 20,
        padding: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 15,
        shadowOffset: {width: 0, height: 8},
        borderWidth: 2,
        borderColor: '#d4af37',
    },
    modalIconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 12,
    },
    modalDesc: {
        fontSize: 15,
        color: '#e0e0e0',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    highlight: {
        color: '#d4af37',
        fontWeight: 'bold',
    },
    modalWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    modalWarningText: {
        color: '#d4af37',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },

    modalButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        minHeight: 56,
    },
    modalBtnOutline: {
        borderWidth: 2,
        borderColor: '#d4af37',
        backgroundColor: 'transparent',
    },
    modalBtnDanger: {
        backgroundColor: '#D32F2F',
    },
    modalBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    modalBtnTextOutline: {
        color: '#d4af37',
    },
});

export default ProfileScreen;