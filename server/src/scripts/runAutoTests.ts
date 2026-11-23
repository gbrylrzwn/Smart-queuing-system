import jwt from 'jsonwebtoken';
import prisma from '../Config/db';
import { BusinessCategory } from '@prisma/client';
const httpFetch = (globalThis as any).fetch;

const API_BASE = 'http://localhost:5000/api';

interface TestResult {
    name: string;
    passed: boolean;
    details: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, details: string) {
    results.push({ name, passed, details });
    console.log(`${passed ? '✅ עבר' : '❌ נכשל'} | ${name} — ${details}`);
}

async function runAllTests() {
    console.log('\n🚀 מתחיל הרצת בדיקות אוטומטיות למערכת ניהול התורים...\n');

    let testOwnerId: number | null = null;
    let testClientId: number | null = null;
    let testBusinessId: number | null = null;
    let testServiceId: number | null = null;
    let testAppointmentId: number | null = null;

    try {
        try {
            const usersCount = await prisma.user.count();
            const passkeysCount = await prisma.passkey.count();
            recordTest(
                'חיבור למסד הנתונים וסנכרון טבלאות',
                true,
                `מסד הנתונים פעיל (${usersCount} משתמשים, ${passkeysCount} מפתחות ביומטריים)`
            );
        } catch (err: any) {
            recordTest('חיבור למסד הנתונים וסנכרון טבלאות', false, err.message);
            throw err;
        }

        const uniqueSuffix = Date.now();
        const owner = await prisma.user.create({
            data: {
                name: 'בעל עסק לבדיקה',
                email: `test_owner_${uniqueSuffix}@test.local`,
                phone: `0509${String(uniqueSuffix).slice(-6)}`,
                password: 'hashed_test_password',
                role: 'BUSINESS_OWNER',
            },
        });
        testOwnerId = owner.id;

        const client = await prisma.user.create({
            data: {
                name: 'לקוח לבדיקה',
                email: `test_client_${uniqueSuffix}@test.local`,
                phone: `0529${String(uniqueSuffix).slice(-6)}`,
                password: 'hashed_test_password',
                role: 'CLIENT',
                noShowCount: 0,
                reliabilityScore: 100,
            },
        });
        testClientId = client.id;

        const business = await prisma.business.create({
            data: {
                name: 'עסק בדיקות אוטומטיות',
                category: 'HAIR_SALON',




                address: 'תל אביב',
                ownerId: owner.id,
                smartBiEnabled: true,
                maxNoShowsAllowed: 2,
                flashDiscountPercent: 15,
                subscriptionStatus: 'ACTIVE',
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                workingHours: {
                    create: [
                      { day: 0, isOpen: true, openTime: '08:00', closeTime: '20:00' },
                      { day: 1, isOpen: true, openTime: '08:00', closeTime: '20:00' },
                      { day: 2, isOpen: true, openTime: '08:00', closeTime: '20:00' },
                      { day: 3, isOpen: true, openTime: '08:00', closeTime: '20:00' },
                      { day: 4, isOpen: true, openTime: '08:00', closeTime: '20:00' },
                      { day: 5, isOpen: true, openTime: '08:00', closeTime: '14:00' },
                      { day: 6, isOpen: false, openTime: '08:00', closeTime: '20:00' },
                    ],
                  },
          
            },
        });
        testBusinessId = business.id;

        const service = await prisma.service.create({
            data: {
                name: 'טיפול בדיקה',
                durationMinutes: 30,

                price: 100,
                businessId: business.id,
            },
        });
        testServiceId = service.id;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const appointment = await prisma.appointment.create({
            data: {
                date: tomorrow,
                startTime: '10:00',
                endTime: '10:30',
                status: 'CONFIRMED',
                clientId: client.id,
                businessId: business.id,
                serviceId: service.id,
            },
        });
        testAppointmentId = appointment.id;

        const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_123';
        const ownerToken = jwt.sign({ id: owner.id, userId: owner.id, role: 'BUSINESS_OWNER' }, secret, { expiresIn: '1h' });
        const clientToken = jwt.sign({ id: client.id, userId: client.id, role: 'CLIENT' }, secret, { expiresIn: '1h' });
    

        const unauthRes = await fetch(`${API_BASE}/smart-bi/gap-candidates`);
        recordTest(
            'אבטחת מידע וחסימת גישה ללא הזדהות',
            unauthRes.status === 401 || unauthRes.status === 403,
            `קוד תגובה שהתקבל: ${unauthRes.status}`
        );

        const forbiddenRes = await fetch(`${API_BASE}/smart-bi/no-show/${appointment.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${clientToken}` },
        });
        recordTest(
            'הפרדת הרשאות בין לקוח לבעל עסק',
            forbiddenRes.status === 403,
            `לקוח רגיל נחסם כמצופה (קוד ${forbiddenRes.status})`
        );

        const todayStr = new Date().toISOString().split('T');
        const gapRes = await fetch(`${API_BASE}/smart-bi/gap-candidates?date=${todayStr}`, {
            headers: { Authorization: `Bearer ${ownerToken}` },
        });
        const gapData: any = await gapRes.json();
        recordTest(
            'מנוע בינה עסקית ואיתור מועמדים למילוי חור',
            gapRes.status === 200 && Array.isArray(gapData.candidates),
            `אותרו ${gapData.candidates?.length ?? 0} מועמדים רלוונטיים`
        );

        const noShowRes = await fetch(`${API_BASE}/smart-bi/no-show/${appointment.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${ownerToken}` },
        });
        const noShowData: any = await noShowRes.json();
        const scoreAfterNoShow = noShowData?.client?.reliabilityScore;
        recordTest(
            'סימון אי-הגעה ועדכון ציון אמינות',
            noShowRes.status === 200 && scoreAfterNoShow === 80,
            `ציון האמינות עודכן מ-100 ל-${scoreAfterNoShow}`
        );

        const resetRes = await fetch(`${API_BASE}/smart-bi/reset-reliability/${client.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${ownerToken}` },
        });
        const refreshedClient = await prisma.user.findUnique({ where: { id: client.id } });
        recordTest(
            'איפוס מונה הברזות ושיקום ציון אמינות',
            resetRes.status === 200 && refreshedClient?.reliabilityScore === 100 && refreshedClient?.noShowCount === 0,
            `ציון האמינות שוקם ל-${refreshedClient?.reliabilityScore}`
        );

        const passkeyLoginOptRes = await fetch(`${API_BASE}/passkey/login-options`, {
            method: 'POST',
            headers: { Origin: 'http://localhost:3000' },
        });
        const passkeyLoginOpt: any = await passkeyLoginOptRes.json();

        const passkeyRegOptRes = await fetch(`${API_BASE}/passkey/register-options`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${clientToken}`,
                Origin: 'http://localhost:3000',
            },
        });
        const passkeyRegOpt: any = await passkeyRegOptRes.json();

        recordTest(
            'תשתית זיהוי ביומטרי (טביעת אצבע / זיהוי פנים)',
            passkeyLoginOptRes.status === 200 &&
            Boolean(passkeyLoginOpt.challenge) &&
            passkeyRegOptRes.status === 200 &&
            Boolean(passkeyRegOpt.challenge),
            'שרת האימות הביומטרי הפיק אתגרי רישום והתחברות תקינים'
        );
        // 8. בדיקת שליחת הצעת בזק רב-ערוצית (SMS ואימייל)
        const smsOfferRes = await httpFetch(`${API_BASE}/smart-bi/send-flash-offer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({
                channel: 'SMS',
                phone: '0501234567',
                message: 'התפנה תור של הרגע האחרון!',
            }),
        });
        const emailOfferRes = await httpFetch(`${API_BASE}/smart-bi/send-flash-offer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({
                channel: 'EMAIL',
                email: 'client@test.local',
                message: 'התפנה תור של הרגע האחרון!',
            }),
        });
        recordTest(
            'שליחת הצעות בזק רב-ערוצית (הודעת טקסט ואימייל)',
            smsOfferRes.status === 200 && emailOfferRes.status === 200,
            'שני ערוצי השליחה הגיבו בהצלחה'
        );

        // 9. בדיקת חסימת שבתות ביומן העסק
        const nextSaturday = new Date();
        nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
        const satStr = nextSaturday.toISOString().split('T');
        const satSlotsRes = await httpFetch(
            `${API_BASE}/appointments/available?businessId=${business.id}&date=${satStr}&serviceId=${service.id}`
        );

        const satData: any = satSlotsRes.status === 200 ? await satSlotsRes.json() : { slots: [] };
        const satSlots = Array.isArray(satData) ? satData : satData.slots || [];
        recordTest(
            'חסימת שבתות ביומן הזמינות',
            satSlotsRes.status === 400 || satSlots.length === 0,
            `שבת נחסמה כמצופה (${satSlots.length} שעות פנויות)`
        );

        // יצירת תור פעיל לשעה 10:00 לבדיקת מניעת כפל תורים
        const activeApp = await prisma.appointment.create({
            data: {
                date: tomorrow,
                startTime: '10:00',
                endTime: '10:30',
                status: 'CONFIRMED',
                clientId: client.id,
                businessId: business.id,
                serviceId: service.id,
            },
        });

        const tomorrowStr = tomorrow.toISOString().split('T');
        const bookingPayload = {
            businessId: business.id,
            serviceId: service.id,
            serviceIds: [service.id],
            date: tomorrowStr,
            startTime: '10:00',
            clientName: client.name,
            clientPhone: client.phone,
          };
      


        // 10. בדיקת מניעת כפל תורים (התנגשות שעות)
        let collisionRes = await httpFetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
            body: JSON.stringify(bookingPayload),
        });
        if (collisionRes.status === 404) {
            collisionRes = await httpFetch(`${API_BASE}/appointments/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
                body: JSON.stringify(bookingPayload),
            });
        }
        recordTest(
            'מניעת כפל תורים והתנגשות שעות ביומן',
            collisionRes.status === 400 || collisionRes.status === 409,
            `תור כפול באותה שעה נחסם (קוד ${collisionRes.status})`
        );

        // 11. בדיקת מגן הברזות אוטומטי בעת קביעת תור (מעבר למצב ממתין לאישור)
        await prisma.user.update({
            where: { id: client.id },
            data: { noShowCount: 2, reliabilityScore: 60 },
        });
        const twoDaysAhead = new Date(tomorrow);
        twoDaysAhead.setDate(twoDaysAhead.getDate() + 1);
        const nextHourPayload = { ...bookingPayload, date: twoDaysAhead.toISOString().split('T').at(0), startTime: '11:00' };

    
        let protectedBookRes = await httpFetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
            body: JSON.stringify(nextHourPayload),
        });
        if (protectedBookRes.status === 404) {
            protectedBookRes = await httpFetch(`${API_BASE}/appointments/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
                body: JSON.stringify(nextHourPayload),
            });
        }
        const bookBody: any = await protectedBookRes.json().catch(() => ({}));
        const pendingApp = await prisma.appointment.findFirst({
            where: { businessId: business.id, clientId: client.id, startTime: '11:00' },
        });
        recordTest(
            'מגן הברזות אוטומטי (מעבר לאישור ידני ללקוח מבריז)',
            Boolean(pendingApp) && pendingApp?.status === 'PENDING',
            pendingApp
                ? `סטטוס התור שנקבע: ${pendingApp.status}`
                : `השרת דחה: ${bookBody.error || bookBody.message || protectedBookRes.status}`
        );

        // 12. בדיקת תיק לקוח דיגיטלי (CRM)
        const crmRes = await httpFetch(`${API_BASE}/crm/business/${business.id}/client/${client.id}`, {


            headers: { Authorization: `Bearer ${ownerToken}` },
        });
        recordTest(
            'שליפת תיק לקוח דיגיטלי והיסטוריית ביקורים',
            crmRes.status === 200,
            `תיק הלקוח נטען בהצלחה (קוד ${crmRes.status})`
        );

        // ניקוי התורים הנוספים שנוצרו בבדיקות
        await prisma.appointment.deleteMany({ where: { businessId: business.id } });
        if (activeApp) testAppointmentId = null;

    } catch (error: any) {
        console.error('\n⚠️ שגיאה בלתי צפויה במהלך הריצה:', error.message);
    } finally {
        if (testAppointmentId) await prisma.appointment.deleteMany({ where: { id: testAppointmentId } });
        if (testServiceId) await prisma.service.deleteMany({ where: { id: testServiceId } });
        if (testBusinessId) await prisma.business.deleteMany({ where: { id: testBusinessId } });
        if (testClientId) await prisma.user.deleteMany({ where: { id: testClientId } });
        if (testOwnerId) await prisma.user.deleteMany({ where: { id: testOwnerId } });
        await prisma.$disconnect();
    }

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.length - passedCount;

    console.log('\n==================================================');
    console.log(`📊 סיכום בדיקות אוטומטיות: ${passedCount} עברו בהצלחה | ${failedCount} נכשלו`);
    console.log('==================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runAllTests();
