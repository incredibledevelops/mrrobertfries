import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import {
  Bike,
  ClipboardList,
  History as HistoryIcon,
  LogOut,
} from "lucide-react-native";
import { Pressable } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme/theme";

import LoginScreen from "../screens/LoginScreen";
import DeliveriesScreen from "../screens/DeliveriesScreen";
import AvailableScreen from "../screens/AvailableScreen";
import HistoryScreen from "../screens/HistoryScreen";
import DeliveryDetailScreen from "../screens/DeliveryDetailScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function LogoutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable
      onPress={signOut}
      style={{ padding: 8 }}
      hitSlop={12}
    >
      <LogOut color={colors.gold} size={20} />
    </Pressable>
  );
}

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Deliveries")
            return <Bike color={color} size={size} />;
          if (route.name === "Available")
            return <ClipboardList color={color} size={size} />;
          return <HistoryIcon color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="Deliveries" component={DeliveriesScreen} />
      <Tabs.Screen name="Available" component={AvailableScreen} />
      <Tabs.Screen name="History" component={HistoryScreen} />
    </Tabs.Navigator>
  );
}

function AuthedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontWeight: "800" },
        headerTintColor: colors.gold,
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DeliveryDetail"
        component={DeliveryDetailScreen}
        options={{
          title: "Delivery",
          headerRight: () => <LogoutButton />,
        }}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.dark,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <AuthedStack />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}