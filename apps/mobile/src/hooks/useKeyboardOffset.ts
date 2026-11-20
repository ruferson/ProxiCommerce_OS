/**
 * @file useKeyboardOffset.ts
 * @description Hook that listens to native keyboard display events and provides
 * the exact keyboard height in pixels. Enables views and modals to dynamically shrink
 * or lift above the virtual keyboard across Android and iOS without closing on scroll.
 */

import { useState, useEffect } from "react";
import { Keyboard, Platform, KeyboardEvent } from "react-native";

export function useKeyboardOffset(): number {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    // Android resizes the window by default. Adding the native keyboard height
    // again would push bottom sheets and full-screen modals far above the viewport.
    if (Platform.OS === "android") {
      setKeyboardHeight(0);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleKeyboardShow = (event: KeyboardEvent) => {
      const height = event.endCoordinates?.height ?? 0;
      setKeyboardHeight(height);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(
      showEvent,
      handleKeyboardShow,
    );
    const hideSubscription = Keyboard.addListener(
      hideEvent,
      handleKeyboardHide,
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardHeight;
}
