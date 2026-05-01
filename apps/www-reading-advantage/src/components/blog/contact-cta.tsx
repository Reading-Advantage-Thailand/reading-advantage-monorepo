import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ContactCTAProps {
  locale: string;
}

export function ContactCTA({ locale }: ContactCTAProps) {
  const isThai = locale === "th";

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {isThai ? "ต้องการพูดคุยกับทีมของเรา?" : "Want to talk to our team?"}
      </h3>
      <p className="text-slate-700 mb-4">
        {isThai
          ? "เรายินดีที่จะตอบคำถามและช่วยคุณค้นหาโซลูชันที่เหมาะสมสำหรับลูกของคุณ"
          : "We'd love to answer your questions and help you find the right solution for your child"}
      </p>
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 font-semibold text-amber-600 hover:text-amber-800 transition-all duration-300"
      >
        <span>{isThai ? "ติดต่อเรา" : "Contact Us"}</span>
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </div>
  );
}
