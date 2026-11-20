/**
 * @file OrderConfirmation.tsx
 * @description Customer order confirmation modal dialog.
 * Displays completed transaction metadata, line item receipt breakdown,
 * and prominently renders the in-store pickup code (prepared for QR validation in Phase 4)
 * or shipping address details.
 */

"use client";

import React from "react";
import { CreateWebOrderResult } from "@proxi-commerce/types";

export interface OrderConfirmationProps {
  /** Completed web order result returned by Supabase RPC */
  order: CreateWebOrderResult;
  /** Display name of the merchant store */
  storeName: string;
  /** Callback to close modal and return to catalog */
  onClose: () => void;
}

/**
 * Order success and receipt confirmation modal.
 *
 * @param {OrderConfirmationProps} props - Component properties.
 * @returns {React.ReactElement} Centered receipt overlay.
 */
export function OrderConfirmation({
  order,
  storeName,
  onClose,
}: OrderConfirmationProps): React.ReactElement {
  const formattedTotal = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(order.total);

  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(order.timestamp));

  const isPickup = order.fulfillment_type === "PICKUP";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-stone-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Success Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl border-2 border-emerald-100 shadow-xs">
            ✓
          </div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900">
            ¡Pedido Confirmado!
          </h2>
          <p className="text-sm text-stone-500">
            Gracias por apoyar a <strong className="text-stone-800">{storeName}</strong>. El comercio ha recibido tu pedido al instante.
          </p>
        </div>

        {/* PICKUP Code Spotlight Box */}
        {isPickup && order.pickup_code && (
          <div className="bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-3xl p-5 text-center space-y-2">
            <span className="text-xs uppercase font-extrabold text-indigo-700 tracking-wider">
              Código de Recogida en Tienda
            </span>
            <div className="text-3xl font-mono font-black text-indigo-900 tracking-widest bg-white py-3 px-6 rounded-2xl border border-indigo-200 shadow-inner">
              {order.pickup_code}
            </div>
            <p className="text-xs text-indigo-700">
              Muestra este código al comerciante en el mostrador para retirar tu pedido.
            </p>
          </div>
        )}

        {/* DELIVERY Address Box */}
        {!isPickup && order.delivery_address && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
            <strong className="block font-bold">Dirección de entrega acordada:</strong>
            <p className="font-medium whitespace-pre-line text-stone-700">
              {order.delivery_address}
            </p>
          </div>
        )}

        {/* Order Details Breakdown */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 text-xs">
          <div className="flex justify-between text-stone-500 pb-2 border-b border-stone-200">
            <span>Ticket: {order.transaction_id.slice(-12).toUpperCase()}</span>
            <span>{formattedDate}</span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-stone-700">
                <span className="font-medium truncate max-w-[240px]">
                  {item.quantity}× {item.title}
                </span>
                <span className="font-bold text-stone-900">
                  {((item.unit_price || 0) * item.quantity).toFixed(2)} €
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-stone-200 text-sm font-black text-stone-900">
            <span>Total del pedido:</span>
            <span className="text-base text-indigo-600">{formattedTotal}</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition active:scale-98"
        >
          Volver a la tienda
        </button>
      </div>
    </div>
  );
}
