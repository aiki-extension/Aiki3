import { BACK4APP_CONFIG as LOCAL_CONFIG } from "./back4appConfig.local";

export const BACK4APP_CONFIG = {
  appId: LOCAL_CONFIG?.appId || "",
  restKey: LOCAL_CONFIG?.restKey || "",
  serverURL: LOCAL_CONFIG?.serverURL || "https://parseapi.back4app.com",
  environment: LOCAL_CONFIG?.environment || "production",
};
