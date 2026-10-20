import { Facebook, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { rpgButton } from "@/components/rpg/chrome";
import { CONTACT_CHANNELS, type ContactChannel } from "@/configs/contact-channels";
import { cn } from "@/lib/utils";

/** The translated labels of the contact list (PublicHome.contact or PublicContact). */
export type ContactLabels = Record<ContactChannel | "lineQrAlt", string>;

const ICONS: Record<ContactChannel, LucideIcon> = { line: MessageCircle, facebook: Facebook, phone: Phone, email: Mail };
const ORDER: ContactChannel[] = ["line", "facebook", "phone", "email"];

/**
 * The contact channels as wood buttons, with the LINE QR picture (spec PP-3). There is no form:
 * every channel opens the visitor's own app (LINE, Facebook, the phone, or the mail program).
 * @param props.labels The translated channel labels.
 * @returns The contact list.
 */
export function ContactLinks({ labels }: { labels: ContactLabels }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ul className="flex flex-1 flex-col gap-3">
        {ORDER.map((channel) => {
          const Icon = ICONS[channel];
          const { href, text } = CONTACT_CHANNELS[channel];
          const external = href.startsWith("https:");
          return (
            <li key={channel}>
              <a
                href={href}
                className={cn(rpgButton("wood"), "min-h-12 w-full justify-start text-left")}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span>{labels[channel]}</span>
                  <span className="truncate text-sm font-normal opacity-90">{text}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <img
        src={CONTACT_CHANNELS.line.qr}
        alt={labels.lineQrAlt}
        width={160}
        height={160}
        className="size-40 self-center rounded-lg bg-white p-2 shadow-md"
      />
    </div>
  );
}
