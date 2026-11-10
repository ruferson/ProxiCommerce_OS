/**
 * @file SyncDecisionModal.tsx
 * @description Modal dialog asking the user how to handle data synchronization
 * when opening the app or pulling to refresh.
 */

import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { Button } from "../ui/Button";
import { theme } from "../../theme";

export interface SyncDecisionModalProps {
  visible: boolean;
  localCount: number;
  onOverwriteLocal: () => void;
  onOverwriteRemote: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SyncDecisionModal: React.FC<SyncDecisionModalProps> = ({
  visible,
  localCount,
  onOverwriteLocal,
  onOverwriteRemote,
  onCancel,
  isLoading = false,
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Sincronización de Datos</Text>
          <Text style={styles.description}>
            Se ha detectado conexión con la nube. ¿Cómo deseas proceder con los
            datos del catálogo?
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Productos guardados localmente:{" "}
              <Text style={styles.bold}>{localCount}</Text>
            </Text>
          </View>
          <Text style={styles.warning}>
            Si eliges conservar el catálogo local, los productos de esta tienda
            que solo existan en la nube se eliminarán.
          </Text>

          <View style={styles.actions}>
            <Button
              title="Descargar de la Nube (Reescribir Local)"
              variant="primary"
              loading={isLoading}
              onPress={onOverwriteLocal}
              style={styles.btn}
            />

            <Button
              title="Conservar Local (Reemplazar Nube)"
              variant="danger"
              disabled={isLoading}
              onPress={onOverwriteRemote}
              style={styles.btn}
            />

            <Button
              title="Ignorar por ahora"
              variant="ghost"
              disabled={isLoading}
              onPress={onCancel}
              style={styles.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.background.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.md,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    elevation: 5,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing.md,
  },
  infoBox: {
    backgroundColor: theme.colors.neutral[100],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[700],
  },
  warning: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.status.warning,
    marginBottom: theme.spacing.md,
  },
  bold: {
    fontWeight: theme.typography.fontWeight.bold,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  btn: {
    borderRadius: theme.borderRadius.lg,
  },
});
