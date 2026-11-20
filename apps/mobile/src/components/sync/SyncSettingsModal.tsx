import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { Button } from "../ui/Button";

export interface SyncSettingsModalProps {
  visible: boolean;
  isEnabled: boolean;
  onClose: () => void;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  visible,
  isEnabled,
  onClose,
  onEnable,
  onDisable,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnable = async () => {
    try {
      setIsProcessing(true);
      await onEnable();
      Alert.alert(
        "Catálogo publicado",
        "Todos los productos locales se han enviado a Supabase.",
      );
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo activar la sincronización.";
      Alert.alert("No se pudo activar", message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisable = async () => {
    try {
      setIsProcessing(true);
      await onDisable();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo desactivar la sincronización.";
      Alert.alert("Error", message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.handleBar} />
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={isEnabled ? "cloud-check-outline" : "cloud-sync-outline"}
                size={30}
                color={theme.colors.primary[600]}
              />
            </View>

            <Text style={styles.title}>Sincronización con Supabase</Text>
            <Text style={styles.description}>
              Publica el catálogo local para que la tienda web pueda mostrar sus
              productos y recibe los cambios de pedidos y stock.
            </Text>

            <View style={styles.statusCard}>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  {isEnabled ? "Sincronización activa" : "Sincronización desactivada"}
                </Text>
                <Text style={styles.statusDescription}>
                  {isEnabled
                    ? "Los cambios se enviarán automáticamente cuando haya conexión."
                    : "Los cambios solo se guardan en este dispositivo."}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                disabled={isProcessing}
                onValueChange={(enabled) => {
                  if (enabled) void handleEnable();
                  else void handleDisable();
                }}
                trackColor={{
                  false: theme.colors.neutral[300],
                  true: theme.colors.primary[400],
                }}
                thumbColor={
                  isEnabled
                    ? theme.colors.primary[700]
                    : theme.colors.neutral[100]
                }
              />
            </View>

            {!isEnabled && (
              <View style={styles.warningCard}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={18}
                  color={theme.colors.primary[700]}
                />
                <Text style={styles.warningText}>
                  Al activar se sustituirá el catálogo remoto por una copia
                  completa del catálogo actual de este dispositivo.
                </Text>
              </View>
            )}

            <Button
              title={
                isEnabled
                  ? "Subir catálogo completo"
                  : "Activar y subir todo"
              }
              loading={isProcessing}
              onPress={handleEnable}
              style={styles.primaryButton}
            />

            {isEnabled && (
              <Button
                title="Desactivar sincronización"
                variant="outline"
                loading={isProcessing}
                onPress={handleDisable}
                style={styles.secondaryButton}
              />
            )}

            <Button
              title="Cerrar"
              variant="ghost"
              disabled={isProcessing}
              onPress={onClose}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: theme.colors.background.overlay,
  },
  modalContent: {
    maxHeight: "88%",
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[300],
    alignSelf: "center",
    marginTop: theme.spacing.sm,
  },
  scrollContent: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: theme.spacing.sm,
  },
  title: {
    textAlign: "center",
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  description: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 20,
    color: theme.colors.neutral[600],
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.neutral[50],
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[800],
  },
  statusDescription: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: 17,
    color: theme.colors.neutral[600],
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: 17,
    color: theme.colors.primary[700],
  },
  primaryButton: {
    marginTop: theme.spacing.lg,
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
  },
});
