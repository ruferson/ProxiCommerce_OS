/**
 * @file TextInput.tsx
 * @description Standard form text input component with label support and validation error messaging.
 */

import React from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
} from "react-native";
import { theme } from "../../theme";

/**
 * Props for the `TextInput` component.
 */
export interface TextInputProps extends RNTextInputProps {
  /** Optional form input label displayed above the field */
  label?: string;
  /** Optional validation error message displayed below the input field */
  error?: string;
}

/**
 * Standardized TextInput component supporting labels and error states.
 *
 * @param {TextInputProps} props - Component properties.
 * @returns {React.ReactElement} Rendered text input control.
 */
export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {/* Optional top-aligned field label */}
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Underlying React Native text input element */}
      <RNTextInput
        placeholderTextColor={theme.colors.neutral[400]}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />

      {/* Conditional validation error feedback */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.neutral[900],
  },
  inputError: {
    borderColor: theme.colors.status.error,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.status.error,
    marginTop: theme.spacing.xs,
  },
});

