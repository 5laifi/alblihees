import { cn } from "@/lib/utils";

interface SectionWrapperProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
    withContainer?: boolean;
}

export function SectionWrapper({
    children,
    className,
    withContainer = true,
    ...props
}: SectionWrapperProps) {
    return (
        <section
            className={cn("py-12 md:py-20", className)}
            {...props}
        >
            {withContainer ? (
                <div className="container px-4 md:px-6">
                    {children}
                </div>
            ) : children}
        </section>
    );
}
