import { getScopedI18n } from "@/locales/server";
import Image from "next/image";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import HeroSection from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";

export default async function ContactPage() {
  const t = await getScopedI18n("pages.contact");

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection
        title={t("title")}
        description={
          <div>
            <p className="text-xl text-sky-700 mb-2">{t("description")}</p>
            <p className="text-lg text-slate-600">{t("subtitle")}</p>
          </div>
        }
        ctaButton={{
          text: t("email.address"),
          href: "mailto:support@reading-advantage.com",
          variant: "primary",
        }}
        height="medium"
        alignment="center"
        customGradient="bg-gradient-to-br from-sky-50 via-sky-100 to-white"
      />

      {/* Contact Cards Section */}
      <section className="py-24 px-4 bg-sky-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Get in Touch
            </span>
            <h2 className="text-4xl font-bold text-sky-900 tracking-tight">
              {t("connectWithUs")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Email Card */}
            <div className="bg-white border border-sky-100 rounded-3xl p-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-200 rounded-2xl flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold text-sky-900 mb-3">
                {t("email.title")}
              </h3>
              <p className="text-slate-600 mb-6">{t("email.description")}</p>
              <Button asChild>
                <a href="mailto:support@reading-advantage.com">
                  {t("email.address")}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>

            {/* Phone Card */}
            <div className="bg-white border border-amber-100 rounded-3xl p-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mb-6">
                <Phone className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-3">
                {t("phone.title")}
              </h3>
              <p className="text-slate-600 mb-6">{t("phone.description")}</p>
              <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50" asChild>
                <a href="tel:+660990058038">
                  {t("phone.number")}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>

            {/* Location Card */}
            <div className="bg-white border border-sky-100 rounded-3xl p-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-200 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold text-sky-900 mb-3">
                {t("location.title")}
              </h3>
              <p className="text-slate-600 mb-6">{t("location.description")}</p>
              <p className="text-sky-700 font-semibold">
                {t("location.city")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social & QR Section */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="uppercase tracking-widest text-xs font-semibold text-sky-600 mb-4 block">
              Connect With Us
            </span>
            <h2 className="text-3xl font-bold text-sky-900 tracking-tight">
              Stay Connected
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Business Hours */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg animate-in fade-in slide-in-from-left-8">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                {t("hours.title")}
              </h3>
              <p className="text-slate-600 mb-3">{t("hours.description")}</p>
              <p className="text-3xl font-bold text-sky-600">
                {t("hours.time")}
              </p>
            </div>

            {/* Social Media & Line QR */}
            <div className="bg-gradient-to-br from-sky-900 to-sky-800 rounded-3xl p-8 shadow-xl text-white animate-in fade-in slide-in-from-right-8">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t("social.title")}</h3>
              <p className="text-sky-100 mb-6">{t("social.description")}</p>

              <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20">
                <h4 className="font-semibold mb-3">{t("lineQr.title")}</h4>
                <p className="text-sm text-sky-100 mb-4">
                  {t("lineQr.description")}
                </p>
                <div className="flex items-center justify-center bg-white rounded-xl p-4 mb-3">
                  <Image
                    src="/line-qr.jpg"
                    alt="Line QR Code"
                    width={200}
                    height={200}
                    className="rounded-xl"
                  />
                </div>
                <p className="text-center text-sm font-semibold text-sky-100">
                  {t("lineQr.caption")}
                </p>
              </div>

              <Button
                variant="white"
                className="mt-6 w-full"
                asChild
              >
                <a
                  href="https://www.tiktok.com/@reading.advantage"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Smartphone className="w-5 h-5" />
                  {t("social.tiktok")}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-4 bg-sky-900">
        <div className="container mx-auto text-center animate-in fade-in">
          <h2 className="text-3xl font-bold text-white mb-4">{t("title")}</h2>
          <p className="text-xl text-sky-100 mb-8 max-w-2xl mx-auto">
            {t("description")}
          </p>
          <Button variant="white" size="lg" asChild>
            <a href="mailto:support@reading-advantage.com">
              {t("email.title")}
              <ArrowRight className="w-5 h-5" />
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
