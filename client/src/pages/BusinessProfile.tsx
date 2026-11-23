import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Business, Service } from '../types';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';


const BusinessProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { user, loading: authLoading, logout } = useAuth();
  
    useEffect(() => {
      if (authLoading) return;
  
      if (user && user.role !== 'CLIENT') {
        logout();
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
        return;
      }
  
      if (!user) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    }, [authLoading, user, location.pathname, logout, navigate]);
    
    

    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [currentStep, setCurrentStep] = useState<number>(1);

    const [selectedStaff, setSelectedStaff] = useState<string>('הראשון שמתפנה');
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const queryDate = searchParams.get('date');
        if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
            return queryDate;
        }
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
    const [bookingLoading, setBookingLoading] = useState<boolean>(false);

    const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
    const [isDayClosed, setIsDayClosed] = useState<boolean>(false);

    const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
    const [calendarMode, setCalendarMode] = useState<'gregorian' | 'hebrew'>('gregorian');

    useEffect(() => {
        const fetchBusinessProfile = async () => {
            try {
                setLoading(true);
                const response = await axiosClient.get(`/business/${id}`);
                setBusiness(response.data.business);
            } catch (err: any) {
                setError(err.response?.data?.error || 'נכשלנו בטעינת פרופיל העסק. אנא נסה שנית.');

            } finally {
                setLoading(false);
            }
        };
        if (id) fetchBusinessProfile();
    }, [id]);

    useEffect(() => {
        const fetchSlots = async () => {
            if (currentStep !== 3 || !id || selectedServices.length === 0 || !selectedDate) return;
            try {
                setSlotsLoading(true);
                setSelectedSlot(null);
                setIsDayClosed(false);

                const staffQuery = selectedStaffId ? `&staffId=${selectedStaffId}` : '';
                const response = await axiosClient.get(
                    `/appointments/available?businessId=${id}&serviceId=${selectedServices.join(',')}&date=${selectedDate}${staffQuery}`
                );
                setIsDayClosed(Boolean(response.data?.closedToday));

                setAvailableSlots(response.data.slots || []);
            } catch (err: any) {
                setAvailableSlots([]);
                if (err.response?.data?.error === 'BUSINESS_CLOSED_TODAY') {
                    setIsDayClosed(true);
                }
            } finally {
                setSlotsLoading(false);
            }
        };
        fetchSlots();
        // רענון שקט ברקע כל 15 שניות בזמן שהלקוח בוחר שעה (שלב 3)
        const intervalId = setInterval(async () => {
            if (currentStep === 3 && id && selectedServices.length > 0 && selectedDate) {
                try {
                    const staffQuery = selectedStaffId ? `&staffId=${selectedStaffId}` : '';
                    const res = await axiosClient.get(
                        `/appointments/available?businessId=${id}&serviceId=${selectedServices.join(',')}&date=${selectedDate}${staffQuery}`
                    );
                    const freshSlots: string[] = res.data.slots || [];
                    setAvailableSlots(freshSlots);
                    setSelectedSlot(prev => (prev && !freshSlots.includes(prev) ? null : prev));
                } catch { }
            }
        }, 15000);

        return () => clearInterval(intervalId);

    }, [currentStep, selectedDate, id, selectedServices, selectedStaffId]);

    // מניעת חזרה אחורה בדפדפן לאחר שהתור כבר נקבע בהצלחה (שלב 5)
    useEffect(() => {
        if (currentStep === 5) {
            window.history.pushState(null, '', window.location.href);
            const handlePopState = () => {
                navigate('/', { replace: true });
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [currentStep, navigate]);

    const toggleService = (serviceId: number) => {
        setSelectedServices((prev) => {
            if (prev.includes(serviceId)) {
                return prev.filter((sid) => sid !== serviceId);
            }
            if (prev.length >= 2) {
                alert('ניתן לבחור עד 2 שירותים בלבד בתור אחד.');
                return prev;
            }
            return [...prev, serviceId];
        });
    };


    const getTotals = () => {
        if (!business || !business.services) return { price: 0, duration: 0, name: '' };
        const items = business.services.filter((s: any) => selectedServices.includes(s.id));
        return {
            price: items.reduce((acc, c) => acc + c.price, 0),
            duration: items.reduce((acc, c) => acc + c.durationMinutes, 0),
            name: items.map(s => s.name).join(', ')
        };
    };
    const totals = getTotals();

    const getCategorizedSlots = () => {
        const morning: string[] = [];
        const afternoon: string[] = [];
        const evening: string[] = [];
        availableSlots.forEach(slot => {
            const [hour] = slot.split(':').map(Number);
            if (hour < 12) morning.push(slot);
            else if (hour >= 12 && hour < 17) afternoon.push(slot);
            else evening.push(slot);
        });
        return { morning, afternoon, evening };
    };
    const categorizedSlots = getCategorizedSlots();
    // המרת מספר יום עברי לאותיות גימטריות רשמיות ללוח השנה ללא מספרים
    const getHebrewDayLetter = (dayNum: number): string => {
        const letters: { [key: number]: string } = {
            1: "א'", 2: "ב'", 3: "ג'", 4: "ד'", 5: "ה'", 6: "ו'", 7: "ז'", 8: "ח'", 9: "ט'",
            10: "י'", 11: 'יא', 12: 'יב', 13: 'יג', 14: 'יד', 15: 'טו', 16: 'טז', 17: 'יז',
            18: 'יח', 19: 'יט', 20: "כ'", 21: 'כא', 22: 'כב', 23: 'כג', 24: 'כד', 25: 'כה',
            26: 'כו', 27: 'כז', 28: 'כח', 29: 'כט', 30: "ל'"
        };
        return letters[dayNum] || String(dayNum);
    };

    const getHebrewDateAndHoliday = (dateStr: string) => {
        if (!dateStr) return { hebStr: '', hebDayShort: '', holiday: '', hebMonthStr: '' };
        try {
            const dateObj = new Date(dateStr);

            const currentYear = dateObj.getFullYear();
            let hebYearStr = "ה'תשפ\"ז";
            if (currentYear === 2025) hebYearStr = "ה'תשפ\"ו";
            if (currentYear === 2027) hebYearStr = "ה'תשפ\"ח";

            const monthFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' });
            const hebMonth = monthFormatter.format(dateObj).replace(/[\u200e\u200f]/g, '').trim();

            const dayOptions = { day: 'numeric' } as const;
            const rawDayStr = dateObj.toLocaleDateString('he-IL-u-ca-hebrew', dayOptions);
            const hebDayNum = parseInt(rawDayStr.replace(/[^0-9]/g, '')) || 1;
            const hebDayShort = getHebrewDayLetter(hebDayNum);

            let holiday = '';
            if (hebMonth.includes('תשרי')) {
                if (hebDayNum === 1 || hebDayNum === 2) holiday = 'ראש השנה';
                else if (hebDayNum === 3) holiday = 'צום גדליה';
                else if (hebDayNum === 10) holiday = 'יום כיפור';
                else if (hebDayNum >= 15 && hebDayNum <= 21) holiday = 'חג סוכות';
                else if (hebDayNum === 22) holiday = 'שמיני עצרת';
            } else if (hebMonth.includes('כסלו') && hebDayNum >= 25) {
                holiday = 'חנוכה';
            } else if (hebMonth.includes('טבת')) {
                if (hebDayNum <= 2) holiday = 'חנוכה';
                else if (hebDayNum === 10) holiday = 'עשרה בטבת';
            } else if (hebMonth.includes('שבט') && hebDayNum === 15) {
                holiday = 'ט"ו בשבט';
            } else if (hebMonth.includes('אדר')) {
                if (hebDayNum === 13) holiday = 'תענית אסתר';
                else if (hebDayNum === 14) holiday = 'פורים';
                else if (hebDayNum === 15) holiday = 'שושן פורים';
            } else if (hebMonth.includes('ניסן') && hebDayNum >= 15 && hebDayNum <= 21) {
                holiday = 'חג הפסח';
            } else if (hebMonth.includes('אייר')) {
                if (hebDayNum === 4) holiday = 'יום הזיכרון';
                else if (hebDayNum === 5) holiday = 'יום העצמאות';
                else if (hebDayNum === 18) holiday = 'ל"ג בעומר';
            } else if (hebMonth.includes('סיון') && hebDayNum === 6) {
                holiday = 'שבועות';
            } else if (hebMonth.includes('אב') && hebDayNum === 9) {
                holiday = 'תשעה באב';
            }

            return {
                hebStr: `${hebDayShort} ב${hebMonth} ${hebYearStr}`,
                hebDayShort,
                holiday,
                hebMonthStr: `${hebMonth} ${hebYearStr}`
            };
        } catch (e) {
            return { hebStr: '', hebDayShort: '', holiday: '', hebMonthStr: '' };
        }
    };

    const getDaysInMonthGrid = () => {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const grid = [];
        for (let i = 0; i < firstDayIndex; i++) {
            grid.push({ dayNum: null, fullDate: '', hebData: { hebStr: '', hebDayShort: '', holiday: '', hebMonthStr: '' } });
        }
        for (let d = 1; d <= totalDays; d++) {
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(d).padStart(2, '0');
            const fullDate = `${year}-${mStr}-${dStr}`;
            grid.push({ dayNum: d, fullDate, hebData: getHebrewDateAndHoliday(fullDate) });
        }
        return grid;
    };

    const getWeeklyDays = () => {
        const list = [];
        const currentSelected = new Date(selectedDate || new Date());
        const startOfWeek = new Date(currentSelected);
        startOfWeek.setDate(currentSelected.getDate() - currentSelected.getDay());
        const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        for (let i = 0; i < 7; i++) {
            const loopDate = new Date(startOfWeek);
            loopDate.setDate(startOfWeek.getDate() + i);
            const year = loopDate.getFullYear();
            const month = String(loopDate.getMonth() + 1).padStart(2, '0');
            const day = String(loopDate.getDate()).padStart(2, '0');
            const fullDate = `${year}-${month}-${day}`;
            list.push({ dayName: dayNames[i], dayNum: loopDate.getDate(), fullDate, hebData: getHebrewDateAndHoliday(fullDate) });
        }
        return list;
    };
    const handleFinalBook = async () => {
        if (bookingLoading) return;
        try {
            setBookingLoading(true);

            await axiosClient.post('/appointments/book', {
                businessId: Number(id),
                serviceId: selectedServices,
                serviceIds: selectedServices,
                staffId: selectedStaffId,
                date: selectedDate,
                startTime: selectedSlot
            });

            try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            } catch { }

            setCurrentStep(5);
        } catch (err: any) {
            alert(err.response?.data?.error || 'המשבצת נתפסה. נא לבחור שעה אחרת.');
            if (err.response?.status === 409) {
                setSelectedSlot(null);
                setCurrentStep(3);
            }
        } finally {
            setBookingLoading(false);
        }
    };



    const handleJoinWaitlist = async () => {
        alert('נרשמת בהצלחה לרשימת ההמתנה!');
        setShowWaitlistModal(false);
    };
    if (loading) return <div className="text-center py-20 text-gray-500 font-sans">טוען את פרטי העסק...</div>;
    if (error || !business) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center space-y-5">
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                            🚫
                        </div>
                        <h1 className="text-xl font-black text-gray-900">העסק אינו זמין כרגע</h1>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            {error || 'עסק זה אינו זמין כרגע לקבלת תורים.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer"
                        >
                            חזרה לחיפוש עסקים ←
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative pb-20" dir="rtl">
            <Navbar />

            <div className="h-44 w-full bg-slate-800 bg-cover bg-center relative" style={business.imageUrl ? { backgroundImage: `url(${business.imageUrl})` } : undefined}>
                <div className="absolute inset-0 bg-black/30" />

                {currentStep < 5 && (
                    <button
                        type="button"
                        onClick={() => {
                            if (currentStep === 1) navigate('/');
                            else setCurrentStep(prev => prev - 1);
                        }}
                        className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 shadow-lg border border-gray-100 hover:scale-105 active:scale-95 transition-all text-sm font-black z-50 cursor-pointer"
                    >
                        ➔
                    </button>
                )}


                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-tr from-slate-800 to-slate-950 text-white font-black text-lg rounded-full border-2 border-white shadow-md flex items-center justify-center overflow-hidden z-20">
                    {business.name ? business.name.substring(0, 2).toUpperCase() : 'iT'}
                </div>
            </div>

            <div className="pt-10 pb-4 text-center bg-white border-b border-gray-100">
                <h1 className="text-xl font-black text-gray-900">{business.name}</h1>
                <p className="text-gray-400 text-xs mt-0.5"> {business.address}</p>
            </div>

            <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col items-center">
                {/* סרגל שלבים אינטראקטיבי עם מספר שלב ושם מלא */}
                {currentStep < 5 && (
                    <div className="w-full max-w-lg mb-8 px-2" dir="rtl">
                        <div className="flex items-start justify-between relative">
                            {/* קו רקע מקשר בין השלבים */}
                            <div className="absolute top-4 right-7 left-7 h-0.5 bg-gray-200 z-0" />

                            {[
                                { step: 1, title: 'שלב 1', label: 'בחירת איש צוות' },
                                { step: 2, title: 'שלב 2', label: 'בחירת שירותים' },
                                { step: 3, title: 'שלב 3', label: ' מועד התור' },
                                { step: 4, title: 'שלב 4', label: 'אישור פרטים' }
                            ].map((item) => {
                                const isCompleted = currentStep > item.step;
                                const isActive = currentStep === item.step;
                                const canClick = item.step < currentStep;

                                return (
                                    <button
                                        key={item.step}
                                        type="button"
                                        disabled={!canClick}
                                        onClick={() => {
                                            if (canClick) setCurrentStep(item.step);
                                        }}
                                        className={`relative z-10 flex flex-col items-center text-center w-20 group focus:outline-none ${canClick ? 'cursor-pointer' : 'cursor-default'
                                            }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border-2 mb-1.5 ${isActive
                                                    ? 'bg-cyan-500 border-cyan-500 text-white shadow-md scale-110'
                                                    : isCompleted
                                                        ? 'bg-slate-900 border-slate-900 text-white group-hover:bg-cyan-600 group-hover:border-cyan-600'
                                                        : 'bg-white border-gray-200 text-gray-400'
                                                }`}
                                        >
                                            {isCompleted ? '✓' : item.step}
                                        </div>
                                        <span
                                            className={`text-[10px] font-bold leading-tight ${isActive ? 'text-cyan-600' : isCompleted ? 'text-gray-500' : 'text-gray-400'
                                                }`}
                                        >
                                            {item.title}
                                        </span>
                                        <span
                                            className={`text-[11px] leading-tight mt-0.5 transition-colors ${isActive
                                                    ? 'font-black text-gray-900'
                                                    : isCompleted
                                                        ? 'font-bold text-gray-700 group-hover:text-cyan-600'
                                                        : 'font-medium text-gray-400'
                                                }`}
                                        >
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="w-full flex flex-col items-center space-y-6 text-center animate-fade-in">
                        <h3 className="text-base font-black text-gray-800">בחירת איש צוות</h3>
                        <div className="flex flex-row flex-wrap justify-center gap-6 py-2" dir="rtl">
                            <div onClick={() => { setSelectedStaff('הראשון שמתפנה'); setSelectedStaffId(null); setSelectedServices([]); }} className="flex flex-col items-center cursor-pointer transition-all select-none">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl transition-all border-2 ${selectedStaff === 'הראשון שמתפנה' ? 'bg-cyan-500 border-cyan-500 text-white shadow-md scale-105' : 'bg-gray-100 border-transparent text-gray-500'}`}>👥</div>
                                <span className={`text-xs mt-2 truncate ${selectedStaff === 'הראשון שמתפנה' ? 'font-black text-cyan-600' : 'font-semibold text-gray-600'}`}>הראשון שמתפנה</span>
                            </div>
                            {business.staff && business.staff.map((member: any) => {
                                const isSelected = selectedStaffId === member.id;
                                return (
                                    <div key={member.id} onClick={() => { setSelectedStaff(member.name); setSelectedStaffId(member.id); setSelectedServices([]); }} className="flex flex-col items-center cursor-pointer transition-all select-none">
                                        {member.imageUrl ? (
                                            <img src={member.imageUrl} alt={member.name} className={`w-16 h-16 rounded-full object-cover transition-all border-2 ${isSelected ? 'border-cyan-500 shadow-md scale-105' : 'border-transparent'}`} />
                                        ) : (
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-xs transition-all border-2 ${isSelected ? 'bg-cyan-500 border-cyan-500 text-white shadow-md scale-105' : 'bg-slate-400 text-white'}`}>{member.name.substring(0, 2).toUpperCase()}</div>
                                        )}
                                        <span className={`text-xs mt-2 truncate ${isSelected ? 'font-black text-cyan-600' : 'font-semibold text-gray-600'}`}>{member.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <button onClick={() => setCurrentStep(2)} className="w-full max-w-[260px] py-3 bg-cyan-500 text-white text-sm font-bold rounded-full shadow-md text-center cursor-pointer">המשך לבחירת שירות</button>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="w-full flex flex-col items-center space-y-4">
                        <h3 className="text-base font-black text-gray-800 text-center w-full">בחירת שירותים</h3>
                        <div className="space-y-2.5 w-full">
                            {(() => {
                                const activeMember = selectedStaffId ? business.staff?.find((m: any) => m.id === selectedStaffId) : null;
                                const filteredServices = activeMember && activeMember.services && activeMember.services.length > 0
                                    ? business.services?.filter((s: any) => activeMember.services.some((ms: any) => ms.id === s.id))
                                    : business.services;

                                return filteredServices?.map((service: any) => {
                                    const isSelected = selectedServices.includes(service.id);
                                    return (
                                        <div key={service.id} onClick={() => toggleService(service.id)} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all w-full ${isSelected ? 'border-cyan-500 bg-cyan-50/30' : 'border-gray-100 bg-white shadow-sm'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${isSelected ? 'bg-cyan-500 border-cyan-500 text-white font-bold' : 'border-gray-300 bg-white'}`}>{isSelected && '✓'}</div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800 text-right">{service.name}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 text-right">⏱ {service.durationMinutes} דקות</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-gray-800">₪{service.price}</span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        <div className="flex gap-3 w-full max-w-[280px] pt-4">
                            <button onClick={() => setCurrentStep(3)} disabled={selectedServices.length === 0} className={`w-full py-2.5 text-white text-xs font-bold rounded-full shadow-md text-center cursor-pointer ${selectedServices.length > 0 ? 'bg-cyan-500' : 'bg-gray-200 text-gray-400'}`}>המשך לבחירת מועד</button>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="w-full flex flex-col items-center space-y-5 animate-fade-in text-right">

                        <div className="w-full max-w-md bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3" dir="rtl">
                            <button type="button" onClick={() => { setCurrentCalendarDate(new Date(selectedDate || new Date())); const m = document.getElementById('calendar-popup-modal'); if (m) m.classList.remove('hidden'); }} className="w-12 h-12 bg-cyan-50 border border-cyan-100 text-cyan-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer">
                                <span className="text-base">📅</span>
                                <span className="text-[9px] font-black -mt-0.5">חודש</span>
                            </button>

                            <div className="flex-1 flex justify-between gap-1 overflow-hidden" dir="rtl">
                                {getWeeklyDays().map((day) => {
                                    const isSelected = selectedDate === day.fullDate;
                                    return (
                                        <div key={day.fullDate} onClick={() => setSelectedDate(day.fullDate)} className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 min-w-[44px]">
                                            <span className={`text-[10px] font-bold ${isSelected ? 'text-cyan-500 font-black' : 'text-gray-400'}`}>{day.dayName}</span>
                                            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-black transition-all ${isSelected ? 'bg-cyan-500 text-white shadow-md scale-105' : 'bg-slate-50 text-gray-700'}`}>
                                                <span>{calendarMode === 'hebrew' ? day.hebData?.hebDayShort : day.dayNum}</span>
                                                {day.hebData?.holiday && <span className="text-[7px] text-red-500">●</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div id="calendar-popup-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs hidden" dir="rtl">
                            <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border flex flex-col">

                                <div className="flex bg-gray-100 p-1 rounded-xl mb-4 w-full">
                                    <button type="button" onClick={() => setCalendarMode('gregorian')} className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all ${calendarMode === 'gregorian' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400'}`}>📅 לועזי נקי</button>
                                    <button type="button" onClick={() => setCalendarMode('hebrew')} className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all ${calendarMode === 'hebrew' ? 'bg-slate-900 text-white shadow-xs' : 'text-gray-400'}`}>📜 עברי וחגים</button>
                                </div>

                                <div className="flex items-center justify-between w-full bg-gray-50 p-2.5 rounded-2xl border mb-3">
                                    <button type="button" onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-xs font-black">▶</button>
                                    {/* 🔥 שדרוג פרימיום: הצגת שני החודשים העבריים המיוצגים בטבלה הנוכחית במידה ויש פיצול חודשים */}
                                    <span className="text-sm font-black text-gray-800 select-none">
                                        {calendarMode === 'hebrew' ? (() => {
                                            const gridDays = getDaysInMonthGrid().filter(d => d.dayNum !== null);
                                            if (gridDays.length > 0) {
                                                const firstMonth = gridDays[0].hebData?.hebMonthStr.split(' ')[0] || '';
                                                const lastMonthStr = gridDays[gridDays.length - 1].hebData?.hebMonthStr || '';
                                                const lastMonthName = lastMonthStr.split(' ')[0] || '';
                                                const hebYear = lastMonthStr.split(' ')[1] || '';

                                                // אם החודש של תחילת היומן שונה מסופו, נציג את שניהם משולבים (לדוגמה: מרחשוון - כסלו ה'תשפ"ז)
                                                if (firstMonth && firstMonth !== lastMonthName) {
                                                    return `${firstMonth} - ${lastMonthName} ${hebYear}`;
                                                }
                                                return lastMonthStr;
                                            }
                                            return currentCalendarDate.toLocaleDateString('he-IL-u-ca-hebrew', { month: 'long', year: 'numeric' });
                                        })() : currentCalendarDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
                                    </span>

                                    <button type="button" onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-xs font-black">◀</button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 pb-2 border-b mb-2">
                                    {['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''].map(d => <span key={d}>{d}</span>)}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {getDaysInMonthGrid().map((day, idx) => {
                                        if (day.dayNum === null) return <div key={`empty-${idx}`} />;
                                        const isSelected = selectedDate === day.fullDate;
                                        const hasHoliday = day.hebData?.holiday !== '';
                                        return (
                                            <button key={day.fullDate} type="button" onClick={() => { setSelectedDate(day.fullDate); const m = document.getElementById('calendar-popup-modal'); if (m) m.classList.add('hidden'); }} className={`h-12 w-11 mx-auto rounded-xl flex flex-col items-center justify-center p-0.5 border relative ${isSelected ? 'bg-cyan-500 border-cyan-500 text-white shadow-md scale-105' : hasHoliday ? 'bg-red-50 border-red-100 text-gray-800' : 'bg-white border-gray-100 text-gray-700 shadow-2xs'}`}>
                                                <span className="text-xs font-black font-mono">
                                                    {calendarMode === 'hebrew' ? day.hebData?.hebDayShort : day.dayNum}
                                                </span>
                                                {hasHoliday && calendarMode === 'hebrew' && (
                                                    <span className={`text-[6px] font-black tracking-tighter truncate max-w-[40px] mt-0.5 ${isSelected ? 'text-white' : 'text-red-500'}`}>
                                                        {day.hebData.holiday}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button type="button" onClick={() => { const m = document.getElementById('calendar-popup-modal'); if (m) m.classList.add('hidden'); }} className="mt-4 w-full py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl shadow-xs">סגור יומן</button>
                            </div>
                        </div>

                        <div className="text-center bg-gray-100/60 py-2 px-4 rounded-xl mb-2 text-[10px] font-black text-gray-500 w-full max-w-sm leading-relaxed">
                            <span>📅 לועזי: {selectedDate ? `${new Date(selectedDate).getDate()}/${new Date(selectedDate).getMonth() + 1}/${new Date(selectedDate).getFullYear()}` : ''}</span>
                            {getHebrewDateAndHoliday(selectedDate)?.hebStr && <span className="block mt-0.5">📜 עברי: {getHebrewDateAndHoliday(selectedDate).hebStr}</span>}
                            {getHebrewDateAndHoliday(selectedDate)?.holiday && <span className="block text-red-500 font-extrabold mt-0.5">🎉 מועד: {getHebrewDateAndHoliday(selectedDate).holiday}</span>}
                        </div>
                        <div className="w-full pt-2 text-right">
                            {slotsLoading ? (
                                <div className="text-center text-xs font-bold text-gray-400 py-10 animate-pulse w-full">היומן בבדיקה...</div>
                            ) : isDayClosed ? (
                                <div className="text-center py-10 bg-slate-50 text-slate-400 rounded-2xl border w-full text-xs font-black">🔒 בית העסק סגור ביום זה.</div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-8 bg-red-50 rounded-2xl border border-red-100/50 w-full p-6 flex flex-col items-center gap-3">
                                    <span className="text-xs font-bold text-red-600">🔒 לא נותרו זמנים פנויים ליום זה</span>
                                    <button type="button" onClick={() => setShowWaitlistModal(true)} className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-full">🔔 היכנס לרשימת המתנה</button>
                                </div>
                            ) : (
                                <div className="space-y-5" dir="rtl">
                                    {(() => {
                                        const isToday = selectedDate === new Date().toISOString().split('T')[0];
                                        const now = new Date();
                                        const currentHour = now.getHours();
                                        const currentMinute = now.getMinutes();

                                        const isSlotPast = (slotTime: string) => {
                                            if (!isToday) return false;
                                            const [slotH, slotM] = slotTime.split(':').map(Number);
                                            return slotH < currentHour || (slotH === currentHour && slotM <= currentMinute);
                                        };

                                        // 🔥 סינון מקדים של המערכים כדי לבדוק אם נשארו תורים עתידיים בכל קטגוריה
                                        const activeMorning = categorizedSlots.morning.filter((slot: string) => !isSlotPast(slot));
                                        const activeAfternoon = categorizedSlots.afternoon.filter((slot: string) => !isSlotPast(slot));
                                        const activeEvening = categorizedSlots.evening.filter((slot: string) => !isSlotPast(slot));

                                        return (
                                            <>
                                                {/* הכותרת תופיע רק אם המערך המסונן מכיל תורים פנויים בעתיד */}
                                                {activeMorning.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-gray-400 mb-2 pr-1 text-right">בוקר</h4>
                                                        <div className="grid grid-cols-4 gap-2.5">
                                                            {activeMorning.map((slot: string) => (
                                                                <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} className={`py-2 text-xs font-black rounded-xl border transition-all text-center cursor-pointer active:scale-95 ${selectedSlot === slot
                                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-black' // הסטייל כשהשעה נבחרת
                                                                        : 'bg-white border-gray-200 text-gray-800 hover:border-blue-500' // הסטייל כשהשעה פנויה וריקה
                                                                    }`}
                                                                >
                                                                    {slot}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {activeAfternoon.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-gray-400 mb-2 pr-1 text-right">אחר הצהריים</h4>
                                                        <div className="grid grid-cols-4 gap-2.5">
                                                            {activeAfternoon.map((slot: string) => (
                                                                <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} className={`py-2 text-xs font-black rounded-xl border transition-all text-center cursor-pointer active:scale-95 ${selectedSlot === slot
                                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-black' // הסטייל כשהשעה נבחרת
                                                                        : 'bg-white border-gray-200 text-gray-800 hover:border-blue-500' // הסטייל כשהשעה פנויה וריקה
                                                                    }`}
                                                                >
                                                                    {slot}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {activeEvening.length > 0 && (
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-gray-400 mb-2 pr-1 text-right">ערב</h4>
                                                        <div className="grid grid-cols-4 gap-2.5">
                                                            {activeEvening.map((slot: string) => (
                                                                <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} className={`py-2 text-xs font-black rounded-xl border transition-all text-center cursor-pointer active:scale-95 ${selectedSlot === slot
                                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-black' // הסטייל כשהשעה נבחרת
                                                                        : 'bg-white border-gray-200 text-gray-800 hover:border-blue-500' // הסטייל כשהשעה פנויה וריקה
                                                                    }`}
                                                                >
                                                                    {slot}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                            )}
                        </div>
                        <div className="flex justify-center gap-3 pt-4">
                            <button
                                onClick={() => setCurrentStep(4)}
                                disabled={!selectedSlot}
                                className={`px-10 py-2.5 text-white text-xs font-bold rounded-full shadow-md text-center cursor-pointer transition-all ${selectedSlot ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-gray-200 text-gray-400'
                                    }`}
                            >
                                הבא
                            </button>
                        </div>

                    </div>
                )}

                {currentStep === 4 && (
                    <div className="w-full flex flex-col items-center space-y-6 text-right">
                        <h3 className="text-base font-black text-gray-800 text-center w-full">אישור פרטי התור</h3>
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 w-full">
                            <div className="flex justify-between items-center border-b border-gray-50 pb-3 w-full"><span className="text-xs text-gray-400 font-bold">עסק</span><span className="text-sm font-black text-gray-800">{business.name}</span></div>
                            <div className="flex justify-between items-center border-b border-gray-50 pb-3 w-full"><span className="text-xs text-gray-400 font-bold">איש צוות</span><span className="text-sm font-black text-gray-800">{selectedStaff}</span></div>

                            <div className="flex justify-between items-center border-b border-gray-50 pb-3 w-full"><span className="text-xs text-gray-400 font-bold">תאריך</span><span className="text-sm font-black text-gray-800">{selectedDate ? new Date(selectedDate).toLocaleDateString('he-IL') : ''}</span></div>
                            <div className="flex justify-between items-center border-b border-gray-50 pb-3 w-full"><span className="text-xs text-gray-400 font-bold">שעת הגעה</span><span className="text-sm font-black text-cyan-600">{selectedSlot}</span></div>
                            <div className="flex justify-between items-center border-b border-gray-50 pb-3 w-full"><span className="text-xs text-gray-400 font-bold">טיפול מבוחר</span><span className="text-xs font-bold text-gray-700 truncate max-w-[180px]">{totals.name}</span></div>
                            <div className="flex justify-between items-center pt-1 w-full"><span className="text-xs text-gray-400 font-bold">לתשלום</span><span className="text-base font-black text-gray-900">₪{totals.price}</span></div>
                        </div>
                        <div className="flex flex-col gap-2.5 w-full max-w-[260px] pt-4">
                            <button onClick={handleFinalBook} disabled={bookingLoading} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-full shadow-lg text-center cursor-pointer">{bookingLoading ? 'משריין מקום...' : 'לסיום וקביעת התור'}</button>
                        </div>
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="text-center py-8 space-y-5 flex flex-col items-center w-full">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 text-3xl shadow-sm">✓</div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 mb-1.5 text-center">נקבע בהצלחה!</h3>
                            <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto leading-relaxed text-center">
                                התור שוריין במערכת בהצלחה ותזכורת תישלח אליך לפני המועד.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5 w-full max-w-[240px] pt-2">
                 

                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-full text-center cursor-pointer transition-all"
                            >
                                סגור וחזור לדף הבית
                            </button>
                        </div>
                    </div>
                )}

            </main>

            {showWaitlistModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" dir="rtl">
                    <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100 text-xl shadow-sm mb-4">🔔</div>
                        <h3 className="text-base font-black text-gray-900 mb-1.5 text-center">רשימת המתנה חכמה</h3>
                        <p className="text-xs text-gray-500 leading-relaxed mb-6 text-center">אין תורים פנויים ביום זה. האם ברצונך להיכנס לרשימת ההמתנה ולקבל התראה אוטומטית ברגע שמתפנה חלון זמן?</p>
                        <div className="flex gap-3 w-full">
                            <button type="button" onClick={handleJoinWaitlist} className="flex-1 py-2 bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-md text-center cursor-pointer">כן, תרשום אותי</button>
                            <button type="button" onClick={() => setShowWaitlistModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 text-center cursor-pointer">ביטול</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessProfile;
