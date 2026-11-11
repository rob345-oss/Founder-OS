import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0c0c0f" },
          headerTintColor: "#f4f4f5",
          contentStyle: { backgroundColor: "#0c0c0f" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Founder OS" }} />
      </Stack>
    </>
  );
}
