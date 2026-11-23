import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../Config/db';

export class NotificationService {
  /**
   * שליחת הודעת SMS אמיתית לסמארטפון של הלקוח ומחזירה true רק אם הספק אישר שליחה
   */
  public static async sendExternalMessage(phone: string, text: string): Promise<boolean> {
    if (!phone) return false;

    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 9) return false;

    const intlPhone = digitsOnly.startsWith('0') ? `972${digitsOnly.slice(1)}` : digitsOnly;
    const localPhone = digitsOnly.startsWith('972') ? `0${digitsOnly.slice(3)}` : digitsOnly;
    const e164Phone = `+${intlPhone}`;
    const senderName = process.env.SMS_SENDER_NAME || 'SmartQueue';

    // 1. שליחת SMS אמיתית דרך Twilio (בינלאומי + ישראל)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const formData = new URLSearchParams();
        formData.append('To', e164Phone);
        formData.append('From', twilioFrom);
        formData.append('Body', text);

        const resp = await fetch(
          `https://twilio.com{twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          }
        );

        const data: any = await resp.json().catch(() => ({}));
        if (resp.ok) {
          console.log(`✅ [Twilio SMS נשלח בהצלחה אל ${e164Phone} | SID: ${data?.sid || 'OK'}]`);
          return true;
        }
        console.error('❌ שגיאת Twilio SMS:', data?.message || resp.statusText);
        return false;
      } catch (err) {
        console.error('❌ שגיאת תקשורת מול Twilio:', err);
        return false;
      }
    }
    // 2. שליחת SMS אמיתית דרך ספק SMS ישראלי / Webhook מסחרי
    const webhookUrl = process.env.SMS_WEBHOOK_URL;
    const apiKey = process.env.SMS_API_KEY;
    const apiUser = process.env.SMS_API_USER || '';

    if (webhookUrl && apiKey) {
      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            key: apiKey,
            user: apiUser,
            sender: senderName,
            recipient: localPhone,
            to: e164Phone,
            phone: localPhone,
            msg: text,
            message: text,
          }),
        });

        if (resp.ok) {
          console.log(`✅ [SMS מסחרי נשלח בהצלחה אל ${localPhone} דרך ${senderName}]`);
          return true;
        }
        const errBody = await resp.text();
        console.error('❌ שגיאת ספק SMS ישראלי:', errBody);
        return false;
      } catch (err) {
        console.error('❌ שגיאת תקשורת מול ספק SMS:', err);
        return false;
      }
    }

    console.warn(`⚠️ [SMS לא נשלח בפועל אל ${localPhone}]: טרם הוגדרו מפתחות ספק SMS ב-Environment.`);
    return false;
  }

  private static async sendEmailMessage(toEmail: string, subject: string, text: string): Promise<void> {
    if (!toEmail) return;

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log(`📧 [הדמיית אימייל אל ${toEmail}] | נושא: ${subject}\n   תוכן: ${text}`);
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"SmartQueue" <${smtpUser}>`,
        to: toEmail,
        subject,
        text,
      });
      console.log(`✅ [אימייל נשלח בהצלחה אל ${toEmail}]`);
    } catch (err) {
      console.error('❌ שגיאה בשליחת אימייל:', err);
    }
  }
  public static async notifyUser(params: {
    userId: number;
    businessId?: number | null;
    phone?: string | null;
    email?: string | null;
    title: string;
    message: string;
    type?: 'BOOKING' | 'CANCEL' | 'REMINDER' | 'WAITLIST' | 'INFO';
    skipExternal?: boolean;
  }): Promise<void> {
    try {
      const { userId, businessId, phone, email, title, message, type = 'INFO', skipExternal = false } = params;

      console.log(`\n🔔 [התראה חדשה למשתמש #${userId} | טלפון: ${phone || 'ללא'}]\n   כותרת: ${title}\n   תוכן: ${message}\n`);

      await prisma.notification.create({
        data: { userId, title, message, type },
      });

      let targetEmail = email;
      if (!targetEmail) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        targetEmail = u?.email || null;
      }
      if (targetEmail && !skipExternal) {
        await this.sendEmailMessage(targetEmail, title, message);
      }

      if (!phone || skipExternal) return;

      if (businessId) {
        const biz = await prisma.business.findUnique({ where: { id: businessId } });
        if (!biz) return;

        if (biz.subscriptionStatus === 'SUSPENDED') {
          console.log(`⛔ [SMS נחסם]: המנוי של עסק #${businessId} מושעה.`);
          return;
        }

        if (biz.smsUsedThisMonth >= biz.smsQuota) {
          console.log(`⚠️ [מכסת SMS מוצתה]: עסק #${businessId} ניצל ${biz.smsUsedThisMonth}/${biz.smsQuota} הודעות החודש.`);
          return;
        }

        const sent = await this.sendExternalMessage(phone, `${title}\n${message}`);
        if (sent) {
          await prisma.business.update({
            where: { id: businessId },
            data: { smsUsedThisMonth: { increment: 1 } },
          });
        }
      } else {
        await this.sendExternalMessage(phone, `${title}\n${message}`);
      }
    } catch (err) {
      console.error('NotificationService.notifyUser error:', err);
    }
  }
  public static startReminderScheduler(): void {
    const clientBaseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

    const runCheck = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const twoDaysAhead = new Date(todayStart);
        twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);

        const upcomingApps = await prisma.appointment.findMany({
          where: {
            status: 'CONFIRMED',
            date: { gte: todayStart, lte: twoDaysAhead },
            OR: [{ reminder24hSent: false }, { reminder2hSent: false }],
          },
          include: { client: true, business: true, service: true },
        });

        for (const app of upcomingApps) {
          const appDate = new Date(app.date);
          const [h, m] = app.startTime.split(':').map(Number);
          appDate.setHours(h, m, 0, 0);

          const diffHours = (appDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (diffHours <= 0) continue;

          const staffText = app.staffName ? ` אצל ${app.staffName}` : '';
          const dateLabel = appDate.toLocaleDateString('he-IL');

          if (!app.reminder24hSent && diffHours <= 25 && diffHours > 4) {
            const token = app.confirmToken || crypto.randomBytes(24).toString('hex');
            const confirmLink = `${clientBaseUrl}/confirm-appointment/${token}`;

            await this.notifyUser({
              userId: app.clientId,
              businessId: app.businessId,
              phone: app.client?.phone,
              email: app.client?.email,
              title: '📅 תזכורת לתור מחר',
              message: `שלום ${app.client?.name}, תזכורת לתור שלך ב-${app.business.name}${staffText} בתאריך ${dateLabel} בשעה ${app.startTime}.\nלאישור הגעה מהיר בלחיצה: ${confirmLink}`,
              type: 'REMINDER',
            });

            await prisma.appointment.update({
              where: { id: app.id },
              data: {
                reminder24hSent: true,
                confirmToken: token,
              },
            });
          }

          if (!app.reminder2hSent && diffHours <= 2.5 && diffHours > 0.2) {
            await this.notifyUser({
              userId: app.clientId,
              businessId: app.businessId,
              phone: app.client?.phone,
              email: app.client?.email,
              title: '⏰ התור שלך בעוד כשעתיים',
              message: `שלום ${app.client?.name}, מחכים לך היום ב-${app.business.name}${staffText} בשעה ${app.startTime} (${app.service.name}).`,
              type: 'REMINDER',
            });

            await prisma.appointment.update({
              where: { id: app.id },
              data: { reminder2hSent: true },
            });
          }
        }
      } catch (err) {
        console.error('ReminderScheduler error:', err);
      }
    };

    setTimeout(runCheck, 10 * 1000);
    setInterval(runCheck, 10 * 60 * 1000);
  }
}
