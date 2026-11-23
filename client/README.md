# 💈 מערכת חכמה לניהול ותזמון תורים (Smart Queue Architecture)

מערכת אקו-סיסטם מלאה ומבוזרת (Full-Stack Decoupled Architecture) לניהול, תזמון ואופטימיזציה של תורים בזמן אמת, המותאמת לעסקים מרובי שירותים (כמו מספרות, קליניקות ומכוני יופי). המערכת נבנתה תחת עקרונות הנדסת תוכנה קשיחים, הפרדת רשויות מלאה (MVC Pattern), ובקרת מקביליות חסם ברמת מסד הנתונים.

---

## 🚀 ארכיטקטורה טכנולוגית (Tech Stack)

### Backend (צד השרת)
- **סביבת ריצה:** Node.js עם TypeScript (Type-Safe Environment).
- **תשתית שרת:** Express.js (Modular Router System).
- **שכבת נתונים ו-ORM:** Prisma Client המחובר למסד נתונים יחסי **PostgreSQL**.
- **אבטחה ואימות:** JSON Web Token (JWT) לאימות משתמשים, ו-Bcrypt להצפנת סיסמאות במבנה הגיבוב (Hashing).
- **ניהול תצורה:** Dotenv להפרדת משתני סביבה מאובטחים (.env).

### Frontend (צד הלקוח)
- **תשתית:** React.js עם TypeScript (Single Page Application).
- **ניהול מצב גלובלי:** React Context API לניהול אחיד של יישות המשתמש המחובר.
- **מערכת ניווט:** React Router DOM הכוללת רכיבי הגנה קשיחים (ProtectedRoute Guards).
- **שכבת רשת:** Axios Client הכולל Request Interceptor להזרקה אוטומטית של טוקן ה-JWT.
- **עיצוב וממשק:** Tailwind CSS לפיתוח ממשק משתמש רספונסיבי מותאם מובייל ודסקטופ.

---

## 🧠 אלגוריתם הליבה ומנגנוני הגנה (Core Business Logic)

1. **אלגוריתם חיתוך זמנים דינמי (Time Slots Allocation):** השרת מחשב בזמן אמת משבצות זמן פנויות על בסיס משך הזמן של השירות המבוקש בדקות, תוך הצלבה מול אילוצי שעות הפעילות של העסק, חלוני הפסקות מובנים, וסינון תורים קיימים בבסיס הנתונים.
2. **בקרת מקביליות חסם (Concurrency Control):** מניעת תנאי מירוץ (Race Condition) וכפל תורים סימולטני באותו המילי-שנייה באמצעות אינדקס מורכב ייחודי (`@@unique([businessId, date, startTime])`) ברמת ה-PostgreSQL ותפיסת שגיאות קריסה (`P2002`) בשרת.
3. **אבטחת הרשאות מבוססת תפקיד (RBAC):** הפרדה מוחלטת בין ממשק הלקוח (`CLIENT`) לממשק המנהל (`BUSINESS_OWNER`) באמצעות שרשרת שכבות ביניים (Middlewares) בשרת ו-Router Guards בדפדפן.

---

## 💻 הוראות הרצה והפעלה (Setup Instructions)

### 1. הכנת מסד הנתונים והשרת (Backend Setup)
```bash
# כניסה לתיקיית השרת
cd server

# התקנת הספריות והתלויות
npm install

# הזרקת מבנה הטבלאות והקשרים לתוך PostgreSQL
npx prisma migrate dev --name init

# הרצת השרת במצב פיתוח (Watch Mode)
npm run dev
```

### 2. הפעלת ממשק המשתמש (Frontend Setup)
```bash
# כניסה לתיקיית הלקוח
cd client

# התקנת הספריות
npm install

# הרצת אפליקציית ה-React בדפדפן
npm run dev
```
