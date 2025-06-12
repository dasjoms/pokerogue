export const isBeta =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.MODE === "beta";
