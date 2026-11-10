/**
 * @file RefundModal.tsx
 * @description Full-refund confirmation bottom-sheet modal.
 * Displays the original transaction summary, validates refund eligibility,
 * and executes the atomic SQLite refund on confirmation.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Transaction, TransactionItem } from "@proxi-commerce/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { theme } from "../../theme";
import {
  getTransactionById,
  isAlreadyRefunded,
  processFullRefund,
} from "../../services/refundService";

/** Eligibility state for a refund operation. */
type EligibilityState =
  | { status: "checking" }
  | { status: "eligible"; transaction: Transaction }
  | { status: "ineligible"; reason: string }
  | { status: "error"; message: string };

/**
 * Props for the `RefundModal` component.
 */
export interface RefundModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** ID of the transaction to refund. Null means nothing is selected. */
  transactionId: string | null;
  storeId: string;
  /** Called after the modal is dismissed (refunded or cancelled) */
  onClose: () => void;
  /** Called after a successful refund to trigger parent refresh */
  onRefundSuccess: () => void;
}

/**
 * Refund confirmation modal.
 *
 * @param {RefundModalProps} props - Component properties.
 * @returns {React.ReactElement} Rendered modal.
 */
export const RefundModal: React.FC<RefundModalProps> = ({
  visible,
  transactionId,
  storeId,
  onClose,
  onRefundSuccess,
}) => {
  const [eligibility, setEligibility] = useState<EligibilityState>({
    status: "checking",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  /** Checks the transaction exists and has no prior refund. */
  const checkEligibility = useCallback(async (txId: string) => {
    setEligibility({ status: "checking" });
    try {
      const tx = await getTransactionById(txId, storeId);
      if (!tx) {
        setEligibility({ status: "ineligible", reason: "Transacción no encontrada." });
        return;
      }
      if (tx.total < 0) {
        setEligibility({ status: "ineligible", reason: "Esta entrada ya es una devolución." });
        return;
      }
      const alreadyDone = await isAlreadyRefunded(txId, storeId);
      if (alreadyDone) {
        setEligibility({ status: "ineligible", reason: "Esta venta ya fue devuelta anteriormente." });
        return;
      }
      setEligibility({ status: "eligible", transaction: tx });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setEligibility({ status: "error", message });
    }
  }, [storeId]);

  useEffect(() => {
    if (visible && transactionId) {
      setIsProcessing(false);
      checkEligibility(transactionId);
    }
  }, [visible, transactionId, checkEligibility]);

  const handleConfirmRefund = async () => {
    if (!transactionId) return;
    setIsProcessing(true);
    try {
      await processFullRefund(transactionId, storeId);
      onRefundSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar la devolución.";
      setEligibility({ status: "ineligible", reason: message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getItems = (): TransactionItem[] => {
    if (eligibility.status !== "eligible") return [];
    const { items } = eligibility.transaction;
    if (Array.isArray(items)) return items as TransactionItem[];
    try { return JSON.parse(items as string); } catch { return []; }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons
                name="cash-refund"
                size={22}
                color={theme.colors.status.error}
              />
            </View>
            <Text style={styles.title}>Gestionar Devolución</Text>
          </View>

          {/* Checking */}
          {eligibility.status === "checking" && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              <Text style={styles.hintText}>Verificando elegibilidad...</Text>
            </View>
          )}

          {/* Error */}
          {(eligibility.status === "error" || eligibility.status === "ineligible") && (
            <View style={styles.centerContent}>
              <View style={styles.ineligibleIcon}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={40}
                  color={theme.colors.status.error}
                />
              </View>
              <Text style={styles.ineligibleTitle}>Devolución no disponible</Text>
              <Text style={styles.ineligibleReason}>
                {eligibility.status === "error"
                  ? eligibility.message
                  : eligibility.reason}
              </Text>
              <Button
                title="Cerrar"
                variant="outline"
                onPress={onClose}
                style={styles.singleButton}
              />
            </View>
          )}

          {/* Eligible */}
          {eligibility.status === "eligible" && (
            <>
              {/* Warning banner */}
              <View style={styles.warningBanner}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={theme.colors.status.warning}
                />
                <Text style={styles.warningText}>
                  Esta acción es irreversible. Se restaurará el stock de todos los artículos.
                </Text>
              </View>

              {/* Transaction summary card */}
              <Card style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>ID de Venta</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {eligibility.transaction.id.slice(-12)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Fecha</Text>
                  <Text style={styles.summaryValue}>
                    {eligibility.transaction.timestamp?.slice(0, 16).replace("T", " ") ?? "—"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Método de Pago</Text>
                  <Text style={styles.summaryValue}>{eligibility.transaction.type}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowLast]}>
                  <Text style={styles.summaryLabel}>Total a Devolver</Text>
                  <Text style={styles.refundAmount}>
                    {eligibility.transaction.total.toFixed(2)} €
                  </Text>
                </View>
              </Card>

              {/* Items list */}
              <Text style={styles.itemsLabel}>Artículos incluidos</Text>
              <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
                {getItems().map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemQtyBadge}>
                      <Text style={styles.itemQtyText}>{Math.abs(item.quantity)}×</Text>
                    </View>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title ?? item.product_id}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {((item.unit_price ?? 0) * Math.abs(item.quantity)).toFixed(2)} €
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={onClose}
                  style={styles.actionButton}
                  disabled={isProcessing}
                />
                <Button
                  title="Confirmar devolución"
                  variant="danger"
                  loading={isProcessing}
                  onPress={handleConfirmRefund}
                  style={styles.actionButton}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.background.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: "85%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[300],
    alignSelf: "center",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.status.errorLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },

  // States
  centerContent: {
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  hintText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.sm,
  },
  ineligibleIcon: {
    marginBottom: theme.spacing.sm,
  },
  ineligibleTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[700],
  },
  ineligibleReason: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  singleButton: {
    marginTop: theme.spacing.md,
    minWidth: 160,
  },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.status.warningLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.status.warning,
    lineHeight: 18,
  },

  // Summary card
  summaryCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.neutral[50],
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  summaryRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
  },
  summaryValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[700],
    maxWidth: "60%",
    textAlign: "right",
  },
  refundAmount: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.status.error,
  },

  // Items list
  itemsLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[500],
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  itemsScroll: {
    maxHeight: 160,
    marginBottom: theme.spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  itemQtyBadge: {
    minWidth: 28,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  itemQtyText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[700],
  },
  itemTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[700],
  },
  itemPrice: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[800],
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
