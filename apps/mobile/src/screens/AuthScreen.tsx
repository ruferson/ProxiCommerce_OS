/**
 * @file AuthScreen.tsx
 * @description Authentication screen allowing merchants to sign in or register
 * using Supabase Auth (email and password).
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { TextInput } from "../components/ui/TextInput";
import { Button } from "../components/ui/Button";
import { theme } from "../theme";

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Campos incompletos",
        "Por favor, introduce tu correo y contraseña.",
      );
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          Alert.alert("Registro exitoso", "Tu cuenta está lista para usar.");
        } else {
          Alert.alert(
            "Registro iniciado",
            "Revisa tu correo para confirmar la cuenta y después inicia sesión.",
          );
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      if (errorMessage.toLowerCase().includes("email rate limit exceeded")) {
        Alert.alert(
          "Límite de correo alcanzado",
          "Supabase ha limitado temporalmente los correos de registro. Para desarrollo, desactiva temporalmente la confirmación de email en Supabase Dashboard > Authentication > Sign In / Providers > Email. Esta opción se configura en el servidor, no desde la app; vuelve a activarla antes de producción.",
        );
        return;
      }

      Alert.alert("Error de autenticación", errorMessage);
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
        <Text style={styles.title}>ProxiCommerce OS</Text>
        <Text style={styles.subtitle}>
          {isSignUp
            ? "Crea tu cuenta de comerciante"
            : "Accede a tu panel de TPV"}
        </Text>

        <TextInput
          label="Correo electrónico"
          placeholder="comercio@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          label="Contraseña"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title={isSignUp ? "Registrarse" : "Iniciar Sesión"}
          variant="primary"
          loading={loading}
          onPress={handleAuthAction}
          style={styles.button}
        />

        <Button
          title={
            isSignUp
              ? "¿Ya tienes cuenta? Inicia sesión"
              : "¿No tienes cuenta? Regístrate"
          }
          variant="ghost"
          disabled={loading}
          onPress={() => setIsSignUp(!isSignUp)}
          style={styles.switchButton}
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
  switchButton: {
    marginTop: theme.spacing.sm,
  },
});
