interface HeaderProps {
    heading: string
    text?: string
    variant?: "primary" | "warning"
    children?: React.ReactNode
}

export function Header({
    heading,
    text,
    children,
    variant = "primary",
}: HeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-8 border-b border-border mb-8">
            <div className="grid gap-1">
                <h1 className={`font-bold text-3xl md:text-5xl tracking-tight ${variant === "warning" ? "text-destructive" : "text-foreground"}`}>{heading}</h1>
                {text && <p className={`text-sm md:text-base text-muted-foreground ${variant === "warning" ? "text-destructive/80" : ""}`}>{text}</p>}
            </div>
            {children}
        </div>
    )
}
