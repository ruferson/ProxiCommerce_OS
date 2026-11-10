/**
 * @file ArqueoScreenModal.tsx
 * @description Full-screen modal dedicated to the Cash Register Closure (Arqueo Z / X).
 * Designed specifically for the merchant's end-of-shift or end-of-day closure:
 * - Spacious full-screen view with a clean navigation bar.
 * - Visual breakdown of net revenue, gross sales, and refunds.
 * - Physical drawer balancing: counted cash input, discrepancy calculation, and responsive layout.
 * - Fiscal/operational summary of digital channels.
 * - Relaxing pastel palette for the end of the day and formal closure support.
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TransactionType } from "@proxi-commerce/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { theme } from "../../theme";
import { useTransactionHistory } from "../../hooks/useTransactionHistory";
import * as SQLite from "expo-sqlite";
import { DB_NAME } from "../../db/schema";
import { enqueueSyncOperation } from "../../db/syncQueue";

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
  ONLINE_WEB: "Online Web",
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

export interface ArqueoScreenModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
}

export const ArqueoScreenModal: React.FC<ArqueoScreenModalProps> = ({
  visible,
  onClose,
  storeId,
}) => {
  const { arqueo, loading, refresh } = useTransactionHistory(storeId);
  const [countedCash, setCountedCash] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (visible) {
      refresh();
      setCountedCash("");
      setNotes("");
    }
  }, [visible, refresh]);

  const countedNum = parseFloat(countedCash.replace(",", ".")) || 0;
  const expectedCash = arqueo?.expectedCash ?? 0;
  const hasCountedInput = countedCash.trim().length > 0;
  const discrepancy = countedNum - expectedCash;

  // Utilize the pre-calculated daily totals from SQLite aggregation
  const totalSales = arqueo?.grossSales ?? 0;
  const totalRefunds = arqueo?.grossRefunds ?? 0;

  const handleFinishDay = () => {
    Alert.alert(
      "Confirmar Cierre Z",
      `¿Deseas dar por cerrado el arqueo de hoy (${arqueo?.date})?\n\n` +
        `Efectivo esperado: ${expectedCash.toFixed(2)} €\n` +
        `Efectivo contado: ${countedNum.toFixed(2)} €\n` +
        `Descuadre: ${discrepancy >= 0 ? "+" : ""}${discrepancy.toFixed(2)} €`,
      [
        { text: "Revisar", style: "cancel" },
        {
          text: "Confirmar Cierre",
          style: "default",
          onPress: async () => {
            try {
              if (arqueo) {
                const closureId = `cls_${Date.now()}`;
                const closureRecord = {
                  id: closureId,
                  store_id: storeId,
                  date: arqueo.date,
                  expected_cash: expectedCash,
                  counted_cash: countedNum,
                  total_digital: arqueo.totalDigital,
                  grand_total: arqueo.grandTotal,
                  transaction_count: arqueo.transactionCount,
                  notes: notes.trim() || null,
                  created_at: new Date().toISOString(),
                };

                // Persist closure to local SQLite database
                const db = await SQLite.openDatabaseAsync(DB_NAME);
                await db.runAsync(
                  `INSERT INTO closures (id, store_id, date, expected_cash, counted_cash, total_digital, grand_total, transaction_count, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                  [
                    closureRecord.id,
                    closureRecord.store_id,
                    closureRecord.date,
                    closureRecord.expected_cash,
                    closureRecord.counted_cash,
                    closureRecord.total_digital,
                    closureRecord.grand_total,
                    closureRecord.transaction_count,
                    closureRecord.notes,
                  ],
                );

                // Queue closure for cloud sync
                await enqueueSyncOperation(
                  "closure",
                  closureId,
                  "INSERT",
                  closureRecord,
                );
              }

              Alert.alert(
                "Cierre Guardado",
                "El informe del turno ha sido validado y encolado para sincronización en la nube.",
                [{ text: "Aceptar", onPress: onClose }],
              );
            } catch (err) {
              console.error("Error al registrar cierre Z en SQLite:", err);
              Alert.alert(
                "Error",
                "No se pudo guardar el cierre en la base de datos local.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={theme.colors.neutral[700]}
            />
          </TouchableOpacity>
          <View style={styles.topBarTitleBlock}>
            <Text style={styles.topBarTitle}>Arqueo y Cierre Z</Text>
            <Text style={styles.topBarSubtitle}>
              {arqueo?.date || "Fin de Jornada"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refresh}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color={theme.colors.primary[600]}
            />
          </TouchableOpacity>
        </View>

        {loading || !arqueo ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Text style={styles.loadingText}>
              Calculando balance de caja...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Net Revenue Card */}
            <Card style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroBadge}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={16}
                    color={theme.colors.primary[700]}
                  />
                  <Text style={styles.heroBadgeText}>Balance Oficial</Text>
                </View>
                <Text style={styles.heroTxCount}>
                  {arqueo.transactionCount} operaciones
                </Text>
              </View>

              <Text style={styles.heroLabel}>Total Neto Facturado</Text>
              <Text style={styles.heroAmount}>
                {arqueo.grandTotal.toFixed(2)} €
              </Text>

              {/* Sub-bar: Gross sales vs Refunds */}
              <View style={styles.heroMetricsRow}>
                <View style={styles.heroMetric}>
                  <Text style={styles.metricLabel}>Ventas Brutas</Text>
                  <Text style={styles.metricValuePos}>
                    +{totalSales.toFixed(2)} €
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.heroMetric}>
                  <Text style={styles.metricLabel}>Devoluciones</Text>
                  <Text style={styles.metricValueNeg}>
                    -{totalRefunds.toFixed(2)} €
                  </Text>
                </View>
              </View>
            </Card>

            {/* SECTION 1: Physical Cash Drawer Balancing */}
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="cash-register"
                size={20}
                color={theme.colors.payment.cash}
              />
              <Text style={styles.sectionTitle}>Cuadre de Efectivo Físico</Text>
            </View>

            <Card style={styles.drawerCard}>
              <View style={styles.drawerColumn}>
                <Text style={styles.drawerLabel}>
                  Efectivo Teórico en Gaveta
                </Text>
                <Text style={styles.drawerSub}>
                  Total de ventas en efectivo menos devoluciones
                </Text>
                <View style={styles.expectedCashBadge}>
                  <MaterialCommunityIcons
                    name="cash"
                    size={18}
                    color={theme.colors.payment.cash}
                  />
                  <Text style={styles.expectedCashVal} numberOfLines={1}>
                    {expectedCash.toFixed(2)} €
                  </Text>
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputTitle}>
                  Efectivo Real Contado en Gaveta
                </Text>
                <View style={styles.inputRow}>
                  <View style={styles.currencyPrefix}>
                    <Text style={styles.currencyPrefixText}>€</Text>
                  </View>
                  <TextInput
                    style={styles.cashInput}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.neutral[400]}
                    keyboardType="decimal-pad"
                    value={countedCash}
                    onChangeText={setCountedCash}
                  />
                  {hasCountedInput && (
                    <TouchableOpacity
                      onPress={() => setCountedCash("")}
                      style={styles.clearInput}
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={18}
                        color={theme.colors.neutral[400]}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Balancing Result */}
              {hasCountedInput && (
                <View
                  style={[
                    styles.resultBox,
                    discrepancy === 0
                      ? styles.resultMatch
                      : discrepancy > 0
                        ? styles.resultSurplus
                        : styles.resultDeficit,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      discrepancy === 0
                        ? "check-decagram"
                        : discrepancy > 0
                          ? "arrow-up-bold-circle-outline"
                          : "alert-octagon"
                    }
                    size={24}
                    color={
                      discrepancy === 0
                        ? theme.colors.status.success
                        : discrepancy > 0
                          ? theme.colors.primary[600]
                          : theme.colors.status.error
                    }
                  />
                  <View style={styles.resultTextBlock}>
                    <Text
                      style={[
                        styles.resultTitle,
                        {
                          color:
                            discrepancy === 0
                              ? theme.colors.status.success
                              : discrepancy > 0
                                ? theme.colors.primary[700]
                                : theme.colors.status.error,
                        },
                      ]}
                    >
                      {discrepancy === 0
                        ? "Caja Cuadrada al Céntimo"
                        : discrepancy > 0
                          ? "Sobrante de Efectivo (+)"
                          : "Faltante en Gaveta (-)"}
                    </Text>
                    <Text
                      style={[
                        styles.resultAmount,
                        {
                          color:
                            discrepancy === 0
                              ? theme.colors.status.success
                              : discrepancy > 0
                                ? theme.colors.primary[700]
                                : theme.colors.status.error,
                        },
                      ]}
                    >
                      {discrepancy >= 0 ? "+" : ""}
                      {discrepancy.toFixed(2)} €
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            {/* SECTION 2: Digital Channels Breakdown */}
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={20}
                color={theme.colors.payment.nfc}
              />
              <Text style={styles.sectionTitle}>
                Cobros Digitales y Bancarios ({arqueo.totalDigital.toFixed(2)}{" "}
                €)
              </Text>
            </View>

            <View style={styles.digitalGrid}>
              {arqueo.breakdown
                .filter((b) => b.type !== "CASH")
                .map((b) => (
                  <Card key={b.type} style={styles.digitalCard}>
                    <View style={styles.digitalCardHeader}>
                      <View
                        style={[
                          styles.digitalIconBadge,
                          { backgroundColor: PAYMENT_COLOR_LIGHT[b.type] },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={PAYMENT_ICON[b.type]}
                          size={18}
                          color={PAYMENT_COLOR[b.type]}
                        />
                      </View>
                      <Text style={styles.digitalCountBadge}>
                        {b.count} cobros
                      </Text>
                    </View>
                    <Text style={styles.digitalLabel}>
                      {PAYMENT_LABEL[b.type]}
                    </Text>
                    <Text style={styles.digitalAmount}>
                      {b.total.toFixed(2)} €
                    </Text>
                  </Card>
                ))}

              {arqueo.totalDigital === 0 && (
                <Card style={styles.emptyDigitalCard}>
                  <Text style={styles.emptyText}>
                    No hay transacciones electrónicas en este turno.
                  </Text>
                </Card>
              )}
            </View>

            {/* SECTION 3: Closure Observations */}
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="notebook-edit-outline"
                size={20}
                color={theme.colors.neutral[600]}
              />
              <Text style={styles.sectionTitle}>Observaciones del Turno</Text>
            </View>

            <Card style={styles.notesCard}>
              <TextInput
                style={styles.notesInput}
                placeholder="Añadir notas sobre incidencias, propinas o justificantes de gasto..."
                placeholderTextColor={theme.colors.neutral[400]}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </Card>

            {/* Closure Confirmation Button */}
            <View style={styles.actions}>
              <Button
                title="Cerrar y Validar Arqueo Z"
                variant="primary"
                onPress={handleFinishDay}
                style={styles.finishButton}
              />
            </View>
          </ScrollView>
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },
  topBarSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.neutral[500],
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl * 2,
  },

  // Hero Card
  heroCard: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
    borderWidth: 1,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.xxl,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  heroBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary[700],
  },
  heroTxCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
    fontWeight: theme.typography.fontWeight.medium,
  },
  heroLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginTop: theme.spacing.sm,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[700],
    marginVertical: 4,
  },
  heroMetricsRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary[200],
  },
  heroMetric: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    backgroundColor: theme.colors.primary[200],
    marginHorizontal: theme.spacing.md,
  },
  metricLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  metricValuePos: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.status.success,
    marginTop: 2,
  },
  metricValueNeg: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.status.error,
    marginTop: 2,
  },

  // Sections
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[700],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Drawer Card
  drawerCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    gap: theme.spacing.md,
  },
  drawerColumn: {
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 4,
  },
  drawerLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
  },
  drawerSub: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  expectedCashBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.payment.cashLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xs,
  },
  expectedCashVal: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.payment.cash,
  },
  inputSection: {
    gap: theme.spacing.xs,
  },
  inputTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[700],
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[300],
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  currencyPrefix: {
    marginRight: theme.spacing.sm,
  },
  currencyPrefixText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[500],
  },
  cashInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  clearInput: {
    padding: theme.spacing.xs,
  },

  // Result Box
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  resultMatch: {
    backgroundColor: theme.colors.status.successLight,
  },
  resultSurplus: {
    backgroundColor: theme.colors.primary[50],
  },
  resultDeficit: {
    backgroundColor: theme.colors.status.errorLight,
  },
  resultTextBlock: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  resultAmount: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },

  // Digital Grid
  digitalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  digitalCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
  },
  digitalCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  digitalIconBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  digitalCountBadge: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[400],
  },
  digitalLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
  digitalAmount: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
    marginTop: 2,
  },
  emptyDigitalCard: {
    width: "100%",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    alignItems: "center",
  },
  emptyText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[400],
  },

  // Notes
  notesCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
  },
  notesInput: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[700],
    minHeight: 70,
    textAlignVertical: "top",
  },

  // Actions
  actions: {
    marginTop: theme.spacing.xl,
  },
  finishButton: {
    height: 56,
    borderRadius: theme.borderRadius.xl,
  },
});
