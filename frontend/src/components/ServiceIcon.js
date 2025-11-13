import React from 'react';
import {View} from 'react-native';
import {Ionicons, MaterialCommunityIcons, FontAwesome5} from '@expo/vector-icons';

const ICONS = {
    scissors: {lib: MaterialCommunityIcons, name: 'content-cut'},
    beard: {lib: MaterialCommunityIcons, name: 'face-man-shimmer'},
    mustache: {lib: MaterialCommunityIcons, name: 'mustache'},
    razor: {lib: MaterialCommunityIcons, name: 'razor-single-edge'},
    comb: {lib: FontAwesome5, name: 'comb'},
    clipper: {lib: MaterialCommunityIcons, name: 'hair-dryer-outline'},
    hair: {lib: Ionicons, name: 'person'},
};

const ServiceIcon = ({iconKey, size = 24, color = '#d4af37', style}) => {
    const fallback = ICONS.scissors;
    const entry = ICONS[iconKey] || fallback;
    const Icon = entry.lib;

    return (
        <View style={[
            {
                width: size,
                height: size,
                alignItems: 'center',
                justifyContent: 'center'
            },
            style
        ]}>
            <Icon name={entry.name} size={size} color={color}/>
        </View>
    );
};

export default ServiceIcon;