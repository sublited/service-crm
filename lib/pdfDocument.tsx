import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/money";
import { renderRichTextForPdf } from "@/lib/htmlToPdf";
import { sanitizePdfText as clean } from "@/lib/pdfTextSanitize";

type Theme = {
  accent: string;
  accentSoft: string;
  headingText: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  totalBg: string;
};

// Quotes: warm orange, meant to feel inviting/persuasive.
// Invoices: strict black & white — reads as formal and unambiguous, and
// prints cleanly on a mono office printer.
const THEMES: Record<"orange" | "mono", Theme> = {
  orange: {
    accent: "#ea580c",
    accentSoft: "#fff7ed",
    headingText: "#9a3412",
    tableHeaderBg: "#fff7ed",
    tableHeaderText: "#9a3412",
    totalBg: "#fff7ed",
  },
  mono: {
    accent: "#14181f",
    accentSoft: "#f3f4f6",
    headingText: "#14181f",
    tableHeaderBg: "#14181f",
    tableHeaderText: "#ffffff",
    totalBg: "#f3f4f6",
  },
};

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#14181f" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, alignItems: "flex-start" },
    logo: { width: 80, height: 80, objectFit: "contain", marginBottom: 8 },
    companyName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
    muted: { color: "#6b7280" },
    docTitle: { fontSize: 20, fontWeight: 700, textAlign: "right", color: theme.headingText, letterSpacing: 1 },
    docMeta: { textAlign: "right", marginTop: 4 },
    accentBar: { height: 3, backgroundColor: theme.accent, marginBottom: 20 },
    section: { marginBottom: 20 },
    label: { fontSize: 8, color: "#6b7280", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
    table: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
    tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 6 },
    tableHeaderRow: { flexDirection: "row", paddingVertical: 6, backgroundColor: theme.tableHeaderBg },
    tableHeaderText: { color: theme.tableHeaderText, fontWeight: 700 },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: "right" },
    colPrice: { flex: 1.3, textAlign: "right" },
    colTotal: { flex: 1.3, textAlign: "right" },
    itemDetails: { marginTop: 3, marginLeft: 2 },
    totalsBox: { marginTop: 12, alignItems: "flex-end" },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 180, paddingVertical: 2 },
    totalsFinal: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 180,
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: theme.totalBg,
      marginTop: 4,
      borderRadius: 2,
    },
    footer: { marginTop: 30, fontSize: 9, color: "#6b7280" },
  });
}

type LineItem = { description: string; quantity: number; unit_price: number; details?: string | null };

export function BusinessDocPDF({
  docType,
  theme,
  docNumber,
  issuedDate,
  dueOrExpiryLabel,
  dueOrExpiryDate,
  company,
  customer,
  items,
  subtotal,
  gstTotal,
  total,
  notes,
  showItemDetails = false,
}: {
  docType: "QUOTE" | "TAX INVOICE" | "INVOICE";
  theme: "orange" | "mono";
  docNumber: string;
  issuedDate: string;
  dueOrExpiryLabel: string;
  dueOrExpiryDate: string | null;
  company: any;
  customer: any;
  items: LineItem[];
  subtotal: number;
  gstTotal: number;
  total: number;
  notes: string | null;
  showItemDetails?: boolean;
}) {
  const t = THEMES[theme];
  const styles = makeStyles(t);
  const pdfTitle = clean(`${docNumber} - ${customer?.name || "Customer"}`);

  return (
    <Document title={pdfTitle} author={clean(company?.name) || "Service CRM"}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {company?.logo_url && <Image src={company.logo_url} style={styles.logo} />}
            <Text style={styles.companyName}>{clean(company?.name) || "Your Business"}</Text>
            {company?.abn && <Text style={styles.muted}>ABN {clean(company.abn)}</Text>}
            {company?.address && <Text style={styles.muted}>{clean(company.address)}</Text>}
            {company?.email && <Text style={styles.muted}>{clean(company.email)}</Text>}
            {company?.phone && <Text style={styles.muted}>{clean(company.phone)}</Text>}
          </View>
          <View>
            <Text style={styles.docTitle}>{docType}</Text>
            <Text style={styles.docMeta}>{clean(docNumber)}</Text>
            <Text style={[styles.docMeta, styles.muted]}>Issued {issuedDate}</Text>
            {dueOrExpiryDate && <Text style={[styles.docMeta, styles.muted]}>{dueOrExpiryLabel} {dueOrExpiryDate}</Text>}
          </View>
        </View>

        <View style={styles.accentBar} />

        <View style={styles.section}>
          <Text style={styles.label}>Bill to</Text>
          <Text>{clean(customer?.name)}</Text>
          {customer?.company_name && <Text>{clean(customer.company_name)}</Text>}
          {customer?.address && <Text style={styles.muted}>{clean(customer.address)}</Text>}
          {customer?.email && <Text style={styles.muted}>{clean(customer.email)}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.tableHeaderText]}>Unit price</Text>
            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <View style={styles.colDesc}>
                <Text>{clean(item.description)}</Text>
                {showItemDetails && item.details && (
                  <View style={styles.itemDetails}>{renderRichTextForPdf(item.details, `item-${i}`)}</View>
                )}
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatMoney(item.unit_price)}</Text>
              <Text style={styles.colTotal}>{formatMoney(item.quantity * item.unit_price)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}><Text style={styles.muted}>Subtotal</Text><Text>{formatMoney(subtotal)}</Text></View>
          <View style={styles.totalsRow}><Text style={styles.muted}>GST</Text><Text>{formatMoney(gstTotal)}</Text></View>
          <View style={styles.totalsFinal}><Text style={{ fontWeight: 700 }}>Total</Text><Text style={{ fontWeight: 700 }}>{formatMoney(total)}</Text></View>
        </View>

        {notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <Text>{clean(notes)}</Text>
          </View>
        )}

        {(company?.bank_details || company?.payid) && docType !== "QUOTE" && (
          <View style={styles.section}>
            <Text style={styles.label}>Payment details</Text>
            {company?.bank_details && <Text>{clean(company.bank_details)}</Text>}
            {company?.payid && <Text>PayID: {clean(company.payid)}</Text>}
          </View>
        )}

        {company?.invoice_footer && <Text style={styles.footer}>{clean(company.invoice_footer)}</Text>}
      </Page>
    </Document>
  );
}
