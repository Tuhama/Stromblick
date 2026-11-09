import "i18next";
import type en from "./en.json";

// Makes t() check its keys against the English file: a typo is a compile error.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
