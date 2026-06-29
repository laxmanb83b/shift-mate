import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadow, APP_NAME } from "@/lib/theme";

/**
 * Optional sign-in via email magic link / OTP. Browsing and posting can work
 * anonymously in the MVP; signing in lets a poster manage (edit/delete) their
 * own postings later.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const notify = (msg: string) =>
    Platform.OS === "web" ? window.alert(msg) : Alert.alert(msg);

  const sendLink = async () => {
    if (!email.trim()) {
      notify("Enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      notify(e?.message ?? "Could not send sign-in link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>{APP_NAME}</Text>
        </View>
        <Text style={styles.title}>Sign in to {APP_NAME}</Text>
        <Text style={styles.sub}>
          Manage your postings. We'll email you a secure sign-in link — no
          password needed.
        </Text>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentEmoji}>📬</Text>
            <Text style={styles.sent}>Check your email for a sign-in link.</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={[styles.input, focused && styles.inputFocused]}
              placeholder="name@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <Pressable style={styles.btn} onPress={sendLink} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Send sign-in link</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.skip}>Skip — just browse jobs</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 26,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  logoBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 16,
  },
  logoText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.3,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: "#fff" },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: 14,
    ...shadow.raised,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  sentBox: { alignItems: "center", marginVertical: 16 },
  sentEmoji: { fontSize: 34, marginBottom: 8 },
  sent: { fontSize: 16, color: colors.primaryDark, textAlign: "center", fontWeight: "600" },
  skip: { color: colors.textMuted, textAlign: "center", marginTop: 22, fontSize: 14 },
});
