import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"

interface FooterProps {
    className?: string
}

export function ArticleFooter({ className }: FooterProps) {
    return (
        <footer className={cn(className)}>
                <div className="flex items-center gap-4 px-8">
                    <Icons.AlertCircle />
                    <p className="text-sm leading-loose">For language learners: This reading passage and its supporting visuals are designed for educational purposes. The computer-generated audio helps with pronunciation and listening practice. As with any learning resource, consider cross-referencing any facts used in academic work.</p>
                </div>
        </footer>
    )
}