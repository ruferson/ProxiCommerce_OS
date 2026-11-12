/**
 * @file BackupModal.tsx
 * @description Manual Google Drive export and restore, independent of Supabase sync.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { AccessTokenRequest } from "expo-auth-session";
import { Button } from "../ui/Button";
import { theme } from "../../theme";
import {
  GoogleDriveBackup,
  listGoogleDriveBackups,
  restoreGoogleDriveBackup,
  uploadToGoogleDrive,
} from "../../services/backupService";

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID_PLACEHOLDER = "not-configured.apps.googleusercontent.com";

export interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreComplete: () => void | Promise<void>;
  storeId: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  visible,
  onClose,
  onRestoreComplete,
  storeId,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [backups, setBackups] = useState<GoogleDriveBackup[]>([]);
  const [showBackupList, setShowBackupList] = useState(false);

  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;
  const isGoogleConfigured =
    Platform.OS === "ios"
      ? Boolean(iosClientId)
      : Platform.OS === "android"
        ? Boolean(androidClientId)
        : Boolean(webClientId);

  const [request, , promptAsync] = Google.useAuthRequest({
    iosClientId: iosClientId ?? CLIENT_ID_PLACEHOLDER,
    androidClientId: androidClientId ?? CLIENT_ID_PLACEHOLDER,
    webClientId: webClientId ?? CLIENT_ID_PLACEHOLDER,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    shouldAutoExchangeCode: false,
  });

  const getAccessToken = async (): Promise<string | null> => {
    if (!isGoogleConfigured) {
      Alert.alert(
        "Google Drive no configurado",
        "Añade el ID de cliente OAuth de esta plataforma a apps/mobile/.env y vuelve a compilar la app.",
      );
      return null;
    }
    if (!request) {
      Alert.alert(
        "Google Drive no disponible",
        "No se pudo preparar la solicitud de autorización. Comprueba la configuración OAuth.",
      );
      return null;
    }

    const result = await promptAsync();
    if (result.type === "cancel" || result.type === "dismiss") return null;
    if (result.type !== "success") {
      throw new Error(
        result.type === "error"
          ? result.error?.description ||
            result.params.error_description ||
            result.params.error ||
            "Google rechazó la autorización."
          : "No se completó la autorización de Google.",
      );
    }

    let accessToken =
      result.type === "success"
        ? result.authentication?.accessToken ?? result.params.access_token
        : undefined;
    if (!accessToken && result.type === "success" && result.params.code) {
      if (!request.codeVerifier) {
        throw new Error(
          "No se pudo completar PKCE para Google Drive. Cierra la ventana y vuelve a intentarlo.",
        );
      }

      const tokenResponse = await new AccessTokenRequest({
        clientId: request.clientId,
        code: result.params.code,
        redirectUri: request.redirectUri,
        scopes: request.scopes,
        extraParams: { code_verifier: request.codeVerifier },
      }).performAsync(Google.discovery);
      accessToken = tokenResponse.accessToken;
    }

    if (!accessToken) {
      throw new Error(
        "Google no devolvió un token de acceso. Revisa los clientes OAuth y el redirect URI.",
      );
    }
    return accessToken;
  };

  const handleCreateBackup = async () => {
    setIsProcessing(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      await uploadToGoogleDrive(accessToken, storeId);
      Alert.alert(
        "Copia guardada",
        "Se exportaron los productos, las ventas y los cierres de esta tienda a Google Drive. Esta copia no se actualiza automáticamente.",
      );
      onClose();
    } catch (error) {
      console.error("[BackupModal] Google Drive backup failed:", error);
      Alert.alert(
        "No se pudo crear la copia",
        error instanceof Error ? error.message : "Error desconocido.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListBackups = async () => {
    setIsProcessing(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const savedBackups = await listGoogleDriveBackups(accessToken, storeId);
      setBackups(savedBackups);
      setShowBackupList(true);
      if (savedBackups.length === 0) {
        Alert.alert(
          "No hay copias",
          "No se encontraron copias de esta tienda creadas por ProxiCommerce en la cuenta de Google seleccionada.",
        );
      }
    } catch (error) {
      console.error("[BackupModal] Google Drive backup listing failed:", error);
      Alert.alert(
        "No se pudieron cargar las copias",
        error instanceof Error ? error.message : "Error desconocido.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const restoreBackup = (backup: GoogleDriveBackup) => {
    Alert.alert(
      "Reemplazar datos locales",
      `Se reemplazarán los productos, las ventas y los cierres de esta tienda en este dispositivo por la copia "${backup.name}". No se modificarán los datos de Supabase.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar copia",
          style: "destructive",
          onPress: () => {
            void executeRestore(backup);
          },
        },
      ],
    );
  };

  const executeRestore = async (backup: GoogleDriveBackup) => {
    setIsProcessing(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      await restoreGoogleDriveBackup(accessToken, backup.id, storeId);
      await onRestoreComplete();
      Alert.alert(
        "Copia restaurada",
        "Los datos se han recuperado en este dispositivo. La restauración no los ha subido a Supabase.",
      );
      onClose();
    } catch (error) {
      console.error("[BackupModal] Google Drive restore failed:", error);
      Alert.alert(
        "No se pudo restaurar la copia",
        error instanceof Error ? error.message : "Error desconocido.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setShowBackupList(false);
    setBackups([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="google-drive"
              size={24}
              color={theme.colors.primary[700]}
            />
            <Text style={styles.title}>
              {showBackupList
                ? "Restaurar desde Google Drive"
                : "Copia manual de Google Drive"}
            </Text>
          </View>

          <Text style={styles.description}>
            {showBackupList
              ? "Elige una copia de esta tienda. Al restaurarla se reemplazarán sus datos locales."
              : "Exporta o recupera productos, ventas y cierres de esta tienda. No es una sincronización automática ni sustituye a la sincronización con Supabase."}
          </Text>

          {!isGoogleConfigured && (
            <Text style={styles.configurationWarning}>
              Falta configurar el cliente OAuth de Google para esta plataforma.
              Consulta la sección Google Drive del README.
            </Text>
          )}

          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={theme.colors.primary[600]}
              />
              <Text style={styles.loadingText}>
                {showBackupList ? "Restaurando copia..." : "Conectando con Google Drive..."}
              </Text>
            </View>
          ) : showBackupList ? (
            <ScrollView style={styles.backupList}>
              {backups.map((backup) => (
                <TouchableOpacity
                  key={backup.id}
                  style={styles.backupItem}
                  onPress={() => restoreBackup(backup)}
                  accessibilityRole="button"
                  accessibilityLabel={`Restaurar ${backup.name}`}
                >
                  <MaterialCommunityIcons
                    name="database"
                    size={20}
                    color={theme.colors.primary[600]}
                  />
                  <View style={styles.backupDetails}>
                    <Text style={styles.backupName} numberOfLines={2}>
                      {backup.name}
                    </Text>
                    <Text style={styles.backupDate}>
                      {backup.createdTime
                        ? new Date(backup.createdTime).toLocaleString()
                        : "Fecha no disponible"}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="restore"
                    size={20}
                    color={theme.colors.neutral[600]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.actions}>
              <Button
                title="Crear copia en Google Drive"
                variant="primary"
                onPress={handleCreateBackup}
                disabled={!isGoogleConfigured || !request}
                style={styles.btn}
              />
              <Button
                title="Buscar y restaurar una copia"
                variant="secondary"
                onPress={handleListBackups}
                disabled={!isGoogleConfigured || !request}
                style={styles.btn}
              />
            </View>
          )}

          <Button
            title={showBackupList ? "Volver" : "Cerrar"}
            variant="ghost"
            onPress={showBackupList ? () => setShowBackupList(false) : closeModal}
            disabled={isProcessing}
            style={styles.btnCancel}
          />
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
    maxHeight: "85%",
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  configurationWarning: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.status.warning,
    marginBottom: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    fontWeight: theme.typography.fontWeight.medium,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  btn: {
    borderRadius: theme.borderRadius.lg,
  },
  btnCancel: {
    marginTop: theme.spacing.xs,
  },
  backupList: {
    flexGrow: 0,
    maxHeight: 300,
    marginBottom: theme.spacing.md,
  },
  backupItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backupDetails: {
    flex: 1,
  },
  backupName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[800],
  },
  backupDate: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[500],
  },
});
