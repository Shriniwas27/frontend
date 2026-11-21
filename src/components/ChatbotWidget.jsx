import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { getWebSocketBaseUrl } from '../api';

const WS_BASE_URL = `${getWebSocketBaseUrl()}/vantome-agent/`;
const USER_AUDIO_SAMPLE_RATE = 16000;
const AI_SAMPLE_RATE = 24000;
const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate = 16000) {
  if (outputSampleRate >= inputSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export default function ChatbotWidget({ scope = 'dashboard', agentId = null }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);

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

  const ensureAudioContext = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!aiAudioContext.current || aiAudioContext.current.state === 'closed') {
        // Use system native sample rate (e.g. 44100 or 48000). The browser automatically resamples.
        aiAudioContext.current = new AudioCtx();
      }
      if (aiAudioContext.current.state === 'suspended') {
        aiAudioContext.current.resume().catch((e) => console.warn('AudioContext resume:', e));
      }
      return aiAudioContext.current;
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
      return null;
    }
  }, []);

  const clearAudioQueue = useCallback(() => {
    pendingSources.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // Ignore already-stopped nodes
      }
    });
    pendingSources.current = [];
    nextStartTime.current = 0;
    setIsAiSpeaking(false);
  }, []);

  const playAudioChunk = useCallback((base64Data) => {
    try {
      const ctx = ensureAudioContext();
      if (!ctx) return;

      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const numSamples = Math.floor(len / 2);
      if (numSamples === 0) return;

      // Extract raw 16-bit PCM little-endian samples
      const bytes = new Uint8Array(numSamples * 2);
      for (let i = 0; i < numSamples * 2; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Data = new Int16Array(bytes.buffer, 0, numSamples);
      const float32Data = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i += 1) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      // Gemini Live sends 24000Hz 16-bit PCM mono
      const buffer = ctx.createBuffer(1, numSamples, AI_SAMPLE_RATE);
      buffer.copyToChannel(float32Data, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;
      // Schedule immediately or seamlessly stitch after the last chunk
      if (nextStartTime.current < now) {
        nextStartTime.current = now + 0.02;
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
          speakingTimer.current = window.setTimeout(() => setIsAiSpeaking(false), 250);
        }
      };
    } catch (err) {
      console.error('playAudioChunk error:', err);
    }
  }, [ensureAudioContext]);

  const startCall = useCallback(async () => {
    try {
      setConnectionStatus('Connecting...');
      stopRingingTone();
      playRingingTone();
      ringingInterval.current = window.setInterval(playRingingTone, 2000);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support media devices');
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: USER_AUDIO_SAMPLE_RATE },
        });
      } catch (mediaErr) {
        console.warn('Camera not available or denied, falling back to audio only:', mediaErr);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: USER_AUDIO_SAMPLE_RATE },
        });
      }
      mediaStream.current = stream;

      if (videoRef.current && stream.getVideoTracks().length > 0) {
        videoRef.current.srcObject = mediaStream.current;
        await videoRef.current.play().catch(() => {});
      }

      ensureAudioContext();

      const params = new URLSearchParams();
      if (scope === 'agent-details' && agentId) {
        params.set('agent_id', String(agentId));
        params.set('source', 'agent-details');
      } else {
        params.set('source', 'dashboard');
      }

      const wsUrl = `${WS_BASE_URL}?${params.toString()}`;
      webSocket.current = new WebSocket(wsUrl);

      webSocket.current.onopen = async () => {
        stopRingingTone();
        setConnectionStatus('Connected');
        if (mediaStream.current?.getVideoTracks().length > 0) {
          streamInterval.current = window.setInterval(sendVideoFrame, 1000);
        }

        if (!mediaStream.current) return;

        try {
          if (!AudioContextClass) return;
          let uCtx;
          try {
            uCtx = new AudioContextClass({ sampleRate: USER_AUDIO_SAMPLE_RATE });
          } catch {
            uCtx = new AudioContextClass();
          }
          userAudioContext.current = uCtx;
          if (uCtx.state === 'suspended') {
            await uCtx.resume().catch(() => {});
          }

          const source = uCtx.createMediaStreamSource(mediaStream.current);
          const processor = uCtx.createScriptProcessor(4096, 1, 1);
          userAudioProcessor.current = processor;

          // Mute gain node prevents local microphone from echoing back through speakers
          const inputMute = uCtx.createGain();
          inputMute.gain.value = 0;
          source.connect(processor);
          processor.connect(inputMute);
          inputMute.connect(uCtx.destination);

          processor.onaudioprocess = (e) => {
            if (!webSocket.current || webSocket.current.readyState !== WebSocket.OPEN) return;

            const input = e.inputBuffer.getChannelData(0);
            const downsampled = downsampleBuffer(input, e.inputBuffer.sampleRate, USER_AUDIO_SAMPLE_RATE);
            const int16 = new Int16Array(downsampled.length);
            for (let i = 0; i < downsampled.length; i += 1) {
              const s = Math.max(-1, Math.min(1, downsampled[i]));
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
        } catch (audioErr) {
          console.error('Failed to initialize microphone audio stream:', audioErr);
        }
      };

      webSocket.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'interrupted') {
            clearAudioQueue();
            return;
          }

          if (msg.type === 'close') {
            stopCall();
            return;
          }

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
    ensureAudioContext();
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
          className="brand-button brand-button-primary fixed right-4 bottom-4 z-50 size-14 !rounded-2xl !p-0 shadow-lg sm:right-7 sm:bottom-7"
        >
          <Mic className="size-6" aria-hidden="true" />
        </button>
      )}

      {isChatOpen && (
        <div
          className="fixed inset-0 flex items-end justify-end p-5 z-50"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="assistant-panel dialog-surface ui-enter flex flex-col overflow-hidden border"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assistant-heading"
          >
            <header className="flex items-center justify-between gap-2 border-b border-app-border bg-app-bg px-4 py-2">
              <h2 id="assistant-heading" className="workspace-section-title">Vantome assistant</h2>
              <button
                onClick={closeModal}
                className="workspace-icon-button"
                aria-label="Close assistant"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-app-card text-app-text-primary">
              <video ref={videoRef} playsInline muted className="hidden" />
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex-none flex flex-col items-center pt-8 pb-4">
                <div
                  className="assistant-avatar grid select-none place-items-center rounded-full transition-shadow"
                  data-speaking={isAiSpeaking}
                >
                  {isAiSpeaking ? (
                    <div className="flex items-center gap-1.5 h-8">
                      <span className="w-1.5 bg-google-blue rounded-full animate-bounce" style={{ height: '24px', animationDuration: '0.6s' }}></span>
                      <span className="w-1.5 bg-google-blue rounded-full animate-bounce" style={{ height: '32px', animationDuration: '0.4s', animationDelay: '0.1s' }}></span>
                      <span className="w-1.5 bg-google-blue rounded-full animate-bounce" style={{ height: '18px', animationDuration: '0.7s', animationDelay: '0.2s' }}></span>
                      <span className="w-1.5 bg-google-blue rounded-full animate-bounce" style={{ height: '28px', animationDuration: '0.5s', animationDelay: '0.3s' }}></span>
                      <span className="w-1.5 bg-google-blue rounded-full animate-bounce" style={{ height: '16px', animationDuration: '0.6s', animationDelay: '0.15s' }}></span>
                    </div>
                  ) : (
                    <Mic className="size-8" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {isAiSpeaking && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>}
                  <p className={`text-sm ${isAiSpeaking ? 'text-google-blue font-semibold' : 'opacity-70'}`}>
                    {isAiSpeaking ? '🔊 Speaking...' : connectionStatus}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
                {messages.map((msg, index) => (
                  <div
                    key={`${index}-${msg.isUser ? 'u' : 'a'}`}
                    className={`px-3 py-2 rounded-xl text-[13px] max-w-[85%] shadow-sm ${msg.isUser
                      ? 'ml-4 self-end bg-google-blue text-[var(--on-primary)]'
                      : 'mr-4 self-start bg-app-bg text-app-text-primary'}`}
                  >
                    {msg.text}
                  </div>
                ))}
                <div ref={callMessagesEndRef} />
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div className="workspace-search flex items-center gap-2 rounded-full p-1 pl-4">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    aria-label="Message"
                    className="min-w-0 flex-1 bg-transparent text-sm text-app-text-primary placeholder:text-app-text-secondary"
                  />
                  <button
                    onClick={handleSend}
                    className="workspace-icon-button bg-google-blue !text-[var(--on-primary)] hover:!bg-[var(--primary-hover)]"
                    aria-label="Send message"
                  >
                    <Send className="size-4" aria-hidden="true" />
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
