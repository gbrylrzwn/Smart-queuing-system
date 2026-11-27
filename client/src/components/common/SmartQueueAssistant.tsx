import React, { useState, useRef, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  sender: 'USER' | 'ASSISTANT';
  text: string;
}

interface SmartQueueAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLIENT_QUESTIONS = [
  'אילו עסקים וטיפולים יש?',
  'מה התורים הקרובים שלי?',
  'איך קובעים או מבטלים תור?',
  'אילו עסקים פתוחים עכשיו?',
];

const BUSINESS_OWNER_QUESTIONS = [
  'נסח הודעת מבצע בוואטסאפ ללקוחות',
  'מה מצב התורים וההכנסות שלי?',
  'איך למלא שעות פנויות ביומן?',
  'נסח הודעת עדכון שעות פעילות לחג',
];

const ADMIN_QUESTIONS = [
  'מה סיכום העסקים והמנויים במערכת?',
  'אילו עסקים בתקופת ניסיון כרגע?',
  'הצג סיכום פעילות יומי בפלטפורמה',
];

export const SmartQueueAssistant: React.FC<SmartQueueAssistantProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isOwner =
    user?.role === 'BUSINESS_OWNER' ||
    ['/dashboard', '/business-home', '/business-invoices', '/financial-analytics'].some((p) =>
      currentPath.startsWith(p)
    );
  const isAdmin = user?.role === 'SUPER_ADMIN' || currentPath.startsWith('/admin');

  const quickQuestions = isAdmin
    ? ADMIN_QUESTIONS
    : isOwner
    ? BUSINESS_OWNER_QUESTIONS
    : CLIENT_QUESTIONS;

  const welcomeMessage = isAdmin
    ? 'שלום מנהל המערכת! אפשר לשאול אותי על נתוני הפלטפורמה, עסקים רשומים, מנויים ותפעול המערכת.'
    : isOwner
    ? 'שלום! אני היועץ העסקי החכם שלך. אפשר לבקש ממני לנסח הודעות שיווק בוואטסאפ, לנתח את היומן וההכנסות שלך או לקבל רעיונות להגדלת התפוסה.'
    : 'שלום! אני העוזר החכם של SmartQueue. אפשר לשאול אותי על עסקים, מחירים, זמינות, התורים שלך או תפעול האפליקציה.';

  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ASSISTANT', text: welcomeMessage },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([{ sender: 'ASSISTANT', text: welcomeMessage }]);
  }, [isOwner, isAdmin]);

  useEffect(() => {
    if (!minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, minimized]);

  if (!isOpen) return null;

  const sendQuestion = async (textToAsk: string) => {
    const clean = textToAsk.trim();
    if (!clean || loading) return;

    const updatedHistory = [...messages, { sender: 'USER' as const, text: clean }];
    setMessages(updatedHistory);
    setQuestion('');
    setLoading(true);
    setMinimized(false);

    try {
      const res = await axiosClient.post('/ai/assistant', {
        question: clean,
        history: updatedHistory.slice(-6),
        currentPath: window.location.pathname,
      });
      setMessages((prev) => [
        ...prev,
        { sender: 'ASSISTANT', text: res.data?.answer || 'לא התקבלה תשובה כרגע.' },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ASSISTANT',
          text: err.response?.data?.error || 'אירעה שגיאה זמנית. נסה שוב בעוד רגע.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className={`fixed bottom-3 left-3 z-40 transition-all duration-200 pointer-events-auto ${
        expanded
          ? 'w-[calc(100vw-1.5rem)] max-w-[520px]'
          : 'w-[calc(100vw-1.5rem)] max-w-[340px]'
      }`}
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-black">
                {isAdmin ? 'עוזר מנהל המערכת' : isOwner ? 'היועץ העסקי החכם' : 'העוזר החכם של SmartQueue'}
              </p>
              <p className="text-[10px] text-blue-100">מופעל על ידי Gemini AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!minimized && (
              <>
                <button
                  type="button"
                  title="נקה שיחה"
                  onClick={() =>
                    setMessages([{ sender: 'ASSISTANT', text: 'השיחה נוקתה. במה אוכל לעזור לך עכשיו?' }])
                  }
                  className="px-2 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold cursor-pointer"
                >
                  נקה
                </button>
                <button
                  type="button"
                  title={expanded ? 'הקטן חלונית' : 'הגדל חלונית'}
                  onClick={() => setExpanded((prev) => !prev)}
                  className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
                >
                  {expanded ? '⤡' : '⤢'}
                </button>
              </>
            )}
            <button
              type="button"
              title={minimized ? 'הרחב חלונית' : 'מזער חלונית'}
              onClick={() => setMinimized((prev) => !prev)}
              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center justify-center cursor-pointer"
            >
              {minimized ? '+' : '−'}
            </button>
            <button
              type="button"
              title="סגור"
              onClick={onClose}
              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            <div
              className={`p-3 overflow-y-auto space-y-2.5 bg-slate-50/70 transition-all duration-200 ${
                expanded ? 'h-80' : 'h-48'
              }`}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'USER' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[88%] px-3 py-2 rounded-2xl leading-relaxed whitespace-pre-line ${
                      expanded ? 'text-sm' : 'text-xs'
                    } ${
                      msg.sender === 'USER'
                        ? 'bg-blue-600 text-white font-semibold rounded-tr-sm'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                    {msg.sender === 'ASSISTANT' && idx > 0 && (
                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(msg.text);
                            alert('התשובה הועתקה ללוח!');
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-blue-600 cursor-pointer"
                        >
                          📋 העתק טקסט
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-[11px] text-blue-600 font-bold text-left animate-pulse">
                  מנסח תשובה מהירה...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-2.5 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
              {quickQuestions.map((qText) => (
                <button
                  key={qText}
                  type="button"
                  onClick={() => sendQuestion(qText)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer"
                >
                  {qText}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion(question);
              }}
              className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5"
            >
              <input
                type="text"
                maxLength={350}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  isOwner
                    ? 'בקש ניסוח הודעה, ניתוח יומן או עזרה...'
                    : 'שאל כל שאלה על העסקים או התורים...'
                }
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
              >
                שלח
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
