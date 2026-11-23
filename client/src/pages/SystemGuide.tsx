import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { SmartQueueLogo } from '../components/common/SmartQueueLogo';

const SystemGuide: React.FC = () => {
  const navigate = useNavigate();
  const [roleTab, setRoleTab] = useState<'CLIENT' | 'OWNER'>('CLIENT');

  const clientSteps = [
    {
      title: '1. איתור עסק חכם — בטקסט, בקול או לפי מיקום',
      desc: 'חפשו מספרה, קליניקה, מכון יופי, ספא או סטודיו כושר באמצעות הקלדה, חיפוש קולי בעברית במיקרופון או סינון לפי עסקים קרובים אליכם.',
    },
    {
      title: '2. בחירת שירות, איש צוות ומועד פנוי בזמן אמת',
      desc: 'צפו במחירון השירותים, משך הטיפול והצוות הזמין, ובחרו את המשבצת המדויקת שנוחה לכם ביומן.',
    },
    {
      title: '3. אישור מיידי, תזכורות וניהול תורים בקליק',
      desc: 'קבלו אישור תור ותזכורות אוטומטיות, שמרו עסקים אהובים במועדפים ונהלו או בטלו תורים בקלות מתוך "התורים שלי".',
    },
    {
      title: '4. עוזר AI ממוסגר לשאלות מהירות',
      desc: 'בכל עמוד תוכלו לפתוח את העוזר החכם כדי לברר שעות פתיחה, מחירי שירותים או לקבל הסבר מיידי על אפשרויות האתר.',
    },
  ];

  const ownerSteps = [
    {
      title: '1. הקמת דף עסק דיגיטלי מלא תוך דקות',
      desc: 'הגדירו שעות פעילות, הפסקות, שירותים, מחירים, אנשי צוות ומיקום מפה כדי שלקוחות ימצאו אתכם מיד.',
    },
    {
      title: '2. יומן חכם, מניעת כפילויות וסנכרון Google Calendar',
      desc: 'ניהול תורים בזמן אמת, חסימת זמנים פרטיים, סנכרון דו-כיווני ליומן Google והתראות אוטומטיות ללקוחות.',
    },
    {
      title: '3. הפקת חשבוניות וקבלות דיגיטליות מאובטחות',
      desc: 'הפיקו חשבוניות/קבלות ממותגות בלחיצת כפתור מתוך תורים ששולמו או ידנית, עם מספור רץ והורדת PDF תחת הפרדת נתונים מוחלטת.',
    },
    {
      title: '4. דוחות פיננסיים ואנליטיקה עסקית',
      desc: 'עקבו אחרי הכנסות בפועל מול צפי עתידי, ביצועי שירותים וצמיחת העסק במקום אחד.',
    },
  ];
  const stepsToShow = roleTab === 'CLIENT' ? clientSteps : ownerSteps;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs text-center space-y-4">
          <div className="flex justify-center">
            <SmartQueueLogo size="lg" showTagline />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 pt-2">
            היכרות עם המערכת — איך זה עובד?
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-500 leading-relaxed">
            SmartQueue מחברת בין לקוחות לעסקים בצורה חכמה, מהירה ומאובטחת. בחרו את המסלול שלכם כדי להכיר את כל הכלים שעומדים לרשותכם.
          </p>

          <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setRoleTab('CLIENT')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                roleTab === 'CLIENT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              אני לקוח — קביעת תורים
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('OWNER')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                roleTab === 'OWNER'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              אני בעל עסק — ניהול וצמיחה
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stepsToShow.map((step) => (
            <div
              key={step.title}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs text-right space-y-2 hover:border-blue-200 transition-colors"
            >
              <h3 className="text-base font-black text-slate-900">{step.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="text-right">
            <h2 className="text-lg font-black">מוכנים להתחיל?</h2>
            <p className="text-xs text-blue-100 mt-1">
              {roleTab === 'CLIENT'
                ? 'חפשו עכשיו עסק באזורכם ושריינו תור תוך שניות.'
                : 'הצטרפו כבעלי עסקים ונהלו את היומן והחשבוניות במקום אחד.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(roleTab === 'CLIENT' ? '/' : '/register')}
            className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            {roleTab === 'CLIENT' ? 'מעבר לחיפוש עסקים' : 'פתיחת חשבון עסקי'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default SystemGuide;
