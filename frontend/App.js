import React, {useEffect, useState, useCallback} from 'react';
import {StatusBar} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {NavigationContainer} from '@react-navigation/native';
import {AuthProvider, useAuth} from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import NoInternetScreen from './src/screens/NoInternetScreen';

function AppContent() {
    const {user, loading} = useAuth();
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const check = async () => {
            const state = await NetInfo.fetch();
            setIsConnected(!!state.isConnected);
        };
        check();
        const unsub = NetInfo.addEventListener(state => {
            setIsConnected(!!state.isConnected);
        });
        return () => unsub();
    }, []);

    const handleRetry = useCallback(() => {
        NetInfo.fetch().then(state => setIsConnected(!!state.isConnected));
    }, []);

    if (loading) {
        return null;
    }

    return (
        <>
            <StatusBar barStyle="light-content"/>
            <NavigationContainer key={user ? 'app' : 'auth'}>
                <AppNavigator/>
            </NavigationContainer>
            {!isConnected && <NoInternetScreen onRetry={handleRetry}/>}
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent/>
        </AuthProvider>
    );
}