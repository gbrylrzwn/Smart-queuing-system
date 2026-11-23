import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Navbar from '../components/layout/Navbar';

const HealthDeclarationPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();

  const [allergies, setAllergies] = useState<string>('');
  const [medicalNotes, setMedicalNotes] = useState<string>('');
  const [agreed, setAgreed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hasSigned, setHasSigned] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  const getCoords = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches.clientX : e.clientX;
    const clientY = e.touches ? e.touches.clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert('יש לאשר את נכונות הפרטים והסכמה לטיפול.');
      return;
    }
    if (!hasSigned || !canvasRef.current) {
      alert('יש לחתום בתיבת החתימה הדיגיטלית לפני השליחה.');
      return;
    }

    try {
      setSubmitting(true);
      const signatureDataUrl = canvasRef.current.toDataURL('image/png');
      const res = await axiosClient.post('/crm/forms', {
        businessId: Number(businessId),
        formTitle: 'הצהרת בריאות והסכמה לטיפול',
        answersJson: {
          allergies: allergies.trim() || 'ללא רגישויות ידועות',
          medicalNotes: medicalNotes.trim() || 'מצב בריאותי תקין',
        },
        signatureDataUrl,
      });
      alert(res.data?.message || 'הצהרת הבריאות נשמרה בהצלחה!');
      navigate('/my-appointments');
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בשליחת הצהרת הבריאות.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="max-w-2xl mx-auto py-8 px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-gray-100 space-y-5"
        >
          <div className="border-b border-gray-100 pb-4">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full">
              ✍️ טופס דיגיטלי מאובטח
            </span>
            <h1 className="text-2xl font-black text-gray-900 mt-2">הצהרת בריאות והסכמה לטיפול</h1>
            <p className="text-xs text-gray-500 mt-1">
              הפרטים והחתימה נשמרים באופן מאובטח בתיק הלקוח שלך בבית העסק לקראת הטיפול.
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-800 mb-1.5">
              רגישויות, אלרגיות לתכשירים / חומרים / צבעים:
            </label>
            <textarea
              rows={2}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="פרט/י כאן אם קיימות רגישויות (אם אין, ניתן להשאיר ריק)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-800 mb-1.5">
              מצב רפואי מיוחד, נטילת תרופות קבועות או הריון:
            </label>
            <textarea
              rows={2}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="פרט/י כאן מידע רפואי רלוונטי לצוות המטפל..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-indigo-600"
            />
            <span className="text-xs font-bold text-gray-700 leading-relaxed">
              אני מצהיר/ה בזאת כי כל הפרטים שמסרתי נכונים ומלאים, ואני מאשר/ת לצוות העסק לבצע את הטיפול בהתאם.
            </span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-gray-800">חתימה דיגיטלית (באצבע או בעכבר):</label>
              <button
                type="button"
                onClick={clearSignature}
                className="text-[11px] font-bold text-red-500 hover:text-red-700 underline cursor-pointer"
              >
                נקה חתימה
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={560}
              height={160}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-40 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 touch-none cursor-crosshair"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-2xl shadow-md transition-all cursor-pointer"
          >
            {submitting ? 'שומר מסמך חתום...' : '✅ אשר ושלח הצהרת בריאות חתומה'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HealthDeclarationPage;
