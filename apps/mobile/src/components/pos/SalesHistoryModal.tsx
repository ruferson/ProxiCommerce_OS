/**
 * @file SalesHistoryModal.tsx
 * @description Sales History & Arqueo (Cash Register) bottom-sheet modal.
 * Displays all recorded transactions newest-first, with daily Arqueo summary.
 * Uses @expo/vector-icons MaterialCommunityIcons throughout (no emoji).
 */

import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Transaction, TransactionItem, TransactionType } from "@proxi-commerce/types";
import { Card } from "../ui/Card";
import { theme } from "../../theme";
import {
  useTransactionHistory,
  PaymentBreakdown,
} from "../../hooks/useTransactionHistory";

// ---------------------------------------------------------------------------
// Icon + color maps (no emojis)
// ---------------------------------------------------------------------------

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const PAYMENT_ICON: Record<TransactionType, MCIconName> = {
  CASH: "cash-multiple",
  NFC: "contactless-payment",
  AI_SCAN: "barcode-scan",
  ONLINE_WEB: "web",
};

const PAYMENT_LABEL: Record<TransactionType, string> = {
  CASH: "Efectivo",
  NFC: "Tarjeta / NFC",
  AI_SCAN: "IA Scan",
  ONLINE_WEB: "Online",
};

const PAYMENT_COLOR: Record<TransactionType, string> = {
  CASH: theme.colors.payment.cash,
  NFC: theme.colors.payment.nfc,
  AI_SCAN: theme.colors.payment.aiScan,
  ONLINE_WEB: theme.colors.payment.web,
};

const PAYMENT_COLOR_LIGHT: Record<TransactionType, string> = {
  CASH: theme.colors.payment.cashLight,
  NFC: theme.colors.payment.nfcLight,
  AI_SCAN: theme.colors.payment.aiScanLight,
  ONLINE_WEB: theme.colors.payment.webLight,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SalesHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  /** Receives the transaction ID when the user taps "Devolver" on a row */
  onRefundPress: (transactionId: string) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Daily Arqueo summary card */
const ArqueoCard: React.FC<{
  date: string;
  grandTotal: number;
  transactionCount: number;
  breakdown: PaymentBreakdown[];
}> = ({ date, grandTotal, transactionCount, breakdown }) => (
  <Card style={styles.arqueoCard}>
    <View style={styles.arqueoHeader}>
      <View style={styles.arqueoIconWrap}>
        <MaterialCommunityIcons
          name="chart-bar"
          size={18}
          color={theme.colors.primary[600]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.arqueoTitle}>Arqueo del Día</Text>
        <Text style={styles.arqueoDate}>{date}</Text>
      </View>
      <View style={styles.arqueoCountBadge}>
        <Text style={styles.arqueoCountText}>{transactionCount} ventas</Text>
      </View>
    </View>

    <Text style={styles.arqueoTotal}>{grandTotal.toFixed(2)} €</Text>

    {breakdown.length > 0 && (
      <View style={styles.breakdownContainer}>
        {breakdown.map((b) => (
          <View key={b.type} style={styles.breakdownRow}>
            <View
              style={[
                styles.breakdownBadge,
                { backgroundColor: PAYMENT_COLOR_LIGHT[b.type] },
              ]}
            >
              <MaterialCommunityIcons
                name={PAYMENT_ICON[b.type]}
                size={12}
                color={PAYMENT_COLOR[b.type]}
              />
              <Text style={[styles.breakdownBadgeText, { color: PAYMENT_COLOR[b.type] }]}>
                {PAYMENT_LABEL[b.type]}
              </Text>
            </View>
            <Text style={styles.breakdownCount}>{b.count}×</Text>
            <Text style={styles.breakdownAmount}>{b.total.toFixed(2)} €</Text>
          </View>
        ))}
      </View>
    )}

    {transactionCount === 0 && (
      <Text style={styles.emptyArqueo}>Sin ventas registradas hoy.</Text>
    )}
  </Card>
);

/** Single transaction row */
const TransactionRow: React.FC<{
  tx: Transaction;
  onRefund: () => void;
}> = ({ tx, onRefund }) => {
  const items = Array.isArray(tx.items) ? (tx.items as TransactionItem[]) : [];
  const timeLabel = tx.timestamp ? tx.timestamp.slice(11, 16) : "—";
  const isRefund = tx.total < 0;
  const isRefunded = !!tx.refund_for_id;

  return (
    <Card style={[styles.txCard, isRefund && styles.txCardRefund]}>
      {/* Top row */}
      <View style={styles.txHeader}>
        {/* Payment type badge */}
        <View
          style={[
            styles.txTypeBadge,
            { backgroundColor: isRefund ? theme.colors.status.errorLight : PAYMENT_COLOR_LIGHT[tx.type] },
          ]}
        >
          <MaterialCommunityIcons
            name={isRefund ? "cash-refund" : PAYMENT_ICON[tx.type]}
            size={12}
            color={isRefund ? theme.colors.status.error : PAYMENT_COLOR[tx.type]}
          />
          <Text
            style={[
              styles.txTypeText,
              { color: isRefund ? theme.colors.status.error : PAYMENT_COLOR[tx.type] },
            ]}
          >
            {isRefund ? "Devolución" : PAYMENT_LABEL[tx.type]}
          </Text>
        </View>

        {/* Time */}
        <Text style={styles.txTime}>{timeLabel}</Text>

        {/* Total */}
        <Text
          style={[styles.txTotal, isRefund && styles.txTotalRefund]}
        >
          {isRefund ? "" : ""}{tx.total.toFixed(2)} €
        </Text>
      </View>

      {/* ID chip row */}
      <View style={styles.txMeta}>
        <View style={styles.txIdChip}>
          <Text style={styles.txIdText}>{tx.id.slice(-10).toUpperCase()}</Text>
        </View>
        {isRefunded && (
          <View style={styles.refundedBadge}>
            <MaterialCommunityIcons name="check-circle-outline" size={11} color={theme.colors.status.success} />
            <Text style={styles.refundedText}>Devuelta</Text>
          </View>
        )}
        {/* Refund action – only on normal, non-yet-refunded sales */}
        {!isRefund && !isRefunded && (
          <TouchableOpacity
            style={styles.refundButton}
            onPress={onRefund}
            activeOpacity={0.7}
            accessibilityLabel="Gestionar devolución"
          >
            <MaterialCommunityIcons
              name="cash-refund"
              size={13}
              color={theme.colors.status.error}
            />
            <Text style={styles.refundButtonText}>Devolver</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Item snapshot */}
      {items.length > 0 && (
        <View style={styles.txItems}>
          {items.map((item, idx) => (
            <Text key={idx} style={styles.txItemText} numberOfLines={1}>
              {Math.abs(item.quantity)}× {item.title ?? item.product_id}
              {"  "}
              <Text style={styles.txItemPrice}>
                {((item.unit_price ?? 0) * Math.abs(item.quantity)).toFixed(2)} €
              </Text>
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
  visible,
  onClose,
  onRefundPress,
}) => {
  const { transactions, arqueo, loading, error, refresh } = useTransactionHistory();

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Historial de Ventas</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar historial"
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={theme.colors.neutral[600]}
              />
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              <Text style={styles.loadingText}>Cargando transacciones...</Text>
            </View>
          )}

          {/* Error */}
          {!loading && error && (
            <View style={styles.centerContent}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={40}
                color={theme.colors.status.error}
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={refresh} style={styles.retryButton} activeOpacity={0.7}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          {!loading && !error && (
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContainer}
            >
              {arqueo && (
                <ArqueoCard
                  date={arqueo.date}
                  grandTotal={arqueo.grandTotal}
                  transactionCount={arqueo.transactionCount}
                  breakdown={arqueo.breakdown}
                />
              )}

              <Text style={styles.listSectionTitle}>
                Todas las transacciones ({transactions.length})
              </Text>

              {transactions.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <MaterialCommunityIcons
                      name="receipt-text-outline"
                      size={40}
                      color={theme.colors.neutral[400]}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Sin transacciones</Text>
                  <Text style={styles.emptySubtext}>
                    Las ventas completadas aparecerán aquí.
                  </Text>
                </View>
              )}

              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onRefund={() => onRefundPress(tx.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
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
    maxHeight: "92%",
    minHeight: "50%",
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

  // Loading / error
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.status.error,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary[100],
    marginTop: theme.spacing.sm,
  },
  retryText: {
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },

  scrollContent: { flex: 1 },
  scrollContainer: { paddingBottom: theme.spacing.xl },

  // Arqueo card
  arqueoCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  arqueoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  arqueoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  arqueoTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[700],
  },
  arqueoDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  arqueoCountBadge: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  arqueoCountText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#ffffff",
  },
  arqueoTotal: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[600],
    marginBottom: theme.spacing.sm,
  },
  breakdownContainer: { gap: theme.spacing.xs },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  breakdownBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  breakdownBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  breakdownCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    width: 24,
    textAlign: "right",
  },
  breakdownAmount: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[700],
    minWidth: 72,
    textAlign: "right",
  },
  emptyArqueo: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[400],
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },

  // Section header
  listSectionTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: theme.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[700],
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[400],
    textAlign: "center",
  },

  // Transaction row
  txCard: { marginBottom: theme.spacing.sm },
  txCardRefund: {
    backgroundColor: theme.colors.status.errorLight,
    borderWidth: 1,
    borderColor: theme.colors.status.error + "40",
  },
  txHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 6,
  },
  txTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  txTypeText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  txTime: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[400],
  },
  txTotal: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },
  txTotalRefund: {
    color: theme.colors.status.error,
  },
  txMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  txIdChip: {
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  txIdText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[500],
    letterSpacing: 0.5,
  },
  refundedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.status.successLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  refundedText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.status.success,
  },
  refundButton: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.status.errorLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  refundButtonText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.status.error,
  },
  txItems: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    gap: 2,
  },
  txItemText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[600],
  },
  txItemPrice: {
    color: theme.colors.neutral[400],
  },
});
