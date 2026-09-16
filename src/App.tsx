import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Camera, Play, RefreshCw, Volume2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppState = 'welcome' | 'scanning' | 'detecting' | 'speaking' | 'result' | 'error';

interface DetectionResult {
  detected: boolean;
  confidence?: number;
  house?: 'Gryffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff';
  phrase?: string;
  error?: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeakingAnimation, setIsSpeakingAnimation] = useState(false);

  // Define audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsSpeakingAnimation(false);
      setAppState('result');
    };
    audioRef.current.onplay = () => {
      setIsSpeakingAnimation(true);
    };
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const startScanning = () => {
    setAppState('scanning');
    setCapturedImage(null);
    setResult(null);
    setAudioUrl(null);
    setErrorMessage('');
  };

  const captureAndDetect = useCallback(async () => {
    if (appState !== 'scanning' || !webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setAppState('detecting');
    setCapturedImage(imageSrc);

    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageParams: imageSrc }),
      });

      if (!response.ok) {
        throw new Error('Error en el servidor');
      }

      const data: DetectionResult = await response.json();

      if (data.detected && data.house && data.phrase) {
        setResult(data);
        // Call TTS
        const ttsResponse = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.phrase }),
        });

        if (!ttsResponse.ok) {
           throw new Error('No se pudo generar el audio');
        }

        const ttsData = await ttsResponse.json();
        if (ttsData.audio) {
           const audioDataUrl = `data:audio/wav;base64,${ttsData.audio}`;
           setAudioUrl(audioDataUrl);
           setAppState('speaking');
           if (audioRef.current) {
             audioRef.current.src = audioDataUrl;
             audioRef.current.play().catch(e => console.error("Autoplay prevent?", e));
           }
        } else {
           throw new Error('No audio returned');
        }
      } else {
        // Not detected, resume scanning after a delay
        if (data.confidence !== undefined) {
          setErrorMessage(`Sombrero no detectado (Confianza: ${(data.confidence * 100).toFixed(0)}%). ¡Póntelo en la cabeza!`);
        } else {
          setErrorMessage("Sombrero no detectado. ¡Póntelo en la cabeza!");
        }
        setAppState('scanning');
        setTimeout(() => {
          setErrorMessage((prev) => prev.startsWith('Sombrero') ? '' : prev);
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado');
      setAppState('scanning');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  }, [appState]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (appState === 'scanning') {
      interval = setInterval(captureAndDetect, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [appState, captureAndDetect]);

  const getHouseClass = (house?: string) => {
    switch (house) {
      case 'Gryffindor': return 'house-Gryffindor';
      case 'Slytherin': return 'house-Slytherin';
      case 'Ravenclaw': return 'house-Ravenclaw';
      case 'Hufflepuff': return 'house-Hufflepuff';
      default: return 'bg-gray-900 border-gray-700 text-gray-200';
    }
  };

  const getHouseSpanish = (house?: string) => {
    return house; // Same names in Spanish as in English
  };

  return (
    <div className="min-h-screen bg-ink text-white font-serif flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
      <div className="absolute inset-0 z-[-1] bg-[radial-gradient(circle_at_50%_50%,#2a1b0a_0%,#0a0502_100%)] pointer-events-none" />
      <div className="max-w-4xl w-full z-10 flex flex-col items-center gap-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full flex justify-between items-center px-4 md:px-10"
        >
          <h1 className="text-lg md:text-xl font-bold uppercase tracking-[3px] text-magic-gold">
            The Sorting Ceremony
          </h1>
        </motion.div>

        {/* Main Content Area */}
        <div className="relative w-full max-w-[944px] h-[580px] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#1a1a1a] border border-magic-gold/30 flex items-center justify-center">
          
          <AnimatePresence mode="wait">
            {appState === 'welcome' && (
              <motion.div 
                key="welcome"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full w-full p-8"
              >
                <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center mb-8">
                  <Camera className="w-12 h-12 text-slate-500" />
                </div>
                <button
                  onClick={startScanning}
                  className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-semibold rounded-full text-xl transition-all shadow-[0_0_20px_rgba(202,138,4,0.4)] flex items-center gap-3"
                >
                  <Play className="fill-current w-6 h-6" />
                  Empezar Ceremonia
                </button>
              </motion.div>
            )}

            {(appState === 'scanning' || appState === 'detecting') && (
              <motion.div 
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full relative"
              >
                {/* Keep webcam rendering under the overlay when taking snapshot */}
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  style={{ filter: "sepia(0.2) contrast(1.1)" }}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    appState === 'detecting' ? "opacity-50" : "opacity-60"
                  )}
                />

                {/* Overlays */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    border: '20px solid transparent',
                    borderImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M10 10H30V12H12V30H10V10Z\' fill=\'%23c5a059\'/%3E%3Cpath d=\'M90 10H70V12H88V30H90V10Z\' fill=\'%23c5a059\'/%3E%3Cpath d=\'M10 90H30V88H12V70H10V90Z\' fill=\'%23c5a059\'/%3E%3Cpath d=\'M90 90H70V88H88V70H90V90Z\' fill=\'%23c5a059\'/%3E%3C/svg%3E") 30'
                  }}
                />
                
                <div 
                  className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[280px] border-2 border-dashed border-magic-gold opacity-40 pointer-events-none"
                  style={{ borderRadius: '110px / 140px' }}
                />

                <motion.div 
                  className="absolute w-full h-[2px] opacity-30 top-1/2 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, var(--color-magic-gold), transparent)' }}
                  animate={{ y: [-100, 100] }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
                />
                
                {appState === 'detecting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                    <RefreshCw className="w-12 h-12 text-magic-gold animate-spin mb-4" />
                    <p className="text-xl font-medium text-magic-gold drop-shadow-md">Analizando...</p>
                  </div>
                )}
                
                {(appState === 'scanning' || appState === 'detecting') && errorMessage && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-950/80 backdrop-blur-md border border-red-500/50 text-red-200 px-6 py-3 rounded-full text-sm sm:text-base font-semibold whitespace-nowrap z-50 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                    {errorMessage}
                  </div>
                )}
              </motion.div>
            )}

            {(appState === 'speaking' || appState === 'result') && capturedImage && result && (
              <motion.div 
                key="speaking"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "w-full h-full relative flex items-center justify-center p-8 transition-colors duration-1000 border-8",
                  appState === 'result' ? getHouseClass(result.house) : "bg-black"
                )}
              >
                {/* Background image effect */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity blur-sm scale-110" 
                  style={{ backgroundImage: `url(${capturedImage})` }} 
                />
                
                {/* Main Image being animated while "talking" */}
                <motion.div
                  className="relative z-10 w-full h-full max-w-sm ml-auto mr-auto shadow-2xl rounded-2xl overflow-hidden border-4 border-magic-gold/30"
                  animate={isSpeakingAnimation ? {
                    boxShadow: ["0px 0px 0px rgba(197, 160, 89, 0)", "0px 0px 40px rgba(197, 160, 89, 0.6)", "0px 0px 0px rgba(197, 160, 89, 0)"]
                  } : {}}
                  transition={isSpeakingAnimation ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                >
                  <img src={capturedImage} className="w-full h-full object-cover object-top" alt="User" />
                  
                  {isSpeakingAnimation && (
                    <div className="absolute top-4 right-4 bg-black/60 p-2 rounded-full backdrop-blur-md animate-pulse">
                      <Volume2 className="w-6 h-6 text-yellow-400" />
                    </div>
                  )}
                </motion.div>
                
                {/* Final overlay for house name */}
                {appState === 'result' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-2xl"
                  >
                    <h2 
                      className="text-4xl sm:text-5xl font-bold uppercase text-center tracking-[4px] text-magic-gold" 
                      style={{ textShadow: "0 0 15px rgba(197, 160, 89, 0.5)" }}
                    >
                      ¡{getHouseSpanish(result.house)}!
                    </h2>
                  </motion.div>
                )}
                
                {/* House Icons Overlay */}
                <div className="absolute right-4 md:right-8 top-8 flex flex-col gap-4 z-30">
                  {['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'].map(house => (
                    <div 
                      key={house}
                      className={cn(
                        "w-12 h-12 rounded-full border flex items-center justify-center font-bold text-lg transition-all duration-500",
                        appState === 'result' && result.house === house 
                          ? `border-magic-gold opacity-100 shadow-[0_0_15px_var(--color-magic-gold)] bg-${house.toLowerCase()}` 
                          : "border-white/20 opacity-50 bg-black/30"
                      )}
                    >
                      {house[0]}
                    </div>
                  ))}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text and Actions */}
        <AnimatePresence>
          {(appState === 'speaking' || appState === 'result') && result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center w-full max-w-[800px] px-4 -mt-16 md:-mt-24 z-20"
            >
              <div 
                className="p-6 rounded-2xl relative overflow-hidden"
                style={{
                  background: 'rgba(10, 5, 2, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--color-magic-gold)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 transition-opacity" />
                <p 
                  className="text-lg md:text-xl leading-relaxed italic relative z-10"
                  style={{ color: '#e0d8d0' }}
                >
                  "{result.phrase}"
                </p>
              </div>

              {appState === 'result' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <button
                    onClick={startScanning}
                    className="mt-8 px-8 py-3 bg-black/50 hover:bg-black/80 text-magic-gold border border-magic-gold/50 rounded-full font-semibold transition-all flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Probar de nuevo
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
      
      {/* Background magical dust particles simulation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20" style={{ background: "radial-gradient(circle at center, transparent 0%, #000 100%)"}}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute rounded-full bg-yellow-400"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 5}s linear infinite`,
              opacity: Math.random() * 0.5 + 0.2
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-0 w-full h-[40px] bg-black/50 flex flex-wrap items-center justify-between px-4 md:px-10 text-[10px] md:text-xs uppercase tracking-[1px] text-magic-gold z-50">
        <div>• MAGIC_AI: ACTIVE</div>
        <div className="hidden sm:block">SUBJECT: {appState === 'result' && result?.house ? 'INITIATE ASSIGNED' : 'UNKNOWN INITIATE'}</div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
