import type { MarkdownSpan } from "./parseMarkdown";

// Block dangerous URL protocols (javascript:, data:, vbscript:, etc.)
// Allow http(s), mailto, fragment, and relative URLs
function isSafeUrl(url: string): boolean {
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('https:') || trimmed.startsWith('http:') || trimmed.startsWith('mailto:') || trimmed.startsWith('/') || trimmed.startsWith('#')) {
        return true;
    }
    return !trimmed.includes(':');
}

// Updated pattern to handle nested markdown and asterisks
const pattern = /(\*\*(.*?)(?:\*\*|$))|(\*(.*?)(?:\*|$))|(\[([^\]]+)\](?:\(([^)]+)\))?)|(`(.*?)(?:`|$))/g;

export function parseMarkdownSpans(markdown: string, header: boolean) {
    const spans: MarkdownSpan[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(markdown)) !== null) {
        // Capture the text between the end of the last match and the start of this match as plain text
        const plainText = markdown.slice(lastIndex, match.index);
        if (plainText) {
            spans.push({ styles: [], text: plainText, url: null });
        }

        if (match[1]) {
            // Bold
            if (header) {
                spans.push({ styles: [], text: match[2], url: null });
            } else {
                spans.push({ styles: ['bold'], text: match[2], url: null });
            }
        } else if (match[3]) {
            // Italic
            if (header) {
                spans.push({ styles: [], text: match[4], url: null });
            } else {
                spans.push({ styles: ['italic'], text: match[4], url: null });
            }
        } else if (match[5]) {
            // Link - handle incomplete links (no URL part)
            if (match[7] && isSafeUrl(match[7])) {
                spans.push({ styles: [], text: match[6], url: match[7] });
            } else {
                // No URL, or URL uses a dangerous protocol — render as plain text
                spans.push({ styles: [], text: match[6], url: null });
            }
        } else if (match[8]) {
            // Inline code
            spans.push({ styles: ['code'], text: match[9], url: null });
        }

        lastIndex = pattern.lastIndex;
    }

    // If there's any text remaining after the last match, treat it as plain
    if (lastIndex < markdown.length) {
        spans.push({ styles: [], text: markdown.slice(lastIndex), url: null });
    }

    return spans;
}