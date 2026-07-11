import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import FloatingHearts from '../components/FloatingHearts';

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center relative px-4 overflow-hidden">
      <FloatingHearts />
      
      <div className="z-10 text-center max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
            <Heart size={44} fill="currentColor" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-rose-600 mb-4 script-font">
          HeartLink
        </h1>
        <p className="text-xl md:text-2xl font-light text-slate-700 mb-8 italic">
          Design beautiful, interactive romantic experiences & elegant proposals
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full font-bold shadow-md transition-all text-center"
          >
            Create Your Proposal Link
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 bg-white/70 hover:bg-white text-rose-600 border border-rose-200 rounded-full font-bold shadow-sm transition-all text-center"
          >
            Access Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
