import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  /**
   * מקבלת מחרוזת תמונה (Base64 או קישור קיים).
   * אם זו תמונה חדשה בפורמט Base64 — מעלה אותה לענן ומחזירה קישור מאובטח קבוע.
   */
  public static async uploadImageIfNeeded(
    imageInput?: string | null,
    folder: string = 'smart-queue'
  ): Promise<string | null> {
    if (!imageInput) return null;

    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      return imageInput;
    }

    if (imageInput.startsWith('data:image')) {
      const result = await cloudinary.uploader.upload(imageInput, {
        folder,
        resource_type: 'image',
      });
      return result.secure_url;
    }

    return imageInput;
  }
}
