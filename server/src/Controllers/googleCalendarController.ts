import { Request, Response } from 'express';
import { google } from 'googleapis';
import prisma from '../Config/db';

const getOAuth2Client = () => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '://googleusercontent.com').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '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').trim();
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google-calendar/callback').trim();

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export class GoogleCalendarController {
  // 1. הפקת קישור התחברות רשמי של גוגל עבור בעל העסק
  static async getAuthUrl(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const business = await prisma.business.findFirst({ where: { ownerId: userId } });

      if (!business) {
        res.status(404).json({ error: 'לא נמצא עסק משויך לחשבון זה.' });
        return;
      }

      const oauth2Client = getOAuth2Client();
      const calendarScope = ['https:', '', 'www', 'googleapis.com', 'auth', 'calendar.events'].join('/').replace('www/', 'www.');
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [calendarScope],
        state: String(business.id),
      });

      res.status(200).json({ url, isConnected: Boolean(business.googleRefreshToken) });
    } catch (error) {
      res.status(500).json({ error: 'שגיאה ביצירת קישור ההתחברות ליומן Google.' });
    }
  }

  // 2. קבלת אישור החיבור מגוגל ושמירת מפתח הסנכרון בשרת
  static async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;
      const businessId = Number(state);

      if (!code || !businessId) {
        res.redirect('http://localhost:3000/dashboard?googleSync=error');
        return;
      }

      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(String(code));

      if (tokens.refresh_token) {
        await prisma.business.update({
          where: { id: businessId },
          data: { googleRefreshToken: tokens.refresh_token },
        });
      }

      res.redirect('http://localhost:3000/dashboard?googleSync=success');
    } catch (error) {
      res.redirect('http://localhost:3000/dashboard?googleSync=error');
    }
  }

  // 3. פונקציית עזר להוספת תור אוטומטית ליומן גוגל של העסק
  static async syncAppointmentToGoogle(businessId: number, appointment: any): Promise<void> {
    try {
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business || !business.googleRefreshToken) return;

      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: business.googleRefreshToken });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const dateIso = new Date(appointment.date).toISOString().split('T')[0];

      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `תור: ${appointment.client?.name || 'לקוח/ה'} - ${appointment.service?.name || 'טיפול'}`,
          description: `טלפון לקוח: ${appointment.client?.phone || 'לא הוזן'}\nשירות: ${appointment.service?.name || ''}`,
          location: business.address || '',
          start: {
            dateTime: `${dateIso}T${appointment.startTime || '09:00'}:00`,
            timeZone: 'Asia/Jerusalem',
          },
          end: {
            dateTime: `${dateIso}T${appointment.endTime || '10:00'}:00`,
            timeZone: 'Asia/Jerusalem',
          },
        },
      });
    } catch (error) {
      console.error('שגיאה בסנכרון תור ליומן גוגל:', error);
    }
  }
}
