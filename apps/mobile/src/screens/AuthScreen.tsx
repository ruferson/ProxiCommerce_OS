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
  Switch,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";
import { TextInput } from "../components/ui/TextInput";
import { Button } from "../components/ui/Button";
import { theme } from "../theme";

const GOOGLE_OAUTH_REDIRECT_URI = "proxicommerce://auth/callback";

WebBrowser.maybeCompleteAuthSession();

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
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
          options: {
            data: { cloud_sync_enabled: cloudSyncEnabled },
          },
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

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: GOOGLE_OAUTH_REDIRECT_URI,
          skipBrowserRedirect: true,
          scopes: "openid email profile",
        },
      });

      if (error) throw error;
      if (!data.url) {
        throw new Error("Supabase no devolvió la URL de autorización de Google.");
      }

      const authResult = await WebBrowser.openAuthSessionAsync(
        data.url,
        GOOGLE_OAUTH_REDIRECT_URI,
      );
      if (authResult.type === "cancel" || authResult.type === "dismiss") return;
      if (authResult.type !== "success") {
        throw new Error("No se completó el inicio de sesión con Google.");
      }

      const callbackUrl = new URL(authResult.url);
      const callbackError =
        callbackUrl.searchParams.get("error_description") ??
        callbackUrl.searchParams.get("error");
      if (callbackError) throw new Error(callbackError);

      const code = callbackUrl.searchParams.get("code");
      if (!code) {
        throw new Error(
          "La respuesta de autenticación no contiene un código OAuth. Comprueba los redirect URLs de Supabase.",
        );
      }

      const { data: sessionData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;

      if (
        isSignUp &&
        sessionData.user.user_metadata.cloud_sync_enabled === undefined
      ) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { cloud_sync_enabled: cloudSyncEnabled },
        });
        if (metadataError) throw metadataError;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión con Google.";
      console.error("[AuthScreen] Google OAuth failed:", error);
      Alert.alert("Error de autenticación con Google", errorMessage);
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

        {isSignUp && (
          <View style={styles.syncOption}>
            <View style={styles.syncOptionText}>
              <Text style={styles.syncOptionTitle}>
                Sincronización automática con Supabase
              </Text>
              <Text style={styles.syncOptionDescription}>
                Envía los cambios de productos, ventas y cierres cuando haya
                conexión. Es opcional; las copias manuales de Google Drive son
                independientes.
              </Text>
            </View>
            <Switch
              value={cloudSyncEnabled}
              onValueChange={setCloudSyncEnabled}
              disabled={loading}
              accessibilityLabel="Activar sincronización automática con Supabase"
              trackColor={{
                false: theme.colors.neutral[300],
                true: theme.colors.primary[400],
              }}
              thumbColor={
                cloudSyncEnabled
                  ? theme.colors.primary[700]
                  : theme.colors.neutral[100]
              }
            />
          </View>
        )}

        <Button
          title={isSignUp ? "Registrarse" : "Iniciar Sesión"}
          variant="primary"
          loading={loading}
          onPress={handleAuthAction}
          style={styles.button}
        />

        <Text style={styles.alternativeText}>o</Text>

        <Button
          title="Continuar con Google"
          variant="outline"
          disabled={loading}
          onPress={handleGoogleAuth}
          style={styles.googleButton}
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
  alternativeText: {
    marginTop: theme.spacing.md,
    textAlign: "center",
    color: theme.colors.neutral[500],
  },
  googleButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
  },
  syncOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.neutral[50],
  },
  syncOptionText: {
    flex: 1,
  },
  syncOptionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral[800],
  },
  syncOptionDescription: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: 17,
    color: theme.colors.neutral[600],
  },
});
