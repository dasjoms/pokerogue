export const headless =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_HEADLESS === "1";
