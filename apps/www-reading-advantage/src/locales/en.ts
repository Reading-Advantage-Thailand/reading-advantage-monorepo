// pages
import { en as aboutPage } from "./pages/about";
import { en as homePage } from "./pages/home";
import { en as contactPage } from "./pages/contact";
import { en as featurePage } from "./pages/feature";
import { en as caseStudiesPage } from "./pages/case-studies";
import { en as blendedLearningPage } from "./pages/blended-learning";
import { en as managedServicePage } from "./pages/managed-service";
import { en as servicesPage } from "./pages/services";
import { en as productsOverview } from "./pages/products/overview";
import { en as codecampPage } from "./pages/products/codecamp-advantage";
import { en as mathPage } from "./pages/products/math-advantage";
import { en as readingPage } from "./pages/products/reading-advantage";
import { en as sciencePage } from "./pages/products/science-advantage";
import { en as stemPage } from "./pages/products/stem-advantage";
import { en as storytimePage } from "./pages/products/storytime-advantage";
import { en as tutorPage } from "./pages/products/tutor-advantage";
import { en as zhongwenPage } from "./pages/products/zhongwen-advantage";
import { en as primaryPage } from "./pages/products/primary-advantage";
import { en as pricingPage } from "./pages/pricing";
import { en as blogPage } from "./pages/blog";
// components
import { en as localeSwitcher } from "./components/locale-switcher";
import { en as pricingTable } from "./components/pricing-table";
import { en as comparisonTable } from "./components/comparison-table";
import { en as contactForm } from "./components/contact-form";
import { en as footer } from "./components/common/footer";
import { en as header } from "./components/common/header";
import { en as navigation } from "./components/common/navigation";
import { en as b2b } from "./components/products/b2b-solutions";
import { en as b2c } from "./components/products/b2c-solutions";
import { en as tutorAdvantage } from "./components/products/tutor-advantage";
import { en as pagination } from "./components/pagination";

export default {
  pages: {
    about: aboutPage,
    home: homePage,
    contact: contactPage,
    feature: featurePage,
    caseStudies: caseStudiesPage,
    services: servicesPage,
    blendedLearning: blendedLearningPage,
    managedService: managedServicePage,
    pricing: pricingPage,
    blog: blogPage,
    products: {
      overview: productsOverview,
      codecampAdvantage: codecampPage,
      mathAdvantage: mathPage,
      primaryAdvantage: primaryPage,
      readingAdvantage: readingPage,
      scienceAdvantage: sciencePage,
      stemAdvantage: stemPage,
      storytimeAdvantage: storytimePage,
      tutorAdvantage: tutorPage,
      zhongwenAdvantage: zhongwenPage,
    },
  },
  components: {
    localeSwitcher,
    pricingTable,
    comparisonTable,
    contactForm,
    pagination,
    products: {
      b2bSolutions: b2b,
      b2cSolutions: b2c,
      tutorAdvantage,
    },
    common: {
      footer,
      header,
      navigation,
    },
  },
} as const;
