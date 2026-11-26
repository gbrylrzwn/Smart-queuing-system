import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../Config/db';

export class NotificationService {
  /**
   * שליחת הודעת SMS אמיתית לסמארטפון של הלקוח ומחזירה true רק אם הספק אישר שליחה
   */
  private static verifyIsraeliProviderResponse(rawBody: string): boolean {
    const trimmed = rawBody.trim();
    if (!trimmed) return false;
    try {
      const json = JSON.parse(trimmed);
      if (json.status !== undefined && Number(json.status) !== 0 && Number(json.status) !== 200 && json.status !== 'ok' && json.status !== 'success') return false;
      if (json.error || json.err || json.success === false) return false;
      return true;
    } catch {
      const lower = trimmed.toLowerCase();
      if (lower.includes('<status>-') || lower.includes('error') || lower.includes('invalid')) return false;
      return true;
    }
  }
  //שליחת הודעה חיצונית
  public static async sendExternalMessage(phone: string, text: string): Promise<boolean> {
    if (!phone || !text.trim()) return false;

    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 9) return false;

    const localPhone = digitsOnly.startsWith('972') ? `0${digitsOnly.slice(3)}` : digitsOnly;
    const senderName = process.env.SMS4FREE_SENDER || process.env.SMS_SENDER_NAME || 'SmartQueue';

    const apiKey = process.env.SMS4FREE_API_KEY;
    const apiUser = process.env.SMS4FREE_USER;
    const apiPass = process.env.SMS4FREE_PASS;

    if (!apiKey || !apiUser || !apiPass) {
      console.warn(`⚠️ [SMS לא נשלח אל ${localPhone}]: חסרים משתני סביבה של SMS4FREE.`);
      return false;
    }

    try {
      const endpoint = ['https:/', 'api.sms4free.co.il', 'ApiSMS', 'v2', 'SendSMS'].join('/');
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiKey,
          user: apiUser,
          pass: apiPass,
          sender: senderName,
          recipient: localPhone,
          msg: text,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data: any = await resp.json().catch(() => null);
      if (resp.ok && Number(data?.status) > 0) {
        console.log(`✅ [SMS4FREE נשלח בהצלחה אל ${localPhone} | נמענים: ${data.status}]`);
        return true;
      }

      console.error(`❌ שגיאת SMS4FREE (קוד ${data?.status ?? resp.status}):`, data?.message || resp.statusText);
      return false;
    } catch (err) {
      console.error('❌ שגיאת תקשורת מול SMS4FREE:', err);
      return false;
    }
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
