/**
 * @file CartDrawer.tsx
 * @description Slide-over checkout drawer component.
 * Allows customers to review items, adjust line quantities, select fulfillment modality
 * (In-store pickup vs. Home delivery), validate required delivery data, and invoke
 * the atomic `create_web_order` RPC endpoint on Supabase.
 */

"use client";

import React, { useState } from "react";
import { PublicStore, FulfillmentType, CreateWebOrderResult } from "@proxi-commerce/types";
import { WebCartItem } from "./useWebCart";
import { supabase } from "../../lib/supabase";

export interface CartDrawerProps {
  /** Controls drawer slide-over visibility */
  isOpen: boolean;
  /** Callback to close drawer */
  onClose: () => void;
  /** Active public store record */
  store: PublicStore;
  /** List of items in the cart */
  items: WebCartItem[];
  /** Total monetary amount in Euros */
  total: number;
  /** Total quantity of items in the cart */
  totalItems: number;
  /** Callback to increment or decrement quantity */
  onUpdateQuantity: (productId: string, quantity: number) => void;
  /** Callback to remove a specific item from cart */
  onRemoveItem: (productId: string) => void;
  /** Callback to clear the entire store cart */
  onClearCart: () => void;
  /** Callback executed when the server RPC confirms the order */
  onOrderSuccess: (result: CreateWebOrderResult) => void;
}

/**
 * Slide-over shopping cart and order placement drawer.
 *
 * @param {CartDrawerProps} props - Component properties.
 * @returns {React.ReactElement | null} Rendered cart drawer overlay or null if closed.
 */
export function CartDrawer({
  isOpen,
  onClose,
  store,
  items,
  total,
  totalItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderSuccess,
}: CartDrawerProps): React.ReactElement | null {
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("PICKUP");
  const [customerName, setCustomerName] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  // Home delivery input state
  const [streetAddress, setStreetAddress] = useState("");
  const [cityPostal, setCityPostal] = useState("");
  const [phone, setPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const formattedTotal = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(total);

  /**
   * Validates form inputs and executes the atomic create_web_order RPC call.
   */
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("El carrito está vacío.");
      return;
    }

    let compiledDeliveryAddress: string | null = null;

    if (fulfillmentType === "DELIVERY") {
      if (!streetAddress.trim() || !cityPostal.trim() || !phone.trim()) {
        setErrorMessage(
          "Por favor, completa la dirección, código postal/ciudad y teléfono para el envío.",
        );
        return;
      }
      compiledDeliveryAddress = `Destinatario: ${customerName.trim() || "Cliente"}\nDirección: ${streetAddress.trim()}\nLocalidad/CP: ${cityPostal.trim()}\nTeléfono: ${phone.trim()}`;
    }

    const compiledNote = [
      customerName.trim() ? `Nombre cliente: ${customerName.trim()}` : "",
      customerNote.trim() ? `Nota: ${customerNote.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n") || null;

    const rpcItems = items.map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
    }));

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc("create_web_order", {
        p_store_id: store.id,
        p_items: rpcItems,
        p_fulfillment_type: fulfillmentType,
        p_delivery_address: compiledDeliveryAddress,
        p_customer_note: compiledNote,
      });

      if (error) {
        console.error("[CartDrawer] create_web_order error:", error);
        if (
          error.code === "PGRST202" ||
          error.message?.includes("create_web_order") ||
          error.message?.includes("schema cache")
        ) {
          setErrorMessage(
            "El backend todavía no tiene activada la función de pedidos. Aplica la migración 20261117110000_public_storefront.sql en Supabase y recarga el proyecto.",
          );
        } else if (error.message?.includes("INSUFFICIENT_STOCK")) {
          setErrorMessage(
            "Lo sentimos, no hay stock suficiente para uno o más productos de tu carrito. Hemos actualizado las existencias disponibles.",
          );
        } else if (error.message?.includes("DELIVERY_ADDRESS_REQUIRED")) {
          setErrorMessage("La dirección de entrega es obligatoria para envíos a domicilio.");
        } else {
          setErrorMessage(error.message || "Error al procesar el pedido. Inténtalo de nuevo.");
        }
        return;
      }

      onClearCart();
      onOrderSuccess(data as CreateWebOrderResult);
    } catch (err: any) {
      console.error("[CartDrawer] unexpected error:", err);
      setErrorMessage("Error de conexión al tramitar el pedido. Comprueba tu conexión a internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-stone-900/50 backdrop-blur-xs flex justify-end">
      {/* Backdrop click area */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-stone-900">Tu Cesta</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              {totalItems} {totalItems === 1 ? "artículo" : "artículos"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center font-bold text-sm transition-colors"
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <span className="text-4xl block">🛒</span>
              <p className="text-stone-500 text-sm">Tu carrito está vacío.</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition"
              >
                Explorar productos
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">
                      {product.title}
                    </h4>
                    <p className="text-xs text-stone-500 font-semibold">
                      {product.price.toFixed(2)} € · Subtotal: {(product.price * quantity).toFixed(2)} €
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-xs font-bold text-stone-700 flex items-center justify-center"
                      aria-label="Disminuir unidad"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-stone-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stock_count}
                      className="w-6 h-6 rounded-md bg-white border border-stone-300 hover:bg-stone-100 text-xs font-bold text-stone-700 flex items-center justify-center disabled:opacity-40"
                      aria-label="Aumentar unidad"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onRemoveItem(product.id)}
                      className="ml-1 text-stone-400 hover:text-rose-500 p-1 text-xs"
                      title="Eliminar artículo"
                      aria-label="Eliminar producto"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fulfillment Form (Rendered only when items exist) */}
          {items.length > 0 && (
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="pt-4 border-t border-stone-200 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Modalidad de Entrega <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("PICKUP")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      fulfillmentType === "PICKUP"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20"
                        : "border-stone-200 hover:border-stone-300 text-stone-700 bg-white"
                    }`}
                  >
                    <div className="text-base mb-1">🏪</div>
                    <div className="text-xs font-bold">Recogida en tienda</div>
                    <div className="text-[10px] text-stone-500">Gratis · Inmediata</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType("DELIVERY")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      fulfillmentType === "DELIVERY"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20"
                        : "border-stone-200 hover:border-stone-300 text-stone-700 bg-white"
                    }`}
                  >
                    <div className="text-base mb-1">🛵</div>
                    <div className="text-xs font-bold">Envío a domicilio</div>
                    <div className="text-[10px] text-stone-500">Entrega en tu barrio</div>
                  </button>
                </div>
              </div>

              {/* Customer Contact Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">
                  Tu nombre y apellidos
                </label>
                <input
                  type="text"
                  placeholder="Ej. Carmen García"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Home Delivery Specific Fields */}
              {fulfillmentType === "DELIVERY" && (
                <div className="space-y-2.5 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-900 block">
                    Datos de Entrega
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Calle, número, piso y puerta *"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Código Postal y Ciudad *"
                        required
                        value={cityPostal}
                        onChange={(e) => setCityPostal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono móvil *"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Order Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">
                  Notas o comentarios para el comercio (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Recogeré el pan bien horneado a las 18:00..."
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer with Checkout Submission Action */}
        {items.length > 0 && (
          <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-stone-900">
              <span>Total a pagar:</span>
              <span className="text-xl font-black text-indigo-600">{formattedTotal}</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-base">⏳</span>
                  <span>Confirmando con la tienda...</span>
                </>
              ) : (
                <span>Confirmar Pedido ({formattedTotal})</span>
              )}
            </button>
            <p className="text-[10px] text-center text-stone-500">
              Pago directo en el comercio al recoger o recibir según la política de la tienda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
