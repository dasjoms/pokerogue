import { headless } from "#app/global-vars/headless";

export let bypassLogin =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BYPASS_LOGIN === "1") || headless;
