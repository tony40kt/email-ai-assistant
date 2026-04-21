import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import EmailListScreen from '../screens/EmailListScreen';
import EmailDetailScreen from '../screens/EmailDetailScreen';
import RulesScreen from '../screens/RulesScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#1a73e8' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmailList"
          component={EmailListScreen}
          options={{ title: '收件匣' }}
        />
        <Stack.Screen
          name="EmailDetail"
          component={EmailDetailScreen}
          options={{ title: '郵件內容' }}
        />
        <Stack.Screen
          name="Rules"
          component={RulesScreen}
          options={{ title: '分類規則' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: '設定' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
