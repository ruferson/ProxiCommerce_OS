/**
 * @file SalesHistoryModal.tsx
 * @description Sales history and receipt lookup modal.
 * Optimized for fast transaction lookup during operations:
 * - Quick payment-method filters (all, cash, card, and more).
 * - Chronological receipt list with item details and timestamps.
 * - Direct refund management with stock restoration.
 * - Compact access to the end-of-shift Arqueo Z without duplicating its calculator.
 * Uses @expo/vector-icons MaterialCommunityIcons throughout (no emojis).
 */

import React, { useEffect, useState, useMemo } from "react";
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
import { useTransactionHistory } from "../../hooks/useTransactionHistory";

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

type FilterType = "ALL" | TransactionType;

const FILTER_OPTIONS: { id: FilterType; label: string; icon: MCIconName }[] = [
  { id: "ALL", label: "Todos", icon: "view-list" },
  { id: "CASH", label: "Efectivo", icon: "cash-multiple" },
  { id: "NFC", label: "Tarjeta", icon: "contactless-payment" },
  { id: "AI_SCAN", label: "IA Scan", icon: "barcode-scan" },
  { id: "ONLINE_WEB", label: "Web", icon: "web" },
];

export interface SalesHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  /** Receives the transaction ID when the user taps "Devolver" on a row */
  onRefundPress: (transactionId: string) => void;
  /** Triggers the dedicated full-screen Arqueo Z screen */
  onOpenArqueoScreen?: () => void;
}

/** Single transaction row */
const TransactionRow: React.FC<{
  tx: Transaction;
  onRefund: () => void;
}> = ({ tx, onRefund }) => {
  const items = Array.isArray(tx.items) ? (tx.items as TransactionItem[]) : [];
  const timeLabel = tx.timestamp ? tx.timestamp.slice(11, 16) : "—";
  const dateLabel = tx.timestamp ? tx.timestamp.slice(0, 10) : "";
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

        {/* Time and date */}
        <Text style={styles.txTime}>
          {timeLabel} {dateLabel ? `· ${dateLabel}` : ""}
        </Text>

        {/* Total */}
        <Text style={[styles.txTotal, isRefund && styles.txTotalRefund]}>
          {tx.total.toFixed(2)} €
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

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
  visible,
  onClose,
  onRefundPress,
  onOpenArqueoScreen,
}) => {
  const { transactions, arqueo, loading, error, refresh } = useTransactionHistory();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  // Client-side filter
  const filteredTransactions = useMemo(() => {
    if (selectedFilter === "ALL") return transactions;
    return transactions.filter((t) => t.type === selectedFilter);
  }, [transactions, selectedFilter]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Historial de Ventas</Text>
              <Text style={styles.modalSubtitle}>Consulta de tickets y devoluciones</Text>
            </View>
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

          {/* Quick access banner for the daily Arqueo Z */}
          {onOpenArqueoScreen && arqueo && (
            <TouchableOpacity
              style={styles.arqueoBanner}
              onPress={onOpenArqueoScreen}
              activeOpacity={0.8}
            >
              <View style={styles.arqueoBannerIcon}>
                <MaterialCommunityIcons
                  name="cash-register"
                  size={20}
                  color={theme.colors.primary[700]}
                />
              </View>
              <View style={styles.arqueoBannerContent}>
                <Text style={styles.arqueoBannerTitle}>Cierre de Caja y Arqueo Z</Text>
                <Text style={styles.arqueoBannerSub}>
                  Hoy: {arqueo.grandTotal.toFixed(2)} € · {arqueo.transactionCount} operaciones
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.colors.primary[600]}
              />
            </TouchableOpacity>
          )}

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
              {/* Payment Method Filters */}
              <View style={styles.filtersSection}>
                <Text style={styles.filtersLabel}>Filtrar por método</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterTabs}
                >
                  {FILTER_OPTIONS.map((f) => {
                    const isSelected = selectedFilter === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[
                          styles.filterTab,
                          isSelected && styles.filterTabSelected,
                        ]}
                        onPress={() => setSelectedFilter(f.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={f.icon}
                          size={13}
                          color={
                            isSelected
                              ? theme.colors.primary[700]
                              : theme.colors.neutral[500]
                          }
                        />
                        <Text
                          style={[
                            styles.filterTabText,
                            isSelected && styles.filterTabTextSelected,
                          ]}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* List Section Header */}
              <View style={styles.listHeaderRow}>
                <Text style={styles.listSectionTitle}>
                  Tickets Registrados ({filteredTransactions.length})
                </Text>
                {selectedFilter !== "ALL" && (
                  <TouchableOpacity
                    onPress={() => setSelectedFilter("ALL")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearFilterText}>Ver todos</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Empty state */}
              {filteredTransactions.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <MaterialCommunityIcons
                      name="receipt-text-outline"
                      size={40}
                      color={theme.colors.neutral[400]}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Sin tickets</Text>
                  <Text style={styles.emptySubtext}>
                    {selectedFilter === "ALL"
                      ? "Las ventas realizadas aparecerán listadas aquí."
                      : `No hay transacciones registradas con método ${PAYMENT_LABEL[selectedFilter as TransactionType] || selectedFilter}.`}
                  </Text>
                </View>
              )}

              {/* Transactions List */}
              {filteredTransactions.map((tx) => (
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
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },

  // Banner compacto hacia Arqueo Z
  arqueoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  arqueoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  arqueoBannerContent: {
    flex: 1,
  },
  arqueoBannerTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[700],
  },
  arqueoBannerSub: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
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

  // Filters section
  filtersSection: {
    marginBottom: theme.spacing.md,
  },
  filtersLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[500],
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  filterTabs: {
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  filterTabSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  filterTabText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[600],
  },
  filterTabTextSelected: {
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeight.bold,
  },

  // Section header
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  listSectionTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[500],
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  clearFilterText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeight.semibold,
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
    paddingHorizontal: theme.spacing.lg,
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
