import React, { useState } from 'react';
import axiosClient from '../../api/axiosClient';

interface ChatMessage {
  sender: 'USER' | 'ASSISTANT';
  text: string;
}

interface SmartQueueAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  'כמה עסקים פעילים יש?',
  'איך קובעים תור?',
  'איך מבטלים תור?',
  'איך עובד החיפוש הקולי?',
];

export const SmartQueueAssistant: React.FC<SmartQueueAssistantProps> = ({ isOpen, onClose }) => {
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ASSISTANT',
      text: 'שלום! אני העוזר החכם של SmartQueue. אפשר לשאול אותי על עסקים פעילים, שעות פתיחה, מחירים או איך להשתמש באפליקציה.',
    },
  ]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black">העוזר החכם של SmartQueue</p>
              <p className="text-[11px] text-blue-100">מידע על עסקים והדרכת שימוש באפליקציה</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 h-80 overflow-y-auto space-y-3 bg-slate-50/70">
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
          className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
        >
          <input
            type="text"
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="שאל על עסק, שעות פתיחה או שימוש..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
          >
            שלח
          </button>
        </form>
      </div>
    </div>
  );
};
