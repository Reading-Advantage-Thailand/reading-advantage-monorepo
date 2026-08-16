import { fireEvent, render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/contact/contact-form";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { TableOfContents } from "@/components/blog/table-of-contents";
import Footer from "@/components/common/footer";
import { Header } from "@/components/layout/header";
import { MasteryAdvantageGraph } from "@/components/marketing/mastery-advantage-graph";
import { ComparisonTable } from "@/components/features/comparison-table";
import { PricingTable } from "@/components/pricing/pricing-table";
import { FAQAccordion } from "@/components/ui/faq-accordion";
import { HorizontalStrip } from "@/components/ui/horizontal-strip";
import ContactPage from "@/app/[locale]/(marketing)/contact/page";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { navigation } from "@/config/navigation";

type ContactDetailsContract = {
  supportEmail: string;
  phoneNumber: string;
  tiktokUrl: string;
  lineQrSrc: string;
};

type ImportMetaWithGlob = ImportMeta & {
  glob: (pattern: string, options: { eager: true }) => Record<string, unknown>;
};

const contactConfigModules = (import.meta as ImportMetaWithGlob).glob(
  "../config/contact.ts",
  { eager: true },
);

const serverWiring = vi.hoisted(() => {
  const supportEmail = "support@reading-advantage.com";
  return {
    getScopedI18n: vi.fn(
      async () => (key: string) =>
        key === "email.address" ? supportEmail : key,
    ),
  };
});

vi.mock("@/locales/server", () => ({
  getScopedI18n: serverWiring.getScopedI18n,
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}

      disconnect() {}

      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Wave 5 Phase 4 accessibility, navigation, and contact contracts", () => {
  it("exposes the mastery graph as an announced image with live status", () => {
    const rendered = render(<MasteryAdvantageGraph />);
    const graph = rendered.container.querySelector("svg");

    expect.soft(graph).toBeInTheDocument();
    expect.soft(graph).toHaveAttribute("role", "img");
    expect.soft(graph).toHaveAccessibleName();

    const status = rendered.container.querySelector('[aria-live="polite"]');
    expect.soft(status).toBeInTheDocument();
    expect.soft(status).toHaveTextContent(/mastery advantage/i);
  });

  it("keeps reviewed interactive components discoverable and stateful", async () => {
    const user = userEvent.setup();
    const tableOfContents = render(
      <TableOfContents
        headings={[{ id: "intro", text: "Introduction", level: 2 }]}
      />,
    );

    const contentsNav = tableOfContents.queryByRole("navigation");
    expect.soft(contentsNav).toHaveAccessibleName();
    const contentsToggle = tableOfContents.getByRole("button", {
      name: /on.?this.?page/i,
    });
    expect.soft(contentsToggle).toHaveAttribute("aria-expanded", "false");
    await user.click(contentsToggle);
    expect.soft(contentsToggle).toHaveAttribute("aria-expanded", "true");
    cleanup();

    const faq = render(
      <FAQAccordion items={[{ question: "Question", answer: "Answer" }]} />,
    );
    const faqButton = faq.getByRole("button", { name: "Question" });
    expect.soft(faqButton).toHaveAttribute("aria-controls");
    await user.click(faqButton);
    const faqPanel = faq.queryByRole("region");
    expect.soft(faqPanel).toHaveAttribute("aria-labelledby", faqButton.id);
    cleanup();

    const strip = render(
      <HorizontalStrip>
        <div>Scrollable content</div>
      </HorizontalStrip>,
    );
    expect.soft(strip.queryByRole("region")).toHaveAccessibleName();
    cleanup();

    const pricing = render(<PricingTable />);
    const checks = [...pricing.container.querySelectorAll(".check")];
    expect.soft(checks.length).toBeGreaterThan(0);
    expect
      .soft(
        checks.every(
          (check) =>
            check.getAttribute("role") === "img" &&
            Boolean(check.getAttribute("aria-label")),
        ),
      )
      .toBe(true);
    cleanup();

    const comparison = render(<ComparisonTable />);
    const markedCells = [...comparison.container.querySelectorAll("td")].filter(
      (cell) => /^[✔✘⚬]$/.test(cell.textContent?.trim() ?? ""),
    );
    expect.soft(markedCells.length).toBeGreaterThan(0);
    expect
      .soft(
        markedCells.every(
          (cell) => cell.querySelector("[aria-label], .sr-only") !== null,
        ),
      )
      .toBe(true);
    cleanup();

    const pagination = render(
      <BlogPagination currentPage={1} totalPages={3} />,
    );
    expect
      .soft(pagination.queryByRole("link", { name: /previous/i }))
      .not.toBeInTheDocument();
    expect
      .soft(pagination.getByRole("link", { name: /next/i }))
      .toHaveAttribute("href", "/blog/page/2");
  });

  it("publishes Services through the shared primary navigation contract", () => {
    const serviceEntry = navigation.find((item) => item.href === "/services");
    expect.soft(serviceEntry).toEqual(
      expect.objectContaining({
        href: "/services",
        title: expect.any(String),
      }),
    );
    for (const messages of [enMessages, thMessages, zhMessages]) {
      expect
        .soft(
          messages.components.common.header.main.some(
            (item) => item.href === "/services",
          ),
        )
        .toBe(true);
    }

    const rendered = render(<Header />);
    expect
      .soft(
        rendered
          .getAllByRole("link", { name: /services/i })
          .some((link) => link.getAttribute("href") === "/services"),
      )
      .toBe(true);
  });

  it("uses one support contact contract across locale data and contact surfaces", async () => {
    const localeMessages = [enMessages, thMessages, zhMessages];
    const contactModule = contactConfigModules["../config/contact.ts"] as
      | { contactDetails?: ContactDetailsContract }
      | undefined;
    const contactDetails = contactModule?.contactDetails;
    const supportEmail =
      contactDetails?.supportEmail ?? enMessages.pages.contact.email.address;

    expect.soft(contactDetails).toEqual(
      expect.objectContaining({
        supportEmail: expect.any(String),
        phoneNumber: expect.any(String),
        tiktokUrl: expect.any(String),
        lineQrSrc: expect.any(String),
      }),
    );
    expect(supportEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    for (const messages of localeMessages) {
      expect(messages.pages.contact.email.address).toBe(supportEmail);
    }

    const footer = render(await Footer());
    const contactPage = render(await ContactPage());
    expect(footer.container).toHaveTextContent(supportEmail);
    expect(contactPage.container).toHaveTextContent(supportEmail);
    expect(
      [...contactPage.container.querySelectorAll('a[href^="mailto:"]')].every(
        (link) => link.getAttribute("href") === `mailto:${supportEmail}`,
      ),
    ).toBe(true);

    const form = render(<ContactForm />);
    const submittedWindow = Object.create(window) as Window;
    let submittedHref = "";
    Object.defineProperty(submittedWindow, "location", {
      configurable: true,
      value: {
        get href() {
          return submittedHref;
        },
        set href(value: string) {
          submittedHref = value;
        },
      },
    });
    vi.stubGlobal("window", submittedWindow);
    fireEvent.submit(form.container.querySelector("form") as HTMLFormElement);
    expect(submittedHref).toMatch(
      new RegExp(`^mailto:${supportEmail.replace(".", "\\.")}`),
    );
  });
});
