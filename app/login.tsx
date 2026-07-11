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
 * Passwordless sign-in with a 6-digit email CODE (not a magic link). The whole
 * flow stays inside the app, so it works when the app is installed to the home
 * screen — a magic link would open in a separate browser and lose the session.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const notify = (msg: string) =>
    Platform.OS === "web" ? window.alert(msg) : Alert.alert(msg);

  const sendCode = async () => {
    if (!email.trim()) {
      notify("Enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep("code");
    } catch (e: any) {
      notify(e?.message ?? "Could not send the code.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 6) {
      notify("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      router.replace("/my-postings");
    } catch (e: any) {
      notify(e?.message ?? "That code didn't work. Check it and try again.");
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

        {step === "email" ? (
          <>
            <Text style={styles.title}>Sign in to {APP_NAME}</Text>
            <Text style={styles.sub}>
              Manage your postings. We'll email you a 6-digit code — no password
              needed.
            </Text>
            <TextInput
              style={[styles.input, focused === "email" && styles.inputFocused]}
              placeholder="name@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
            <Pressable style={styles.btn} onPress={sendCode} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Email me a code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.sub}>
              We sent a 6-digit code to {email}. Enter it below to sign in.
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.codeInput,
                focused === "code" && styles.inputFocused,
              ]}
              placeholder="123456"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              onFocus={() => setFocused("code")}
              onBlur={() => setFocused(null)}
            />
            <Pressable style={styles.btn} onPress={verify} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify &amp; sign in</Text>
              )}
            </Pressable>
            <View style={styles.codeActions}>
              <Pressable onPress={() => setStep("email")}>
                <Text style={styles.link}>Change email</Text>
              </Pressable>
              <Pressable onPress={sendCode} disabled={loading}>
                <Text style={styles.link}>Resend code</Text>
              </Pressable>
            </View>
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
  codeInput: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
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
  codeActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  link: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  skip: { color: colors.textMuted, textAlign: "center", marginTop: 22, fontSize: 14 },
});
