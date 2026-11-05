/**
 * @file ProductFormModal.tsx
 * @description Modal dialog for creating and editing products.
 * Includes camera image capture with local filesystem persistence, barcode scanner integration,
 * input validation, and form state management for both creation and modification workflows.
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Product } from "@proxi-commerce/types";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import { BarcodeScannerModal } from "../pos/BarcodeScannerModal";
import { theme } from "../../theme";

export interface ProductFormModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Triggered when the user dismisses the modal */
  onClose: () => void;
  /** Async callback to persist the created or updated product entity */
  onSave: (
    product: Omit<Product, "created_at" | "updated_at">,
  ) => Promise<void>;
  /** Optional async callback to delete a product entity (available when editing) */
  onDelete?: (productId: string) => Promise<void>;
  /** Unique store identifier associated with the product */
  storeId: string;
  /** Optional initial product data when operating in edit mode */
  initialProduct?: Product | null;
  /** Optional initial barcode value when opening form from scanner */
  initialBarcode?: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  storeId,
  initialProduct,
  initialBarcode,
}) => {
  // Form input field state
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Check whether form is editing an existing item or creating a new one
  const isEditing = Boolean(initialProduct);

  // Synchronize form fields whenever initialProduct, initialBarcode, or modal visibility changes
  useEffect(() => {
    if (initialProduct) {
      setTitle(initialProduct.title);
      setPrice(initialProduct.price.toString());
      setStock(initialProduct.stock_count.toString());
      setBarcode(initialProduct.barcode || "");
      setImageUri(initialProduct.image_uri);
    } else {
      // Reset form to blank inputs for fresh creation
      setTitle("");
      setPrice("");
      setStock("");
      setBarcode(initialBarcode || "");
      setImageUri(null);
    }
  }, [initialProduct, initialBarcode, visible]);

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permiso denegado",
        "Se requiere acceso a la cámara para fotografiar productos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const sourceUri = result.assets[0].uri;
      const fileName = `product_${Date.now()}.jpg`;
      const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
      setImageUri(destinationUri);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!title.trim() || !price || !stock || !imageUri) {
      Alert.alert(
        "Campos incompletos",
        "Por favor, añade una foto, título, precio y stock.",
      );
      return;
    }

    try {
      setIsSaving(true);
      const productData: Omit<Product, "created_at" | "updated_at"> = {
        id: initialProduct ? initialProduct.id : `prod_${Date.now()}`,
        store_id: storeId,
        title: title.trim(),
        price: parseFloat(price.replace(",", ".")),
        stock_count: parseInt(stock, 10),
        image_uri: imageUri,
        barcode: barcode.trim() || undefined,
      };

      await onSave(productData);
      onClose();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el producto localmente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!initialProduct || !onDelete) return;

    Alert.alert(
      "Eliminar producto",
      `¿Estás seguro de que deseas eliminar "${initialProduct.title}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await onDelete(initialProduct.id);
              onClose();
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el producto localmente.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleBarcodeScanned = (scannedData: string) => {
    setBarcode(scannedData);
    setScannerOpen(false);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Modal Heading */}
              <Text style={styles.modalTitle}>
                {isEditing ? "Editar Producto" : "Nuevo Producto"}
              </Text>

              {/* Photo Picker / Camera Trigger */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.imagePicker}
                onPress={takePhoto}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <MaterialCommunityIcons
                      name="camera-plus-outline"
                      size={28}
                      color={theme.colors.neutral[500]}
                    />
                    <Text style={styles.imagePickerText}>
                      Tomar foto del producto
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Product Title Field */}
              <TextInput
                label="Nombre del producto"
                placeholder="Ej. Barra de pan rústica"
                value={title}
                onChangeText={setTitle}
              />

              {/* Barcode Field with Scanner Action */}
              <View style={styles.barcodeFieldContainer}>
                <View style={styles.barcodeInputWrapper}>
                  <TextInput
                    label="Código de barras (EAN / UPC)"
                    placeholder="Ej. 8412345678901"
                    keyboardType="default"
                    value={barcode}
                    onChangeText={setBarcode}
                  />
                </View>
                <TouchableOpacity
                  style={styles.scanBarcodeButton}
                  onPress={() => setScannerOpen(true)}
                  activeOpacity={0.7}
                  accessibilityLabel="Escanear código de barras con la cámara"
                >
                  <MaterialCommunityIcons
                    name="barcode-scan"
                    size={22}
                    color={theme.colors.primary[600]}
                  />
                </TouchableOpacity>
              </View>

              {/* Price and Stock Inputs in a Two-Column Row */}
              <View style={styles.row}>
                <View style={styles.column}>
                  <TextInput
                    label="Precio (€)"
                    placeholder="1.50"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={styles.column}>
                  <TextInput
                    label="Stock inicial"
                    placeholder="20"
                    keyboardType="number-pad"
                    value={stock}
                    onChangeText={setStock}
                  />
                </View>
              </View>

              {/* Modal Action Buttons: Cancel and Save */}
              <View style={styles.actions}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={onClose}
                  disabled={isSaving || isDeleting}
                  style={styles.actionButton}
                />
                <Button
                  title={isEditing ? "Guardar Cambios" : "Guardar Localmente"}
                  variant="primary"
                  loading={isSaving}
                  disabled={isDeleting}
                  onPress={handleSave}
                  style={styles.actionButton}
                />
              </View>

              {/* Optional Delete Button when editing an existing product */}
              {isEditing && Boolean(onDelete) && (
                <Button
                  title="Eliminar producto"
                  variant="danger"
                  loading={isDeleting}
                  disabled={isSaving}
                  onPress={handleDelete}
                  style={styles.deleteButton}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Embedded Barcode Scanner for Form */}
      <BarcodeScannerModal
        visible={scannerOpen}
        title="Escanear Código del Artículo"
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setScannerOpen(false)}
      />
    </>
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
    padding: theme.spacing.lg,
    maxHeight: "92%",
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  imagePicker: {
    height: 150,
    backgroundColor: theme.colors.background.surfaceContainer,
    borderRadius: theme.borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[300],
    borderStyle: "dashed",
    overflow: "hidden",
  },
  imagePickerPlaceholder: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  imagePickerText: {
    color: theme.colors.neutral[600],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  barcodeFieldContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  barcodeInputWrapper: {
    flex: 1,
  },
  scanBarcodeButton: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginHorizontal: -theme.spacing.xs,
  },
  column: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
  },
  actions: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: theme.borderRadius.xl,
  },
  deleteButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
  },
});
