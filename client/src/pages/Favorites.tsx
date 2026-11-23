import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Business, BusinessCategory } from '../types';
import Navbar from '../components/layout/Navbar';

const Favorites: React.FC = () => {
  const navigate = useNavigate();

  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [businessToRemove, setBusinessToRemove] = useState<Business | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosClient.get('/business/my-favorites');
        setFavoriteBusinesses(response.data.favorites || []);
      } catch (err) {
        setError('נכשלנו בטעינת העסקים המועדפים שלך. אנא נסה לרענן את העמוד.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const confirmRemoveFavorite = async () => {
    if (!businessToRemove) return;
    try {
      await axiosClient.delete(`/business/${businessToRemove.id}/favorite`);
      setFavoriteBusinesses((prev) => prev.filter((b) => b.id !== businessToRemove.id));
      setBusinessToRemove(null);
    } catch (err) {
      alert('נכשלנו בהסרת העסק מהמועדפים.');
    }
  };

  const getCategoryTheme = (cat: BusinessCategory) => {
    const themes: Record<BusinessCategory, { text: string; bg: string; icon: string }> = {
      HAIR_SALON: { text: 'מספרה', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: '💇‍♂️' },
      CLINIC: { text: 'קליניקה', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🩺' },
      BEAUTY_SALON: { text: 'מכון יופי', bg: 'bg-pink-50 text-pink-700 border-pink-200', icon: '✨' },
      SPA: { text: 'ספא', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: '💆‍♀️' },
      FITNESS_STUDIO: { text: 'סטודיו כושר', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: '💪' }
    };
    return themes[cat] || { text: cat, bg: 'bg-gray-50 text-gray-700 border-gray-200', icon: '💼' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-10">
        <div className="flex items-center justify-between border-b border-gray-200 pb-5 mb-8">
          <div className="text-right">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <span>❤️</span>
              <span>העסקים המועדפים שלי</span>
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              כאן מרוכזים כל העסקים ששמרת או שכבר קבעת אליהם תור בעבר לגישה מהירה.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            חיפוש עסקים נוספים ←
          </button>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-r-transparent mb-4" />
            <div className="text-gray-500 font-medium text-sm">טוען את רשימת המועדפים שלך...</div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 font-medium py-8 bg-red-50 rounded-2xl border border-red-100 max-w-xl mx-auto px-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          favoriteBusinesses.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto p-8">
              <span className="text-4xl block mb-3">🤍</span>
              <h4 className="text-sm font-black text-gray-800">עדיין אין לך עסקים שמורים במועדפים</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1.5 leading-relaxed">
                תוכל ללחוץ על אייקון הלב בכל עסק בדף הבית, או לקבוע תור ראשון והעסק יישמר כאן אוטומטית.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                גלה עסקים עכשיו
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteBusinesses.map((b) => {
                const theme = getCategoryTheme(b.category);
                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/business/${b.id}`)}
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
                      <span className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-sm backdrop-blur-md ${theme.bg}`}>
                        <span>{theme.icon}</span> <span>{theme.text}</span>
                      </span>
                    </div>

                    <div className="p-5 flex flex-col justify-between flex-1 text-right">
                      <div>
                        <h4 className="text-base font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                          {b.name}
                        </h4>
                        <p className="text-xs text-gray-400 font-semibold mt-1 flex items-center gap-1">
                          <span>📍</span> <span>{b.address}</span>
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/business/${b.id}`);
                          }}
                          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
                        >
                          קביעת תור
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBusinessToRemove(b);
                          }}
                          className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-red-100"
                          title="הסר מהמועדפים"
                        >
                          <span className="text-base">❤️</span>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
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

export default Favorites;
