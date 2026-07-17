export type LineItem = {
  quantity: number;
  unit_price: number;
  gst: boolean;
};

const GST_RATE = 0.1; // Australian GST

export function calcTotals(items: LineItem[]) {
  let subtotal = 0;
  let gstTotal = 0;

  for (const item of items) {
    const lineTotal = item.quantity * item.unit_price;
    subtotal += lineTotal;
    if (item.gst) gstTotal += lineTotal * GST_RATE;
  }

  return {
    subtotal: round2(subtotal),
    gstTotal: round2(gstTotal),
    total: round2(subtotal + gstTotal),
  };
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}
