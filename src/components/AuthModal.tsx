import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  auth,
  updateProfile
} from '../lib/firebase';
import { UserProfile } from '../types';
import { apiGetUserProfile, apiSaveUserProfile } from '../lib/appsScript';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Set initial mode on open
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Fetch or create user profile on backend
        let profile = await apiGetUserProfile(user.uid);
        if (!profile) {
          // If profile doesn't exist on backend, create it
          const joinedDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || email,
            displayName: user.displayName || 'Seller',
            joinedDate,
            verifiedStatus: user.emailVerified,
            phone: '',
            listingRefs: []
          };
          
          await apiSaveUserProfile(newProfile);
        }

        // Check if user is verified
        if (!user.emailVerified) {
          setMode('verify');
        } else {
          // Sync verification status to database
          await apiSaveUserProfile({
            uid: user.uid,
            email: user.email || email,
            displayName: user.displayName || 'Seller',
            joinedDate: new Date().toLocaleDateString(),
            verifiedStatus: true,
            phone: '',
            listingRefs: []
          });
          onAuthSuccess(user);
          onClose();
        }

      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Full Name is required');
        if (!phone.trim()) throw new Error('Phone number is required for buyers/sellers to contact you');
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update display name in Firebase Auth
        await updateProfile(user, { displayName: fullName });

        // Send email verification
        await sendEmailVerification(user);
        setVerificationSent(true);

        // Save profile to backend (Google Drive/Local Fallback)
        const joinedDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const newProfile: UserProfile = {
          uid: user.uid,
          email,
          displayName: fullName,
          joinedDate,
          verifiedStatus: false,
          phone,
          listingRefs: []
        };

        await apiSaveUserProfile(newProfile);

        setMode('verify');
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message;
      if (err.code === 'auth/invalid-credential') errMsg = 'Invalid email or password.';
      else if (err.code === 'auth/email-already-in-use') errMsg = 'This email is already in use.';
      else if (err.code === 'auth/weak-password') errMsg = 'Password should be at least 6 characters.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      setLoading(true);
      try {
        await sendEmailVerification(auth.currentUser);
        setVerificationSent(true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSkipOrDone = () => {
    if (auth.currentUser) {
      // Allow user to use dashboard as read-only/unverified
      onAuthSuccess(auth.currentUser);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl glass-panel glow-teal"
        id="auth-modal-container"
      >
        {/* Border glow accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-vibrant-teal via-electric-amber to-vibrant-teal" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {mode !== 'verify' ? (
            <>
              {/* Header */}
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-sm text-gray-400">
                  {mode === 'login' 
                    ? 'Access Sri Lanka\'s premium flash marketplace' 
                    : 'Get started and post lightning-fast deals'}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 flex items-start gap-3 p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-200 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="E.g. Shanaka Perera"
                          className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Contact Phone Number</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="E.g. 0771234567"
                          className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-obsidian-950/80 border border-gray-800 rounded-xl py-3 pl-11 pr-11 text-sm text-white focus:outline-none focus:border-vibrant-teal focus:ring-1 focus:ring-vibrant-teal transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-vibrant-teal to-blue-500 text-obsidian-950 font-bold py-3 px-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center text-sm tracking-wider uppercase"
                >
                  {loading ? 'Processing...' : mode === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              </form>

              {/* Mode Toggle */}
              <div className="mt-6 text-center text-xs text-gray-400">
                {mode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button onClick={() => setMode('signup')} className="text-vibrant-teal hover:underline font-semibold">
                      Sign up for free
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button onClick={() => setMode('login')} className="text-vibrant-teal hover:underline font-semibold">
                      Log in here
                    </button>
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Email Verification Prompt Mode */
            <div className="text-center py-4 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-electric-amber/10 text-electric-amber border border-electric-amber/30 mb-2">
                <Mail className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Verify Your Email</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  A verification link has been sent to <span className="text-vibrant-teal font-medium">{email}</span>.
                </p>
              </div>

              <div className="p-4 bg-obsidian-950/60 border border-gray-800 rounded-xl text-left text-xs text-gray-400 space-y-3">
                <p className="font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-electric-amber" /> Mandatory Email Verification
                </p>
                <p>
                  To secure the FlashmyDeal community and prevent scam postings, you must verify your email address before listing any items.
                </p>
                <p>
                  Click the link in the email we sent you, then refresh or sign in again to unlock all posting features.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-950/40 border border-red-500/20 rounded-lg text-red-200 text-xs text-left">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSkipOrDone}
                  className="w-full bg-vibrant-teal text-obsidian-950 font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm tracking-wider uppercase"
                >
                  I've Verified My Email
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="flex-1 border border-gray-800 hover:bg-white/5 text-gray-300 font-semibold py-2 px-3 rounded-lg text-xs transition-all"
                  >
                    {verificationSent ? 'Resent!' : 'Resend Email'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 border border-gray-800 hover:bg-white/5 text-gray-300 font-semibold py-2 px-3 rounded-lg text-xs transition-all"
                  >
                    Browse First
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
