import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  isAdmin,
  fetchHiddenPostings,
  updatePostingStatus,
  deletePosting,
  formatActiveTill,
} from "@/lib/postings";
import type { Posting } from "@/lib/types";
import { colors, radius, shadow } from "@/lib/theme";

export default function AdminHiddenScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Posting[]>([]);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await isAdmin();
      setAdmin(ok);
      if (ok) setItems(await fetchHiddenPostings());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const notify = (msg: string) =>
    Platform.OS === "web" ? window.alert(msg) : Alert.alert(msg);

  const confirm = (msg: string, onYes: () => void) => {
    if (Platform.OS === "web") {
      if (window.confirm(msg)) onYes();
    } else {
      Alert.alert("Please confirm", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onYes },
      ]);
    }
  };

  const unhide = async (p: Posting) => {
    setBusy(p.id);
    try {
      await updatePostingStatus(p.id, "active");
      setItems((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      notify("Could not unhide the posting.");
    } finally {
      setBusy(null);
    }
  };

  const remove = (p: Posting) =>
    confirm(`Delete "${p.title}" permanently?`, async () => {
      setBusy(p.id);
      try {
        await deletePosting(p.id);
        setItems((prev) => prev.filter((x) => x.id !== p.id));
      } catch {
        notify("Could not delete the posting.");
      } finally {
        setBusy(null);
      }
    });

  if (loading)
    return (
      <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
    );

  if (!admin)
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Admins only</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/")}>
          <Text style={styles.primaryBtnText}>Back to jobs</Text>
        </Pressable>
      </View>
    );

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      ListHeaderComponent={
        <Text style={styles.count}>
          {items.length} hidden {items.length === 1 ? "posting" : "postings"}
        </Text>
      }
      renderItem={({ item }) => {
        const b = busy === item.id;
        return (
          <View style={styles.card}>
            <Pressable onPress={() => router.push(`/posting/${item.id}`)}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.meta}>
                {item.category ? `${item.category} · ` : ""}
                {item.location_text || "No location"} · till{" "}
                {formatActiveTill(item.expires_at)}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.unhide]}
                disabled={b}
                onPress={() => unhide(item)}
              >
                <Text style={styles.btnText}>👁 Unhide</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.del]}
                disabled={b}
                onPress={() => remove(item)}
              >
                <Text style={[styles.btnText, styles.delText]}>🗑 Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emoji}>👁</Text>
          <Text style={styles.title}>No hidden postings</Text>
          <Text style={styles.body}>
            When you hide a posting it shows up here so you can bring it back.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 400,
    backgroundColor: colors.bg,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  body: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: 18,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
  },
  unhide: { backgroundColor: colors.primary },
  del: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.danger },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  delText: { color: colors.danger },
});
