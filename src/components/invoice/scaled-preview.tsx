"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { DOC_MIN_HEIGHT, DOC_WIDTH } from "./invoice-document";

// Fits the fixed-size A4 document into whatever width is available.
// The scale is applied to a wrapper, never to the document node itself, so
// PDF capture always sees the document at its natural size.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ScaledPreview({ children, maxScale = 1 }: { children: ReactNode; maxScale?: number }) {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    const [height, setHeight] = useState(DOC_MIN_HEIGHT);

    useIsomorphicLayoutEffect(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        const measure = () => {
            const width = outer.clientWidth;
            if (width > 0) setScale(Math.min(maxScale, width / DOC_WIDTH));
            setHeight(inner.offsetHeight || DOC_MIN_HEIGHT);
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(outer);
        observer.observe(inner);
        return () => observer.disconnect();
    }, [maxScale]);

    return (
        <div ref={outerRef} dir="ltr" className="invoice-scale-outer" style={{ width: "100%", minWidth: 0 }}>
            <div className="invoice-scale-box" style={{ width: DOC_WIDTH * scale, height: height * scale, margin: "0 auto", position: "relative" }}>
                <div
                    ref={innerRef}
                    className="invoice-scale-inner"
                    style={{
                        width: DOC_WIDTH,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        boxShadow: "0 20px 50px rgba(2,21,38,0.22)",
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
