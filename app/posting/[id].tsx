import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  fetchPosting,
  reportPosting,
  updatePostingStatus,
  deletePosting,
  getCurrentUserId,
  isAdmin,
  formatActiveTill,
} from "@/lib/postings";
import type { Posting } from "@/lib/types";
import { colors, radius, shadow } from "@/lib/theme";

export default function PostingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [posting, setPosting] = useState<Posting | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchPosting(id), getCurrentUserId(), isAdmin()])
      .then(([p, uid, adminOk]) => {
        setPosting(p);
        setUserId(uid);
        setAdmin(adminOk);
      })
      .catch(() => setPosting(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = !!posting?.poster_id && posting.poster_id === userId;

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

  const call = () => {
    if (posting?.contact_phone) Linking.openURL(`tel:${posting.contact_phone}`);
  };
  const sms = () => {
    if (posting?.contact_phone) Linking.openURL(`sms:${posting.contact_phone}`);
  };
  const email = () => {
    if (posting?.contact_email)
      Linking.openURL(`mailto:${posting.contact_email}`);
  };
  const report = async () => {
    if (!posting) return;
    try {
      await reportPosting(posting.id, "user_reported");
      notify("Thanks — this posting has been reported for review.");
    } catch {
      notify("Could not submit report. Please try again.");
    }
  };

  const setStatus = async (status: Posting["status"], msg: string) => {
    if (!posting) return;
    setBusy(true);
    try {
      await updatePostingStatus(posting.id, status);
      setPosting({ ...posting, status });
      notify(msg);
    } catch {
      notify("Could not update the posting.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!posting) return;
    confirm("Delete this posting permanently?", async () => {
      setBusy(true);
      try {
        await deletePosting(posting.id);
        notify("Posting deleted.");
        router.replace("/");
      } catch {
        notify("Could not delete the posting.");
        setBusy(false);
      }
    });
  };

  if (loading)
    return (
      <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
    );
  if (!posting)
    return (
      <Text style={styles.error}>This posting is no longer available.</Text>
    );

  const filled = posting.status === "filled";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {posting.image_url ? (
        <Image source={{ uri: posting.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>ShiftMate</Text>
        </View>
      )}

      <View style={styles.sheet}>
        {filled ? (
          <View style={styles.filledBanner}>
            <Text style={styles.filledText}>✓ This position has been filled</Text>
          </View>
        ) : null}

        <Text style={styles.title}>{posting.title}</Text>

        <View style={styles.metaRow}>
          {posting.category ? (
            <View style={styles.catTag}>
              <Text style={styles.catTagText}>{posting.category}</Text>
            </View>
          ) : null}
          <Text style={styles.activeTill}>
            Active till {formatActiveTill(posting.expires_at)}
          </Text>
        </View>

        {posting.location_text ? (
          <Text style={styles.meta}>📍 {posting.location_text}</Text>
        ) : null}
        {posting.description ? (
          <Text style={styles.desc}>{posting.description}</Text>
        ) : null}

        <View style={styles.contactBox}>
          <Text style={styles.contactHeader}>Contact</Text>
          {posting.contact_name ? (
            <Text style={styles.contactName}>{posting.contact_name}</Text>
          ) : null}

          {posting.contact_phone ? (
            <View style={styles.btnRow}>
              <Pressable style={[styles.btn, styles.btnCall]} onPress={call}>
                <Text style={styles.btnText}>📞 Call</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnText2]} onPress={sms}>
                <Text style={styles.btnText}>💬 Text</Text>
              </Pressable>
            </View>
          ) : null}

          {posting.contact_email ? (
            <Pressable style={[styles.btn, styles.btnEmail]} onPress={email}>
              <Text style={styles.btnText}>✉️ {posting.contact_email}</Text>
            </Pressable>
          ) : null}

          {!posting.contact_phone && !posting.contact_email ? (
            <Text style={styles.meta}>No contact details provided.</Text>
          ) : null}
        </View>

        {/* Owner controls */}
        {isOwner ? (
          <View style={styles.ownerBox}>
            <Text style={styles.ownerHeader}>Manage your posting</Text>
            <Pressable
              style={[styles.ownerBtn, styles.editBtn]}
              disabled={busy}
              onPress={() => router.push(`/post?id=${posting.id}`)}
            >
              <Text style={[styles.ownerBtnText, styles.editText]}>
                ✎ Edit posting
              </Text>
            </Pressable>
            {filled ? (
              <Pressable
                style={[styles.ownerBtn, styles.reactivate]}
                disabled={busy}
                onPress={() =>
                  setStatus("active", "Posting is active again.")
                }
              >
                <Text style={styles.ownerBtnText}>↺ Reactivate posting</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.ownerBtn, styles.markFilled]}
                disabled={busy}
                onPress={() =>
                  setStatus("filled", "Marked as filled — it's now hidden.")
                }
              >
                <Text style={styles.ownerBtnText}>✓ Mark as filled (hired)</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.ownerBtn, styles.deleteBtn]}
              disabled={busy}
              onPress={remove}
            >
              <Text style={[styles.ownerBtnText, styles.deleteText]}>
                🗑 Delete posting
              </Text>
            </Pressable>
          </View>
        ) : admin ? (
          <View style={[styles.ownerBox, styles.adminBox]}>
            <Text style={styles.adminHeader}>🛡 Admin moderation</Text>
            <Text style={styles.adminNote}>
              Remove this posting if it's inappropriate, even without a report.
            </Text>
            <Pressable
              style={[styles.ownerBtn, styles.adminDelete]}
              disabled={busy}
              onPress={remove}
            >
              <Text style={styles.ownerBtnText}>🗑 Delete posting</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.report} onPress={report}>
            <Text style={styles.reportText}>🚩 Report this posting</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  image: { width: "100%", height: 240, backgroundColor: colors.surfaceAlt },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  imagePlaceholderText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 32,
    letterSpacing: 0.5,
  },
  sheet: {
    backgroundColor: colors.surface,
    marginTop: -18,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    minHeight: 400,
  },
  filledBanner: {
    backgroundColor: "#dcfce7",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  filledText: { color: "#15803d", fontWeight: "700", textAlign: "center" },
  title: { fontSize: 23, fontWeight: "800", color: colors.text },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  catTag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catTagText: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  activeTill: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 10 },
  desc: { fontSize: 15, color: colors.text, marginTop: 14, lineHeight: 23 },
  contactBox: {
    marginTop: 24,
    padding: 18,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  contactName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: "center",
    ...shadow.card,
  },
  btnCall: { backgroundColor: colors.success },
  btnText2: { backgroundColor: colors.accent },
  btnEmail: { backgroundColor: colors.primary, marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "800" },

  ownerBox: {
    marginTop: 26,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ownerHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  ownerBtn: {
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: 8,
  },
  markFilled: { backgroundColor: colors.success },
  reactivate: { backgroundColor: colors.primary },
  editBtn: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editText: { color: colors.primary },
  ownerBtnText: { color: "#fff", fontWeight: "800" },
  deleteBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteText: { color: colors.danger },

  adminBox: { borderColor: colors.danger, backgroundColor: "#fff5f5" },
  adminHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.danger,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  adminNote: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 19,
  },
  adminDelete: { backgroundColor: colors.danger },

  report: { marginTop: 30, alignItems: "center" },
  reportText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  error: { color: colors.danger, textAlign: "center", margin: 24 },
});
