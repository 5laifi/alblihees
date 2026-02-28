import { SectionWrapper } from "@/components/section-wrapper";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    className?: string;
}

export function PageHeader({ title, subtitle, className }: PageHeaderProps) {
    return (
        <div className={cn("bg-muted/30 border-b", className)}>
            <SectionWrapper className="py-10 md:py-16">
                <div className="flex flex-col items-center text-center space-y-3 md:space-y-4 max-w-3xl mx-auto">
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-primary">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                </div>
            </SectionWrapper>
        </div>
    );
}
