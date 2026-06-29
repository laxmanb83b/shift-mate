import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useFocusEffect } from "expo-router";
import PostingCard from "@/components/PostingCard";
import { fetchPostings, CATEGORIES } from "@/lib/postings";
import type { Posting } from "@/lib/types";
import {
  colors,
  radius,
  shadow,
  APP_NAME,
  APP_TAGLINE,
  APP_DESCRIPTION,
} from "@/lib/theme";

export default function BrowseScreen() {
  const [postings, setPostings] = useState<Posting[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      try {
        setError(null);
        if (replace) setLoading(true);
        else setLoadingMore(true);
        const { rows, hasMore: more } = await fetchPostings({
          search,
          category,
          page: pageToLoad,
        });
        setPostings((prev) => (replace ? rows : [...prev, ...rows]));
        setHasMore(more);
        setPage(pageToLoad);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load postings.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, category]
  );

  // Runs on focus and whenever the applied search/category changes.
  useFocusEffect(
    useCallback(() => {
      loadPage(0, true);
    }, [loadPage])
  );

  const onEndReached = () => {
    if (hasMore && !loadingMore && !loading) loadPage(page + 1, false);
  };

  const chips = ["All", ...CATEGORIES];

  return (
    <View style={styles.container}>
      {/* Branded header */}
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.brandRow}>
            <View style={styles.logoPill}>
              <Text style={styles.logoPillText}>{APP_NAME}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Link href="/my-postings" asChild>
              <Pressable style={styles.mineBtn} hitSlop={8}>
                <Text style={styles.mineBtnText}>My posts</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          <Text style={styles.description}>{APP_DESCRIPTION}</Text>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔎</Text>
            <TextInput
              style={styles.search}
              placeholder="Search by location or job type…"
              placeholderTextColor={colors.textMuted}
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={() => setSearch(searchInput.trim())}
              returnKeyType="search"
            />
            {searchInput.length > 0 ? (
              <Pressable
                onPress={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                hitSlop={8}
              >
                <Text style={styles.clearIcon}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* Category filter chips */}
      <View style={styles.chipsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chips.map((c) => {
            const value = c === "All" ? null : c;
            const active = category === value;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={postings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostingCard posting={item} />}
          contentContainerStyle={{ paddingVertical: 10, paddingBottom: 96 }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={() => {
                setRefreshing(true);
                loadPage(0, true);
              }}
            />
          }
          ListHeaderComponent={
            postings.length > 0 ? (
              <Text style={styles.count}>
                {postings.length}
                {hasMore ? "+" : ""}{" "}
                {postings.length === 1 ? "job" : "jobs"}
                {category ? ` in ${category}` : " nearby"}
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={colors.primary}
              />
            ) : hasMore ? (
              <Pressable
                style={styles.loadMore}
                onPress={() => loadPage(page + 1, false)}
              >
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🗒️</Text>
              <Text style={styles.emptyTitle}>No postings found</Text>
              <Text style={styles.empty}>
                {search || category
                  ? "Try a different search or category."
                  : "Be the first to post a part-time job in your area."}
              </Text>
            </View>
          }
        />
      )}

      <Link href="/post" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>＋ Post a Job</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { backgroundColor: colors.primary },
  headerInner: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  logoPillText: { color: "#fff", fontWeight: "800", fontSize: 19, letterSpacing: 0.3 },
  tagline: { color: "#dbe0ff", fontSize: 13, marginTop: 10 },
  mineBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  mineBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  description: {
    color: "#e6e9ff",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    marginTop: 16,
    ...shadow.card,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  search: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  clearIcon: { color: colors.textMuted, fontSize: 14, paddingLeft: 8 },

  chipsBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  count: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 2,
  },

  loadMore: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loadMoreText: { color: colors.primary, fontWeight: "700" },

  error: { color: colors.danger, textAlign: "center", margin: 24 },

  emptyWrap: { alignItems: "center", marginTop: 70, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  fab: {
    position: "absolute",
    bottom: 26,
    alignSelf: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 26,
    paddingVertical: 15,
    borderRadius: radius.pill,
    ...shadow.raised,
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
