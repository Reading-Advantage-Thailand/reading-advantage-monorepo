import { type NavItem } from "@/types/nav"

export type { NavItem }

export const navigation: NavItem[] = [
  {
    title: "Products",
    href: "/products",
    items: [
      {
        title: "Primary Advantage",
        href: "/products/primary-advantage",
        description: "Grades 3-6 literacy development platform"
      },
      {
        title: "Reading Advantage",
        href: "/products/reading-advantage",
        description: "AI-powered reading comprehension platform"
      },
      {
        title: "Math Advantage",
        href: "/products/math-advantage",
        description: "Interactive mathematics learning"
      },
      {
        title: "Science Advantage",
        href: "/products/science-advantage",
        description: "Hands-on science education"
      },
      {
        title: "STEM Advantage",
        href: "/products/stem-advantage",
        description: "Integrated STEM learning platform"
      },
      {
        title: "Zhongwen Advantage",
        href: "/products/zhongwen-advantage",
        description: "Chinese language learning platform"
      },
      {
        title: "Storytime Advantage",
        href: "/products/storytime-advantage",
        description: "Interactive storytelling platform"
      },
      {
        title: "CodeCamp Advantage",
        href: "/products/codecamp-advantage",
        description: "Learn coding through projects"
      },
      {
        title: "Tutor Advantage",
        href: "/products/tutor-advantage",
        description: "Online tutoring platform"
      }
    ]
  },
  {
    title: "Features",
    href: "/features"
  },
  {
    title: "Pricing",
    href: "/pricing"
  },
  {
    title: "Blog",
    href: "/blog"
  },
  {
    title: "About",
    href: "/about"
  },
  {
    title: "Contact",
    href: "/contact"
  }
]

export const productLinks = navigation[0].items?.map((item: NavItem) => ({
  label: item.title,
  href: item.href
})) || []
