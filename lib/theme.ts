// Central design tokens — tweak colors here and the whole app follows.

export const colors = {
  // surfaces
  bg: "#eef2f9", // app background (cool light blue-gray)
  surface: "#ffffff", // cards, sheets
  surfaceAlt: "#e7edf7", // subtle panels

  // brand — Deep Blue & Coral
  primary: "#1d4ed8", // blue-700
  primaryDark: "#1e40af",
  primarySoft: "#dbe6fe", // tinted backgrounds / chips
  accent: "#f97316", // coral/orange — secondary actions (text)
  success: "#10b981", // emerald — call button
  warning: "#f59e0b",
  danger: "#dc2626",

  // text
  text: "#0b1b3b", // deep navy slate
  textMuted: "#5a6472",
  textOnPrimary: "#ffffff",

  // lines & inputs
  border: "#dde3ee",
  inputBg: "#f6f8fc",
  inputBorder: "#c3cede",
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
