/**
 * @file BarcodeScannerModal.tsx
 * @description Modal a pantalla completa para el escaneo nativo de códigos de barras (EAN-13, EAN-8, UPC, Code128, QR)
 * utilizando CameraView de expo-camera.
 * Diseñado con soporte de retícula de enfoque interactiva, feedback visual, linterna y selector de modo.
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../ui/Button";
import { theme } from "../../theme";

export interface BarcodeScannerModalProps {
  /** Controla la visibilidad del escáner */
  visible: boolean;
  /** Título o instrucción superior (ej: "Escanear para Cobrar" o "Asignar Código al Producto") */
  title?: string;
  /** Callback disparado al detectar un código */
  onBarcodeScanned: (data: string, type: string) => void;
  /** Callback para cerrar el escáner */
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  title = "Escanear Código de Barras",
  onBarcodeScanned,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scannedRecently, setScannedRecently] = useState(false);

  // Reset states when opening
  useEffect(() => {
    if (visible) {
      setTorchEnabled(false);
      setScannedRecently(false);
    }
  }, [visible]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scannedRecently || !result.data) return;

    // Debounce to prevent multiple scans of the same frame
    setScannedRecently(true);
    onBarcodeScanned(result.data, result.type);

    // Re-enable after short interval
    setTimeout(() => {
      setScannedRecently(false);
    }, 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Cerrar escáner"
          >
            <MaterialCommunityIcons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={[styles.headerBtn, torchEnabled && styles.headerBtnActive]}
            onPress={() => setTorchEnabled((prev) => !prev)}
            activeOpacity={0.7}
            accessibilityLabel="Activar linterna"
          >
            <MaterialCommunityIcons
              name={torchEnabled ? "flashlight" : "flashlight-off"}
              size={20}
              color={torchEnabled ? theme.colors.status.warning : "#ffffff"}
            />
          </TouchableOpacity>
        </View>

        {/* Camera Surface */}
        {!permission ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={styles.centerText}>Verificando permisos de cámara...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.centerContainer}>
            <View style={styles.permissionIconWrap}>
              <MaterialCommunityIcons
                name="camera-off-outline"
                size={48}
                color={theme.colors.status.warning}
              />
            </View>
            <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
            <Text style={styles.permissionSubtitle}>
              Para leer códigos de barras (EAN, UPC, etc.) se necesita acceso a la cámara del dispositivo.
            </Text>
            <Button
              title="Conceder Permiso"
              variant="primary"
              onPress={requestPermission}
              style={styles.permissionBtn}
            />
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onClose}
              style={[styles.permissionBtn, { marginTop: theme.spacing.sm }]}
            />
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "code128",
                  "code39",
                  "code93",
                  "qr",
                ],
              }}
              onBarcodeScanned={scannedRecently ? undefined : handleBarcodeScanned}
            />

            {/* Visual Viewfinder Overlay */}
            <View style={styles.overlayMask}>
              <View style={styles.maskTop} />
              <View style={styles.maskCenterRow}>
                <View style={styles.maskSide} />
                <View style={styles.viewfinder}>
                  {/* Corner brackets */}
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />

                  {/* Red laser scanning line */}
                  <View style={styles.laserLine} />
                </View>
                <View style={styles.maskSide} />
              </View>
              <View style={styles.maskBottom}>
                <Text style={styles.hintText}>
                  Apunta la cámara al código de barras del producto (EAN/UPC)
                </Text>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: "rgba(0,0,0,0.75)",
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#ffffff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.main,
  },
  centerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.md,
  },
  permissionIconWrap: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: theme.colors.status.warningLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  permissionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.xs,
  },
  permissionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  permissionBtn: {
    width: "100%",
    maxWidth: 280,
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
  },
  overlayMask: {
    ...StyleSheet.absoluteFillObject,
  },
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  maskCenterRow: {
    flexDirection: "row",
    height: 240,
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  viewfinder: {
    width: 290,
    height: 240,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#ffffff",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    width: "88%",
    height: 2,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  maskBottom: {
    flex: 1.2,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  hintText: {
    color: "#ffffff",
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: "center",
    opacity: 0.9,
  },
});

