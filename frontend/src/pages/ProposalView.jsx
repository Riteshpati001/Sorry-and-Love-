import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import IntroCard from '../components/IntroCard';
import GallerySection from '../components/GallerySection';
import BrickBreaker from '../components/BrickBreaker';
import GiftBoxes from '../components/GiftBoxes';
import ProposalCard from '../components/ProposalCard';
import ThankYouCard from '../components/ThankYouCard';
import FloatingHearts from '../components/FloatingHearts';
import { HeartCrack } from 'lucide-react';

const ProposalView = () => {
  const { slug } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const fetchProposal = async () => {
    try {
      const response = await apiFetch(`/api/proposals/slug/${slug}`);
      const data = await response.json();
      if (data.success) {
        setProposal(data.proposal);
        if (data.proposal.status !== 'pending') {
          setStep(6);
        }
      } else {
        setError(data.message || 'Experience expired or deleted.');
      }
    } catch (err) {
      setError('An error occurred loading the page experience.');
    } finally {
      setLoading(false);
    }
  };

  // SAFETY CHECK: Handle undefined or empty slug before trying to fetch
  useEffect(() => {
    if (!slug || slug === 'undefined') {
      setError('The link you received is broken, incomplete, or invalid. Please ask the sender to generate and send a new link.');
      setLoading(false);
      return;
    }
    fetchProposal();
  }, [slug]);

  const handleDecision = async (responseStatus) => {
    try {
      const response = await apiFetch(`/api/proposals/slug/${slug}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response: responseStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setProposal({ ...proposal, status: responseStatus });
        setStep(6);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-100 to-lavender-100">
        <div className="animate-bounce text-rose-500 font-bold text-lg">Unfolding secure invitation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-rose-50 via-pink-100 to-lavender-100 px-4 text-center">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-4">
          <HeartCrack size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Experience Offline</h2>
        <p className="text-sm text-slate-500 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center relative py-12 bg-gradient-to-br from-rose-50 via-pink-100 to-lavender-100 overflow-x-hidden">
      <FloatingHearts />

      {step === 1 && (
        <IntroCard
          receiverName={proposal.receiverName}
          introMessage={proposal.introMessage}
          musicUrl={proposal.musicUrl}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <GallerySection
          slug={slug}
          media={proposal.media}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <BrickBreaker
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <GiftBoxes
          onNext={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <ProposalCard
          receiverName={proposal.receiverName}
          proposalMessage={proposal.proposalMessage}
          onAccept={() => handleDecision('accepted')}
          onReject={() => handleDecision('rejected')}
        />
      )}

      {step === 6 && (
        <ThankYouCard
          status={proposal.status}
          receiverName={proposal.receiverName}
        />
      )}
    </div>
  );
};

export default ProposalView;
