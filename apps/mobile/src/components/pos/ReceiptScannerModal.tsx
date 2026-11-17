/**
 * @file ReceiptScannerModal.tsx
 * @description Full modal workflow for capturing receipts using the device camera or gallery,
 * processing them with a configurable vision AI, reviewing matched lines against local catalog products,
 * and executing atomic stock deductions in SQLite with offline sync replication.
 */

import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Product } from "@proxi-commerce/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import {
  parseReceiptWithAI,
  reconcileReceiptWithCatalog,
  ExtractedReceipt,
  ReconciledReceiptItem,
} from "../../services/aiReceiptService";
import { createTransaction } from "../../services/transactionService";
import { theme } from "../../theme";

export interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  catalog: Product[];
  onSuccess: () => Promise<void>;
}

type Step = "CAPTURE" | "ANALYZING" | "REVIEW";

// Keep disabled during development; enable after configuring a provider and API key.
const AI_RECEIPT_ANALYSIS_ENABLED = false;

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  visible,
  onClose,
  storeId,
  catalog,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>("CAPTURE");
  const [analyzingStatus, setAnalyzingStatus] = useState(
    "Iniciando análisis...",
  );
  const [extractedReceipt, setExtractedReceipt] =
    useState<ExtractedReceipt | null>(null);
  const [items, setItems] = useState<ReconciledReceiptItem[]>([]);
  const [productPickerTargetId, setProductPickerTargetId] = useState<
    string | null
  >(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const catalogById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of catalog) {
      map.set(product.id, product);
    }
    return map;
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const query = pickerSearchQuery.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter(
      (prod) =>
        prod.title.toLowerCase().includes(query) ||
        (prod.barcode && prod.barcode.toLowerCase().includes(query)),
    );
  }, [catalog, pickerSearchQuery]);

  const resetState = () => {
    setStep("CAPTURE");
    setAnalyzingStatus("Iniciando análisis...");
    setExtractedReceipt(null);
    setItems([]);
    setProductPickerTargetId(null);
    setPickerSearchQuery("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetState();
    onClose();
  };

  const closeProductPicker = () => {
    setProductPickerTargetId(null);
    setPickerSearchQuery("");
  };

  /**
   * Processes the chosen image with the configured vision AI provider
   */
  const processImage = async (
    base64: string,
    mimeType: string = "image/jpeg",
  ) => {
    if (!AI_RECEIPT_ANALYSIS_ENABLED) {
      Alert.alert(
        "Análisis con IA en desarrollo",
        "El escaneo se activará cuando configures tu proveedor de IA y habilites esta función en el código.",
      );
      return;
    }

    try {
      setStep("ANALYZING");
      setAnalyzingStatus("Analizando ticket...");

      const parsed = await parseReceiptWithAI(base64, mimeType);
      setExtractedReceipt(parsed);

      if (parsed.items.length === 0) {
        Alert.alert(
          "Sin artículos detectados",
          "IA no encontró líneas de productos legibles en la imagen. Prueba a repetir la foto con mejor enfoque e iluminación.",
          [{ text: "Reintentar", onPress: () => setStep("CAPTURE") }],
        );
        return;
      }

      setAnalyzingStatus("Reconciliando productos con el catálogo local...");
      const reconciled = reconcileReceiptWithCatalog(parsed, catalog);
      setItems(reconciled);

      setStep("REVIEW");
    } catch (err: any) {
      console.error("[ReceiptScannerModal] Error processing receipt:", err);
      Alert.alert(
        "Error al procesar ticket",
        err?.message || "No se pudo interpretar el ticket con IA.",
        [
          {
            text: "Reintentar",
            onPress: () => setStep("CAPTURE"),
          },
          {
            text: "Cancelar",
            style: "cancel",
            onPress: handleClose,
          },
        ],
      );
    }
  };

  /**
   * Launches the camera to photograph a receipt
   */
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Se necesita acceso a la cámara para fotografiar los tickets de compra.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const mimeType = result.assets[0].mimeType || "image/jpeg";
        await processImage(result.assets[0].base64, mimeType);
      }
    } catch (err) {
      console.error("[ReceiptScannerModal] Camera error:", err);
      Alert.alert("Error de cámara", "No se pudo abrir la cámara.");
    }
  };

  /**
   * Opens the photo library to pick an existing receipt image
   */
  const handlePickFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Se necesita acceso a la galería para seleccionar imágenes de tickets.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        base64: true,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const mimeType = result.assets[0].mimeType || "image/jpeg";
        await processImage(result.assets[0].base64, mimeType);
      }
    } catch (err) {
      console.error("[ReceiptScannerModal] Gallery error:", err);
      Alert.alert(
        "Error de galería",
        "No se pudo abrir la galería de imágenes.",
      );
    }
  };

  const toggleItemSelection = (item: ReconciledReceiptItem) => {
    if (!item.matched_product_id) {
      setPickerSearchQuery("");
      setProductPickerTargetId(item.id);
      return;
    }

    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, selected: !it.selected } : it,
      ),
    );
  };

  const updateItemQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const newQty = Math.max(1, it.quantity + delta);
        return {
          ...it,
          quantity: newQty,
          subtotal: Number((newQty * it.unit_price).toFixed(2)),
        };
      }),
    );
  };

  const handleAssignProduct = (itemId: string, product: Product) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const effectiveUnitPrice =
          it.unit_price > 0 ? it.unit_price : product.price;
        return {
          ...it,
          matched_product_id: product.id,
          matched_product_title: product.title,
          match_confidence: "EXACT",
          unit_price: effectiveUnitPrice,
          subtotal: Number((it.quantity * effectiveUnitPrice).toFixed(2)),
          selected: true,
        };
      }),
    );
    closeProductPicker();
  };

  /**
   * Confirms the sale: aggregates duplicate product matches, creates a transaction
   * of type 'AI_SCAN' in SQLite, and decrements stock atomically.
   */
  const handleConfirmAndDeductStock = async () => {
    const selectedItems = items.filter(
      (it) =>
        it.selected &&
        it.matched_product_id &&
        catalogById.has(it.matched_product_id),
    );

    if (selectedItems.length === 0) {
      Alert.alert(
        "Sin productos seleccionados",
        "Debes asociar y seleccionar al menos un producto del catálogo para registrar la venta y descontar el stock.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Merge lines linked to the same catalog product to prevent duplicate line conflicts
      const aggregatedMap = new Map<
        string,
        { product: Product; quantity: number; subtotal: number }
      >();

      for (const item of selectedItems) {
        const matchedProduct = catalogById.get(item.matched_product_id!)!;
        const unitPrice =
          item.unit_price > 0 ? item.unit_price : matchedProduct.price;
        const lineSubtotal = Number((item.quantity * unitPrice).toFixed(2));

        const existing = aggregatedMap.get(matchedProduct.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.subtotal = Number(
            (existing.subtotal + lineSubtotal).toFixed(2),
          );
        } else {
          aggregatedMap.set(matchedProduct.id, {
            product: matchedProduct,
            quantity: item.quantity,
            subtotal: lineSubtotal,
          });
        }
      }

      const cartItemsSnapshot = Array.from(aggregatedMap.values());
      const totalValue = Number(
        cartItemsSnapshot.reduce((sum, ci) => sum + ci.subtotal, 0).toFixed(2),
      );

      await createTransaction({
        storeId,
        type: "AI_SCAN",
        total: totalValue > 0 ? totalValue : (extractedReceipt?.total ?? 0),
        items: cartItemsSnapshot,
      });

      Alert.alert(
        "Ticket Conciliado con Éxito",
        `Se ha registrado la venta tipo IA Scan por ${totalValue.toFixed(2)} € y se ha descontado el stock de ${cartItemsSnapshot.length} ${cartItemsSnapshot.length === 1 ? "producto" : "productos"} en SQLite local y la nube.`,
        [
          {
            text: "Finalizar",
            onPress: async () => {
              resetState();
              onClose();
              await onSuccess();
            },
          },
        ],
      );
    } catch (err: any) {
      console.error("[ReceiptScannerModal] Error applying transaction:", err);
      Alert.alert(
        "Error al guardar",
        err?.message || "No se pudo registrar la venta en la base de datos.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const validSelectedItems = useMemo(
    () =>
      items.filter(
        (it) =>
          it.selected &&
          it.matched_product_id &&
          catalogById.has(it.matched_product_id),
      ),
    [items, catalogById],
  );

  const selectedCount = validSelectedItems.length;
  const calculatedTotal = useMemo(
    () =>
      Number(
        validSelectedItems.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2),
      ),
    [validSelectedItems],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleClose}
            activeOpacity={0.7}
            disabled={isSubmitting}
          >
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={theme.colors.neutral[700]}
            />
          </TouchableOpacity>
          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>Escanear Ticket con IA</Text>
            <Text style={styles.topBarSubtitle}>
              IA Vision OCR · Conciliación
            </Text>
          </View>
          {step === "REVIEW" ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep("CAPTURE")}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <MaterialCommunityIcons
                name="camera-retake-outline"
                size={20}
                color={theme.colors.primary[600]}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        {/* STEP 1: CAPTURE SCREEN */}
        {step === "CAPTURE" && (
          <ScrollView contentContainerStyle={styles.captureContainer}>
            <View style={styles.heroIllustration}>
              <View style={styles.heroIconCircle}>
                <MaterialCommunityIcons
                  name="receipt-text-check-outline"
                  size={46}
                  color={theme.colors.primary[600]}
                />
              </View>
              <Text style={styles.heroTitle}>
                Digitaliza tus Ventas Físicas
              </Text>
              <Text style={styles.heroDescription}>
                Cuando esté activado, podrás fotografiar un ticket para extraer
                sus artículos, precios y cantidades y conciliarlos con tu
                catálogo.
              </Text>
            </View>

            <Card style={styles.developmentNotice}>
              <View style={styles.guidelineRow}>
                <MaterialCommunityIcons
                  name="flask-outline"
                  size={20}
                  color={theme.colors.payment.cash}
                />
                <Text style={styles.developmentTitle}>
                  Función en desarrollo
                </Text>
              </View>
              <Text style={styles.guidelineText}>
                El análisis está desactivado y no genera costes. Para probarlo,
                configura tu propia API de IA compatible en{" "}
                <Text style={styles.developmentCode}>apps/mobile/.env</Text> y
                activa{" "}
                <Text style={styles.developmentCode}>
                  AI_RECEIPT_ANALYSIS_ENABLED
                </Text>{" "}
                en este componente. Consulta el README para más detalles.
              </Text>
            </Card>

            <Card style={styles.guidelineCard}>
              <View style={styles.guidelineRow}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={20}
                  color={theme.colors.payment.cash}
                />
                <Text style={styles.guidelineTitle}>
                  Recomendaciones para precisión óptima:
                </Text>
              </View>
              <Text style={styles.guidelineText}>
                • Apoya el ticket sobre una mesa bien iluminada y sin arrugas.
                {"\n"}• Asegúrate de que los nombres de los productos y precios
                sean legibles.{"\n"}• Evita sombras pronunciadas sobre el papel
                térmico.
              </Text>
            </Card>

            <View style={styles.captureActions}>
              <Button
                title="Tomar Foto del Ticket"
                onPress={handleTakePhoto}
                variant="primary"
                disabled={!AI_RECEIPT_ANALYSIS_ENABLED}
                style={styles.primaryActionButton}
              />
              <Button
                title="Elegir Foto de la Galería"
                onPress={handlePickFromGallery}
                variant="outline"
                disabled={!AI_RECEIPT_ANALYSIS_ENABLED}
                style={styles.secondaryActionButton}
              />
            </View>
          </ScrollView>
        )}

        {/* STEP 2: ANALYZING STATE */}
        {step === "ANALYZING" && (
          <View style={styles.centerContainer}>
            <View style={styles.pulseBox}>
              <ActivityIndicator
                size="large"
                color={theme.colors.primary[600]}
              />
            </View>
            <Text style={styles.analyzingTitle}>Analizando Ticket</Text>
            <Text style={styles.analyzingSubtext}>{analyzingStatus}</Text>
          </View>
        )}

        {/* STEP 3: REVIEW & RECONCILIATION */}
        {step === "REVIEW" && (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.reviewContainer}>
              {/* Receipt Header Banner */}
              <Card style={styles.receiptSummaryCard}>
                <View style={styles.receiptMetaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.merchantLabel}>
                      Establecimiento detectado
                    </Text>
                    <Text style={styles.merchantName} numberOfLines={1}>
                      {extractedReceipt?.merchant_name || "Comercio Local"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.merchantLabel}>Total en Ticket</Text>
                    <Text style={styles.receiptTotal}>
                      {(extractedReceipt?.total ?? calculatedTotal).toFixed(2)}{" "}
                      €
                    </Text>
                  </View>
                </View>
              </Card>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Líneas detectadas ({items.length})
                </Text>
                <Text style={styles.sectionSub}>
                  {selectedCount} seleccionados para descontar
                </Text>
              </View>

              {items.map((item) => {
                const matchedProduct = item.matched_product_id
                  ? catalogById.get(item.matched_product_id)
                  : undefined;
                const isMatched = Boolean(matchedProduct);
                const confidenceColor =
                  item.match_confidence === "EXACT"
                    ? theme.colors.status.success
                    : item.match_confidence === "HIGH"
                      ? theme.colors.primary[600]
                      : theme.colors.status.error;

                return (
                  <Card
                    key={item.id}
                    style={[
                      styles.itemCard,
                      (!item.selected || !isMatched) && styles.itemCardDisabled,
                    ]}
                  >
                    <View style={styles.itemMainRow}>
                      {/* Checkbox toggle */}
                      <TouchableOpacity
                        onPress={() => toggleItemSelection(item)}
                        style={[
                          styles.checkbox,
                          item.selected && isMatched && styles.checkboxActive,
                        ]}
                      >
                        {item.selected && isMatched && (
                          <MaterialCommunityIcons
                            name="check"
                            size={14}
                            color="#ffffff"
                          />
                        )}
                      </TouchableOpacity>

                      {/* Content block */}
                      <View style={styles.itemContentBlock}>
                        <Text style={styles.itemTitle}>
                          {item.inferred_title}
                        </Text>
                        <Text style={styles.itemRawText}>
                          OCR: "{item.raw_text}"
                          {item.barcode ? ` · EAN: ${item.barcode}` : ""}
                        </Text>

                        {/* Match Status Badge */}
                        <TouchableOpacity
                          style={[
                            styles.matchBadge,
                            { borderColor: confidenceColor },
                          ]}
                          onPress={() => {
                            setPickerSearchQuery("");
                            setProductPickerTargetId(item.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons
                            name={
                              isMatched
                                ? "check-circle-outline"
                                : "alert-circle-outline"
                            }
                            size={14}
                            color={confidenceColor}
                          />
                          <Text
                            style={[
                              styles.matchBadgeText,
                              { color: confidenceColor },
                            ]}
                            numberOfLines={1}
                          >
                            {isMatched
                              ? `${matchedProduct!.title} (Stock: ${matchedProduct!.stock_count})`
                              : "Sin asociar (Toca para vincular)"}
                          </Text>
                          <MaterialCommunityIcons
                            name="chevron-down"
                            size={14}
                            color={theme.colors.neutral[500]}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Quantity Stepper & Price */}
                      <View style={styles.stepperBlock}>
                        <Text style={styles.itemSubtotal}>
                          {item.subtotal.toFixed(2)} €
                        </Text>
                        <View style={styles.stepperRow}>
                          <TouchableOpacity
                            onPress={() => updateItemQuantity(item.id, -1)}
                            style={styles.stepBtn}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={14}
                              color={theme.colors.neutral[700]}
                            />
                          </TouchableOpacity>
                          <Text style={styles.stepQty}>{item.quantity}</Text>
                          <TouchableOpacity
                            onPress={() => updateItemQuantity(item.id, 1)}
                            style={styles.stepBtn}
                          >
                            <MaterialCommunityIcons
                              name="plus"
                              size={14}
                              color={theme.colors.neutral[700]}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </ScrollView>

            {/* Bottom Floating Execution Bar */}
            <View style={styles.bottomBar}>
              <View style={styles.bottomMeta}>
                <Text style={styles.bottomLabel}>Total a conciliar</Text>
                <Text style={styles.bottomAmount}>
                  {calculatedTotal.toFixed(2)} €
                </Text>
              </View>
              <Button
                title={
                  isSubmitting
                    ? "Descontando..."
                    : `Confirmar Venta (${selectedCount})`
                }
                onPress={handleConfirmAndDeductStock}
                variant="primary"
                disabled={isSubmitting || selectedCount === 0}
                style={styles.confirmButton}
              />
            </View>
          </View>
        )}

        {/* IN-MODAL PRODUCT PICKER SHEET (avoids nested React Native Modal freezes) */}
        {productPickerTargetId && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.pickerOverlay}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeProductPicker}
            />
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Vincular Producto</Text>
                <TouchableOpacity
                  onPress={closeProductPicker}
                  style={styles.pickerCloseBtn}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={theme.colors.neutral[700]}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.pickerSubtitle}>
                Selecciona qué producto de tu catálogo corresponde a esta línea
                del ticket:
              </Text>

              <View style={styles.searchInputContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={18}
                  color={theme.colors.neutral[400]}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre o código de barras..."
                  placeholderTextColor={theme.colors.neutral[400]}
                  value={pickerSearchQuery}
                  onChangeText={setPickerSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {pickerSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setPickerSearchQuery("")}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={16}
                      color={theme.colors.neutral[400]}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                style={{ maxHeight: 330 }}
                keyboardShouldPersistTaps="handled"
              >
                {filteredCatalog.map((prod) => (
                  <TouchableOpacity
                    key={prod.id}
                    style={styles.pickerProductRow}
                    onPress={() =>
                      handleAssignProduct(productPickerTargetId, prod)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerProductTitle}>
                        {prod.title}
                      </Text>
                      <Text style={styles.pickerProductStock}>
                        Stock actual: {prod.stock_count} uds ·{" "}
                        {prod.price.toFixed(2)} €
                        {prod.barcode ? ` · ${prod.barcode}` : ""}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="link-variant"
                      size={18}
                      color={theme.colors.primary[600]}
                    />
                  </TouchableOpacity>
                ))}
                {filteredCatalog.length === 0 && (
                  <Text style={styles.pickerEmptyText}>
                    {catalog.length === 0
                      ? "No hay productos registrados en el catálogo."
                      : "No hay productos que coincidan con tu búsqueda."}
                  </Text>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitleBlock: {
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  topBarSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary[600],
    marginTop: 2,
  },
  captureContainer: {
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  heroIllustration: {
    alignItems: "center",
    marginVertical: theme.spacing.xl,
  },
  heroIconCircle: {
    width: 90,
    height: 90,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  heroTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    textAlign: "center",
  },
  heroDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    textAlign: "center",
    marginTop: theme.spacing.xs,
    lineHeight: 20,
    paddingHorizontal: theme.spacing.md,
  },
  developmentNotice: {
    width: "100%",
    backgroundColor: theme.colors.payment.cashLight,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: "#c2e4d4",
    marginBottom: theme.spacing.md,
  },
  developmentTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.payment.cash,
  },
  developmentCode: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },
  guidelineCard: {
    width: "100%",
    backgroundColor: theme.colors.payment.cashLight,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: "#c2e4d4",
    marginBottom: theme.spacing.xl,
  },
  guidelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 6,
  },
  guidelineTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.payment.cash,
  },
  guidelineText: {
    fontSize: 12,
    color: theme.colors.neutral[600],
    lineHeight: 18,
  },
  captureActions: {
    width: "100%",
    gap: theme.spacing.sm,
  },
  primaryActionButton: {
    width: "100%",
  },
  secondaryActionButton: {
    width: "100%",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xxl,
  },
  pulseBox: {
    width: 70,
    height: 70,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  analyzingTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  analyzingSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  reviewContainer: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  receiptSummaryCard: {
    backgroundColor: theme.colors.background.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  receiptMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  merchantLabel: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  merchantName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    marginTop: 2,
  },
  receiptTotal: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[700],
  },
  sectionSub: {
    fontSize: 11,
    color: theme.colors.neutral[500],
  },
  itemCard: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
  },
  itemCardDisabled: {
    opacity: 0.55,
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs + 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  itemContentBlock: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  itemRawText: {
    fontSize: 11,
    color: theme.colors.neutral[400],
    fontStyle: "italic",
    marginTop: 1,
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    backgroundColor: theme.colors.neutral[50],
    marginTop: 6,
    gap: 4,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.semibold,
    flex: 1,
  },
  stepperBlock: {
    alignItems: "flex-end",
  },
  itemSubtotal: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    marginBottom: 6,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.background.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
    minWidth: 16,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: theme.colors.background.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 8,
  },
  bottomMeta: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: 11,
    color: theme.colors.neutral[500],
  },
  bottomAmount: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
  },
  confirmButton: {
    paddingHorizontal: theme.spacing.lg,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 50,
  },
  pickerModalContent: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  pickerTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerSubtitle: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    height: 40,
    marginBottom: theme.spacing.sm,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[900],
  },
  pickerProductRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  pickerProductTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[800],
  },
  pickerProductStock: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  pickerEmptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[400],
    textAlign: "center",
    paddingVertical: theme.spacing.lg,
  },
});
