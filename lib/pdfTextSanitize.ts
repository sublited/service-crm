/**
 * @react-pdf/renderer's built-in "Helvetica" font only supports the WinAnsi
 * character set. Anything outside it (curly quotes from a phone keyboard,
 * em-dashes, emoji, non-Latin scripts) renders as broken/repeated glyphs —
 * this is almost certainly the cause of stray characters showing up after
 * names in generated PDFs. This normalises the common offenders to safe
 * ASCII equivalents and strips anything else Helvetica can't render.
 */
export function sanitizePdfText(input: string | null | undefined): string {
  if (!input) return "";

  const replacements: Record<string, string> = {
    "\u2018": "'", "\u2019": "'", // curly single quotes
    "\u201C": '"', "\u201D": '"', // curly double quotes
    "\u2013": "-", "\u2014": "-", // en/em dash
    "\u2026": "...", // ellipsis
    "\u00A0": " ", // non-breaking space
    "\u2022": "-", // stray bullet character
  };

  let out = input;
  for (const [from, to] of Object.entries(replacements)) {
    out = out.split(from).join(to);
  }

  // Strip anything outside printable ASCII + Latin-1 supplement (covers
  // accented characters Helvetica/WinAnsi can actually render). This is a
  // safety net for emoji and other scripts rather than a full solution —
  // if this app needs true Unicode support (e.g. non-Latin customer names),
  // swap in a custom TTF font via Font.register() in lib/pdfDocument.tsx.
  out = out.replace(/[^\x00-\xFF]/g, "");

  return out;
}
