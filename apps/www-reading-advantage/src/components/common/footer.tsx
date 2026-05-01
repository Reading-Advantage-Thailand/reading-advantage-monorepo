import { getScopedI18n } from "@/locales/server";
import Link from "next/link";
import React from "react";
import Image from "next/image";

export default async function Footer() {
  const t = await getScopedI18n("components.common.footer");
  return (
    <footer className="bg-sky-50 text-slate-700 py-12 border-t border-sky-100">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-[40px] border border-sky-100 p-8 md:p-12 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className=" font-semibold text-lg mb-4">
                {t("heading")}
              </h3>
              <p className="text-slate-600 ">
                {t("description")}
              </p>
            </div>
            <div>
              <h3 className=" font-semibold text-lg mb-4">
                {t("quickLinks.title")}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-slate-600 hover:text-black transition-colors "
                  >
                    {t("quickLinks.links.about")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products"
                    className="text-slate-600 hover:text-black transition-colors "
                  >
                    {t("quickLinks.links.products")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-slate-600 hover:text-black transition-colors "
                  >
                    {t("quickLinks.links.services")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/case-studies"
                    className="text-slate-600 hover:text-black transition-colors "
                  >
                    {t("quickLinks.links.caseStudies")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-slate-600 hover:text-black transition-colors "
                  >
                    {t("quickLinks.links.contact")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className=" font-semibold text-lg mb-4">
                {t("contactUs.title")}
              </h3>
              <ul className="space-y-2 text-slate-600 ">
                <li>{t("contactUs.email")}: support@reading-advantage.com</li>
                <li>{t("contactUs.phone")}: +66 099-005-8038</li>
                <li>
                  {t("contactUs.location")} <br />
                  Tiktok @reading.advantage
                </li>
                <li>
                  <Image
                    src="/line-qr.jpg"
                    width={100}
                    height={100}
                    alt="Line QR"
                    className="rounded-lg"
                  />
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-sky-100 mt-8 pt-8 text-center text-slate-600 ">
            <p>
              &copy; {new Date().getFullYear()} Reading Advantage Thailand. All
              rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
