/**
 * @file CreateStoreScreen.tsx
 * @description Onboarding screen for new merchants to register their store details.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { TextInput } from "../components/ui/TextInput";
import { Button } from "../components/ui/Button";
import { theme } from "../theme";

export interface CreateStoreScreenProps {
  userId: string;
  onStoreCreated: () => Promise<void>;
}

export const CreateStoreScreen: React.FC<CreateStoreScreenProps> = ({
  userId,
  onStoreCreated,
}) => {
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateStore = async () => {
    if (!storeName.trim() || !storeSlug.trim()) {
      Alert.alert(
        "Campos incompletos",
        "Por favor, introduce el nombre y el identificador (slug) de tu tienda.",
      );
      return;
    }

    const formattedSlug = storeSlug.trim().toLowerCase().replace(/\s+/g, "-");

    try {
      setLoading(true);
      const { error } = await supabase.from("stores").insert([
        {
          id: `store_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          owner_auth_id: userId,
          name: storeName.trim(),
          slug: formattedSlug,
        },
      ]);

      if (error) throw error;
      await onStoreCreated();
      Alert.alert(
        "¡Tienda creada!",
        "Tu entorno comercial está listo para operar.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo registrar la tienda.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Configura tu Tienda</Text>
        <Text style={styles.subtitle}>
          Introduce los datos de tu comercio físico para empezar a vender. La
          sincronización automática con Supabase depende de la opción elegida al
          registrarte.
        </Text>

        <TextInput
          label="Nombre del establecimiento"
          placeholder="Ej. Panadería El Trigo de Oro"
          value={storeName}
          onChangeText={setStoreName}
        />

        <TextInput
          label="Identificador web (Slug)"
          placeholder="ej. trigo-de-oro"
          autoCapitalize="none"
          value={storeSlug}
          onChangeText={setStoreSlug}
        />

        <Button
          title="Crear mi Tienda"
          variant="primary"
          loading={loading}
          onPress={handleCreateStore}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xl,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral[900],
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  button: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
  },
});
