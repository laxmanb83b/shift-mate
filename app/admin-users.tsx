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
  adminListUsers,
  fetchPostingsByUser,
  deletePosting,
  deletePostingsByUser,
  formatActiveTill,
  type AdminUser,
} from "@/lib/postings";
import type { Posting } from "@/lib/types";
import { colors, radius, shadow } from "@/lib/theme";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  filled: "Filled",
  expired: "Expired",
  flagged: "Flagged",
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [postsByUser, setPostsByUser] = useState<Record<string, Posting[]>>({});
  const [loadingPosts, setLoadingPosts] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  const setUserCount = (userId: string, count: number) =>
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, posting_count: count } : u))
    );

  const deleteOne = (userId: string, post: Posting) =>
    confirm(`Delete "${post.title}"?`, async () => {
      setBusy(post.id);
      try {
        await deletePosting(post.id);
        const remaining = (postsByUser[userId] ?? []).filter(
          (p) => p.id !== post.id
        );
        setPostsByUser((prev) => ({ ...prev, [userId]: remaining }));
        setUserCount(userId, remaining.length);
      } catch {
        notify("Could not delete the posting.");
      } finally {
        setBusy(null);
      }
    });

  const deleteAll = (u: AdminUser) =>
    confirm(
      `Delete ALL ${u.posting_count} posts by ${u.email ?? "this user"}? This cannot be undone.`,
      async () => {
        setBusy(u.id);
        try {
          await deletePostingsByUser(u.id);
          setPostsByUser((prev) => ({ ...prev, [u.id]: [] }));
          setUserCount(u.id, 0);
        } catch {
          notify("Could not delete the postings.");
        } finally {
          setBusy(null);
        }
      }
    );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await isAdmin();
      setAdmin(ok);
      if (ok) setUsers(await adminListUsers());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async (u: AdminUser) => {
    if (expandedId === u.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(u.id);
    if (!postsByUser[u.id] && u.posting_count > 0) {
      setLoadingPosts(u.id);
      try {
        const posts = await fetchPostingsByUser(u.id);
        setPostsByUser((prev) => ({ ...prev, [u.id]: posts }));
      } finally {
        setLoadingPosts(null);
      }
    }
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
        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/")}>
          <Text style={styles.primaryBtnText}>Back to jobs</Text>
        </Pressable>
      </View>
    );

  return (
    <FlatList
      style={styles.container}
      data={users}
      keyExtractor={(u) => u.id}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      ListHeaderComponent={
        <Text style={styles.count}>
          {users.length} registered {users.length === 1 ? "user" : "users"}
        </Text>
      }
      renderItem={({ item }) => {
        const open = expandedId === item.id;
        const posts = postsByUser[item.id] ?? [];
        return (
          <View style={styles.card}>
            <Pressable style={styles.userRow} onPress={() => toggle(item)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.email ?? "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.email} numberOfLines={1}>
                  {item.email ?? "(no email)"}
                </Text>
                <Text style={styles.meta}>
                  Joined {formatActiveTill(item.created_at)} ·{" "}
                  {item.posting_count}{" "}
                  {item.posting_count === 1 ? "post" : "posts"}
                </Text>
              </View>
              <Text style={styles.chevron}>{open ? "▾" : "▸"}</Text>
            </Pressable>

            {open ? (
              <View style={styles.posts}>
                {loadingPosts === item.id ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                ) : item.posting_count === 0 ? (
                  <Text style={styles.noPosts}>No postings.</Text>
                ) : (
                  <>
                    <Pressable
                      style={styles.deleteAllBtn}
                      disabled={busy === item.id}
                      onPress={() => deleteAll(item)}
                    >
                      <Text style={styles.deleteAllText}>
                        🗑 Delete all {item.posting_count} posts
                      </Text>
                    </Pressable>
                    {posts.map((p) => (
                      <View key={p.id} style={styles.postRow}>
                        <Pressable
                          style={styles.postMain}
                          onPress={() => router.push(`/posting/${p.id}`)}
                        >
                          <Text style={styles.postTitle} numberOfLines={1}>
                            {p.title}
                          </Text>
                          <Text style={styles.postMeta}>
                            {p.category ? `${p.category} · ` : ""}till{" "}
                            {formatActiveTill(p.expires_at)}
                          </Text>
                        </Pressable>
                        <View
                          style={[
                            styles.badge,
                            p.status === "active"
                              ? styles.badgeActive
                              : styles.badgeMuted,
                          ]}
                        >
                          <Text style={styles.badgeText}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.delBtn}
                          disabled={busy === p.id}
                          onPress={() => deleteOne(item.id, p)}
                        >
                          <Text style={styles.delBtnText}>🗑</Text>
                        </Pressable>
                      </View>
                    ))}
                  </>
                )}
              </View>
            ) : null}
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emoji}>👤</Text>
          <Text style={styles.title}>No users yet</Text>
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.card,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontWeight: "800", fontSize: 16 },
  email: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 4 },

  posts: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  noPosts: { color: colors.textMuted, fontSize: 13, paddingVertical: 12, paddingHorizontal: 2 },
  deleteAllBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  deleteAllText: { color: colors.danger, fontWeight: "700", fontSize: 12 },
  postRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  postMain: { flex: 1 },
  delBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  delBtnText: { fontSize: 15 },
  postTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  postMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeActive: { backgroundColor: "#dcfce7" },
  badgeMuted: { backgroundColor: colors.border },
  badgeText: { fontSize: 11, fontWeight: "800", color: colors.text },
});
