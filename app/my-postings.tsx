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
import { Link, useFocusEffect, useRouter } from "expo-router";
import {
  fetchMyPostings,
  getCurrentUserId,
  getCurrentUserEmail,
  updatePostingStatus,
  deletePosting,
  formatActiveTill,
  isAdmin,
  signOut,
} from "@/lib/postings";
import type { Posting } from "@/lib/types";
import { colors, radius, shadow } from "@/lib/theme";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  filled: "Filled",
  expired: "Expired",
  flagged: "Under review",
  hidden: "Hidden by admin",
};

export default function MyPostingsScreen() {
  const router = useRouter();
  const [postings, setPostings] = useState<Posting[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const uid = await getCurrentUserId();
      setSignedIn(!!uid);
      if (uid) {
        const [mine, adminOk, mail] = await Promise.all([
          fetchMyPostings(),
          isAdmin(),
          getCurrentUserEmail(),
        ]);
        setPostings(mine);
        setAdmin(adminOk);
        setEmail(mail);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = () => {
    const doSignOut = async () => {
      await signOut();
      setSignedIn(false);
      setPostings([]);
      setAdmin(false);
      setEmail(null);
    };
    if (Platform.OS === "web") {
      if (window.confirm("Sign out of ShiftMate?")) doSignOut();
    } else {
      Alert.alert("Sign out", "Sign out of ShiftMate?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: doSignOut },
      ]);
    }
  };

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

  const toggleFilled = async (p: Posting) => {
    setBusyId(p.id);
    try {
      const next = p.status === "filled" ? "active" : "filled";
      await updatePostingStatus(p.id, next);
      setPostings((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: next } : x))
      );
    } catch {
      notify("Could not update the posting.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = (p: Posting) =>
    confirm("Delete this posting permanently?", async () => {
      setBusyId(p.id);
      try {
        await deletePosting(p.id);
        setPostings((prev) => prev.filter((x) => x.id !== p.id));
      } catch {
        notify("Could not delete the posting.");
      } finally {
        setBusyId(null);
      }
    });

  if (loading)
    return (
      <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
    );

  if (!signedIn)
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🔐</Text>
        <Text style={styles.emptyTitle}>Sign in to manage postings</Text>
        <Text style={styles.empty}>
          Sign in so your postings are linked to you — then you can mark them
          filled or delete them.
        </Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryBtnText}>Sign in</Text>
        </Pressable>
      </View>
    );

  return (
    <FlatList
      style={styles.container}
      data={postings}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      ListHeaderComponent={
        <View>
          <View style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountLabel}>Signed in as</Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {email ?? "your account"}
              </Text>
            </View>
            <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
          {admin ? (
            <Pressable
              style={styles.adminBanner}
              onPress={() => router.push("/admin")}
            >
              <Text style={styles.adminBannerText}>
                🛡 Admin review — reported postings
              </Text>
              <Text style={styles.adminBannerArrow}>›</Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const filled = item.status === "filled";
        const busy = busyId === item.id;
        return (
          <View style={styles.card}>
            <Link href={`/posting/${item.id}`} asChild>
              <Pressable>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      filled
                        ? styles.badgeFilled
                        : item.status === "active"
                        ? styles.badgeActive
                        : styles.badgeMuted,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {item.category ? `${item.category} · ` : ""}Active till{" "}
                  {formatActiveTill(item.expires_at)}
                </Text>
              </Pressable>
            </Link>

            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, styles.edit]}
                disabled={busy}
                onPress={() => router.push(`/post?id=${item.id}`)}
              >
                <Text style={[styles.actionText, styles.editText]}>✎ Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, filled ? styles.reactivate : styles.fill]}
                disabled={busy}
                onPress={() => toggleFilled(item)}
              >
                <Text style={styles.actionText}>
                  {filled ? "↺ Reactivate" : "✓ Mark filled"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.del]}
                disabled={busy}
                onPress={() => remove(item)}
              >
                <Text style={[styles.actionText, styles.delText]}>🗑 Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🗒️</Text>
          <Text style={styles.emptyTitle}>No postings yet</Text>
          <Text style={styles.empty}>
            Postings you create while signed in show up here.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push("/post")}
          >
            <Text style={styles.primaryBtnText}>Post a job</Text>
          </Pressable>
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
    backgroundColor: colors.bg,
    minHeight: 400,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  empty: {
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

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountLabel: { fontSize: 12, color: colors.textMuted },
  accountEmail: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 1 },
  signOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  signOutText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  adminBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  adminBannerText: { flex: 1, color: "#fff", fontWeight: "800", fontSize: 14 },
  adminBannerArrow: { color: "#fff", fontSize: 22, fontWeight: "800" },
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
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeActive: { backgroundColor: "#dcfce7" },
  badgeFilled: { backgroundColor: colors.primarySoft },
  badgeMuted: { backgroundColor: colors.surfaceAlt },
  badgeText: { fontSize: 11, fontWeight: "800", color: colors.text },
  cardMeta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
  },
  fill: { backgroundColor: colors.success },
  reactivate: { backgroundColor: colors.primary },
  edit: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  del: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.danger },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  editText: { color: colors.primary },
  delText: { color: colors.danger },
});
