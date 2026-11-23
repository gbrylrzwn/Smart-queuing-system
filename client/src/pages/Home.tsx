import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Business, BusinessCategory } from '../types';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const [favorites, setFavorites] = useState<number[]>([]);
  const [activeAppointmentsCount, setActiveAppointmentsCount] = useState<number>(0);

  const [businessToRemove, setBusinessToRemove] = useState<Business | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [filterByLocation, setFilterByLocation] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('הדפדפן הנוכחי אינו תומך בחיפוש קולי. אם פתחת את הקישור מתוך WhatsApp, לחץ על 3 הנקודות למעלה ובחר "פתח ב-Chrome / Safari".');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'he-IL';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i].transcript;
        }
        const cleanText = transcript.trim();
        if (cleanText) {
          setSearchTerm(cleanText);
          setActiveSearchTerm(cleanText);
          setActiveCategory(selectedCategory);
          setShowSuggestions(false);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event?.error === 'not-allowed') {
          alert('הגישה למיקרופון חסומה. אנא אשר הרשאת מיקרופון בהגדרות הדפדפן.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      alert('לא ניתן היה להפעיל את המיקרופון במכשיר זה.');
    }
  };

  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const handleToggleLocationFilter = () => {
    if (filterByLocation) {
      setFilterByLocation(false);
      return;
    }

    if (!navigator.geolocation) {
      alert('הדפדפן שלך אינו תומך באיתור מיקום GPS.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setFilterByLocation(true);
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        alert('לא הצלחנו לאתר את מיקומך. אנא אשר גישה למיקום בהגדרות הדפדפן.');
      }
    );
  };
  const getCategoryTheme = (cat: BusinessCategory) => {
    const themes: Record<BusinessCategory, { text: string; bg: string }> = {
      HAIR_SALON: { text: 'מספרה', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      CLINIC: { text: 'קליניקה', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      BEAUTY_SALON: { text: 'מכון יופי', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
      SPA: { text: 'ספא', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
      FITNESS_STUDIO: { text: 'סטודיו כושר', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
    };
    return themes[cat] || { text: cat, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const searchSuggestions = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const suggestionsSet = new Map<string, { label: string; type: string }>();

    businesses.forEach((b) => {
      if (b.name && b.name.toLowerCase().includes(query)) {
        suggestionsSet.set(`biz-${b.name}`, { label: b.name, type: 'עסק' });
      }
      const catLabel = getCategoryTheme(b.category).text;
      if (catLabel.toLowerCase().includes(query)) {
        suggestionsSet.set(`cat-${catLabel}`, { label: catLabel, type: 'תחום' });
      }
      const servicesList = (b as any).services || [];
      if (Array.isArray(servicesList)) {
        servicesList.forEach((s: any) => {
          if (s.name && s.name.toLowerCase().includes(query)) {
            suggestionsSet.set(`srv-${s.name}`, { label: s.name, type: 'שירות' });
          }
        });
      }
    });

    return Array.from(suggestionsSet.values()).slice(0, 6);
  }, [searchTerm, businesses]);
  useEffect(() => {
    const roleStr = user?.role as unknown as string;
    if (user && (roleStr === 'OWNER' || roleStr === 'BUSINESS_OWNER')) {
      navigate('/business-home', { replace: true });
      return;
    }

    if (user && roleStr === 'SUPER_ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }

    const fetchHomeData = async () => {
      try {
        setError(null);
        const response = await axiosClient.get('/business/all');
        setBusinesses(response.data.businesses || []);

        if (user) {
          const favResponse = await axiosClient.get('/business/my-favorites');
          const favList: Business[] = favResponse.data.favorites || [];
          setFavorites(favList.map((b) => b.id));

          const ordersRes = await axiosClient.get('/appointments/my-orders');
          const allOrders: any[] = ordersRes.data.appointments || [];
          const now = new Date();
          const activeCount = allOrders.filter((app) => {
            if (app.status !== 'CONFIRMED' && app.status !== 'PENDING') return false;
            const appEnd = new Date(app.date);
            const [endH, endM] = (app.endTime || '23:59').split(':').map(Number);
            appEnd.setHours(endH, endM, 0, 0);
            return appEnd > now;
          }).length;
          setActiveAppointmentsCount(activeCount);
        }
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          setBusinesses([]);
        } else {
          setError('נכשלנו בטעינת העסקים במערכת. אנא ודא שחיבור האינטרנט תקין ורענן את העמוד.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [user, navigate]);
  useEffect(() => {
    const isSearching = activeSearchTerm.trim() !== '' || activeCategory !== 'ALL' || filterByLocation;
    let results = [...businesses];

    if (isSearching) {
      if (activeCategory !== 'ALL') {
        results = results.filter(b => b.category === activeCategory);
      }
      if (activeSearchTerm.trim() !== '') {
        const query = activeSearchTerm.trim().toLowerCase();
        results = results.filter(b => {
          const matchesNameOrAddress =
            b.name.toLowerCase().includes(query) ||
            b.address.toLowerCase().includes(query);

          const categoryLabel = getCategoryTheme(b.category).text.toLowerCase();
          const matchesCategory = categoryLabel.includes(query);

          const servicesList = (b as any).services || [];
          const matchesServices = Array.isArray(servicesList) && servicesList.some(
            (s: any) => s.name && s.name.toLowerCase().includes(query)
          );

          return matchesNameOrAddress || matchesCategory || matchesServices;
        });
      }

      if (filterByLocation && userLocation) {
        results = results
          .filter(b => {
            const bAny = b as any;
            if (!bAny.latitude || !bAny.longitude) return false;
            const dist = calculateDistanceKm(userLocation.lat, userLocation.lon, bAny.latitude, bAny.longitude);
            return dist <= 20;
          })
          .sort((a, b) => {
            const aAny = a as any;
            const bAny = b as any;
            const distA = calculateDistanceKm(userLocation.lat, userLocation.lon, aAny.latitude, aAny.longitude);
            const distB = calculateDistanceKm(userLocation.lat, userLocation.lon, bAny.latitude, bAny.longitude);
            return distA - distB;
          });
      }
    } else {
      results = [];
    }

    setFilteredBusinesses(results);
  }, [activeSearchTerm, activeCategory, businesses, favorites, filterByLocation, userLocation]);
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearchTerm(searchTerm);
    setActiveCategory(selectedCategory);
  };

  const toggleFavorite = async (e: React.MouseEvent, business: Business) => {
    e.stopPropagation();
    const isFav = favorites.includes(business.id);
    if (isFav) {
      setBusinessToRemove(business);
    } else {
      try {
        await axiosClient.post(`/business/${business.id}/favorite`);
        setFavorites([...favorites, business.id]);
      } catch (err) {
        alert('נכשלנו בשמירת העסק במועדפים.');
      }
    }
  };

  const confirmRemoveFavorite = async () => {
    if (!businessToRemove) return;
    try {
      await axiosClient.delete(`/business/${businessToRemove.id}/favorite`);
      const updatedFavs = favorites.filter(id => id !== businessToRemove.id);
      setFavorites(updatedFavs);
      setBusinessToRemove(null);
    } catch (err) {
      alert('נכשלנו בהסרת העסק מהמועדפים.');
    }
  };

  if (user?.role === 'SUPER_ADMIN') {
    return null;
  }

  const isSearchingActive = activeSearchTerm.trim() !== '' || activeCategory !== 'ALL' || filterByLocation;

  const handleOpenBusiness = (businessId: number) => {
    if (activeAppointmentsCount >= 3) {
      alert('ניתן להחזיק עד 3 תורים עתידיים פעילים במקביל. לאחר שאחד התורים יסתיים או יבוטל, תוכל לקבוע תור חדש.');
      return;
    }
    navigate(`/business/${businessId}`);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <header className="relative bg-white border-b border-gray-100 overflow-hidden py-16 shadow-sm">
        <div className="relative max-w-5xl mx-auto px-4 text-center" dir="rtl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-4 tracking-wide uppercase mx-auto">
            הדור הבא של ניהול התורים
          </span>
          <h1 className="text-4xl font-black text-gray-900 sm:text-5xl tracking-tight leading-none mb-4 text-center">
            קביעת תור חכמה <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">בשניות</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-500 font-normal leading-relaxed text-center">
            מצא את נותן השירות המוביל באזורך, בדוק זמינות בזמן אמת, ושריין את המשבצת המושלמת עבורך.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12">
        <form onSubmit={handleSearchSubmit} className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 -mt-24 relative z-10 flex flex-col md:flex-row gap-4 items-center justify-between" dir="rtl">
          <div className="w-full md:flex-1 relative text-right" dir="rtl">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={isListening ? 'מקשיב עכשיו... דבר למיקרופון' : 'חפש לפי שם עסק, סוג שירות או כתובת...'}
              value={searchTerm}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              className={`w-full pr-10 pl-32 py-3 border rounded-xl shadow-inner focus:outline-none focus:ring-2 text-sm font-medium transition-all text-right ${
                isListening
                  ? 'border-red-400 bg-red-50/40 focus:ring-red-400'
                  : 'border-gray-200 focus:ring-blue-500'
              }`}
            />
            <div className="absolute left-1.5 top-1.5 bottom-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleVoiceSearch}
                title={isListening ? 'עצור הקלטה קולית' : 'חיפוש קולי בעברית'}
                className={`h-full px-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  isListening
                    ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-sm'
                    : 'bg-gray-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>

              <button
                type="submit"
                onClick={() => setShowSuggestions(false)}
                className="h-full px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
              >
                חיפוש
              </button>
            </div>

            {showSuggestions && searchSuggestions.length > 0 && (
              <ul className="absolute top-full right-0 left-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-gray-50 text-right">
                {searchSuggestions.map((item, idx) => (
                  <li
                    key={idx}
                    onMouseDown={() => {
                      setSearchTerm(item.label);
                      setActiveSearchTerm(item.label);
                      setActiveCategory(selectedCategory);
                      setShowSuggestions(false);
                    }}
                    className="px-4 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                      </svg>
                      <span className="text-sm font-bold text-gray-800">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                      {item.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-full md:w-64 text-right" dir="rtl">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setActiveCategory(e.target.value);
              }}
              className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-gray-700 transition-all cursor-pointer text-right"
            >
              <option value="ALL">כל התחומים</option>
              <option value="HAIR_SALON">מספרות ועיצוב שיער</option>
              <option value="CLINIC">קליניקות ומרפאות</option>
              <option value="BEAUTY_SALON">מכוני יופי וקוסמטיקה</option>
              <option value="SPA">ספא וטיפולים</option>
              <option value="FITNESS_STUDIO">סטודיו ואימונים</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleToggleLocationFilter}
            disabled={locationLoading}
            className={`w-full md:w-auto px-4 py-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterByLocation
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-inner'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
            <span>
              {locationLoading ? 'מאתר מיקום...' : filterByLocation ? 'קרוב אליי (עד 20 ק"מ)' : 'סנן לפי המיקום שלי'}
            </span>
          </button>
        </form>
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-r-transparent mb-4" />
            <div className="text-gray-500 font-medium text-base text-center">מאתר נותני שירות זמינים עבורך...</div>
          </div>
        )}

        {error && <div className="text-center text-red-600 font-medium py-10 bg-red-50 rounded-2xl border border-red-100 my-8 max-w-3xl mx-auto text-right px-6" dir="rtl">{error}</div>}
        {!loading && !error && isSearchingActive && (
          filteredBusinesses.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8 max-w-xl mx-auto p-8" dir="rtl">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-gray-700 text-center">
                {isSearchingActive ? 'לא נמצאו עסקים התואמים לחיפוש שלך.' : 'אין לך עסקים שמורים ברשימת המועדפים.'}
              </h4>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {filteredBusinesses.map((b) => {
                const theme = getCategoryTheme(b.category);
                const isFav = favorites.includes(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleOpenBusiness(b.id)}
                    className="bg-white rounded-3xl border border-gray-100 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                      {b.imageUrl ? (
                        <img
                          src={b.imageUrl}
                          alt={b.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-2xl font-black">
                          {b.name.substring(0, 2)}
                        </div>
                      )}
                      <span className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-sm backdrop-blur-md ${theme.bg}`}>
                        {theme.text}
                      </span>
                    </div>
                    <div className="p-5 flex flex-col justify-between flex-1 text-right" dir="rtl">
                      <div>
                        <h4 className="text-base font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                          {b.name}
                        </h4>
                        <p className="text-xs text-gray-400 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
                            <circle cx="12" cy="11" r="2.5" />
                          </svg>
                          <span>{b.address}</span>
                          {userLocation && (b as any).latitude && (b as any).longitude && (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              {calculateDistanceKm(userLocation.lat, userLocation.lon, (b as any).latitude, (b as any).longitude)} ק"מ ממך
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBusiness(b.id);
                          }}
                          className={`px-5 py-2 text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer ${
                            activeAppointmentsCount >= 3
                              ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          קביעת תור
                        </button>

                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, b)}
                          className="w-9 h-9 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-gray-100"
                          title={isFav ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                        >
                          <svg
                            className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      {businessToRemove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl text-right">
            <h3 className="text-sm font-black text-gray-900">הסרת עסק מהמועדפים</h3>
            <p className="text-xs text-gray-400 mt-1">
              האם אתה בטוח שברצונך להסיר את <span className="font-bold text-gray-700">{businessToRemove.name}</span> מרשימת המועדפים שלך?
            </p>
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setBusinessToRemove(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl">ביטול</button>
              <button onClick={confirmRemoveFavorite} className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md">כן, הסר עסק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
