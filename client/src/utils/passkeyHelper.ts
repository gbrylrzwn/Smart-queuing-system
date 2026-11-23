import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import axiosClient from '../api/axiosClient';

export async function registerBiometricPasskey(): Promise<string> {
  const optionsRes = await axiosClient.post('/passkey/register-options');
  const credential = await startRegistration({ optionsJSON: optionsRes.data });
  const verifyRes = await axiosClient.post('/passkey/register-verify', { credential });
  return verifyRes.data?.message || 'הזיהוי הביומטרי הופעל בהצלחה במכשיר זה!';
}

export async function loginWithBiometricPasskey(): Promise<{ token: string; user: any }> {
  const optionsRes = await axiosClient.post('/passkey/login-options');
  const credential = await startAuthentication({ optionsJSON: optionsRes.data });
  const verifyRes = await axiosClient.post('/passkey/login-verify', { credential });
  return verifyRes.data;
}
