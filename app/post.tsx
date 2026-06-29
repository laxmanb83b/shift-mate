import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  createPosting,
  updatePosting,
  fetchPosting,
  uploadAndModerateImage,
  CATEGORIES,
  EXPIRY_OPTIONS,
} from "@/lib/postings";
import { colors, radius, shadow } from "@/lib/theme";

export default function PostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState(30);
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null); // new local pick
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPost, setLoadingPost] = useState(editing);
  const [focused, setFocused] = useState<string | null>(null);

  // In edit mode, load the posting and prefill the form.
  useEffect(() => {
    if (!editing || !id) return;
    fetchPosting(id)
      .then((p) => {
        if (!p) return;
        setTitle(p.title ?? "");
        setDescription(p.description ?? "");
        setContactName(p.contact_name ?? "");
        setContactPhone(p.contact_phone ?? "");
        setContactEmail(p.contact_email ?? "");
        setLocation(p.location_text ?? "");
        setCategory(p.category ?? null);
        setExistingImageUrl(p.image_url ?? null);
      })
      .finally(() => setLoadingPost(false));
  }, [editing, id]);

  const notify = (msg: string) =>
    Platform.OS === "web" ? window.alert(msg) : Alert.alert(msg);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify("Photo permission is needed to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setExistingImageUrl(null);
    }
  };

  const previewUri = imageUri ?? existingImageUrl;

  const submit = async () => {
    if (!title.trim()) {
      notify("Please add a job title.");
      return;
    }
    if (!contactPhone.trim() && !contactEmail.trim()) {
      notify("Add at least one contact method (phone or email).");
      return;
    }
    setSubmitting(true);
    try {
      // New local image → moderate + upload. Otherwise keep whatever remains.
      let imageUrl: string | null = existingImageUrl;
      if (imageUri) {
        imageUrl = await uploadAndModerateImage(imageUri);
      }

      // On edit, an emptied field should clear (null); on create it's omitted.
      const empty = editing ? null : undefined;
      const fields: any = {
        title: title.trim(),
        description: description.trim() || empty,
        contact_name: contactName.trim() || empty,
        contact_phone: contactPhone.trim() || empty,
        contact_email: contactEmail.trim() || empty,
        location_text: location.trim() || empty,
        category: category ?? empty,
        image_url: imageUrl,
      };

      if (editing && id) {
        // Only change "active till" if the poster picked a new duration.
        await updatePosting(id, {
          ...fields,
          ...(expiryTouched ? { expiryDays } : {}),
        });
        notify("Posting updated.");
        router.replace(`/posting/${id}`);
      } else {
        const posting = await createPosting({ ...fields, expiryDays });
        notify("Your job posting is live!");
        router.replace(`/posting/${posting.id}`);
      }
    } catch (e: any) {
      notify(e?.message ?? "Could not save the posting.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (name: string) => [
    styles.input,
    focused === name && styles.inputFocused,
  ];

  if (loadingPost) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Edit Job" }} />
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
    >
      <Stack.Screen options={{ title: editing ? "Edit Job" : "Post a Job" }} />

      <Text style={styles.intro}>
        {editing
          ? "Update your posting. Changes go live right away."
          : "Share a part-time gig. Add a photo of the posting if you have one — it's auto-checked before going live."}
      </Text>

      <View style={styles.card}>
        <Field label="Job title" required>
          <TextInput
            style={inputStyle("title")}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Weekend barista"
            placeholderTextColor={colors.textMuted}
            onFocus={() => setFocused("title")}
            onBlur={() => setFocused(null)}
          />
        </Field>
        <Field label="Description">
          <TextInput
            style={[...inputStyle("desc"), styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Hours, pay, what's involved…"
            placeholderTextColor={colors.textMuted}
            multiline
            onFocus={() => setFocused("desc")}
            onBlur={() => setFocused(null)}
          />
        </Field>
        <Field label="Location">
          <TextInput
            style={inputStyle("loc")}
            value={location}
            onChangeText={setLocation}
            placeholder="Neighborhood, city"
            placeholderTextColor={colors.textMuted}
            onFocus={() => setFocused("loc")}
            onBlur={() => setFocused(null)}
          />
        </Field>
      </View>

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.card}>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(active ? null : c)}
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
        </View>
      </View>

      <Text style={styles.sectionLabel}>
        {editing ? "Extend active period" : "Active for"}
      </Text>
      <View style={styles.card}>
        <View style={styles.chipWrap}>
          {EXPIRY_OPTIONS.map((opt) => {
            const active = expiryTouched && expiryDays === opt.days;
            return (
              <Pressable
                key={opt.days}
                onPress={() => {
                  setExpiryDays(opt.days);
                  setExpiryTouched(true);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hintSmall}>
          {editing
            ? "Pick a duration to reset “active till” to that many days from today. Leave it to keep the current date."
            : "Your posting will automatically hide after this many days."}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>How seekers reach you</Text>
      <View style={styles.card}>
        <Field label="Contact name">
          <TextInput
            style={inputStyle("name")}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Who to ask for"
            placeholderTextColor={colors.textMuted}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
          />
        </Field>
        <Field label="Contact phone">
          <TextInput
            style={inputStyle("phone")}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="Phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            onFocus={() => setFocused("phone")}
            onBlur={() => setFocused(null)}
          />
        </Field>
        <Field label="Contact email">
          <TextInput
            style={inputStyle("email")}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="name@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
          />
        </Field>
        <Text style={styles.hintSmall}>Add at least a phone or an email.</Text>
      </View>

      <Text style={styles.sectionLabel}>Photo (optional)</Text>
      <View style={styles.card}>
        {previewUri ? (
          <View>
            <Image source={{ uri: previewUri }} style={styles.preview} />
            <Pressable
              onPress={() => {
                setImageUri(null);
                setExistingImageUrl(null);
              }}
            >
              <Text style={styles.removeImg}>Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.imgBtn} onPress={pickImage}>
            <Text style={styles.imgBtnIcon}>＋</Text>
            <Text style={styles.imgBtnText}>Add a photo of the posting</Text>
          </Pressable>
        )}
        <Text style={styles.hint}>
          🛡️ Uploaded images are automatically screened. Only clear,
          job-related photos are accepted.
        </Text>
      </View>

      <Pressable
        style={[styles.submit, submitting && { opacity: 0.6 }]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>
            {editing ? "Save changes" : "Post Job"}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  req: { color: colors.danger },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: "#fff",
  },
  multiline: { height: 96, textAlignVertical: "top" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  imgBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingVertical: 24,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
  },
  imgBtnIcon: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  imgBtnText: { color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  removeImg: { color: colors.danger, marginTop: 10, fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 10, lineHeight: 17 },
  hintSmall: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: 22,
    ...shadow.raised,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
