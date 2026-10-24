import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Settings, 
  Save, 
  MapPin, 
  Phone, 
  Store
} from 'lucide-react';
import { ShopkeeperProfile } from '../types';

interface AIInsightsViewProps {
  shopId: string;
  token: string;
  shopkeeper: ShopkeeperProfile;
  onUpdateShopkeeper: (updated: ShopkeeperProfile) => void;
  onOpenVoice: () => void;
}

interface QAMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  shopId,
  token,
  shopkeeper,
  onUpdateShopkeeper,
  onOpenVoice,
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'settings'>('insights');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Settings form state
  const [name, setName] = useState(shopkeeper.name);
  const [shopName, setShopName] = useState(shopkeeper.shopName);
  const [phone, setPhone] = useState(shopkeeper.phone);
  const [location, setLocation] = useState(shopkeeper.location);
  const [upiId, setUpiId] = useState(shopkeeper.upiId || '');
  const [gstNumber, setGstNumber] = useState(shopkeeper.gstNumber || '');
  const [isSavedToast, setIsSavedToast] = useState(false);

  const [messages, setMessages] = useState<QAMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `Hello ${shopkeeper.name}. I can answer questions using this shop's authorized records.

Try: "What were my sales today?", "Which products are running low?", or "How much do customers owe me?"`,
    },
  ]);

  const handleAsk = async (promptText?: string) => {
    const q = promptText || question.trim();
    if (!q || isLoading) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: q }]);
    setQuestion('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/shops/${shopId}/assistant/advisor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q }),
      });
      const text = await res.text();
      let data: { answer?: string; error?: string } = {};
      try {
        data = text ? JSON.parse(text) as typeof data : {};
      } catch {
        throw new Error(`The assistant returned an invalid response (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || `The assistant request failed (${res.status}).`);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: data.answer || 'No answer is available for that question.',
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: error instanceof Error ? error.message : 'The assistant could not complete this request.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateShopkeeper({
      name,
      shopName,
      phone,
      location,
      upiId,
      gstNumber,
    });
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI Insights & Shop Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Business intelligence queries, shop location configuration & voice logs
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-white border border-slate-200/80 p-1 rounded-xl shadow-xs self-start">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'insights'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Business Advisor
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shop & Location Settings
          </button>
        </div>
      </div>

      {/* Tab 1: AI Advisor */}
      {activeTab === 'insights' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ShopLedger Gemini Retail Intelligence
                </h3>
                <p className="text-xs text-slate-500">Answers calculated from this shop's saved business records</p>
              </div>
            </div>

            <button
              onClick={onOpenVoice}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              Open Voice Mic
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 my-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 max-w-2xl ${
                  m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                    m.sender === 'user' ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-slate-900 text-white font-medium'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 whitespace-pre-line'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500 pl-2">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Gemini calculating store trends...</span>
              </div>
            )}
          </div>

          {/* Suggested Quick Prompts */}
          <div className="pt-2 pb-2 flex items-center gap-2 overflow-x-auto border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Prompts:</span>
            {[
              'Which products are running low?',
              'How much do customers owe me?',
              'What were my sales today?',
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(p)}
                className="text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 px-2.5 py-1 rounded-lg border border-slate-200/70 whitespace-nowrap shrink-0 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2 pt-2"
          >
            <input
              type="text"
              placeholder="Ask about sales, inventory, expenses, dues, receipts or payroll..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Settings & Location */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs max-w-3xl space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Shop Profile & Location Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These details appear on your printed customer bills and UPI QR codes
            </p>
          </div>

          {isSavedToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              Shopkeeper settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shopkeeper Name (दुकानदार का नाम)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Name (दुकान का नाम)
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Location (दुकान का पूरा पता / लोकेशन)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UPI ID (फॉर पेमेंट QR कोड)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. shivansh@oksbi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GST Number (वैकल्पिक)
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="06AAAAA0000A1Z5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
