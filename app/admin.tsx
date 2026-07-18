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
  fetchReportedPostings,
  dismissReports,
  deletePosting,
  formatActiveTill,
  type ReportedPosting,
} from "@/lib/postings";
import { colors, radius, shadow } from "@/lib/theme";

export default function AdminScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ReportedPosting[]>([]);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await isAdmin();
      setAdmin(ok);
      if (ok) setItems(await fetchReportedPostings());
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
        { text: "Yes", style: "destructive", onPress: onYes },
      ]);
    }
  };

  const removePost = (it: ReportedPosting) =>
    confirm(`Delete "${it.posting.title}" permanently?`, async () => {
      setBusyId(it.posting.id);
      try {
        await deletePosting(it.posting.id); // cascades its reports
        setItems((prev) => prev.filter((x) => x.posting.id !== it.posting.id));
      } catch {
        notify("Could not delete the posting.");
      } finally {
        setBusyId(null);
      }
    });

  const dismiss = (it: ReportedPosting) => {
    setBusyId(it.posting.id);
    dismissReports(it.posting.id)
      .then(() =>
        setItems((prev) => prev.filter((x) => x.posting.id !== it.posting.id))
      )
      .catch(() => notify("Could not dismiss the reports."))
      .finally(() => setBusyId(null));
  };

  if (loading)
    return (
      <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
    );

  if (!admin)
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Admins only</Text>
        <Text style={styles.body}>
          This area is for moderators. If you should have access, ask the owner
          to add your account to the admins list.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/")}>
          <Text style={styles.primaryBtnText}>Back to jobs</Text>
        </Pressable>
      </View>
    );

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(it) => it.posting.id}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      ListHeaderComponent={
        <View>
          <Pressable
            style={styles.usersBtn}
            onPress={() => router.push("/admin-users")}
          >
            <Text style={styles.usersBtnText}>👥 View all registered users</Text>
            <Text style={styles.usersBtnArrow}>›</Text>
          </Pressable>
          <Pressable
            style={styles.hiddenNavBtn}
            onPress={() => router.push("/admin-hidden")}
          >
            <Text style={styles.hiddenNavText}>🙈 Hidden postings</Text>
            <Text style={styles.hiddenNavArrow}>›</Text>
          </Pressable>
          <Text style={styles.count}>
            {items.length} reported {items.length === 1 ? "posting" : "postings"}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const busy = busyId === item.posting.id;
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.posting.title}
              </Text>
              <View style={styles.flag}>
                <Text style={styles.flagText}>🚩 {item.reportCount}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.posting.category ? `${item.posting.category} · ` : ""}
              {item.posting.location_text || "No location"} · Active till{" "}
              {formatActiveTill(item.posting.expires_at)}
            </Text>
            {item.posting.description ? (
              <Text style={styles.desc} numberOfLines={3}>
                {item.posting.description}
              </Text>
            ) : null}
            <Text style={styles.reportedAt}>
              Last reported {formatActiveTill(item.lastReportedAt)}
            </Text>

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.view]}
                onPress={() => router.push(`/posting/${item.posting.id}`)}
              >
                <Text style={[styles.btnText, styles.viewText]}>View</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.dismiss]}
                disabled={busy}
                onPress={() => dismiss(item)}
              >
                <Text style={[styles.btnText, styles.dismissText]}>
                  Dismiss
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.del]}
                disabled={busy}
                onPress={() => removePost(item)}
              >
                <Text style={styles.btnText}>🗑 Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.title}>No reported postings</Text>
          <Text style={styles.body}>Nothing needs review right now.</Text>
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
    ...shadow.raised,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  usersBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  usersBtnText: { flex: 1, color: "#fff", fontWeight: "800", fontSize: 14 },
  usersBtnArrow: { color: "#fff", fontSize: 22, fontWeight: "800" },
  hiddenNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  hiddenNavText: { flex: 1, color: colors.primary, fontWeight: "800", fontSize: 14 },
  hiddenNavArrow: { color: colors.primary, fontSize: 22, fontWeight: "800" },
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
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  flag: {
    backgroundColor: "#fee2e2",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  flagText: { color: colors.danger, fontWeight: "800", fontSize: 12 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  desc: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 20 },
  reportedAt: { fontSize: 12, color: colors.textMuted, marginTop: 8 },

  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
  },
  view: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  viewText: { color: colors.text },
  dismiss: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.primary },
  dismissText: { color: colors.primary },
  del: { backgroundColor: colors.danger },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
