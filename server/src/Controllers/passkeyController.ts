import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import prisma from '../Config/db';

const challengeStore = new Map<string, string>();

function getRpDetails(req: Request) {
  const origin = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:3000';
  let rpID = 'localhost';
  try {
    rpID = new URL(origin).hostname;
  } catch {
    rpID = 'localhost';
  }
  return { rpName: 'מערכת ניהול תורים חכמה', rpID, origin };
}

export class PasskeyController {
  /**
   * שלב א' בהגדרת זיהוי ביומטרי למשתמש מחובר (לקוח או בעל עסק)
   * POST /api/passkey/register-options
   */
  public static async registerOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Number((req as any).user?.userId || (req as any).user?.id);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { passkeys: true },
      });

      if (!user) {
        res.status(404).json({ error: 'משתמש לא נמצא.' });
        return;
      }

      const { rpName, rpID } = getRpDetails(req);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(String(user.id)),
        userName: user.email || user.phone || `user_${user.id}`,
        userDisplayName: user.name || 'משתמש במערכת',
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'preferred',
        },
        excludeCredentials: user.passkeys.map((pk) => ({
          id: pk.id,
          transports: pk.transports ? (JSON.parse(pk.transports) as any) : undefined,
        })),
      });

      challengeStore.set(`reg_${user.id}`, options.challenge);
      res.status(200).json(options);
    } catch (error) {
      next(error);
    }
  }

  /**
   * שלב ב' באימות ושמירת המפתח הביומטרי של המכשיר
   * POST /api/passkey/register-verify
   */
  public static async registerVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Number((req as any).user?.userId || (req as any).user?.id);
      const { credential } = req.body;
      const expectedChallenge = challengeStore.get(`reg_${userId}`);

      if (!expectedChallenge) {
        res.status(400).json({ error: 'פג תוקף הבקשה, אנא נסה שוב.' });
        return;
      }

      const { rpID, origin } = getRpDetails(req);

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        res.status(400).json({ error: 'אימות הזיהוי הביומטרי נכשל.' });
        return;
      }

      const { credential: regCred } = verification.registrationInfo;

      await prisma.passkey.upsert({
        where: { id: regCred.id },
        update: {
          publicKey: Buffer.from(regCred.publicKey),
          counter: regCred.counter,
          transports: regCred.transports ? JSON.stringify(regCred.transports) : null,
        },
        create: {
          id: regCred.id,
          userId,
          publicKey: Buffer.from(regCred.publicKey),
          counter: regCred.counter,
          transports: regCred.transports ? JSON.stringify(regCred.transports) : null,
        },
      });

      challengeStore.delete(`reg_${userId}`);
      res.status(200).json({ message: 'הזיהוי הביומטרי הוגדר בהצלחה במכשיר זה!' });
    } catch (error) {
      next(error);
    }
  }
  /**
   * שלב א' בהתחברות ביומטרית מהירה (ללא צורך בהקלדת מייל או טלפון)
   * POST /api/passkey/login-options
   */
  public static async loginOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rpID } = getRpDetails(req);
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
      });

      challengeStore.set(`auth_${options.challenge}`, options.challenge);
      setTimeout(() => challengeStore.delete(`auth_${options.challenge}`), 5 * 60 * 1000);

      res.status(200).json(options);
    } catch (error) {
      next(error);
    }
  }

  /**
   * שלב ב' באימות הביומטרי והנפקת אסימון התחברות (JWT)
   * POST /api/passkey/login-verify
   */
  public static async loginVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credential } = req.body;
      if (!credential?.id || !credential?.response?.clientDataJSON) {
        res.status(400).json({ error: 'נתוני אימות חסרים.' });
        return;
      }

      const clientDataRaw = Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf8');
      const clientData = JSON.parse(clientDataRaw);
      const expectedChallenge = challengeStore.get(`auth_${clientData.challenge}`);

      if (!expectedChallenge) {
        res.status(400).json({ error: 'פג תוקף בקשת ההתחברות, אנא נסה שוב.' });
        return;
      }

      const passkeyRecord = await prisma.passkey.findUnique({
        where: { id: credential.id },
        include: { user: true },
      });

      if (!passkeyRecord || !passkeyRecord.user) {
        res.status(404).json({ error: 'מכשיר זה אינו משויך לחשבון קיים. אנא התחבר פעם אחת והפעל זיהוי ביומטרי.' });
        return;
      }

      const { rpID, origin } = getRpDetails(req);

      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkeyRecord.id,
          publicKey: new Uint8Array(passkeyRecord.publicKey),
          counter: passkeyRecord.counter,
          transports: passkeyRecord.transports ? (JSON.parse(passkeyRecord.transports) as any) : undefined,
        },
      });

      if (!verification.verified) {
        res.status(401).json({ error: 'הזיהוי הביומטרי נכשל.' });
        return;
      }

      await prisma.passkey.update({
        where: { id: passkeyRecord.id },
        data: { counter: verification.authenticationInfo.newCounter },
      });

      challengeStore.delete(`auth_${clientData.challenge}`);

      const user = passkeyRecord.user;
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_123';
      const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '7d' });

      res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
