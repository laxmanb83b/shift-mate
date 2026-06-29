import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import type { Posting } from "@/lib/types";
import { colors, radius, shadow } from "@/lib/theme";

export default function PostingCard({ posting }: { posting: Posting }) {
  return (
    <Link href={`/posting/${posting.id}`} asChild>
      <Pressable style={styles.card}>
        {posting.image_url ? (
          <Image source={{ uri: posting.image_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text
              style={styles.thumbText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ShiftMate
            </Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {posting.title}
          </Text>
          {posting.location_text ? (
            <Text style={styles.meta} numberOfLines={1}>
              📍 {posting.location_text}
            </Text>
          ) : null}
          {posting.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {posting.description}
            </Text>
          ) : null}
          <View style={styles.tagRow}>
            {posting.category ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{posting.category}</Text>
              </View>
            ) : null}
            {posting.contact_phone || posting.contact_email ? (
              <View style={[styles.tag, styles.tagMuted]}>
                <Text style={[styles.tagText, styles.tagTextMuted]}>
                  Contact available
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: 14,
    marginVertical: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  thumbText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  body: { flex: 1, paddingHorizontal: 12 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagMuted: { backgroundColor: colors.surfaceAlt },
  tagText: { color: colors.primaryDark, fontSize: 11, fontWeight: "700" },
  tagTextMuted: { color: colors.textMuted },
  chevron: { color: colors.textMuted, fontSize: 26, paddingHorizontal: 4 },
});
