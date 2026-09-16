import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Camera, Play, RefreshCw, Volume2, Wand2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isSpeakingAnimation, setIsSpeakingAnimation] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const hatImageRef = useRef<HTMLImageElement | null>(null);

  // Transformación suavizada del Sombrero (anti-jitter lerp)
  const hatTransformRef = useRef({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    angle: 0,
    headWidth: 0,
    visible: false,
  });

  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number>(0);

  // 1. Cargar imagen del Sombrero Seleccionador
  useEffect(() => {
    const img = new Image();
    img.src = '/sorting-hat-clean.png';
    hatImageRef.current = img;
  }, []);

  // 2. Inicializar Google MediaPipe Face Landmarker
  useEffect(() => {
    let isMounted = true;

    async function initFaceLandmarker() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error('Error al cargar FaceLandmarker de MediaPipe:', err);
        if (isMounted) setIsModelLoading(false);
      }
    }

    initFaceLandmarker();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  // 3. Configurar elemento de audio
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

  // 4. Bucle de Renderizado de Realidad Aumentada (Canvas 2.5D)
  useEffect(() => {
    if (appState !== 'scanning' && appState !== 'detecting') {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    function renderAR() {
      const webcam = webcamRef.current;
      const video = webcam?.video;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (video && canvas && video.readyState >= 2) {
        // Asegurar que las dimensiones del canvas coincidan exactamente con el video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          let detected = false;
          if (landmarker) {
            try {
              const now = performance.now();
              const detection = landmarker.detectForVideo(video, now);

              if (detection && detection.faceLandmarks && detection.faceLandmarks.length > 0) {
                detected = true;
                const landmarks = detection.faceLandmarks[0];

                // Puntos de referencia anatómicos clave:
                // 10: parte superior de la frente / nacimiento del cabello
                // 127: sien izquierda
                // 356: sien derecha
                const pTop = landmarks[10];
                const pLeft = landmarks[127];
                const pRight = landmarks[356];

                const topX = pTop.x * canvas.width;
                const topY = pTop.y * canvas.height;
                const leftX = pLeft.x * canvas.width;
                const leftY = pLeft.y * canvas.height;
                const rightX = pRight.x * canvas.width;
                const rightY = pRight.y * canvas.height;

                // Ancho de la cabeza y ángulo de inclinación
                const headWidth = Math.hypot(rightX - leftX, rightY - leftY);
                const angle = Math.atan2(rightY - leftY, rightX - leftX);

                // Proporciones y aspecto dinámico para el sombrero sin cintas
                const img = hatImageRef.current;
                const imageAspect =
                  img && img.naturalWidth > 0 && img.naturalHeight > 0
                    ? img.naturalHeight / img.naturalWidth
                    : 1423 / 826;

                // Ancho proporcionado al rostro para un ajuste natural sin exceder la pantalla
                const targetW = headWidth * 1.75;
                const targetH = targetW * imageAspect;

                // Punto de apoyo en la frente para bajar el sombrero y asentarlo en la cabeza:
                // El punto 10 es el nacimiento del cabello y el 151/9 es el entrecejo.
                const pForehead = landmarks[151] || landmarks[9] || pTop;
                const foreheadY = pForehead.y * canvas.height;
                const targetX = topX;
                // Bajamos el anclaje a la frente (entre nacimiento del pelo y entrecejo)
                const targetY = topY + (foreheadY - topY) * 0.65;

                const cur = hatTransformRef.current;
                if (!cur.visible) {
                  cur.x = targetX;
                  cur.y = targetY;
                  cur.w = targetW;
                  cur.h = targetH;
                  cur.angle = angle;
                  cur.headWidth = headWidth;
                  cur.visible = true;
                } else {
                  // Filtro LERP (interpolación suave anti-jitter)
                  cur.x += (targetX - cur.x) * 0.4;
                  cur.y += (targetY - cur.y) * 0.4;
                  cur.w += (targetW - cur.w) * 0.4;
                  cur.h += (targetH - cur.h) * 0.4;
                  cur.angle += (angle - cur.angle) * 0.4;
                  cur.headWidth += (headWidth - cur.headWidth) * 0.4;
                }
              }
            } catch (err) {
              // Fallback de detección en fotograma individual
            }
          }

          setIsFaceDetected(detected);

          const cur = hatTransformRef.current;
          if (detected && cur.visible && hatImageRef.current && hatImageRef.current.complete) {
            const anchorOffsetX = cur.w * 0.5;
            // El ala frontal del sombrero sin cintas se apoya en la frente a ~82% de la altura
            const anchorOffsetY = cur.h * 0.87;
            const breathe = Math.sin(Date.now() / 400) * 0.015;

            // Renderizado del Sombrero Seleccionador sobre la cabeza
            ctx.save();
            ctx.translate(cur.x, cur.y);
            ctx.rotate(cur.angle);
            ctx.scale(1 + breathe, 1 - breathe);

            // Sombra suave para dar volumen y realismo
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 6;

            ctx.drawImage(
              hatImageRef.current,
              -anchorOffsetX,
              -anchorOffsetY,
              cur.w,
              cur.h
            );
            ctx.restore();

            // Generar partículas mágicas doradas flotando desde el sombrero
            if (Math.random() < 0.4) {
              const isTip = Math.random() < 0.35;
              const spawnX = isTip
                ? cur.x + (Math.random() - 0.5) * 40
                : cur.x + (Math.random() - 0.5) * cur.w * 0.7;
              const spawnY = isTip ? cur.y - cur.h * 0.5 : cur.y - cur.h * 0.05;

              particlesRef.current.push({
                x: spawnX,
                y: spawnY,
                vx: (Math.random() - 0.5) * 1.2,
                vy: -Math.random() * 2 - 0.8,
                size: Math.random() * 3 + 1.5,
                alpha: 1.0,
                color: ['#F59E0B', '#FCD34D', '#FDE68A', '#FEF08A'][
                  Math.floor(Math.random() * 4)
                ],
              });
            }
          } else if (!detected) {
            cur.visible = false;
          }

          // Dibujar y actualizar partículas mágicas
          const particles = particlesRef.current;
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.025;
            if (p.alpha <= 0) {
              particles.splice(i, 1);
              continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderAR);
    }

    animFrameIdRef.current = requestAnimationFrame(renderAR);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [appState]);

  const startScanning = () => {
    setAppState('scanning');
    setCapturedImage(null);
    setResult(null);
    setAudioUrl(null);
    setErrorMessage('');
  };

  // Captura combinada: Imagen de la cámara + Sombrero de Realidad Aumentada sobre la cabeza
  const getCompoundScreenshot = (): string | null => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    // 1. Dibujar imagen del vídeo
    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    // 2. Dibujar overlay de Realidad Aumentada (el Sombrero colocado)
    ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);

    return offscreen.toDataURL('image/jpeg', 0.88);
  };

  // Ejecutar la ceremonia de selección
  const captureAndDetect = useCallback(async () => {
    if (appState !== 'scanning') return;

    const imageSrc = getCompoundScreenshot();
    if (!imageSrc) {
      setErrorMessage('Asegúrate de que la cámara esté encendida');
      return;
    }

    setAppState('detecting');
    setCapturedImage(imageSrc);

    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageParams: imageSrc }),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el Sombrero Seleccionador');
      }

      const data: DetectionResult = await response.json();

      if (data.detected && data.house && data.phrase) {
        setResult(data);

        // Invocar síntesis de voz
        const ttsResponse = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.phrase }),
        });

        if (!ttsResponse.ok) {
          throw new Error('No se pudo generar la voz mágica');
        }

        const ttsData = await ttsResponse.json();
        if (ttsData.audio) {
          const audioDataUrl = `data:audio/wav;base64,${ttsData.audio}`;
          setAudioUrl(audioDataUrl);
          setAppState('speaking');
          if (audioRef.current) {
            audioRef.current.src = audioDataUrl;
            audioRef.current.play().catch((e) => console.error('Autoplay prevented:', e));
          }
        } else {
          throw new Error('No se recibió el audio');
        }
      } else {
        setErrorMessage('¡Ponte frente a la cámara para que el Sombrero pueda leer tu mente!');
        setAppState('scanning');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado');
      setAppState('scanning');
    }
  }, [appState]);

  const getHouseClass = (house?: string) => {
    switch (house) {
      case 'Gryffindor':
        return 'house-Gryffindor border-[#ae0001] shadow-[0_0_80px_rgba(174,0,1,0.5)]';
      case 'Slytherin':
        return 'house-Slytherin border-[#2a623d] shadow-[0_0_80px_rgba(42,98,61,0.5)]';
      case 'Ravenclaw':
        return 'house-Ravenclaw border-[#222f5b] shadow-[0_0_80px_rgba(34,47,91,0.5)]';
      case 'Hufflepuff':
        return 'house-Hufflepuff border-[#ecb939] shadow-[0_0_80px_rgba(236,185,57,0.5)]';
      default:
        return 'bg-gray-900 border-gray-700 text-gray-200';
    }
  };

  const getHouseBadgeBg = (house: string) => {
    switch (house) {
      case 'Gryffindor':
        return 'bg-[#740001] text-[#eeba30] border-[#d3a625]';
      case 'Slytherin':
        return 'bg-[#1a472a] text-[#aaaaaa] border-[#2a623d]';
      case 'Ravenclaw':
        return 'bg-[#0e1a40] text-[#946b2d] border-[#222f5b]';
      case 'Hufflepuff':
        return 'bg-[#ecb939] text-[#111111] border-[#f0c75e]';
      default:
        return 'bg-black/30 border-white/20';
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black text-white font-serif overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {appState === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full flex flex-col items-center justify-end p-6 sm:p-12 text-center"
          >
            {/* Obra de arte completa a pantalla completa */}
            <img
              src="/escuela-hechiceria-bg.jpg"
              alt="Escuela de Hechicería"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/75 pointer-events-none" />

            {/* Contenido inferior elegante */}
            <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center gap-4 mb-4 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-purple-500/40 text-purple-300 text-xs sm:text-sm tracking-widest uppercase shadow-xl">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                Ceremonia de Selección
              </div>

              <p className="text-stone-200 text-base sm:text-lg leading-relaxed drop-shadow-lg max-w-lg font-sans">
                Colócate ante el espejo mágico. El Sombrero Seleccionador cobrará vida sobre tu cabeza y revelará la casa de Hogwarts a la que perteneces.
              </p>

              <button
                onClick={startScanning}
                disabled={isModelLoading}
                className="mt-2 px-10 py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-bold rounded-full text-lg sm:text-xl transition-all shadow-[0_0_40px_rgba(234,179,8,0.7)] flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isModelLoading ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    Invocando magia...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-6 h-6" />
                    Entrar a la Ceremonia
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {(appState === 'scanning' || appState === 'detecting') && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden"
          >
            {/* Cámara en vivo a pantalla completa */}
            <Webcam
              {...({
                audio: false,
                ref: webcamRef,
                screenshotFormat: "image/jpeg",
                videoConstraints: { facingMode: "user" },
                style: { filter: "contrast(1.05) brightness(1.02)" },
                className: "w-full h-full object-cover",
              } as any)}
            />

            {/* Canvas para el Sombrero y Partículas a pantalla completa */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />

            {/* Barra superior flotante minimalista */}
            <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 bg-black/65 backdrop-blur-md px-4 py-2 rounded-full border border-magic-gold/30 text-magic-gold text-xs sm:text-sm tracking-wider uppercase font-semibold pointer-events-auto shadow-xl">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                Escuela de Hechicer<span className="text-purple-400">IA</span>
              </div>

              {isFaceDetected ? (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-yellow-300 bg-yellow-950/80 border border-yellow-500/50 px-4 py-2 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(234,179,8,0.4)] pointer-events-auto animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
                  Sombrero colocado
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-300 bg-black/65 border border-stone-700/60 px-4 py-2 rounded-full backdrop-blur-md pointer-events-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  Colócate frente a la cámara
                </div>
              )}
            </div>

            {/* Botón de Selección Flotante */}
            {appState === 'scanning' && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto">
                <button
                  onClick={captureAndDetect}
                  disabled={!isFaceDetected}
                  className={cn(
                    "px-10 py-4 rounded-full font-bold text-lg md:text-xl flex items-center gap-3 transition-all duration-300 shadow-2xl",
                    isFaceDetected
                      ? "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black hover:scale-105 shadow-[0_0_40px_rgba(234,179,8,0.8)] cursor-pointer"
                      : "bg-black/70 text-stone-400 border border-stone-700 backdrop-blur-md opacity-75 cursor-not-allowed"
                  )}
                >
                  <Wand2 className={cn("w-6 h-6", isFaceDetected && "animate-bounce text-stone-900")} />
                  {isFaceDetected ? "¡Seleccionar mi Casa!" : "Ponte frente a la cámara..."}
                </button>
              </div>
            )}

            {/* Overlay de Análisis */}
            {appState === 'detecting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md z-40">
                <RefreshCw className="w-16 h-16 text-magic-gold animate-spin mb-4" />
                <p className="text-3xl font-bold text-magic-gold tracking-wide drop-shadow-lg">
                  El Sombrero está leyendo tu mente...
                </p>
                <p className="text-stone-300 text-base mt-2 italic">
                  Mmm, sí... veo cualidades singulares...
                </p>
              </div>
            )}

            {/* Mensaje de error / feedback */}
            {errorMessage && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-950/90 backdrop-blur-md border border-red-500/50 text-red-200 px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap z-50 shadow-2xl">
                {errorMessage}
              </div>
            )}
          </motion.div>
        )}

        {(appState === 'speaking' || appState === 'result') && capturedImage && result && (
          <motion.div
            key="speaking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "fixed inset-0 w-full h-full flex flex-col items-center justify-between p-6 sm:p-10 transition-colors duration-1000 overflow-hidden",
              appState === 'result' ? getHouseClass(result.house) : "bg-[#0b0806]"
            )}
          >
            {/* Fondo del estudiante difuminado a pantalla completa */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity blur-md scale-105 pointer-events-none"
              style={{ backgroundImage: `url(${capturedImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30 pointer-events-none" />

            {/* Cabecera superior con estandartes */}
            <div className="relative z-30 w-full flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-magic-gold/30 text-magic-gold text-xs sm:text-sm tracking-wider uppercase font-semibold">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                Escuela de Hechicer<span className="text-purple-400">IA</span>
              </div>

              <div className="flex items-center gap-2">
                {['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'].map((house) => (
                  <div
                    key={house}
                    className={cn(
                      "w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-700",
                      appState === 'result' && result.house === house
                        ? cn(getHouseBadgeBg(house), "scale-115 shadow-[0_0_25px_rgba(255,255,255,0.5)]")
                        : "border-white/20 opacity-40 bg-black/50 text-stone-400"
                    )}
                  >
                    {house[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* Fotografía central del estudiante con el Sombrero puesto */}
            <div className="relative z-20 flex-1 flex items-center justify-center my-2 max-h-[60vh]">
              <motion.div
                className="relative h-full max-h-[58vh] aspect-[3/4] shadow-[0_0_50px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden border-2 border-magic-gold/50"
                animate={
                  isSpeakingAnimation
                    ? {
                        boxShadow: [
                          "0px 0px 15px rgba(197, 160, 89, 0.3)",
                          "0px 0px 50px rgba(197, 160, 89, 0.85)",
                          "0px 0px 15px rgba(197, 160, 89, 0.3)",
                        ],
                      }
                    : {}
                }
                transition={
                  isSpeakingAnimation
                    ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                    : {}
                }
              >
                <img
                  src={capturedImage}
                  className="w-full h-full object-cover object-top"
                  alt="Estudiante con el Sombrero Seleccionador"
                />

                {isSpeakingAnimation && (
                  <div className="absolute top-4 right-4 bg-black/75 p-2.5 rounded-full backdrop-blur-md border border-yellow-500/40 animate-pulse">
                    <Volume2 className="w-6 h-6 text-yellow-400" />
                  </div>
                )}

                {/* Proclamación de la Casa sobre la foto */}
                {appState === 'result' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] pointer-events-none text-center"
                  >
                    <h2
                      className="text-4xl sm:text-6xl font-extrabold uppercase tracking-[6px] text-magic-gold"
                      style={{
                        textShadow: "0 0 30px rgba(197, 160, 89, 0.9), 0 4px 15px rgba(0,0,0,0.95)",
                      }}
                    >
                      ¡{result.house}!
                    </h2>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Veredicto y Botón de Reinicio */}
            <div className="relative z-30 w-full max-w-2xl text-center">
              <div
                className="p-4 sm:p-6 rounded-2xl relative overflow-hidden"
                style={{
                  background: 'rgba(12, 7, 3, 0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--color-magic-gold)',
                  boxShadow: '0 12px 50px rgba(0,0,0,0.9)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10" />
                <p
                  className="text-base sm:text-lg md:text-xl leading-relaxed italic relative z-10"
                  style={{ color: '#f0e6d6' }}
                >
                  "{result.phrase}"
                </p>
              </div>

              {appState === 'result' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    onClick={startScanning}
                    className="mt-4 px-8 py-3 bg-black/80 hover:bg-black text-magic-gold border border-magic-gold/60 hover:border-magic-gold rounded-full font-semibold transition-all flex items-center gap-2 mx-auto shadow-lg hover:shadow-[0_0_25px_rgba(197,160,89,0.5)] cursor-pointer"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Probar con otro alumno
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
