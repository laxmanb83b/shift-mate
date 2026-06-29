import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Prefer EXPO_PUBLIC_* env vars; fall back to app.json `extra` for quick local runs.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "";

if (!supabaseUrl || supabaseUrl.includes("YOUR-PROJECT")) {
  console.warn(
    "[supabase] Missing config. Set EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in .env"
  );
}

const isWeb = Platform.OS === "web";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Native: persist the session with AsyncStorage.
    // Web: omit storage so supabase-js uses its own localStorage adapter,
    // which is safe during static (SSR/Node) rendering where there is no
    // window/localStorage. Forcing AsyncStorage here crashes the SSR pass.
    ...(isWeb ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    // On web, detect the magic-link token in the redirect URL.
    detectSessionInUrl: isWeb,
  },
});

export const PENDING_BUCKET = "pending-images";
export const PUBLIC_BUCKET = "posting-images";
