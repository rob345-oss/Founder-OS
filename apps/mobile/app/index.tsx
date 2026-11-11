import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL!;

const supabase = createClient(supabaseUrl, supabaseAnon);

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("—");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!token) {
      setSummary("—");
      return;
    }
    setBusy(true);
    fetch(`${apiUrl}/api/v1/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) =>
        setSummary(`Ventures ${j.venture_count} · Projects ${j.project_count} · Open ${j.task_open_count}`),
      )
      .catch(() => setSummary("Error loading"))
      .finally(() => setBusy(false));
  }, [token]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setSummary(error.message);
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Command Center</Text>
      {!token && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#71717a"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#71717a"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Sign in" onPress={signIn} disabled={busy} />
        </>
      )}
      {token && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Summary</Text>
          {busy ? <ActivityIndicator /> : <Text style={styles.cardValue}>{summary}</Text>}
          <Button title="Sign out" onPress={signOut} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 64, backgroundColor: "#0c0c0f" },
  title: { fontSize: 22, fontWeight: "600", color: "#fafafa", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    color: "#fafafa",
  },
  card: { marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: "#18181b" },
  cardLabel: { fontSize: 12, color: "#a1a1aa", textTransform: "uppercase" },
  cardValue: { fontSize: 16, color: "#e4e4e7", marginVertical: 12 },
});
