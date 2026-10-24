import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mic, 
  Volume2, 
  VolumeX, 
  Send, 
  CheckCircle2, 
  Bot, 
  User
} from 'lucide-react';
interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  token: string;
  onExecuteAction: (action: string, payload: any) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionExecuted?: string;
}

const SAMPLE_COMMANDS = [
  'What were my sales today?',
  'Which products are running low?',
  'How much do customers owe me?',
  'Add 2 Amul milk to the bill',
];

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  shopId,
  token,
  onExecuteAction,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello. I can answer questions about your authenticated ShopLedger business records in English.',
    },
  ]);

  useEffect(() => {
    if (isOpen) return;
    setIsListening(false);
    setIsSpeaking(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [isOpen]);

  if (!isOpen) return null;

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your command below!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => {
        setIsListening(false);
        setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, sender: 'assistant', text: 'Speech recognition failed. Please try again or type your question in English.' }]);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleSendCommand(transcript);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, sender: 'assistant', text: 'Speech recognition could not start. Please type your question in English.' }]);
    }
  };

  const speakText = (text: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleSendCommand = async (commandToSend?: string) => {
    const cmd = commandToSend || inputText.trim();
    if (!cmd) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cmd,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    try {
      const res = await fetch(`/api/shops/${shopId}/assistant/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ command: cmd }),
      });
      const text = await res.text();
      let data: { speechReply?: string; action?: string; payload?: Record<string, unknown>; error?: string } = {};
      try {
        data = text ? JSON.parse(text) as typeof data : {};
      } catch {
        throw new Error(`The assistant returned an invalid response (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || `The assistant request failed (${res.status}).`);
      if (typeof data.speechReply !== 'string') throw new Error('The assistant response was incomplete.');
      const reply = data.speechReply;

      const botMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        actionExecuted: data.action !== 'NONE' ? data.action : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(reply);

      // Execute product control action!
      if (data.action && data.action !== 'NONE') {
        onExecuteAction(data.action, data.payload || {});
      }
    } catch (err) {
      const fallbackReply = err instanceof Error ? err.message : 'The assistant could not complete this request.';
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: fallbackReply,
        },
      ]);
      speakText(fallbackReply);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  ShopLedger AI Voice Assistant
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Secure shop data
                </span>
              </div>
              <p className="text-xs text-slate-500">English only · authenticated ShopLedger records</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              title={soundEnabled ? (isSpeaking ? 'Assistant is speaking' : 'Mute Assistant Voice') : 'Unmute Assistant Voice'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAFBFD]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 max-w-[85%] ${
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-slate-800 text-white'
                    : 'bg-emerald-600 text-white shadow-xs'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                }`}
              >
                <p>{m.text}</p>
                {m.actionExecuted && (
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Action: {m.actionExecuted}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Voice Command Pills */}
        <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Try asking:</span>
          {SAMPLE_COMMANDS.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleSendCommand(cmd)}
              className="text-[11px] font-medium text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200/70 whitespace-nowrap shrink-0 transition-colors"
            >
              "{cmd}"
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={startListening}
              className={`p-2.5 rounded-xl transition-all shadow-xs ${
                isListening
                  ? 'bg-rose-600 text-white animate-bounce'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              title="Click and speak"
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder={isListening ? 'Listening in English...' : 'Ask a ShopLedger business question in English...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
