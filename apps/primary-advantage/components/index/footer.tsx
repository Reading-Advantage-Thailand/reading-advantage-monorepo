import { Icons } from "@/components/icons";
import { CONTACT_CHANNELS } from "@/configs/contact-channels";
import { siteConfig } from "@/configs/site-config";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type FooterLink = { title: string; href: string };

/**
 * Builds the footer link groups from translated labels.
 * @param t Translation function for the Footer namespace.
 * @param books The label of the Our books page.
 * @returns About, legal, and contact link groups.
 */
function footerLinkGroups(t: (key: string) => string, books: string): { title: string; links: FooterLink[] }[] {
  return [
    {
      title: t("about"),
      links: [
        { title: t("aboutUs"), href: "/about" },
        { title: books, href: "/books" },
        {
          title: t("support"),
          href: "https://docs.google.com/forms/d/e/1FAIpQLSe_Ew100kef6j4O4IuiHm4ZeGhOj5FN6JRyJ7-0gvZV9eFgjQ/viewform?usp=sf_link",
        },
      ],
    },
    {
      title: t("legal"),
      links: [
        { title: t("privacyPolicy"), href: "/privacy-policy" },
        { title: t("terms"), href: "/terms" },
      ],
    },
    {
      title: t("contact"),
      links: [CONTACT_CHANNELS.email, CONTACT_CHANNELS.phone, CONTACT_CHANNELS.line].map(({ text, href }) => ({ title: text, href })),
    },
  ];
}

/**
 * The wooden footer of the public pages: the brand and the site tagline, the link groups, and
 * the contact channels from `configs/contact-channels.ts`.
 * @returns The footer.
 */
export function Footer() {
  const t = useTranslations("Footer");
  const tSite = useTranslations("PublicSite");
  const tNav = useTranslations("MainNav");
  const groups = footerLinkGroups(t, tNav("books"));
  return (
    <footer className="cq cq-footer">
      <div className="container py-8">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="flex max-w-sm flex-col gap-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <Icons.logo alt="" width={28} height={28} />
              {siteConfig.name}
            </Link>
            <p className="text-sm text-balance opacity-90">{tSite("tagline")}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-3 text-sm font-bold tracking-wide uppercase">{group.title}</h2>
                <ul className="flex flex-col gap-2 text-sm">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      {/^(https:|tel:|mailto:)/.test(link.href) ? (
                        <a href={link.href} {...(link.href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                          {link.title}
                        </a>
                      ) : (
                        <Link href={link.href}>{link.title}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-8 border-t border-white/15 pt-4 text-sm opacity-80">
          © {new Date().getFullYear()} Primary Advantage™ {t("rights")}
        </p>
      </div>
    </footer>
  );
}
