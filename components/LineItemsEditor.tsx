"use client";

import { useState } from "react";
import { formatMoney, calcTotals } from "@/lib/money";
import RichTextEditor from "@/components/RichTextEditor";

export type LineItemDraft = {
  service_id: string | null;
  description: string;
  details?: string;
  quantity: number;
  unit_price: number;
  gst: boolean;
};

type Service = {
  id: string;
  name: string;
  description?: string | null;
  default_price: number;
  gst: boolean;
};

export default function LineItemsEditor({
  items,
  setItems,
  services,
  showDetails = false,
}: {
  items: LineItemDraft[];
  setItems: (items: LineItemDraft[]) => void;
  services: Service[];
  showDetails?: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  function updateItem(index: number, patch: Partial<LineItemDraft>) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    setItems(next);
  }

  function addBlankItem() {
    setItems([...items, { service_id: null, description: "", details: "", quantity: 1, unit_price: 0, gst: true }]);
  }

  function addFromService(service: Service) {
    setItems([
      ...items,
      {
        service_id: service.id,
        description: service.name,
        details: service.description || "",
        quantity: 1,
        unit_price: Number(service.default_price),
        gst: service.gst,
      },
    ]);
    if (showDetails) setExpanded(items.length);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
    if (expanded === index) setExpanded(null);
  }

  const totals = calcTotals(items);

  return (
    <div>
      {services.length > 0 && (
        <div className="mb-3">
          <label className="label">Add from service list</label>
          <select
            className="input"
            value=""
            onChange={(e) => {
              const service = services.find((s) => s.id === e.target.value);
              if (service) addFromService(service);
            }}
          >
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatMoney(Number(s.default_price))}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="card p-4">
            <div className="flex gap-2 mb-3">
              <input
                className="input flex-1"
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Description"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-ink/30 hover:text-red-500 hover:bg-red-50"
                aria-label="Remove line"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="label">Qty</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="input"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">Unit price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex flex-col justify-between">
                <label className="label flex items-center gap-1.5 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={item.gst}
                    onChange={(e) => updateItem(i, { gst: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-black/20"
                  />
                  GST
                </label>
                <p className="text-sm font-medium text-right pt-1.5">{formatMoney(item.quantity * item.unit_price)}</p>
              </div>
            </div>

            {showDetails && (
              <div className="mt-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  {expanded === i ? "Hide description details" : item.details ? "Edit description details" : "+ Add description details"}
                </button>
                {expanded === i && (
                  <div className="mt-2">
                    <RichTextEditor
                      value={item.details || ""}
                      onChange={(html) => updateItem(i, { details: html })}
                      placeholder="What's included — bullet points, a simple table, etc."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addBlankItem}
          className="w-full text-sm text-brand-600 hover:text-brand-700 border border-dashed border-black/15 rounded-lg py-3"
        >
          + Add line item
        </button>
      </div>

      <div className="flex justify-end mt-4">
        <dl className="w-full sm:w-56 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-ink/50">Subtotal</dt><dd>{formatMoney(totals.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/50">GST</dt><dd>{formatMoney(totals.gstTotal)}</dd></div>
          <div className="flex justify-between font-semibold text-base pt-1 border-t border-black/[0.06]"><dt>Total</dt><dd>{formatMoney(totals.total)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
