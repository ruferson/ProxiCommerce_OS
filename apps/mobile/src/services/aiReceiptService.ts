/**
 * @file aiReceiptService.ts
 * @description Extracts receipt line items through a configurable,
 * OpenAI-compatible multimodal API and reconciles them with the local catalog.
 */

import { Product } from "@proxi-commerce/types";

export interface RawReceiptItem {
  raw_text: string;
  inferred_title: string;
  barcode?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ExtractedReceipt {
  merchant_name?: string | null;
  timestamp?: string | null;
  total: number;
  items: RawReceiptItem[];
}

export type MatchConfidence = "EXACT" | "HIGH" | "LOW" | "NONE";

export interface ReconciledReceiptItem extends RawReceiptItem {
  id: string;
  matched_product_id: string | null;
  matched_product_title: string | null;
  match_confidence: MatchConfidence;
  selected: boolean;
}

const REQUEST_TIMEOUT_MS = 45_000;

const RECEIPT_PROMPT = `Read this purchase receipt, supplier invoice, or payment slip and return only a JSON object.
Use this shape:
{
  "merchant_name": string | null,
  "timestamp": string | null,
  "total": number,
  "items": [{
    "raw_text": string,
    "inferred_title": string,
    "barcode": string | null,
    "quantity": number,
    "unit_price": number,
    "subtotal": number
  }]
}
Normalize abbreviated product names where possible. Extract a barcode only if it is printed.
Use positive quantities (default 1), numeric prices without currency symbols, and a numeric receipt total.
If a value cannot be read, use null for optional text fields and 0 for unknown numeric totals/prices.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTextContent(content: unknown): string | null {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const text = content
      .filter(
        (part): part is Record<string, unknown> =>
          isRecord(part) && typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("");
    return text || null;
  }

  return null;
}

function parseReceiptResponse(rawText: string): ExtractedReceipt {
  const cleanJson = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let value: unknown;
  try {
    value = JSON.parse(cleanJson);
  } catch {
    throw new Error(
      "La IA no devolvió un JSON válido. Comprueba la configuración de su API.",
    );
  }

  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("La respuesta de la IA no tiene el formato esperado.");
  }

  const items = value.items
    .filter(isRecord)
    .map((item): RawReceiptItem => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);

      return {
        raw_text: String(item.raw_text || item.inferred_title || "Línea"),
        inferred_title: String(item.inferred_title || item.raw_text || "Artículo"),
        barcode: item.barcode ? String(item.barcode).trim() : null,
        quantity,
        unit_price: unitPrice,
        subtotal: Math.max(
          0,
          Number(item.subtotal) || Number((quantity * unitPrice).toFixed(2)),
        ),
      };
    });

  return {
    merchant_name:
      typeof value.merchant_name === "string" ? value.merchant_name : null,
    timestamp:
      typeof value.timestamp === "string"
        ? value.timestamp
        : new Date().toISOString(),
    total:
      typeof value.total === "number" && Number.isFinite(value.total)
        ? value.total
        : 0,
    items,
  };
}

/**
 * Calls a configured OpenAI-compatible chat-completions endpoint with a receipt
 * image. Configure the provider URL, model, and API key in the mobile app env.
 */
export async function parseReceiptWithAI(
  base64Image: string,
  mimeType: string = "image/jpeg",
): Promise<ExtractedReceipt> {
  const apiUrl = process.env.EXPO_PUBLIC_AI_API_URL?.trim();
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
  const model = process.env.EXPO_PUBLIC_AI_MODEL?.trim();

  if (!apiUrl || !apiKey || !model) {
    throw new Error(
      "Configura EXPO_PUBLIC_AI_API_URL, EXPO_PUBLIC_AI_API_KEY y EXPO_PUBLIC_AI_MODEL en apps/mobile/.env.",
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, "");

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: RECEIPT_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae los datos de este ticket." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${cleanBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `La solicitud a la IA superó el límite de ${REQUEST_TIMEOUT_MS / 1000} segundos.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorDetails = (await response.text()).slice(0, 300);
    throw new Error(
      `La API de IA respondió con el estado ${response.status}${errorDetails ? `: ${errorDetails}` : "."}`,
    );
  }

  const result: unknown = await response.json();
  if (!isRecord(result) || !Array.isArray(result.choices)) {
    throw new Error("La API de IA devolvió una respuesta inesperada.");
  }

  const firstChoice = result.choices[0];
  const message =
    isRecord(firstChoice) && isRecord(firstChoice.message)
      ? firstChoice.message
      : null;
  const rawText = message ? getTextContent(message.content) : null;

  if (!rawText) {
    throw new Error("La API de IA no devolvió texto interpretable del ticket.");
  }

  return parseReceiptResponse(rawText);
}

/**
 * Reconciles parsed receipt items against the merchant's local SQLite catalog.
 * Uses barcode lookup first, followed by fuzzy string similarity with price proximity tie-breaking.
 */
export function reconcileReceiptWithCatalog(
  receipt: ExtractedReceipt,
  catalog: Product[],
): ReconciledReceiptItem[] {
  const batchTimestamp = Date.now();

  return receipt.items.map((item, index) => {
    let bestProduct: Product | null = null;
    let highestScore = 0;

    if (item.barcode) {
      const barcodeMatch = catalog.find(
        (product) =>
          product.barcode && product.barcode.trim() === item.barcode!.trim(),
      );
      if (barcodeMatch) {
        bestProduct = barcodeMatch;
        highestScore = 1;
      }
    }

    if (!bestProduct) {
      for (const product of catalog) {
        const titleScore = calculateSimilarity(
          item.inferred_title,
          product.title,
        );
        const rawScore = calculateSimilarity(item.raw_text, product.title);
        let score = Math.max(titleScore, rawScore);

        if (score >= 0.4 && item.unit_price > 0 && product.price > 0) {
          const priceDiffRatio =
            Math.abs(item.unit_price - product.price) / product.price;
          if (priceDiffRatio <= 0.05) {
            score = Math.min(0.99, score + 0.08);
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestProduct = product;
        }
      }
    }

    let confidence: MatchConfidence = "NONE";
    let matchedId: string | null = null;
    let matchedTitle: string | null = null;

    if (highestScore >= 0.85 && bestProduct) {
      confidence = "EXACT";
      matchedId = bestProduct.id;
      matchedTitle = bestProduct.title;
    } else if (highestScore >= 0.5 && bestProduct) {
      confidence = "HIGH";
      matchedId = bestProduct.id;
      matchedTitle = bestProduct.title;
    } else if (highestScore >= 0.3 && bestProduct) {
      confidence = "LOW";
      matchedId = bestProduct.id;
      matchedTitle = bestProduct.title;
    }

    return {
      ...item,
      id: `rcpt_item_${batchTimestamp}_${index}`,
      matched_product_id: matchedId,
      matched_product_title: matchedTitle,
      match_confidence: confidence,
      selected: confidence === "EXACT" || confidence === "HIGH",
    };
  });
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateSimilarity(textA: string, textB: string): number {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  const wordsA = new Set(normA.split(" ").filter((word) => word.length > 1));
  const wordsB = new Set(normB.split(" ").filter((word) => word.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersectionCount = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersectionCount++;
  }

  const unionCount = new Set([...wordsA, ...wordsB]).size;
  return intersectionCount / unionCount;
}
