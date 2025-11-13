import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

import HomeScreen from '../screens/HomeScreen';
import ServicesScreen from '../screens/ServicesScreen';
import AppointmentScreen from '../screens/AppointmentScreen';
import MyAppointmentsScreen from '../screens/MyAppointmentsScreen';
import ProfileScreen from '../screens/ProfileScreen';

import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function UserTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#1a1a1a',
                    borderTopColor: '#d4af37',
                    borderTopWidth: 2
                },
                tabBarActiveTintColor: '#d4af37',
                tabBarInactiveTintColor: '#888',
            }}
        >
            <Tab.Screen
                name="Início"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({color, size}) => <Ionicons name="home" color={color} size={size}/>
                }}
            />
            <Tab.Screen
                name="Serviços"
                component={ServicesScreen}
                options={{
                    tabBarIcon: ({color, size}) => <Ionicons name="cut" color={color} size={size}/>
                }}
            />
            <Tab.Screen
                name="Agendar"
                component={AppointmentScreen}
                options={{
                    tabBarIcon: ({color, size}) => <Ionicons name="calendar" color={color} size={size}/>
                }}
            />
            <Tab.Screen
                name="Perfil"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({color, size}) => <Ionicons name="person" color={color} size={size}/>
                }}
            />
        </Tab.Navigator>
    );
}

function AdminTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#1a1a1a',
                    borderTopColor: '#d4af37',
                    borderTopWidth: 2
                },
                tabBarActiveTintColor: '#d4af37',
                tabBarInactiveTintColor: '#888',
            }}
        >
            <Tab.Screen
                name="Admin"
                component={AdminScreen}
                options={{
                    tabBarIcon: ({color, size}) => <Ionicons name="shield" color={color} size={size}/>
                }}
            />
            <Tab.Screen
                name="Perfil"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({color, size}) => <Ionicons name="person" color={color} size={size}/>
                }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const {user, loading} = useAuth();

    if (loading) {
        return null;
    }

    const isAdmin = user?.tipoUsuario === 1 || user?.tipoUsuario === '1';

    return !user ? (
        <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="Login" component={LoginScreen}/>
            <Stack.Screen name="Register" component={RegisterScreen}/>
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}/>
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen}/>
        </Stack.Navigator>
    ) : isAdmin ? (
        <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="AdminTabs" component={AdminTabs}/>
            <Stack.Screen
                name="MyAppointments"
                component={MyAppointmentsScreen}
                options={{headerTitle: 'Meus Agendamentos'}}
            />
        </Stack.Navigator>
    ) : (
        <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="UserTabs" component={UserTabs}/>
            <Stack.Screen
                name="MyAppointments"
                component={MyAppointmentsScreen}
                options={{headerTitle: 'Meus Agendamentos'}}
            />
        </Stack.Navigator>
    );
}