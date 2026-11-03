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
import { Product } from "@proxi-commerce/types";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import { theme } from "../../theme";

export interface ProductFormModalProps {
  /** Modal visibility control state */
  visible: boolean;
  /** Modal close trigger handler */
  onClose: () => void;
  /** Async callback to save created or updated product entity */
  onSave: (
    product: Omit<Product, "created_at" | "updated_at">,
  ) => Promise<void>;
  /** Store entity identifier */
  storeId: string;
  /** Initial product model for editing mode */
  initialProduct?: Product | null;
}

/**
 * Expressive Bottom Sheet Modal dialog for product creation and edition.
 */
export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  onClose,
  onSave,
  storeId,
  initialProduct,
}) => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(initialProduct);

  useEffect(() => {
    if (initialProduct) {
      setTitle(initialProduct.title);
      setPrice(initialProduct.price.toString());
      setStock(initialProduct.stock_count.toString());
      setImageUri(initialProduct.image_uri);
    } else {
      setTitle("");
      setPrice("");
      setStock("");
      setImageUri(null);
    }
  }, [initialProduct, visible]);

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
      };

      await onSave(productData);
      onClose();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el producto localmente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Editar Producto" : "Nuevo Producto"}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.imagePicker}
              onPress={takePhoto}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imagePickerText}>
                  📷 Tomar foto del producto
                </Text>
              )}
            </TouchableOpacity>

            <TextInput
              label="Nombre del producto"
              placeholder="Ej. Barra de pan rústica"
              value={title}
              onChangeText={setTitle}
            />

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

            <View style={styles.actions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={onClose}
                style={styles.actionButton}
              />
              <Button
                title={isEditing ? "Guardar Cambios" : "Guardar Localmente"}
                variant="primary"
                loading={isSaving}
                onPress={handleSave}
                style={styles.actionButton}
              />
            </View>
          </ScrollView>
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
    padding: theme.spacing.lg,
    maxHeight: "90%",
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.lg,
    textAlign: "center",
  },
  imagePicker: {
    height: 160,
    backgroundColor: theme.colors.background.surfaceContainer,
    borderRadius: theme.borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderStyle: "dashed",
    overflow: "hidden",
  },
  imagePickerText: {
    color: theme.colors.neutral[500],
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
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
});
