import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import axiosClient from '../api/axiosClient';

export type BiometricCapability =
  | { supported: false; label: '' }

  | { supported: true; mode: 'FACE_OR_TOUCH_APPLE' | 'FINGERPRINT_ANDROID' | 'PLATFORM_BIOMETRIC'; label: string };

/**
 * בדיקת חומרה ביומטרית אמיתית + הפרדה מדויקת לפי סוג המכשיר
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    if (typeof window === 'undefined' || !browserSupportsWebAuthn()) {
      return { supported: false, label: '' };
    }
    if (
      typeof PublicKeyCredential === 'undefined' ||
      !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      return { supported: false, label: '' };
    }

    const hasHardware = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!hasHardware) {
      return { supported: false, label: '' };
    }

    const ua = navigator.userAgent || '';
    const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isApple) {
      return {
        supported: true,
        mode: 'FACE_OR_TOUCH_APPLE',
        label: 'זיהוי פנים או טביעת אצבע',
      };
    }
    if (isAndroid) {
      return {
        supported: true,
        mode: 'FINGERPRINT_ANDROID',
        label: 'טביעת אצבע',
      };
    }
    return {
      supported: true,
      mode: 'PLATFORM_BIOMETRIC',
      label: 'זיהוי ביומטרי של המכשיר',
    };
  } catch {
    return { supported: false, label: '' };
  }
}

export async function registerBiometricPasskey(): Promise<string> {
  const cap = await getBiometricCapability();
  if (!cap.supported) {
    throw new Error('מכשיר זה אינו תומך בהגדרת טביעת אצבע או זיהוי פנים.');
  }
  try {
    const optionsRes = await axiosClient.post('/passkey/register-options');
    const credential = await startRegistration({ optionsJSON: optionsRes.data });
    const verifyRes = await axiosClient.post('/passkey/register-verify', { credential });
    return verifyRes.data?.message || `${cap.label} הופעל בהצלחה במכשיר זה!`;
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('האימות הביומטרי בוטל.');
    }
    throw new Error(err?.response?.data?.error || err?.message || 'שגיאה בהגדרת הזיהוי הביומטרי.');
  }
}

export async function loginWithBiometricPasskey(): Promise<{ token: string; user: any }> {
  const cap = await getBiometricCapability();
  if (!cap.supported) {
    throw new Error('מכשיר זה אינו תומך בהתחברות ביומטרית.');
  }
  try {
    const optionsRes = await axiosClient.post('/passkey/login-options');
    const credential = await startAuthentication({ optionsJSON: optionsRes.data });
    const verifyRes = await axiosClient.post('/passkey/login-verify', { credential });
    return verifyRes.data;
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('הזיהוי הביומטרי בוטל על ידי המשתמש.');
    }
    throw new Error(err?.response?.data?.error || err?.message || 'לא נמצא זיהוי ביומטרי רשום במכשיר זה.');
  }
}
