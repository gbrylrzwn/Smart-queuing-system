interface ShabbatWindow {
    candleLighting: Date;
    havdalah: Date;
    fetchedAt: number;
  }
  
  const cache: { [key: string]: ShabbatWindow } = {};
  
  /**
   * בודק האם כרגע שבת (בין הדלקת נרות בשישי לצאת השבת/הבדלה במוצ"ש) לפי שעון ישראל ומיקום העסק.
   * במוצאי שבת לאחר צאת השבת — מחזיר false (פתוח לקביעת תורים!).
   */
  export async function isCurrentlyShabbat(latitude?: number | null, longitude?: number | null): Promise<boolean> {
    const now = new Date();
    const ilDayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'short',
    }).format(now);
  
    if (ilDayStr !== 'Fri' && ilDayStr !== 'Sat') {
      return false;
    }
  
    const lat = latitude || 32.0853;
    const lng = longitude || 34.7818;
    const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  
    try {
      let windowData = cache[cacheKey];
      if (!windowData || Date.now() - windowData.fetchedAt > 12 * 60 * 60 * 1000) {
        const url = `https://hebcal.com{lat}&longitude=${lng}&tzid=Asia/Jerusalem&M=on`;
        const response = await fetch(url);
        if (response.ok) {
          const data: any = await response.json();
          const candlesItem = data.items?.find((i: any) => i.category === 'candles');
          const havdalahItem = data.items?.find((i: any) => i.category === 'havdalah');
  
          if (candlesItem?.date && havdalahItem?.date) {
            windowData = {
              candleLighting: new Date(candlesItem.date),
              havdalah: new Date(havdalahItem.date),
              fetchedAt: Date.now(),
            };
            cache[cacheKey] = windowData;
          }
        }
      }
  
      if (windowData) {
        return now >= windowData.candleLighting && now < windowData.havdalah;
      }
    } catch {
      // גיבוי במקרה שאין חיבור חיצוני
    }
  
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
  
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
    const totalMinutes = hour * 60 + minute;
  
    if (ilDayStr === 'Fri') return totalMinutes >= 16 * 60 + 30;
    if (ilDayStr === 'Sat') return totalMinutes < 20 * 60 + 30;
    return false;
  }
  