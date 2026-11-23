import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import { SmartQueueLogo } from '../components/common/SmartQueueLogo';

const PrivacyPolicy: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'CLIENTS' | 'BUSINESSES'>('CLIENTS');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs text-right space-y-4">
          <SmartQueueLogo size="md" />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 pt-2">
            מדיניות פרטיות, אבטחת מידע ותנאי שימוש
          </h1>
          <p className="text-xs text-slate-500">
            עודכן לאחרונה: נובמבר 2026 • SmartQueue (תור חכם) מחויבת להגנה מלאה על פרטיות המשתמשים והעסקים בפלטפורמה.
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('CLIENTS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSection === 'CLIENTS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              מדיניות פרטיות ללקוחות קצה
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('BUSINESSES')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSection === 'BUSINESSES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              מדיניות פרטיות ואבטחה לבעלי עסקים
            </button>
          </div>
        </div>
        {activeSection === 'CLIENTS' ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs space-y-6 text-right leading-relaxed text-sm text-slate-700">
            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. איזה מידע נאסף מלקוחות קצה?</h2>
              <p>
                בעת הרשמה או קביעת תור אנו אוספים אך ורק את הפרטים ההכרחיים למתן השירות: שם מלא, מספר טלפון נייד (לצורך אימות ושליחת תזכורות תורים) וכתובת אימייל אופציונלית.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. שימוש בחיפוש קולי ובשירותי מיקום (GPS)</h2>
              <p>
                החיפוש הקולי בדף הבית מתבצע ישירות בדפדפן שלך בזמן אמת — קבצי שמע אינם מוקלטים ואינם נשמרים בשרתים שלנו. איתור מיקום GPS מתבצע רק לאחר אישורך המפורש לצורך הצגת עסקים קרובים ואינו נשמר בהיסטוריית מעקב.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. למי נמסר המידע?</h2>
              <p>
                פרטי התור שלך (שם, טלפון, שירות ומועד) משותפים אך ורק עם בית העסק שאצלו קבעת תור. איננו מוכרים, משכירים או מעבירים מידע אישי לצדדים שלישיים למטרות פרסום.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. זכות עיון ומחיקת חשבון לצמיתות</h2>
              <p>
                כל לקוח רשאי לעדכן את פרטיו או למחוק את חשבונו לצמיתות מתוך תפריט ההגדרות באפליקציה לאחר אימות קוד חד-פעמי.
              </p>
            </section>
          </div>
        ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs space-y-6 text-right leading-relaxed text-sm text-slate-700">
            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. הפרדת נתונים מוחלטת (Tenant Isolation)</h2>
              <p>
                כל עסק הרשום ב-SmartQueue פועל בסביבה מבודדת ומאובטחת. יומן התורים, רשימת הלקוחות, הנתונים הפיננסיים והחשבוניות של העסק נגישים אך ורק לבעל העסק המורשה.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. אבטחת חשבוניות ומסמכים פיננסיים</h2>
              <p>
                הפקת חשבוניות וקבלות דיגיטליות מתבצעת תחת אימות זהות מלא (JWT + בקרת בעלות בצד השרת), עם מספור רץ ייחודי לכל עסק והגנה מפני גישה חיצונית או בין-עסקית.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. סנכרון יומן חיצוני והצפנה</h2>
              <p>
                כל הסיסמאות מוצפנות בתקן תעשייתי (bcrypt), כל התקשורת מוצפנת בפרוטוקול HTTPS/TLS מאובטח, והחיבור ליומן Google מתבצע בהרשאת OAuth2 רשמית הניתנת לניתוק בכל עת.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. אחריות בעל העסק</h2>
              <p>
                בעל העסק מתחייב להזין פרטי עסק ושירותים מדויקים, לכבד תורים שאושרו במערכת ולשמור על סודיות פרטי הגישה לחשבונו.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default PrivacyPolicy;
