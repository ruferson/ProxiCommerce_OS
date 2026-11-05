/**
 * @file CheckoutModal.tsx
 * @description Point-of-Sale (POS) ticket summary and checkout modal.
 * Supports line-item review and removal, payment method selection (Cash vs. NFC/Card),
 * cash tendered and change calculation, and atomic SQLite transaction recording.
 */

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CartItem, TransactionType } from "@proxi-commerce/types";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import { IconButton } from "../ui/IconButton";
import { Card } from "../ui/Card";
import { createTransaction } from "../../services/transactionService";
import { theme } from "../../theme";

/**
 * Props for the `CheckoutModal` component.
 */
export interface CheckoutModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Triggered when the user dismisses the modal */
  onClose: () => void;
  /** Active cart line items included in the sale */
  cart: CartItem[];
  /** Total sum of the order in Euros */
  total: number;
  /** Callback triggered upon successful transaction completion */
  onSuccess: () => void;
  /** Unique store identifier */
  storeId: string;
  /** Callback triggered to decrement or remove an item from the cart */
  onRemoveItem: (productId: string) => void;
}

/**
 * Modal dialog for inspecting sale breakdown, calculating cash change, and executing SQLite checkout.
 *
 * @param {CheckoutModalProps} props - Component properties.
 * @returns {React.ReactElement} Rendered checkout modal.
 */
export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  onClose,
  cart,
  total,
  onSuccess,
  storeId,
  onRemoveItem,
}) => {
  // Payment method selection state (defaults to Cash)
  const [paymentType, setPaymentType] = useState<TransactionType>("CASH");
  // Cash tendered input string
  const [cashGiven, setCashGiven] = useState<string>("");
  // Transaction processing loading indicator state
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse numerical cash amount, normalizing comma decimal separators
  const cashAmount = parseFloat(cashGiven.replace(",", ".")) || 0;
  // Calculate change due when paying with cash
  const changeDue = Math.max(0, cashAmount - total);
  // Ensure sufficient cash has been provided if CASH method is active
  const isValidCash = paymentType !== "CASH" || cashAmount >= total;

  /**
   * Finalizes the sale transaction, persists the order in SQLite, and decrements inventory.
   */
  const handleConfirmSale = async () => {
    // Prevent checkout if tendered cash is lower than total
    if (!isValidCash) {
      Alert.alert(
        "Efectivo insuficiente",
        "El importe entregado es menor al total.",
      );
      return;
    }

    try {
      setIsProcessing(true);
      // Persist the transaction and update inventory counts
      await createTransaction({
        storeId,
        type: paymentType,
        total,
        items: cart,
      });

      // Show completion confirmation with change calculation for cash sales
      Alert.alert(
        "¡Venta completada!",
        `Transacción registrada correctamente.${paymentType === "CASH" ? `\nCambio a devolver: ${changeDue.toFixed(2)} €` : ""}`,
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to complete sale transaction:", error);
      Alert.alert("Error", "No se pudo guardar la transacción localmente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resumen del Ticket</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={18} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Cart Line Items List */}
          <ScrollView style={styles.itemList}>
            {cart.map((item) => (
              <Card key={item.product.id} padding="sm" style={styles.itemCard}>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.product.title}
                  </Text>
                  <Text style={styles.itemSubtext}>
                    {item.quantity} x {item.product.price.toFixed(2)} €
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>
                  {item.subtotal.toFixed(2)} €
                </Text>
                {/* Decrement or remove item */}
                <IconButton
                  icon="-"
                  size="sm"
                  onPress={() => onRemoveItem(item.product.id)}
                  style={styles.removeButton}
                />
              </Card>
            ))}
          </ScrollView>

          <View style={styles.sectionDivider} />

          {/* Payment Method Selector Tabs */}
          <Text style={styles.sectionTitle}>Método de Pago</Text>
          <View style={styles.paymentSelector}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.paymentOption,
                paymentType === "CASH" && styles.paymentSelected,
              ]}
              onPress={() => setPaymentType("CASH")}
            >
              <MaterialCommunityIcons
                name="cash-multiple"
                size={18}
                color={paymentType === "CASH" ? theme.colors.primary[700] : theme.colors.neutral[500]}
              />
              <Text
                style={[
                  styles.paymentText,
                  paymentType === "CASH" && styles.paymentSelectedText,
                ]}
              >
                Efectivo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.paymentOption,
                paymentType === "NFC" && styles.paymentSelected,
              ]}
              onPress={() => setPaymentType("NFC")}
            >
              <MaterialCommunityIcons
                name="contactless-payment"
                size={18}
                color={paymentType === "NFC" ? theme.colors.primary[700] : theme.colors.neutral[500]}
              />
              <Text
                style={[
                  styles.paymentText,
                  paymentType === "NFC" && styles.paymentSelectedText,
                ]}
              >
                Tarjeta / NFC
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cash Tendered Input & Change Calculation Section */}
          {paymentType === "CASH" && (
            <View style={styles.cashContainer}>
              <TextInput
                label="Efectivo entregado (€)"
                placeholder={total.toFixed(2)}
                keyboardType="decimal-pad"
                value={cashGiven}
                onChangeText={setCashGiven}
              />
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Cambio a devolver:</Text>
                <Text style={styles.changeValue}>{changeDue.toFixed(2)} €</Text>
              </View>
            </View>
          )}

          {/* Order Grand Total Display */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total a Cobrar:</Text>
            <Text style={styles.totalAmount}>{total.toFixed(2)} €</Text>
          </View>

          {/* Action Buttons: Cancel and Confirm Sale */}
          <View style={styles.actions}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              style={styles.actionButton}
            />
            <Button
              title="Confirmar Venta"
              variant="primary"
              loading={isProcessing}
              disabled={!isValidCash || cart.length === 0}
              onPress={handleConfirmSale}
              style={styles.actionButton}
            />
          </View>
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
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  itemList: {
    maxHeight: 180,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[800],
  },
  itemSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  itemSubtotal: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    marginHorizontal: theme.spacing.xs,
  },
  removeButton: {
    marginLeft: theme.spacing.xs,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.xs,
  },
  paymentSelector: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.neutral[100],
  },
  paymentSelected: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  paymentText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[700],
  },
  paymentSelectedText: {
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeight.bold,
  },
  cashContainer: {
    marginBottom: theme.spacing.sm,
  },
  changeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  changeLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
  },
  changeValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.status.success,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.md,
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },
  totalAmount: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

