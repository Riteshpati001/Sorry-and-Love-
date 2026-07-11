import React, { useState, useRef } from 'react';
import { Mic, Square, Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

const VoiceRecorder = ({ proposalId, onUploadSuccess }) => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    setAudioUrl('');
    setAudioBlob(null);
    setStatus('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioBlob(audioBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Error starting media device recording:', err);
      setStatus('Microphone access denied or unsupported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    setUploading(true);
    setStatus('');

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voicenote.webm');

    try {
      const response = await apiFetch(`/api/proposals/${proposalId}/voice-note`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setStatus('Voice note uploaded directly to AWS S3 successfully!');
        setAudioBlob(null);
        setAudioUrl('');
        onUploadSuccess(data.media);
      } else {
        setStatus(data.message || 'Error occurred while saving voice note.');
      }
    } catch (error) {
      console.error('AWS S3 voice note sync failed:', error);
      setStatus('Connection or storage configuration error.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Record Voice Note</span>
        {recording && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            <Mic size={14} /> Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all animate-pulse"
          >
            <Square size={14} /> Stop Recording
          </button>
        )}
      </div>

      {audioUrl && (
        <div className="space-y-3 pt-2">
          <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader className="animate-spin" size={14} /> Uploading directly to AWS S3...
              </>
            ) : (
              'Save & Attach Voice Note'
            )}
          </button>
        </div>
      )}

      {status && (
        <div className={`text-xs text-center p-2 rounded-lg flex items-center justify-center gap-1.5 ${
          status.includes('successfully') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
        }`}>
          {status.includes('successfully') ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {status}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
