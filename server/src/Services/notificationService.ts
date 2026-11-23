import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../Config/db';

export class NotificationService {
  /**
   * שליחת הודעת WhatsApp / SMS אמיתית לסמארטפון
   */
  public static async sendExternalMessage(phone: string, text: string): Promise<void> {
    if (!phone) return;

    const digitsOnly = phone.replace(/[^0-9]/g, '');
    const intlPhone = digitsOnly.startsWith('0') ? `972${digitsOnly.slice(1)}` : digitsOnly;
    const e164Phone = `+${intlPhone}`;

    // 1. שליחת SMS אמיתית דרך Twilio (אם מוגדר ב-Render / .env)
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

        const resp = await fetch(`https://twilio.com{twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (resp.ok) {
          console.log(`✅ [SMS אמיתי נשלח דרך Twilio אל ${e164Phone}]`);
          return;
        } else {
          const errText = await resp.text();
          console.error('❌ שגיאת Twilio SMS:', errText);
        }
      } catch (err) {
        console.error('❌ שגיאת רשת בשליחת Twilio SMS:', err);
      }
    }

    // 2. שליחת SMS דרך ספק Webhook / ישראלי (אם מוגדר)
    const webhookUrl = process.env.SMS_WEBHOOK_URL;
    const apiKey = process.env.SMS_API_KEY;

    if (webhookUrl && apiKey) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            to: intlPhone,
            phone: digitsOnly,
            message: text,
          }),
        });
        console.log(`✅ [SMS חיצוני נשלח אל ${intlPhone}]`);
        return;
      } catch (err) {
        console.error('❌ שגיאה בשליחת SMS חיצוני:', err);
      }
    }

    // 3. שליחת WhatsApp אמיתית לסמארטפון לבדיקה מיידית (CallMeBot)
    const callMeBotPhone = process.env.CALLMEBOT_PHONE;
    const callMeBotKey = process.env.CALLMEBOT_APIKEY;

    if (callMeBotPhone && callMeBotKey) {
      try {
        const targetWa = digitsOnly.startsWith('972') ? intlPhone : callMeBotPhone;
        const url = `https://callmebot.com{encodeURIComponent(targetWa)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(callMeBotKey)}`;
        await fetch(url);
        console.log(`✅ [WhatsApp אמיתי נשלח לסמארטפון ${targetWa}]`);
      } catch (err) {
        console.error('❌ שגיאה בשליחת WhatsApp:', err);
      }
    }
  }



  /**
   * שליחת הודעת אימייל למשתמש שהזין כתובת מייל
   */
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
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: `"SmartQueue" <${smtpUser}>`,
        to: toEmail,
        subject,
        text
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
        data: { userId, title, message, type }
      });

      // שליחה אוטומטית לאימייל אם למשתמש יש כתובת מייל רשומה (חינם וללא פגיעה במכסת SMS)
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

        await this.sendExternalMessage(phone, `${title}\n${message}`);
        await prisma.business.update({
          where: { id: businessId },
          data: { smsUsedThisMonth: { increment: 1 } }
        });
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
            OR: [{ reminder24hSent: false }, { reminder2hSent: false }]
          },
          include: { client: true, business: true, service: true }
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
              type: 'REMINDER'
            });

            await prisma.appointment.update({
              where: { id: app.id },
              data: {
                reminder24hSent: true,
                confirmToken: token
              }
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
              type: 'REMINDER'
            });

            await prisma.appointment.update({
              where: { id: app.id },
              data: { reminder2hSent: true }
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

