import type enMessages from "../locales/en";

type NormalizeMessageShape<Value> = Value extends string
  ? string
  : Value extends readonly (infer Item)[]
    ? readonly NormalizeMessageShape<Item>[]
    : Value extends object
      ? {
          [Key in keyof Value as Key extends number
            ? `${Key}`
            : Key]: NormalizeMessageShape<Value[Key]>;
        }
      : Value;

type EnglishMessages = NormalizeMessageShape<typeof enMessages>;
type EnglishServices = EnglishMessages["pages"]["services"];
type EnglishService = EnglishServices["services"][number];
type SixServiceFeatures = {
  "0": EnglishService["features"][0];
  "1": EnglishService["features"][1];
  "2": EnglishService["features"][2];
  "3": EnglishService["features"][3];
  "4": EnglishService["features"][4];
  "5": EnglishService["features"][5];
};
type FourServiceFeatures = {
  "0": EnglishService["features"][0];
  "1": EnglishService["features"][1];
  "2": EnglishService["features"][2];
  "3": EnglishService["features"][3];
};
type ExactService<Features extends object> = {
  name: EnglishService["name"];
  status: EnglishService["status"];
  statusBadge: EnglishService["statusBadge"];
  description: EnglishService["description"];
  cta: EnglishService["cta"];
  href: EnglishService["href"];
  image: EnglishService["image"];
  features: Features;
};
type ExactServices = Omit<EnglishServices, "services"> & {
  services: {
    "0": ExactService<SixServiceFeatures>;
    "1": ExactService<SixServiceFeatures>;
    "2": ExactService<SixServiceFeatures>;
    "3": ExactService<FourServiceFeatures>;
  };
};
type ExactPages = Omit<EnglishMessages["pages"], "services"> & {
  services: ExactServices;
};
type ExactMessages = Omit<EnglishMessages, "pages"> & {
  pages: ExactPages;
};

declare module "next-intl" {
  interface AppConfig {
    Messages: ExactMessages;
  }
}
