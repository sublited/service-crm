import { parse, HTMLElement, Node, NodeType } from "node-html-parser";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { sanitizePdfText as clean } from "@/lib/pdfTextSanitize";

const styles = StyleSheet.create({
  paragraph: { marginBottom: 4 },
  listItem: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10 },
  listItemText: { flex: 1 },
  table: { marginTop: 4, marginBottom: 4, borderTopWidth: 0.5, borderTopColor: "#d1d5db", borderLeftWidth: 0.5, borderLeftColor: "#d1d5db" },
  tableRow: { flexDirection: "row" },
  tableCell: {
    flex: 1,
    padding: 3,
    fontSize: 9,
    borderRightWidth: 0.5,
    borderRightColor: "#d1d5db",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
  tableHeaderCell: {
    flex: 1,
    padding: 3,
    fontSize: 9,
    fontWeight: 700,
    backgroundColor: "#f3f4f6",
    borderRightWidth: 0.5,
    borderRightColor: "#d1d5db",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
});

function inlineText(node: Node): string {
  // Flattens bold/italic/etc children into plain text — react-pdf <Text> can
  // nest styled spans, but for service descriptions plain text keeps this
  // converter small and predictable.
  if (node.nodeType === NodeType.TEXT_NODE) return node.rawText;
  const el = node as HTMLElement;
  return el.childNodes.map(inlineText).join("");
}

/**
 * Renders a constrained subset of HTML (what the Tiptap editor in
 * components/RichTextEditor.tsx produces) as react-pdf elements:
 * <p>, <ul>/<ol>/<li>, <table>/<tr>/<td>/<th>, <strong>/<em> (flattened to text).
 * Anything else is rendered as plain text so nothing silently disappears.
 */
export function renderRichTextForPdf(html: string, keyPrefix = "rt"): JSX.Element[] {
  if (!html || !html.trim()) return [];
  const root = parse(html);
  const elements: JSX.Element[] = [];
  let key = 0;

  function walk(node: Node) {
    if (node.nodeType !== NodeType.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();

    if (tag === "p") {
      const text = clean(inlineText(el).trim());
      if (text) elements.push(<Text key={`${keyPrefix}-${key++}`} style={styles.paragraph}>{text}</Text>);
    } else if (tag === "ul" || tag === "ol") {
      const items = el.childNodes.filter((c) => c.nodeType === NodeType.ELEMENT_NODE && (c as HTMLElement).tagName?.toLowerCase() === "li");
      items.forEach((li, i) => {
        const text = clean(inlineText(li).trim());
        if (!text) return;
        const marker = tag === "ol" ? `${i + 1}.` : "•";
        elements.push(
          <View key={`${keyPrefix}-${key++}`} style={styles.listItem}>
            <Text style={styles.bullet}>{marker}</Text>
            <Text style={styles.listItemText}>{text}</Text>
          </View>
        );
      });
    } else if (tag === "table") {
      const rows = el.querySelectorAll("tr");
      elements.push(
        <View key={`${keyPrefix}-${key++}`} style={styles.table}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.tableRow}>
              {row.childNodes
                .filter((c) => c.nodeType === NodeType.ELEMENT_NODE)
                .map((cellNode, ci) => {
                  const cellEl = cellNode as HTMLElement;
                  const isHeader = cellEl.tagName?.toLowerCase() === "th";
                  return (
                    <Text key={ci} style={isHeader ? styles.tableHeaderCell : styles.tableCell}>
                      {clean(inlineText(cellEl).trim())}
                    </Text>
                  );
                })}
            </View>
          ))}
        </View>
      );
    } else {
      // Unknown wrapper (e.g. a top-level div) — recurse into children.
      el.childNodes.forEach(walk);
    }
  }

  root.childNodes.forEach(walk);
  return elements;
}
