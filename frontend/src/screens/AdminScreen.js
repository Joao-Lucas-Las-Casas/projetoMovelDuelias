import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    ActivityIndicator, RefreshControl, Modal, TextInput, FlatList,
    ScrollView, Image
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons, Feather} from '@expo/vector-icons';
import {useAuth} from '../contexts/AuthContext';
import Toast from 'react-native-toast-message';

import {appointmentService} from '../services/appointmentService';
import {serviceService, ServicesEvents} from '../services/serviceService';
import {barberService, BarbersEvents} from '../services/barberService';
import {userService} from '../services/userService';
import ServiceIcon from '../components/ServiceIcon';

const barberImages = {
    'Carlos Lima': 'https://static.vecteezy.com/ti/fotos-gratis/t2/5889815-atraente-jovem-com-cabelo-escuro-e-moderno-penteado-vestindo-roupas-casuais-ao-ar-livre-foto.jpg',
    'Ricardo Alves': 'https://cdn.pixabay.com/photo/2016/11/21/12/42/beard-1845166_640.jpg',
};

const getBarberImage = (barber) => {
    const name = barber?.nome || '';
    return barberImages[name] ? {uri: barberImages[name]} : null;
};

const toDateObj = (raw) => {
    if (!raw && raw !== 0) return null;
    if (typeof raw === 'number') {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
    }
    const s = String(raw).trim();
    if (!s) return null;

    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
        const [yy, MM, dd, hh = '00', mm = '00', ss = '00'] = m.slice(1);
        const iso = `${yy}-${MM}-${dd}T${hh}:${mm}:${ss}`;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s.replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
};

const normalizeAdminAppointment = (raw) => {
    const dtString = raw?.dateTime ?? raw?.data;
    const dt = toDateObj(dtString);
    const status = String(raw.status || '').toLowerCase();

    return {
        id: raw.id,
        date: dt,
        status,
        serviceName: raw.servicoNome || 'Serviço',
        servicePrice: Number(raw.servicoPreco ?? 0),
        barberName: raw.barbeiroNome || 'A definir',
        customerName: raw.clienteNome || raw.email?.split('@')[0] || 'Cliente',
        _raw: raw,
    };
};

const formatDate = (d) =>
    d
        ? d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
        : '--/--/----';

const formatTime = (d) =>
    d
        ? d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})
        : '--:--';

const money = (n) => `R$ ${Number(n).toFixed(2).replace('.', ',')}`;

const isFinal = (st) => st === 'finalizado' || st === 'finalized';
const isCanceled = (st) => st === 'cancelado' || st === 'canceled';
const isScheduled = (st) =>
    st === 'agendado' || st === 'confirmado' || st === 'confirmed' || st === 'pending';

function AdminAppointments() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const list = await appointmentService.getAdminAppointments();
            const normalized = (Array.isArray(list) ? list : []).map(normalizeAdminAppointment);
            setItems(normalized);
        } catch (_e) {
            console.log('❌ Erro ao carregar agendamentos admin');
            Alert.alert('Erro', 'Não foi possível carregar os agendamentos.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load();
    }, [load]);

    useEffect(() => {
        load();
    }, [load]);

    const confirmCancel = (apt) => {
        if (isCanceled(apt.status) || isFinal(apt.status)) return;
        Alert.alert(
            'Cancelar agendamento',
            `Cancelar o agendamento de ${apt.customerName} para ${apt.serviceName}?`,
            [
                {text: 'Não', style: 'cancel'},
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await appointmentService.adminUpdateStatus(apt.id, 'cancelado');
                            Toast.show({
                                type: 'success',
                                text1: 'Agendamento cancelado',
                                position: 'bottom'
                            });
                            load();
                        } catch (_e) {
                            Toast.show({
                                type: 'error',
                                text1: 'Erro ao cancelar agendamento',
                                position: 'bottom'
                            });
                        }
                    },
                },
            ]
        );
    };

    const confirmDelete = (apt) => {
        if (!isFinal(apt.status) && !isCanceled(apt.status)) {
            Alert.alert(
                'Não permitido',
                'Só é possível apagar agendamentos finalizados ou cancelados.'
            );
            return;
        }
        Alert.alert(
            'Apagar agendamento',
            `Tem certeza que deseja apagar o agendamento de ${apt.customerName}?`,
            [
                {text: 'Não', style: 'cancel'},
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await appointmentService.adminDelete(apt.id);
                            Toast.show({
                                type: 'success',
                                text1: 'Agendamento apagado',
                                position: 'bottom'
                            });
                            load();
                        } catch (_e) {
                            Toast.show({
                                type: 'error',
                                text1: 'Erro ao apagar agendamento',
                                position: 'bottom'
                            });
                        }
                    },
                },
            ]
        );
    };

    const StatusChip = ({status}) => {
        const base = [styles.chip];
        let label = status;

        if (isScheduled(status)) {
            base.push(styles.chipGreen);
            label = 'Agendado';
        } else if (isFinal(status)) {
            base.push(styles.chipOrange);
            label = 'Finalizado';
        } else if (isCanceled(status)) {
            base.push(styles.chipRed);
            label = 'Cancelado';
        } else {
            base.push(styles.chipGray);
        }

        return (
            <View style={base}>
                <Text style={styles.chipText}>{label}</Text>
            </View>
        );
    };

    const renderItem = ({item}) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={styles.title}>
                        {item.customerName} <Text style={styles.dot}>•</Text> {item.serviceName}
                    </Text>
                </View>

                <View style={styles.statusTopRight}>
                    <StatusChip status={item.status}/>
                </View>
            </View>

            <View style={[styles.row, {marginTop: 6}]}>
                <Ionicons name="time-outline" size={16} color="#d4af37" style={styles.icon}/>
                <Text style={styles.subText}>
                    {formatDate(item.date)} • {formatTime(item.date)}
                </Text>
            </View>

            <View style={[styles.row, {marginTop: 6}]}>
                <Ionicons name="cut-outline" size={16} color="#d4af37" style={styles.icon}/>
                <Text style={styles.subText}>Barbeiro: {item.barberName}</Text>
            </View>

            <View style={{marginTop: 10}}>
                <View style={styles.pricePill}>
                    <Text style={styles.priceText}>{money(item.servicePrice)}</Text>
                </View>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[
                        styles.cancelBtn,
                        (isCanceled(item.status) || isFinal(item.status)) && styles.btnDisabled,
                    ]}
                    onPress={() => confirmCancel(item)}
                    disabled={isCanceled(item.status) || isFinal(item.status)}
                >
                    <Ionicons name="close" size={18} color="#fff"/>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.trashBtn,
                        !(isCanceled(item.status) || isFinal(item.status)) && styles.btnDisabled,
                    ]}
                    onPress={() => confirmDelete(item)}
                    disabled={!(isCanceled(item.status) || isFinal(item.status))}
                >
                    <Ionicons name="trash" size={20} color="#fff"/>
                </TouchableOpacity>
            </View>
        </View>
    );

    const keyExtractor = (item, index) => {
        const dt = item?.date || item?.dateTime || item?._raw?.created_at || '';
        return `${item.id ?? 'noid'}-${String(dt)}-${index}`;
    };

    const ListHeader = () => (
        <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={22} color="#d4af37"/>
            <Text style={styles.sectionTitle}>Agendamentos</Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#d4af37"/>
                <Text style={styles.loadingText}>Carregando agendamentos...</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                !loading && (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={64} color="#666"/>
                        <Text style={styles.emptyStateText}>Nenhum agendamento</Text>
                        <Text style={styles.emptyStateSubtext}>Quando houver agendamentos, eles aparecerão aqui.</Text>
                    </View>
                )
            }
        />
    );
}

const emptyService = {
    id: null,
    nome: '',
    preco: '',
    descricao: '',
    duracao: '',
    icone: 'scissors'
};

const emptyBarber = {
    id: null,
    nome: '',
    especialidades: '',
    bio: '',
    foto: '',
    ativo: true
};

const PRIMARY_ADMIN_ID = 1;

const confirmAction = (title, message, confirmText = 'Confirmar') =>
    new Promise((resolve) => {
        Alert.alert(title, message, [
            {text: 'Cancelar', style: 'cancel', onPress: () => resolve(false)},
            {text: confirmText, style: 'destructive', onPress: () => resolve(true)},
        ]);
    });

const AdminScreen = ({navigation}) => {
    const {user, logout} = useAuth();

    const [activeTab, setActiveTab] = useState('agendamentos');
    const [loading, setLoading] = useState(false);

    const [services, setServices] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [users, setUsers] = useState([]);

    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [serviceForm, setServiceForm] = useState(emptyService);
    const [savingService, setSavingService] = useState(false);
    const [deletingServiceId, setDeletingServiceId] = useState(null);

    const [barberModalVisible, setBarberModalVisible] = useState(false);
    const [barberForm, setBarberForm] = useState(emptyBarber);
    const [savingBarber, setSavingBarber] = useState(false);
    const [deletingBarberId, setDeletingBarberId] = useState(null);

    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const reloadingServices = useRef(false);
    const reloadingBarbers = useRef(false);
    const reloadingUsers = useRef(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const showToast = (type, text1, text2 = '') => {
        if (!mounted.current) return;

        Toast.show({
            type,
            text1,
            text2,
            position: 'bottom',
            visibilityTime: 4000,
        });
    };

    const loadUsers = useCallback(async () => {
        if (reloadingUsers.current) return;
        try {
            reloadingUsers.current = true;
            setLoading(true);
            const list = await userService.getAll();
            setUsers(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error('Erro ao carregar usuários:', e);
            if (mounted.current) {
                showToast('error', 'Erro', 'Falha ao carregar usuários.');
                setUsers([]);
            }
        } finally {
            if (mounted.current) {
                reloadingUsers.current = false;
                setLoading(false);
            }
        }
    }, []);

    const loadServices = useCallback(async () => {
        if (reloadingServices.current) return;
        try {
            reloadingServices.current = true;
            setLoading(true);
            const res = await serviceService.getServices();
            if (res?.success) {
                const data = Array.isArray(res.data) ? res.data :
                    Array.isArray(res.services) ? res.services :
                        Array.isArray(res) ? res : [];
                setServices(data);
            } else {
                setServices([]);
            }
        } catch (e) {
            console.error('Erro ao carregar serviços:', e);
            if (mounted.current) {
                showToast('error', 'Erro', 'Falha ao carregar serviços.');
            }
        } finally {
            if (mounted.current) {
                reloadingServices.current = false;
                setLoading(false);
            }
        }
    }, []);

    const loadBarbers = useCallback(async () => {
        if (reloadingBarbers.current) return;
        try {
            reloadingBarbers.current = true;
            setLoading(true);
            const res = await barberService.getBarbers();

            if (res?.success && Array.isArray(res.data)) {
                setBarbers(res.data);
            } else if (Array.isArray(res.barbers)) {
                setBarbers(res.barbers);
            } else if (Array.isArray(res)) {
                setBarbers(res);
            } else {
                setBarbers([]);
            }
        } catch (e) {
            console.error('Erro ao carregar barbeiros:', e);
            if (mounted.current) {
                setBarbers([]);
                showToast('error', 'Erro', 'Não foi possível carregar barbeiros');
            }
        } finally {
            if (mounted.current) {
                reloadingBarbers.current = false;
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const unsubscribeServices = ServicesEvents.on(() => {
            if (activeTab === 'servicos' && !reloadingServices.current && mounted.current) {
                loadServices();
            }
        });

        const unsubscribeBarbers = BarbersEvents.on(() => {
            if (activeTab === 'barbeiros' && !reloadingBarbers.current && mounted.current) {
                loadBarbers();
            }
        });

        return () => {
            unsubscribeServices?.();
            unsubscribeBarbers?.();
        };
    }, [activeTab, loadServices, loadBarbers]);

    useEffect(() => {
        if (activeTab === 'servicos') {
            loadServices();
        } else if (activeTab === 'barbeiros') {
            loadBarbers();
        } else if (activeTab === 'usuarios') {
            loadUsers();
        }
    }, [activeTab, loadServices, loadBarbers, loadUsers]);

    useEffect(() => {
        const off = BarbersEvents.on('changed', () => {
            if (activeTab === 'barbeiros' && !reloadingBarbers.current && mounted.current) {
                loadBarbers();
            }
        });
        return off;
    }, [activeTab, loadBarbers]);

    const onToggleBlock = async (u) => {
        const target = u.nome || u.email;
        const action = u.liberacao ? 'Bloquear' : 'Desbloquear';

        if (!(await confirmAction(
            `${action} usuário?`,
            `Tem certeza que deseja ${action.toLowerCase()} o usuário ${target}?`,
            action
        ))) return;

        try {
            const newLiberacao = u.liberacao ? 0 : 1;
            await userService.update(u.id, {
                liberacao: newLiberacao,
                mudaSenha: u.mudaSenha || 0,
                tipoUsuario: u.tipoUsuario || 0
            });

            showToast('success', 'Sucesso!',
                newLiberacao ? 'Usuário desbloqueado' : 'Usuário bloqueado'
            );
            loadUsers();
        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            showToast('error', 'Erro', 'Falha ao alterar status do usuário');
        }
    };

    const handleToggleRole = async (u, newRole) => {
        if (u.id === PRIMARY_ADMIN_ID) {
            showToast('error', 'Erro', 'Não é permitido alterar o admin principal');
            return;
        }

        const target = u.nome || u.email;
        const action = newRole === 1 ? 'Tornar admin' : 'Rebaixar para usuário';
        const message = newRole === 1
            ? `Tem certeza que deseja promover o usuário ${target} a administrador?\n\n⚠️ Este usuário ganhará acesso ao painel administrativo.`
            : `Tem certeza que deseja rebaixar o usuário ${target} para usuário comum?\n\n⚠️ Este usuário perderá acesso ao painel administrativo.`;

        if (!(await confirmAction(action + '?', message, action))) return;

        try {
            await userService.update(u.id, {
                liberacao: u.liberacao || 1,
                mudaSenha: u.mudaSenha || 0,
                tipoUsuario: newRole
            });

            showToast('success', 'Sucesso!',
                newRole === 1 ? 'Usuário promovido a admin' : 'Usuário rebaixado para user'
            );
            loadUsers();
        } catch (error) {
            console.error('Erro ao alterar função do usuário:', error);
            showToast('error', 'Erro', 'Falha ao alterar função do usuário');
        }
    };

    const confirmOpenPasswordModal = async (u) => {
        const target = u.nome || u.email;

        if (!(await confirmAction(
            'Alterar Senha?',
            `Deseja alterar a senha do usuário ${target}?\n\n⚠️ O usuário será obrigado a trocar a senha no próximo login.`,
            'Continuar'
        ))) return;

        setSelectedUser(u);
        setNewPassword('');
        setPasswordModalVisible(true);
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            showToast('error', 'Erro', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        try {
            setChangingPassword(true);
            await userService.setPassword(selectedUser.id, newPassword);

            await userService.update(selectedUser.id, {
                liberacao: selectedUser.liberacao || 1,
                mudaSenha: 1,
                tipoUsuario: selectedUser.tipoUsuario || 0
            });

            showToast('success', 'Sucesso!', 'Senha alterada com sucesso');
            setPasswordModalVisible(false);
            loadUsers();
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            showToast('error', 'Erro', 'Falha ao alterar senha');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleOpenServiceModal = (service = null) => {
        if (!mounted.current) return;

        if (service) {
            setServiceForm({
                id: service.id,
                nome: service.nome || '',
                preco: String(service.preco || ''),
                descricao: service.descricao || '',
                duracao: String(service.duracao || service.duracaoMin || ''),
                icone: service.icone || 'scissors'
            });
        } else {
            setServiceForm(emptyService);
        }
        setServiceModalVisible(true);
    };

    const handleSaveService = async () => {
        if (!serviceForm.nome || !serviceForm.preco || !serviceForm.duracao) {
            showToast('error', 'Erro', 'Preencha nome, preço e duração do serviço');
            return;
        }

        try {
            setSavingService(true);
            const serviceData = {
                nome: serviceForm.nome.trim(),
                descricao: serviceForm.descricao.trim(),
                preco: parseFloat(serviceForm.preco.replace(',', '.')),
                duracao: parseInt(serviceForm.duracao),
                icone: serviceForm.icone
            };

            let result;
            if (serviceForm.id) {
                result = await serviceService.update(serviceForm.id, serviceData);
            } else {
                result = await serviceService.create(serviceData);
            }

            if (result.success) {
                showToast('success', 'Sucesso!', serviceForm.id ? 'Serviço atualizado!' : 'Serviço criado!');
                setServiceModalVisible(false);
                if (activeTab === 'servicos') loadServices();
            } else {
                showToast('error', 'Erro', result.error || 'Erro ao salvar serviço');
            }
        } catch (_error) {
            console.error('Erro ao salvar serviço');
            showToast('error', 'Erro', 'Falha ao salvar serviço');
        } finally {
            if (mounted.current) {
                setSavingService(false);
            }
        }
    };

    const handleDeleteService = async (serviceId) => {
        Alert.alert(
            'Excluir Serviço',
            'Tem certeza que deseja excluir este serviço?',
            [
                {text: 'Cancelar', style: 'cancel'},
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingServiceId(serviceId);
                            const result = await serviceService.remove(serviceId);
                            if (result.success) {
                                showToast('success', 'Sucesso!', 'Serviço excluído com sucesso!');
                                if (activeTab === 'servicos') loadServices();
                            } else {
                                showToast('error', 'Erro', result.error || 'Erro ao excluir serviço');
                            }
                        } catch (_error) {
                            showToast('error', 'Erro', 'Falha ao excluir serviço');
                        } finally {
                            if (mounted.current) {
                                setDeletingServiceId(null);
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleSelectIcon = (iconKey) => {
        if (!mounted.current) return;
        setServiceForm({...serviceForm, icone: iconKey});
    };

    const handleOpenBarberModal = (barber = null) => {
        if (!mounted.current) return;

        if (barber) {
            setBarberForm({
                id: barber.id,
                nome: barber.nome || '',
                bio: barber.bio || '',
                especialidades: Array.isArray(barber.especialidades)
                    ? barber.especialidades.join(', ')
                    : (barber.especialidades || ''),
                foto: barber.foto || '',
                ativo: barber.ativo !== undefined ? barber.ativo : true
            });
        } else {
            setBarberForm(emptyBarber);
        }
        setBarberModalVisible(true);
    };

    const handleSaveBarber = async () => {
        if (!barberForm.nome?.trim()) {
            showToast('error', 'Erro', 'Informe o nome do barbeiro');
            return;
        }

        try {
            setSavingBarber(true);
            const payload = {
                nome: barberForm.nome.trim(),
                bio: barberForm.bio.trim(),
                especialidades: barberForm.especialidades.trim(),
                foto: barberForm.foto.trim(),
                ativo: barberForm.ativo ? 1 : 0
            };

            let result;
            if (barberForm.id) {
                result = await barberService.update(barberForm.id, payload);
            } else {
                result = await barberService.create(payload);
            }

            if (result.success) {
                showToast('success', 'Sucesso!', barberForm.id ? 'Barbeiro atualizado!' : 'Barbeiro criado!');
                setBarberModalVisible(false);
                if (activeTab === 'barbeiros') await loadBarbers();
            } else {
                showToast('error', 'Erro', result.error || 'Erro ao salvar barbeiro');
            }
        } catch (_error) {
            console.error('Erro ao salvar barbeiro');
            showToast('error', 'Erro', 'Falha ao salvar barbeiro');
        } finally {
            if (mounted.current) {
                setSavingBarber(false);
            }
        }
    };

    const handleDeleteBarber = (barberId) => {
        Alert.alert(
            'Excluir Barbeiro',
            'Tem certeza que deseja excluir este barbeiro?',
            [
                {text: 'Cancelar', style: 'cancel'},
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingBarberId(barberId);
                            const result = await barberService.remove(barberId);
                            if (result.success) {
                                showToast('success', 'Sucesso!', 'Barbeiro excluído com sucesso!');
                                if (activeTab === 'barbeiros') await loadBarbers();
                            } else {
                                showToast('error', 'Erro', result.error || 'Erro ao excluir barbeiro');
                            }
                        } catch (_error) {
                            showToast('error', 'Erro', 'Falha ao excluir barbeiro');
                        } finally {
                            if (mounted.current) {
                                setDeletingBarberId(null);
                            }
                        }
                    }
                }
            ]
        );
    };

    const renderUsers = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#d4af37"/>
                    <Text style={styles.loadingText}>Carregando usuários...</Text>
                </View>
            );
        }

        const filteredUsers = users;

        if (filteredUsers.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={64} color="#666"/>
                    <Text style={styles.emptyStateText}>Nenhum usuário encontrado</Text>
                    <Text style={styles.emptyStateSubtext}>
                        Os usuários aparecerão aqui quando se cadastrarem no sistema.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <View style={[styles.sectionHeader, {justifyContent: 'space-between'}]}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="people-circle" size={22} color="#d4af37"/>
                        <Text style={styles.sectionTitle}>Usuários</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={loadUsers}
                    >
                        <Ionicons name="refresh" size={16} color="#000"/>
                        <Text style={styles.addButtonText}>Atualizar</Text>
                    </TouchableOpacity>
                </View>

                {filteredUsers.map((u) => (
                    <View key={`user-${u.id}`} style={styles.userCard}>
                        <View style={styles.userHeader}>
                            <View style={styles.userTitleLeft}>
                                <Feather name="user" size={18} color="#F1C40F" style={{marginRight: 8}}/>
                                <Text style={styles.userName}>{u.nome || 'Usuário'}</Text>
                            </View>

                            <View style={styles.badgesRight}>
                                <View style={[styles.badge, u.liberacao ? styles.badgeGreen : styles.badgeGrey]}>
                                    <Text style={styles.badgeTxt}>{u.liberacao ? 'Ativo' : 'Bloqueado'}</Text>
                                </View>
                                <View
                                    style={[styles.badge, u.tipoUsuario === 1 ? styles.badgePurple : styles.badgeBlue]}>
                                    <Text style={styles.badgeTxt}>{u.tipoUsuario === 1 ? 'Admin' : 'User'}</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.userEmail}>{u.email}</Text>

                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, u.liberacao ? styles.blockBtn : styles.unblockBtn]}
                                onPress={() => onToggleBlock(u)}
                            >
                                <Feather name="lock" size={16} color="#fff"/>
                                <Text style={styles.actionTxt}>{u.liberacao ? 'Bloquear' : 'Desbloquear'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, styles.passBtn]}
                                onPress={() => confirmOpenPasswordModal(u)}
                            >
                                <Feather name="key" size={16} color="#fff"/>
                                <Text style={styles.actionTxt}>Senha</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, styles.roleBtn]}
                                onPress={() => handleToggleRole(u, u.tipoUsuario === 1 ? 0 : 1)}
                                disabled={u.id === PRIMARY_ADMIN_ID}
                            >
                                <Feather name="user-plus" size={16} color="#fff"/>
                                <Text style={styles.actionTxt}>
                                    {u.tipoUsuario === 1 ? 'Rebaixar' : 'Tornar Admin'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderServices = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#d4af37"/>
                    <Text style={styles.loadingText}>Carregando serviços...</Text>
                </View>
            );
        }

        if (services.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <View style={{marginBottom: 16}}>
                        <ServiceIcon iconKey="scissors" size={64}/>
                    </View>
                    <Text style={styles.emptyStateText}>Nenhum serviço cadastrado</Text>
                    <Text style={styles.emptyStateSubtext}>
                        Clique em "Novo" para adicionar um serviço.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <View style={[styles.sectionHeader, {justifyContent: 'space-between'}]}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={{marginRight: 2}}>
                            <ServiceIcon iconKey="scissors" size={22}/>
                        </View>
                        <Text style={styles.sectionTitle}>Serviços</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleOpenServiceModal()}
                    >
                        <Ionicons name="add" size={16} color="#000"/>
                        <Text style={styles.addButtonText}>Novo</Text>
                    </TouchableOpacity>
                </View>

                {services.map((service) => (
                    <View key={`service-${service.id}`} style={styles.serviceCard}>
                        <View style={styles.serviceInfo}>
                            <View style={styles.serviceHeader}>
                                <View style={{marginRight: 10}}>
                                    <ServiceIcon iconKey={service.icone || 'scissors'} size={24}/>
                                </View>
                                <Text style={styles.serviceName}>{service.nome}</Text>
                            </View>
                            <Text style={styles.serviceDescription}>
                                {service.descricao || 'Sem descrição'}
                            </Text>
                            <View style={styles.serviceDetails}>
                                <Text style={styles.servicePrice}>
                                    R$ {Number(service.preco).toFixed(2).replace('.', ',')}
                                </Text>
                                <Text style={styles.serviceDuration}>
                                    {service.duracao || service.duracaoMin || '--'} min
                                </Text>
                            </View>
                        </View>
                        <View style={styles.serviceActions}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => handleOpenServiceModal(service)}
                            >
                                <Ionicons name="create" size={16} color="#fff"/>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteService(service.id)}
                                disabled={deletingServiceId === service.id}
                            >
                                {deletingServiceId === service.id ? (
                                    <ActivityIndicator size="small" color="#fff"/>
                                ) : (
                                    <Ionicons name="trash" size={16} color="#fff"/>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderBarbers = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#d4af37"/>
                    <Text style={styles.loadingText}>Carregando barbeiros...</Text>
                </View>
            );
        }

        if (barbers.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={64} color="#666"/>
                    <Text style={styles.emptyStateText}>Nenhum barbeiro cadastrado</Text>
                    <Text style={styles.emptyStateSubtext}>Use "Novo" para adicionar um barbeiro.</Text>
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <View style={[styles.sectionHeader, {justifyContent: 'space-between'}]}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="people" size={22} color="#d4af37"/>
                        <Text style={styles.sectionTitle}>Barbeiros</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleOpenBarberModal()}
                    >
                        <Ionicons name="add" size={16} color="#000"/>
                        <Text style={styles.addButtonText}>Novo</Text>
                    </TouchableOpacity>
                </View>

                {barbers.map((b) => {
                    const barberImage = getBarberImage(b);
                    return (
                        <View key={`barber-${b.id}`} style={styles.serviceCard}>
                            <View style={styles.serviceInfo}>
                                <View style={styles.serviceHeader}>
                                    {barberImage ? (
                                        <Image
                                            source={barberImage}
                                            style={styles.barberThumbnail}
                                        />
                                    ) : (
                                        <View style={styles.barberThumbPlaceholder}>
                                            <Ionicons name="person" size={26} color="#d4af37"/>
                                        </View>
                                    )}
                                    <Text style={styles.serviceName}>{b.nome || 'Sem nome'}</Text>
                                </View>
                                {!!b.bio && <Text style={styles.serviceDescription}>{b.bio}</Text>}
                                {!!b.especialidades && (
                                    <Text style={styles.serviceDescription}>
                                        Especialidades: {Array.isArray(b.especialidades) ? b.especialidades.join(', ') : b.especialidades}
                                    </Text>
                                )}
                                <View style={styles.serviceDetails}>
                                    <Text style={styles.servicePrice}>
                                        Status: {b.ativo ? 'Ativo' : 'Inativo'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.serviceActions}>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => handleOpenBarberModal(b)}
                                >
                                    <Ionicons name="create" size={16} color="#fff"/>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteBarber(b.id)}
                                    disabled={deletingBarberId === b.id}
                                >
                                    {deletingBarberId === b.id ? (
                                        <ActivityIndicator size="small" color="#fff"/>
                                    ) : (
                                        <Ionicons name="trash" size={16} color="#fff"/>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'agendamentos':
                return <AdminAppointments/>;

            case 'servicos':
                return (
                    <ScrollView
                        contentContainerStyle={{paddingBottom: 32}}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={false}
                                onRefresh={loadServices}
                                colors={['#d4af37']}
                                tintColor="#d4af37"
                            />
                        }
                    >
                        {renderServices()}
                    </ScrollView>
                );

            case 'barbeiros':
                return (
                    <ScrollView
                        contentContainerStyle={{paddingBottom: 32}}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={false}
                                onRefresh={loadBarbers}
                                colors={['#d4af37']}
                                tintColor="#d4af37"
                            />
                        }
                    >
                        {renderBarbers()}
                    </ScrollView>
                );

            case 'usuarios':
                return (
                    <ScrollView
                        contentContainerStyle={{paddingBottom: 32}}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={false}
                                onRefresh={loadUsers}
                                colors={['#d4af37']}
                                tintColor="#d4af37"
                            />
                        }
                    >
                        {renderUsers()}
                    </ScrollView>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0f0f', '#1a1a1a', '#0f0f0f']} style={styles.gradient}>
                <View style={styles.header}>
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.welcomeText}>
                            Olá, {user?.perfil?.nome || user?.nome || 'Administrador'} 👋
                        </Text>
                        <Text style={styles.subtitle}>Painel Administrativo — Gerencie agendamentos, serviços, barbeiros
                            e usuários</Text>
                    </View>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'agendamentos' && styles.activeTab]}
                        onPress={() => setActiveTab('agendamentos')}
                    >
                        <Ionicons name="calendar" size={20} color={activeTab === 'agendamentos' ? '#d4af37' : '#888'}/>
                        <Text
                            style={[styles.tabText, activeTab === 'agendamentos' && styles.activeTabText]}>Agendamentos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'servicos' && styles.activeTab]}
                        onPress={() => setActiveTab('servicos')}
                    >
                        <View style={{marginRight: 2}}>
                            <ServiceIcon
                                iconKey={serviceForm.icone || 'scissors'}
                                size={20}
                                color={activeTab === 'servicos' ? '#d4af37' : '#888'}
                            />
                        </View>
                        <Text style={[styles.tabText, activeTab === 'servicos' && styles.activeTabText]}>Serviços</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'barbeiros' && styles.activeTab]}
                        onPress={() => setActiveTab('barbeiros')}
                    >
                        <Ionicons name="people" size={20} color={activeTab === 'barbeiros' ? '#d4af37' : '#888'}/>
                        <Text
                            style={[styles.tabText, activeTab === 'barbeiros' && styles.activeTabText]}>Barbeiros</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'usuarios' && styles.activeTab]}
                        onPress={() => setActiveTab('usuarios')}
                    >
                        <Ionicons name="people-circle" size={20} color={activeTab === 'usuarios' ? '#d4af37' : '#888'}/>
                        <Text style={[styles.tabText, activeTab === 'usuarios' && styles.activeTabText]}>Usuários</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {renderContent()}
                </View>

                {/* Modal de Serviço */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={serviceModalVisible}
                    onRequestClose={() => setServiceModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={{marginRight: 12}}>
                                    <ServiceIcon
                                        iconKey={serviceForm.icone || 'scissors'}
                                        size={32}
                                        color="#d4af37"
                                    />
                                </View>
                                <Text style={styles.modalTitle}>
                                    {serviceForm.id ? 'Editar Serviço' : 'Novo Serviço'}
                                </Text>
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Nome do serviço"
                                value={serviceForm.nome}
                                onChangeText={(text) => setServiceForm({...serviceForm, nome: text})}
                                placeholderTextColor="#888"
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="Preço (ex: 25.00)"
                                value={serviceForm.preco}
                                onChangeText={(text) => setServiceForm({...serviceForm, preco: text})}
                                keyboardType="decimal-pad"
                                placeholderTextColor="#888"
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="Duração em minutos"
                                value={serviceForm.duracao}
                                onChangeText={(text) => setServiceForm({...serviceForm, duracao: text})}
                                keyboardType="numeric"
                                placeholderTextColor="#888"
                            />

                            <View style={styles.iconSelector}>
                                <Text style={styles.iconSelectorLabel}>Ícone do serviço:</Text>
                                <View style={styles.iconsGrid}>
                                    {['scissors', 'beard', 'mustache', 'razor'].map((iconKey) => {
                                        const isSelected = serviceForm.icone === iconKey;
                                        return (
                                            <TouchableOpacity
                                                key={iconKey}
                                                style={[
                                                    styles.iconOption,
                                                    isSelected && styles.iconOptionSelected
                                                ]}
                                                onPress={() => handleSelectIcon(iconKey)}
                                            >
                                                <ServiceIcon
                                                    iconKey={iconKey}
                                                    size={28}
                                                    color={isSelected ? '#000' : '#d4af37'}
                                                />
                                                <Text style={[
                                                    styles.iconLabel,
                                                    isSelected && styles.iconLabelSelected
                                                ]}>
                                                    {iconKey === 'scissors' ? 'Tesoura' :
                                                        iconKey === 'beard' ? 'Barba' :
                                                            iconKey === 'mustache' ? 'Bigode' : 'Navalha'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Descrição (opcional)"
                                value={serviceForm.descricao}
                                onChangeText={(text) => setServiceForm({...serviceForm, descricao: text})}
                                multiline
                                numberOfLines={3}
                                placeholderTextColor="#888"
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setServiceModalVisible(false)}
                                    disabled={savingService}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleSaveService}
                                    disabled={savingService}
                                >
                                    {savingService ? (
                                        <ActivityIndicator size="small" color="#fff"/>
                                    ) : (
                                        <Text style={styles.saveButtonText}>
                                            {serviceForm.id ? 'Atualizar' : 'Criar'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Modal de Barbeiro */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={barberModalVisible}
                    onRequestClose={() => setBarberModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Ionicons name="person" size={32} color="#d4af37"/>
                                <Text style={styles.modalTitle}>
                                    {barberForm.id ? 'Editar Barbeiro' : 'Novo Barbeiro'}
                                </Text>
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Nome do barbeiro"
                                value={barberForm.nome}
                                onChangeText={(text) => setBarberForm({...barberForm, nome: text})}
                                placeholderTextColor="#888"
                            />

                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Biografia (opcional)"
                                value={barberForm.bio}
                                onChangeText={(text) => setBarberForm({...barberForm, bio: text})}
                                multiline
                                numberOfLines={2}
                                placeholderTextColor="#888"
                            />

                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Especialidades (separadas por vírgula)"
                                value={barberForm.especialidades}
                                onChangeText={(text) => setBarberForm({...barberForm, especialidades: text})}
                                multiline
                                numberOfLines={2}
                                placeholderTextColor="#888"
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="URL da foto (opcional)"
                                value={barberForm.foto}
                                onChangeText={(text) => setBarberForm({...barberForm, foto: text})}
                                placeholderTextColor="#888"
                            />

                            <View style={styles.switchContainer}>
                                <Text style={styles.switchLabel}>Barbeiro ativo</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.switch,
                                        barberForm.ativo && styles.switchActive
                                    ]}
                                    onPress={() => setBarberForm({...barberForm, ativo: !barberForm.ativo})}
                                >
                                    <View style={[
                                        styles.switchThumb,
                                        barberForm.ativo && styles.switchThumbActive
                                    ]}/>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setBarberModalVisible(false)}
                                    disabled={savingBarber}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleSaveBarber}
                                    disabled={savingBarber}
                                >
                                    {savingBarber ? (
                                        <ActivityIndicator size="small" color="#fff"/>
                                    ) : (
                                        <Text style={styles.saveButtonText}>
                                            {barberForm.id ? 'Atualizar' : 'Criar'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Modal para Trocar Senha */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={passwordModalVisible}
                    onRequestClose={() => setPasswordModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Ionicons name="key" size={32} color="#d4af37"/>
                                <Text style={styles.modalTitle}>Alterar Senha</Text>
                            </View>

                            <Text style={styles.passwordUserInfo}>
                                Alterando senha para: {selectedUser?.nome || selectedUser?.email}
                            </Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Nova senha (mínimo 6 caracteres)"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                placeholderTextColor="#888"
                                autoCapitalize="none"
                            />

                            <Text style={styles.passwordWarning}>
                                ⚠️ O usuário será obrigado a trocar a senha no próximo login
                            </Text>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setPasswordModalVisible(false)}
                                    disabled={changingPassword}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleChangePassword}
                                    disabled={changingPassword || !newPassword}
                                >
                                    {changingPassword ? (
                                        <ActivityIndicator size="small" color="#fff"/>
                                    ) : (
                                        <Text style={styles.saveButtonText}>
                                            Alterar Senha
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Toast/>
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
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center'
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 0,
        marginHorizontal: 2,
    },
    activeTab: {
        backgroundColor: 'transparent',
        borderBottomWidth: 2,
        borderBottomColor: '#d4af37',
    },
    tabText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    activeTabText: {
        color: '#d4af37',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d4af37',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    serviceCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    serviceInfo: {
        flex: 1
    },
    serviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6
    },
    serviceName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff'
    },
    serviceDescription: {
        fontSize: 13,
        color: '#b5b5b5'
    },
    serviceDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    servicePrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#d4af37',
    },
    serviceDuration: {
        fontSize: 14,
        color: '#888',
    },
    serviceActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginLeft: 12,
        gap: 8
    },
    editButton: {
        backgroundColor: '#d4af37',
        padding: 8,
        borderRadius: 6,
        marginRight: 8,
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
        padding: 8,
        borderRadius: 6,
    },
    barberThumbnail: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#2a2a2a',
    },
    barberThumbPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#2a2a2a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userCard: {
        backgroundColor: '#161616',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#292929',
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    userTitleLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    userName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    },
    badgesRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeTxt: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700'
    },
    badgeGreen: {
        backgroundColor: '#16A34A'
    },
    badgeBlue: {
        backgroundColor: '#1D4ED8'
    },
    badgePurple: {
        backgroundColor: '#7C3AED'
    },
    badgeGrey: {
        backgroundColor: '#6B7280'
    },
    userEmail: {
        color: '#cfcfcf',
        marginBottom: 12,
        fontSize: 14
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 6,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 6,
        marginHorizontal: 2,
        gap: 6,
        shadowColor: 'transparent',
    },
    actionTxt: {
        color: '#e6e6e6',
        fontSize: 12,
        fontWeight: '600',
    },
    blockBtn: {
        backgroundColor: '#a63c3c',
    },
    unblockBtn: {
        backgroundColor: '#2f8a4a',
    },
    passBtn: {
        backgroundColor: '#416b9c',
    },
    roleBtn: {
        backgroundColor: '#604a93',
    },
    passwordUserInfo: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    passwordWarning: {
        color: '#e67e22',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        color: '#888',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    input: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    iconSelector: {
        marginBottom: 16,
    },
    iconSelectorLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    iconsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    iconOption: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#2a2a2a',
        width: '48%',
        marginBottom: 8,
    },
    iconOptionSelected: {
        backgroundColor: '#d4af37',
    },
    iconLabel: {
        color: '#d4af37',
        fontSize: 12,
        marginTop: 6,
        fontWeight: '600',
    },
    iconLabelSelected: {
        color: '#000',
        fontWeight: 'bold',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    switchLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    switch: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#444',
        padding: 2,
    },
    switchActive: {
        backgroundColor: '#d4af37',
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        transform: [{translateX: 0}],
    },
    switchThumbActive: {
        transform: [{translateX: 22}],
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#555',
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: '#d4af37',
        marginLeft: 8,
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 32,
    },
    card: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
        elevation: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        flexWrap: 'wrap',
    },
    dot: {
        color: '#d4af37',
        fontWeight: 'bold',
    },
    statusTopRight: {
        alignSelf: 'flex-start',
    },
    icon: {
        marginRight: 6,
    },
    subText: {
        fontSize: 14,
        color: '#aaa',
    },
    pricePill: {
        alignSelf: 'flex-start',
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d4af37',
    },
    priceText: {
        color: '#d4af37',
        fontSize: 14,
        fontWeight: 'bold',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#e74c3c',
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginRight: 10,
    },
    cancelBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    trashBtn: {
        backgroundColor: '#e74c3c',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDisabled: {
        opacity: 0.4,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    chipText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    chipGreen: {
        backgroundColor: '#27ae60',
    },
    chipOrange: {
        backgroundColor: '#e67e22',
    },
    chipRed: {
        backgroundColor: '#e74c3c',
    },
    chipGray: {
        backgroundColor: '#7f8c8d',
    },
});

export default AdminScreen;