import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronRight } from 'lucide-react';
import GlassCard from './GlassCard';

const IntroCard = ({ receiverName, introMessage, musicUrl, onNext }) => {
  const [typedText, setTypedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const fullText = introMessage || `Welcome to this special journey, created just for you. Take a deep breath and step inside.`;

  useEffect(() => {
    let index = 0;
    setTypedText('');
    const interval = setInterval(() => {
      setTypedText((prev) => prev + fullText.charAt(index));
      index++;
      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [fullText]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log("Audio playback blocked:", err));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="max-w-xl w-full mx-auto px-4 z-10">
      {musicUrl && <audio ref={audioRef} src={musicUrl} loop />}
      
      <GlassCard className="animate-pulse-glow text-center">
        <div className="script-font text-5xl md:text-6xl text-rose-600 mb-4">
          Dearest {receiverName},
        </div>
        
        <div className="min-h-[120px] text-lg text-slate-700 leading-relaxed mb-8 italic">
          {typedText}
          <span className="animate-ping inline-block w-1.5 h-4 bg-rose-500 ml-1"></span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {musicUrl && (
            <button
              onClick={toggleMusic}
              className="flex items-center gap-2 px-6 py-3 bg-pink-100 hover:bg-pink-200 text-rose-600 rounded-full font-semibold transition-all duration-300 border border-pink-200"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? 'Pause Melody' : 'Play Melody'}
            </button>
          )}

          <button
            onClick={onNext}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full font-semibold transition-all duration-300 shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transform hover:-translate-y-0.5"
          >
            Open Journey <ChevronRight size={18} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default IntroCard;
