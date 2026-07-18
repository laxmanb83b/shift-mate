import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textOnPrimary,
          headerTitleStyle: { color: colors.textOnPrimary, fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Browse has its own branded banner, so hide the default nav bar. */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="post" options={{ title: "Post a Job" }} />
        <Stack.Screen name="posting/[id]" options={{ title: "Job Details" }} />
        <Stack.Screen name="my-postings" options={{ title: "My Postings" }} />
        <Stack.Screen name="admin" options={{ title: "Admin Review" }} />
        <Stack.Screen name="admin-users" options={{ title: "Registered Users" }} />
        <Stack.Screen name="login" options={{ title: "Sign In" }} />
      </Stack>
    </>
  );
}
