// Client-side PDF export. The document is rendered by the browser (so Arabic
// shaping and the web fonts are exactly what the preview shows), captured as
// an image and placed on A4 pages.

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// html-to-image rebuilds the document with every element frozen at its computed
// pixel size. A box that is exactly as wide as its text (a flex item, an
// inline-block) gets a fractional width such as 50.4766px, which the browser
// then snaps DOWN to its 1/64px layout grid. The box ends up a hair narrower
// than its own text, so the last word ("د.ك" after an amount) wraps onto a
// second line, and because the height is frozen too, that line is painted on
// top of whatever sits below it.
//
// Guard: any text that occupies a single line in the preview is pinned to a
// single line for the capture. The overflow is under 1/64px, so nothing moves.
// Returns a function that puts the inline styles back.
function pinSingleLineText(root: HTMLElement): () => void {
    const undo: Array<() => void> = [];
    const seen = new Set<HTMLElement>();
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        const el = text.parentElement;
        if (!el || seen.has(el) || !text.textContent?.trim()) continue;
        seen.add(el);

        const whiteSpace = getComputedStyle(el).whiteSpace;
        if (whiteSpace === "nowrap" || whiteSpace === "pre") continue;

        // One line = every fragment of the element's content overlaps vertically.
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
        if (rects.length === 0) continue;
        const lowestTop = Math.max(...rects.map((r) => r.top));
        const highestBottom = Math.min(...rects.map((r) => r.bottom));
        if (lowestTop >= highestBottom) continue; // genuinely multi-line: leave it alone

        const previous = el.style.getPropertyValue("white-space");
        const priority = el.style.getPropertyPriority("white-space");
        el.style.setProperty("white-space", "nowrap");
        undo.push(() => {
            if (previous) el.style.setProperty("white-space", previous, priority);
            else el.style.removeProperty("white-space");
        });
    }

    return () => undo.forEach((restore) => restore());
}

export async function exportNodeToPdf(node: HTMLElement, fileName: string): Promise<void> {
    const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

    if (document.fonts?.ready) await document.fonts.ready;

    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const options = {
        width,
        height,
        pixelRatio: 2.5,
        quality: 0.94,
        backgroundColor: "#f6f9fe",
        style: { transform: "none", boxShadow: "none", margin: "0" },
    };

    let dataUrl: string;
    const unpin = pinSingleLineText(node);
    try {
        // Safari only paints embedded images reliably from the second pass on.
        await toJpeg(node, options);
        dataUrl = await toJpeg(node, options);
    } finally {
        unpin();
    }

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const imageHeightMm = (height / width) * A4_WIDTH_MM;

    if (imageHeightMm <= A4_HEIGHT_MM + 1) {
        pdf.addImage(dataUrl, "JPEG", 0, 0, A4_WIDTH_MM, imageHeightMm, undefined, "FAST");
    } else {
        // Long documents: same image on every page, shifted up one page at a time.
        const pages = Math.ceil(imageHeightMm / A4_HEIGHT_MM - 0.01);
        for (let page = 0; page < pages; page++) {
            if (page > 0) pdf.addPage();
            pdf.addImage(dataUrl, "JPEG", 0, -page * A4_HEIGHT_MM, A4_WIDTH_MM, imageHeightMm, undefined, "FAST");
        }
    }

    pdf.save(fileName);
}
