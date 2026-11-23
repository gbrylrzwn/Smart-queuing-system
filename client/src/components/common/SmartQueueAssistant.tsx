import React, { useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  sender: 'USER' | 'ASSISTANT';
  text: string;
}

const QUICK_QUESTIONS = [
  'כמה עסקים פעילים יש?',
  'איך קובעים תור?',
  'איך מבטלים תור?',
  'איך עובד החיפוש הקולי?',
];

export const SmartQueueAssistant: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ASSISTANT',
      text: 'שלום! אני העוזר החכם של SmartQueue. אפשר לשאול אותי על עסקים פעילים, שעות פתיחה, מחירים או איך להשתמש באפליקציה.',
    },
  ]);

  if (user?.role === 'SUPER_ADMIN') {
    return null;
  }

  const sendQuestion = async (textToAsk: string) => {
    const clean = textToAsk.trim();
    if (!clean || loading) return;

    setMessages((prev) => [...prev, { sender: 'USER', text: clean }]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await axiosClient.post('/ai/assistant', { question: clean });
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
    <div className="fixed bottom-5 left-5 z-40" dir="rtl">
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black">העוזר החכם של SmartQueue</p>
                <p className="text-[10px] text-blue-100">מידע על עסקים והדרכת שימוש</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="p-4 h-72 overflow-y-auto space-y-3 bg-slate-50/70">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'USER' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === 'USER'
                      ? 'bg-blue-600 text-white font-semibold rounded-tr-sm'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-[11px] text-slate-400 font-bold text-left">בודק נתונים...</div>
            )}
          </div>
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
            {QUICK_QUESTIONS.map((qText) => (
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
            className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              maxLength={300}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="שאל על עסק, שעות פתיחה או שימוש..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
            >
              שלח
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-12 px-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-xl shadow-blue-600/25 flex items-center gap-2 text-xs font-black transition-transform active:scale-95 cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span>עוזר חכם</span>
      </button>
    </div>
  );
};
