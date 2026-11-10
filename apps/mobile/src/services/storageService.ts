/**
 * @file storageService.ts
 * @description Handles uploading local image files to Supabase Storage using Base64 encoding.
 * Utilizes expo-file-system/legacy to maintain compatibility across Expo SDK versions.
 */

import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

/**
 * Uploads a local image file to Supabase Storage and returns its public HTTPS URL.
 *
 * @param {string} localUri - Local `file://` device path of the target image.
 * @param {string} productId - Unique product ID used to name the remote file.
 * @returns {Promise<string>} Public HTTPS URL of the uploaded image asset.
 */
export async function uploadProductImage(
  localUri: string,
  productId: string,
): Promise<string> {
  try {
    // Read local file as Base64 string to bypass fetch Blob limitations in React Native
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const extension = localUri.split(".").pop() || "jpg";
    const fileName = `${productId}.${extension}`;

    // Upload ArrayBuffer data to Supabase Storage bucket
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, decode(base64), {
        contentType: `image/${extension}`,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Retrieve and return the publicly accessible URL
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("[StorageService] Failed to upload image:", error);
    throw error;
  }
}
