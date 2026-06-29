// Central design tokens — tweak colors here and the whole app follows.

export const colors = {
  // surfaces
  bg: "#eef1f8", // app background (cool light)
  surface: "#ffffff", // cards, sheets
  surfaceAlt: "#f1f4fc", // subtle panels

  // brand
  primary: "#4f46e5", // indigo
  primaryDark: "#3730a3",
  primarySoft: "#e0e7ff", // tinted backgrounds / chips
  accent: "#0ea5e9", // sky — secondary actions (text)
  success: "#10b981", // emerald — call button
  warning: "#f59e0b",
  danger: "#ef4444",

  // text
  text: "#0f172a", // slate-900
  textMuted: "#64748b", // slate-500
  textOnPrimary: "#ffffff",

  // lines & inputs
  border: "#e2e8f0",
  inputBg: "#f8fafc",
  inputBorder: "#cbd5e1",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const shadow = {
  card: {
    shadowColor: "#1e293b",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#1e293b",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
};

// App identity
export const APP_NAME = "ShiftMate";
export const APP_TAGLINE = "Local gigs, posted in seconds";
export const APP_DESCRIPTION =
  "Browse part-time and casual work near you, or post your own with a photo, location, and contact details — completely free.";
// Short monogram shown in the logo badge.
export const APP_BADGE = "SM";
