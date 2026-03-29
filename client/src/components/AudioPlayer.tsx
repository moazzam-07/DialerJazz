import { useEffect, useRef } from 'react';

type Props = React.HTMLAttributes<HTMLAudioElement> & {
  mediaStream: MediaStream | null;
};

const AudioPlayer = ({ mediaStream, ...props }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!mediaStream || !audioRef.current) return;
    audioRef.current.srcObject = mediaStream;
  }, [mediaStream]);

  return <audio ref={audioRef} autoPlay {...props} style={{ display: 'none' }} />;
};

export default AudioPlayer;
