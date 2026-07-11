import React from 'react';

const GlassCard = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel p-8 md:p-12 rounded-3xl shadow-2xl relative border overflow-hidden ${className}`}>
      <div className="absolute top-4 left-6 w-3 h-3 bg-pink-300 rounded-full animate-sparkle opacity-60 pointer-events-none" />
      <div className="absolute bottom-6 right-8 w-4 h-4 bg-rose-200 rounded-full animate-sparkle opacity-50 pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
