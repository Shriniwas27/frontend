import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getWebSocketBaseUrl } from '../api';

const WS_DASHBOARD_URL = `${getWebSocketBaseUrl()}/vantome-agent/dashboard`;
const WS_AGENT_DETAILS_URL = `${getWebSocketBaseUrl()}/vantome-agent/`;
const USER_AUDIO_SAMPLE_RATE = 16000;
const AI_SAMPLE_RATE = 24000;

export default function ChatbotWidget({ scope = 'dashboard', agentId = null, theme = 'light' }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const isDark = theme === 'dark';

  const webSocket = useRef(null);
  const mediaStream = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamInterval = useRef(null);

  const userAudioContext = useRef(null);
  const userAudioProcessor = useRef(null);
  const aiAudioContext = useRef(null);
  const nextStartTime = useRef(0);
  const pendingSources = useRef([]);
  const speakingTimer = useRef(null);
  const callMessagesEndRef = useRef(null);
  const ringingInterval = useRef(null);
  const ringingAudioCtx = useRef(null);

  const playRingingTone = useCallback(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!ringingAudioCtx.current) {
      ringingAudioCtx.current = new Ctx();
    }

    const ctx = ringingAudioCtx.current;
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
    gain.gain.setValueAtTime(0.28, now + 0.35);
    gain.gain.linearRampToValueAtTime(0, now + 0.9);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }, []);

  const stopRingingTone = useCallback(() => {
    if (ringingInterval.current) {
      window.clearInterval(ringingInterval.current);
      ringingInterval.current = null;
    }

    if (ringingAudioCtx.current) {
      ringingAudioCtx.current.close().catch(() => {});
      ringingAudioCtx.current = null;
    }
  }, []);

  const stopCall = useCallback(() => {
    stopRingingTone();

    if (streamInterval.current) {
      window.clearInterval(streamInterval.current);
      streamInterval.current = null;
    }

    if (webSocket.current && webSocket.current.readyState < WebSocket.CLOSING) {
      webSocket.current.close();
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach((t) => t.stop());
      mediaStream.current = null;
    }

    if (userAudioProcessor.current) {
      userAudioProcessor.current.disconnect();
      userAudioProcessor.current = null;
    }

    if (userAudioContext.current && userAudioContext.current.state !== 'closed') {
      userAudioContext.current.close();
      userAudioContext.current = null;
    }

    if (aiAudioContext.current && aiAudioContext.current.state !== 'closed') {
      aiAudioContext.current.close();
      aiAudioContext.current = null;
    }

    if (speakingTimer.current) {
      window.clearTimeout(speakingTimer.current);
      speakingTimer.current = null;
    }

    webSocket.current = null;
    pendingSources.current = [];
    nextStartTime.current = 0;
    setConnectionStatus('Disconnected');
    setIsAiSpeaking(false);
  }, [stopRingingTone]);

  const sendVideoFrame = useCallback(() => {
    if (!webSocket.current || webSocket.current.readyState !== WebSocket.OPEN) return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState < 3) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
    webSocket.current.send(JSON.stringify({ type: 'video', data: base64Data }));
  }, []);

  const playAudioChunk = useCallback((base64Data) => {
    try {
      if (!aiAudioContext.current) return;

      if (aiAudioContext.current.state === 'suspended') {
        aiAudioContext.current.resume();
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i += 1) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      const buffer = aiAudioContext.current.createBuffer(1, float32Data.length, AI_SAMPLE_RATE);
      buffer.copyToChannel(float32Data, 0);

      const source = aiAudioContext.current.createBufferSource();
      source.buffer = buffer;
      source.connect(aiAudioContext.current.destination);

      const now = aiAudioContext.current.currentTime;
      const JITTER_BUFFER = 0.1;
      if (nextStartTime.current < now + JITTER_BUFFER) {
        nextStartTime.current = now + JITTER_BUFFER;
      }

      source.start(nextStartTime.current);
      nextStartTime.current += buffer.duration;

      pendingSources.current.push(source);
      setIsAiSpeaking(true);

      source.onended = () => {
        pendingSources.current = pendingSources.current.filter((s) => s !== source);
        if (pendingSources.current.length === 0) {
          if (speakingTimer.current) {
            window.clearTimeout(speakingTimer.current);
          }
          speakingTimer.current = window.setTimeout(() => setIsAiSpeaking(false), 200);
        }
      };
    } catch (err) {
      // Keep UI responsive even if one audio chunk fails.
      console.error('playAudioChunk error:', err);
    }
  }, []);

  const startCall = useCallback(async () => {
    try {
      setConnectionStatus('Connecting...');
      stopRingingTone();
      playRingingTone();
      ringingInterval.current = window.setInterval(playRingingTone, 2000);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support media devices');
      }

      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: USER_AUDIO_SAMPLE_RATE },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream.current;
        await videoRef.current.play();
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      aiAudioContext.current = new AudioCtx({ sampleRate: AI_SAMPLE_RATE });

      const params = new URLSearchParams();
      const isAgentScope = scope === 'agent-details' && agentId;

      if (isAgentScope) {
        params.set('agent_id', String(agentId));
      }

      const wsBaseUrl = isAgentScope ? WS_AGENT_DETAILS_URL : WS_DASHBOARD_URL;
      const wsUrl = params.toString() ? `${wsBaseUrl}?${params.toString()}` : wsBaseUrl;
      webSocket.current = new WebSocket(wsUrl);

      webSocket.current.onopen = () => {
        stopRingingTone();
        setConnectionStatus('Connected');
        streamInterval.current = window.setInterval(sendVideoFrame, 150);

        if (!mediaStream.current) return;

        userAudioContext.current = new AudioCtx({ sampleRate: USER_AUDIO_SAMPLE_RATE });
        const source = userAudioContext.current.createMediaStreamSource(mediaStream.current);
        userAudioProcessor.current = userAudioContext.current.createScriptProcessor(4096, 1, 1);
        source.connect(userAudioProcessor.current);
        userAudioProcessor.current.connect(userAudioContext.current.destination);

        userAudioProcessor.current.onaudioprocess = (e) => {
          if (!webSocket.current || webSocket.current.readyState !== WebSocket.OPEN) return;

          const input = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i += 1) {
            const s = Math.max(-1, Math.min(1, input[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
          }

          const b64 = btoa(binary);
          webSocket.current.send(JSON.stringify({ type: 'audio', data: b64 }));
        };
      };

      webSocket.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'audio') {
            playAudioChunk(msg.data);
            return;
          }

          if (msg.type === 'text') {
            setMessages((prev) => {
              if (prev.length > 0 && !prev[prev.length - 1].isUser) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  text: updated[updated.length - 1].text + msg.data,
                };
                return updated;
              }
              return [...prev, { text: msg.data, isUser: false }];
            });
            return;
          }

          if (msg.type === 'usertext') {
            setMessages((prev) => {
              if (prev.length > 0 && prev[prev.length - 1].isUser) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  text: `${updated[updated.length - 1].text} ${msg.data}`,
                };
                return updated;
              }
              return [...prev, { text: msg.data, isUser: true }];
            });
          }
        } catch (err) {
          console.warn('Failed to parse websocket message:', err);
        }
      };

      webSocket.current.onclose = () => {
        stopRingingTone();
        setConnectionStatus('Disconnected');
      };

      webSocket.current.onerror = (err) => {
        stopRingingTone();
        console.error('WebSocket error:', err);
        setConnectionStatus('Error');
      };
    } catch (err) {
      stopRingingTone();
      console.error('startCall failed:', err);
      setConnectionStatus('Failed');
      stopCall();
    }
  }, [agentId, playAudioChunk, playRingingTone, scope, sendVideoFrame, stopCall, stopRingingTone]);

  const openSupport = () => {
    setIsChatOpen(true);
    startCall();
  };

  const closeModal = () => {
    setIsChatOpen(false);
    stopCall();
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const txtToSend = inputValue;
    setMessages((prev) => [...prev, { text: txtToSend, isUser: true }]);
    setInputValue('');

    if (webSocket.current?.readyState === WebSocket.OPEN) {
      webSocket.current.send(JSON.stringify({ type: 'text', data: txtToSend }));
    }
  };

  useEffect(() => {
    callMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      stopCall();
    };
  }, [stopCall]);

  return (
    <>
      {!isChatOpen && (
        <button
          onClick={openSupport}
          aria-label="Open AI voice assistant"
          className={`fixed bottom-7 right-7 z-50 w-14 h-14 rounded-full text-white flex items-center justify-center transition-all duration-200 hover:scale-105 ${isDark
            ? 'bg-emerald-accent shadow-[0_0_0_3px_rgba(16,185,129,0.28),0_12px_26px_rgba(0,0,0,0.5)] hover:shadow-[0_0_0_4px_rgba(16,185,129,0.36),0_16px_34px_rgba(0,0,0,0.6)]'
            : 'bg-google-blue shadow-[0_10px_24px_rgba(26,115,232,0.35)] hover:shadow-[0_14px_30px_rgba(26,115,232,0.45)]'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
      )}

      {isChatOpen && (
        <div
          className="fixed inset-0 flex items-end justify-end p-5 z-50"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom border border-gray-200"
            style={{ width: 340, height: 550 }}
          >
            <div className="bg-google-blue text-white px-5 py-4 font-semibold flex justify-between items-center text-[15px]">
              <div className="flex items-center gap-2">
                <span className="text-xl">AI</span>
                <span>AI Voice Agent</span>
              </div>
              <button
                onClick={closeModal}
                className="bg-white/20 hover:bg-white/30 text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              >
                X
              </button>
            </div>

            <div className="flex-1 flex flex-col relative text-gray-800 overflow-hidden bg-white">
              <video ref={videoRef} playsInline muted className="hidden" />
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex-none flex flex-col items-center pt-8 pb-4">
                <div
                  className="rounded-full flex items-center justify-center text-4xl transition-all duration-300"
                  style={{
                    width: 90,
                    height: 90,
                    background: isAiSpeaking ? 'rgba(26,115,232,0.2)' : 'rgba(26,115,232,0.1)',
                    boxShadow: isAiSpeaking
                      ? '0 0 0 12px rgba(26,115,232,0.14), 0 0 0 24px rgba(26,115,232,0.06)'
                      : '0 0 0 8px rgba(26,115,232,0.05)',
                  }}
                >
                  AI
                </div>
                <h3 className="mt-6 font-semibold text-lg text-gray-900">Vantome Assistant</h3>
                <p className="opacity-70 text-sm mt-1">{connectionStatus}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
                {messages.map((msg, index) => (
                  <div
                    key={`${index}-${msg.isUser ? 'u' : 'a'}`}
                    className={`px-3 py-2 rounded-xl text-[13px] max-w-[85%] shadow-sm ${msg.isUser
                      ? 'self-end bg-google-blue text-white ml-4'
                      : 'self-start bg-gray-100 text-gray-700 mr-4'}`}
                  >
                    {msg.text}
                  </div>
                ))}
                <div ref={callMessagesEndRef} />
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div className="flex bg-gray-100 rounded-full p-1 pl-4 items-center border border-gray-200">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 text-[14px] placeholder:text-gray-500"
                  />
                  <button
                    onClick={handleSend}
                    className="bg-google-blue text-white w-8 h-8 rounded-full flex items-center justify-center font-bold transition-transform hover:scale-105"
                  >
                    ↑
                  </button>
                </div>

                <div className="flex justify-center mt-2">
                  {connectionStatus === 'Disconnected' || connectionStatus === 'Error' || connectionStatus === 'Failed' ? (
                    <button
                      onClick={startCall}
                      className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 border-none cursor-pointer flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                      title="Start Call"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={stopCall}
                      className="w-14 h-14 rounded-full bg-rose-accent border-none cursor-pointer flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                      title="End Call"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}