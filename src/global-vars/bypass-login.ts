import { headless } from "#app/global-vars/headless";

export const bypassLogin =
  import.meta.env.VITE_BYPASS_LOGIN === "1" || headless;
