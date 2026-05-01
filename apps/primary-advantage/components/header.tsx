interface HeaderProps {
  heading: string;
  text?: string;
  variant?: "primary" | "warning";
  children?: React.ReactNode;
}

export function Header({
  heading,
  text,
  children,
  variant = "primary",
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="grid gap-1">
        <h1
          className={`text-3xl font-bold md:text-4xl ${
            variant === "warning" ? "text-[#c2410c] dark:text-[#c2410c]" : ""
          }`}
        >
          {heading}
        </h1>
        {text && (
          <p
            className={`text-muted-foreground text-lg ${
              variant === "warning" ? "text-[#9a3412] dark:text-[#7c2d12]" : ""
            }`}
          >
            {text}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
