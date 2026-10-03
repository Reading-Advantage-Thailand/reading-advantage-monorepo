import { ArrowRight } from "lucide-react";
import { Link } from "@/locales/navigation";

type LiveCardProps = {
  href: string;
  logo: string;
  name: string;
  description: string;
  meta: string;
  cta: string;
  accent: string;
};

/**
 * Card for a live product line: logo, one line, meta line, and a link.
 * @param props The card text, the logo path, and the accent color for the top bar.
 * @returns The linked card.
 */
export function HomeLiveCard({ href, logo, name, description, meta, cta, accent }: LiveCardProps) {
  return (
    <Link
      href={href}
      data-testid={`home-live-${name.toLowerCase().replace(/\s+/g, "-")}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-site-border bg-white p-7 shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-black motion-safe:transition-transform motion-safe:hover:-translate-y-1 hover:shadow-lg"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent }} />
      <img src={logo} alt={name} width={240} height={60} className="mb-6 h-12 w-auto self-start" />
      <p className="mb-3 text-base leading-relaxed text-black">{description}</p>
      <p className="mb-8 text-sm leading-relaxed text-site-body">{meta}</p>
      <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-black">
        <span className="border-b border-site-border pb-0.5 group-hover:border-black">{cta}</span>
        <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}

type RoadmapCardProps = {
  href: string;
  logo: string;
  name: string;
  tag: string;
};

/**
 * Quiet card for a planned product line. It carries no date.
 * @param props The product name, the logo path, and the "Planned" tag text.
 * @returns The linked card.
 */
export function HomeRoadmapCard({ href, logo, name, tag }: RoadmapCardProps) {
  return (
    <Link
      href={href}
      data-testid={`home-roadmap-${name.toLowerCase().replace(/\s+/g, "-")}`}
      className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-site-border bg-transparent p-4 outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-black"
    >
      <img src={logo} alt={name} width={240} height={60} className="h-10 w-auto opacity-70" />
      <span className="rounded-full bg-[#efece5] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-site-body">
        {tag}
      </span>
    </Link>
  );
}
