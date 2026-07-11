import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHeart } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass"
        style={{ textAlign: 'center', padding: 60, maxWidth: 500, width: '100%' }}
      >
        <div style={{ fontSize: 80, marginBottom: 20 }}>😢</div>
        <h1 style={{
          fontFamily: "'Great Vibes', cursive",
          fontSize: 72,
          color: '#FF4D6D',
          marginBottom: 10,
        }}>
          404
        </h1>
        <h2 style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 24,
          color: '#FFC0CB',
          marginBottom: 20,
        }}>
          Page Not Found
        </h2>
        <p style={{ color: '#999', marginBottom: 30 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <FaHeart /> Go Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
