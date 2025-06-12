export const headless =
  (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.VITE_HEADLESS === "1") ||
  process.env.VITE_HEADLESS === "1";
