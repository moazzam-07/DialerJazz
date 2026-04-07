import { useEffect, useRef } from 'react';

type Props = {
  mediaStream: MediaStream | null;
  color?: string;
  isActive?: boolean; // If we want to animate even without stream
};

export default function AudioVisualizer({ mediaStream, color = '#10b981', isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mediaStream && !isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    if (mediaStream) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let values = Array.from({ length: 20 }, () => Math.random() * height * 0.4 + 5);
      
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as any);
        const sliced: number[] = [];
        for (let i = 0; i < 20 && i < dataArray.length; i++) {
          sliced.push(dataArray[i]);
        }
        values = sliced.map(v => (v / 255) * height);
      }

      ctx.fillStyle = color;
      const barWidth = (width / values.length) - 2;
      
      values.forEach((val, i) => {
        const x = i * (barWidth + 2);
        const y = height - Math.max(val, 2);
        const h = Math.max(val, 2);
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 2);
        ctx.fill();
      });
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [mediaStream, isActive, color]);

  if (!mediaStream && !isActive) {
    return <div className="h-8 w-full bg-surface rounded animate-pulse" />;
  }

  return (
    <div className="flex h-8 w-full items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} width={200} height={32} className="block w-full h-full" />
    </div>
  );
}
