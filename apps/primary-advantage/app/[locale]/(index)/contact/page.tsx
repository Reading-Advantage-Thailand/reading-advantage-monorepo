import React from 'react'
import type { Metadata } from "next";

type Props = {}

/** Static metadata for the contact page. */
export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Primary Advantage.",
};

export default function ContactPage({ }: Props) {
    return (
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
            <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
                <p>
                    Daniel Bo: admin@reading-advantage.com.
                </p>
            </div>
        </section>
    )
}