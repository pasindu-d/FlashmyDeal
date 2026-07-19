import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  auth,
  updateProfile,
  sendEmailVerification,
  signOut
} from '../lib/firebase';
import { UserProfile } from '../types';
import { apiGetUserProfile, apiSaveUserProfile, apiSendVerificationEmail } from '../lib/appsScript';

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
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Set initial mode on open
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setVerifiedSuccess(false);
      setOtpInput('');
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

        // Step 4: Check if user's email is verified in Firebase
        if (!user.emailVerified) {
          // Check if they are verified via database profile in Google Sheets / local storage
          const profile = await apiGetUserProfile(user.uid);
          if (profile && profile.verifiedStatus) {
            // They are verified on our side, proceed to login!
            onAuthSuccess(user);
            onClose();
            return;
          }

          // Send verification email link again in case they missed it
          try {
            await sendEmailVerification(user);
          } catch (verifErr) {
            console.error("sendEmailVerification failed on login:", verifErr);
          }
          // Sign them out immediately to prevent unauthorized state
          await signOut(auth);
          setMode('verify');
          setError('Please verify your email by clicking the link in the verification mail we just sent to you. If you don\'t see it, please check your Inbox or Spam folder. Thank you!');
          return;
        }
        
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
            verifiedStatus: true, // It is verified!
            phone: '',
            listingRefs: [],
            password, // Capture password!
            verifiedDate: new Date().toISOString()
          };
          
          await apiSaveUserProfile(newProfile);
          profile = newProfile;
        } else {
          // Sync/capture password and update verified status to true even if profile exists
          profile.verifiedStatus = true;
          if (!profile.verifiedDate) {
            profile.verifiedDate = new Date().toISOString();
          }
          profile.password = password;
          await apiSaveUserProfile(profile);
        }

        onAuthSuccess(user);
        onClose();

      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Full Name is required');
        if (!String(phone || '').trim()) throw new Error('Phone number is required for buyers/sellers to contact you');
        
        // Step 1: createUserWithEmailAndPassword() sets emailVerified to false and logs them in
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update display name in Firebase Auth
        try {
          await updateProfile(user, { displayName: fullName });
        } catch (profileErr) {
          console.error("Firebase updateProfile failed during signup:", profileErr);
        }

        // Save profile to backend (Google Drive/Local Fallback) with verifiedStatus: false
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
          listingRefs: [],
          password, // Capture password!
        };

        try {
          await apiSaveUserProfile(newProfile);
        } catch (saveErr) {
          console.error("apiSaveUserProfile failed during signup:", saveErr);
        }

        // Step 2: Call sendEmailVerification()
        try {
          await sendEmailVerification(user);
        } catch (verifErr) {
          console.error("Firebase sendEmailVerification failed during signup:", verifErr);
        }

        // Immediately sign the user out
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.error("Firebase signOut failed during signup:", signOutErr);
        }

        // Set mode to 'verify' to show the "check inbox to verify" screen
        setVerificationSent(true);
        setMode('verify');
      }
    } catch (err: any) {
      console.error("Authentication error details:", err);
      let errMsg = 'An unexpected authentication error occurred.';
      if (err.code === 'auth/invalid-credential' || (err.message && err.message.includes('auth/invalid-credential'))) {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use' || (err.message && err.message.includes('auth/email-already-in-use'))) {
        errMsg = 'This email is already registered. If you were in the middle of signing up, please switch to "Log In" with this email and password, then click "Verify instantly (Sandbox Bypass)".';
      } else if (err.code === 'auth/weak-password' || (err.message && err.message.includes('auth/weak-password'))) {
        errMsg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email' || (err.message && err.message.includes('auth/invalid-email'))) {
        errMsg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/user-not-found' || (err.message && err.message.includes('auth/user-not-found'))) {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/wrong-password' || (err.message && err.message.includes('auth/wrong-password'))) {
        errMsg = 'Invalid email or password.';
      } else {
        errMsg = err.message || String(err);
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
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
            /* Firebase Link Verification screen */
            <div className="text-center py-6 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vibrant-teal/10 text-vibrant-teal border border-vibrant-teal/30 mb-2">
                <Mail className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white tracking-tight">Verify Your Email</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Please verify your email address by clicking the link in the mail sent to:<br />
                  <span className="text-vibrant-teal font-medium block mt-1.5 break-all select-all">{email}</span>
                </p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  If you do not see the email, please check your <strong>Inbox</strong> or <strong>Spam folder</strong>. Thank you!
                </p>
              </div>

              <div className="p-4 bg-obsidian-950/60 border border-gray-800 rounded-xl text-left text-xs text-gray-400">
                <p className="text-[11px] leading-relaxed text-gray-500 text-center">
                  <strong>Need a new link?</strong> Simply try to log in again with your email and password, and we will send a fresh verification mail.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-950/40 border border-red-500/20 rounded-lg text-red-200 text-xs text-left">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    try {
                      // Attempt to sign in and verify profile in database
                      const userCredential = await signInWithEmailAndPassword(auth, email, password);
                      const user = userCredential.user;
                      
                      let profile = await apiGetUserProfile(user.uid);
                      if (!profile) {
                        const joinedDate = new Date().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                        profile = {
                          uid: user.uid,
                          email,
                          displayName: fullName || 'Seller',
                          joinedDate,
                          verifiedStatus: true,
                          phone: phone || '',
                          listingRefs: [],
                          password
                        };
                      } else {
                        profile.verifiedStatus = true;
                        profile.verifiedDate = new Date().toISOString();
                      }
                      
                      await apiSaveUserProfile(profile);
                      onAuthSuccess(user);
                      onClose();
                    } catch (bypassErr: any) {
                      console.error("Auto-verification failed:", bypassErr);
                      setError("Could not auto-verify: " + (bypassErr.message || bypassErr));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Verify instantly (Sandbox Bypass)'}
                </button>
                <button
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="w-full bg-gradient-to-r from-vibrant-teal to-blue-500 text-obsidian-950 font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm tracking-wider uppercase"
                >
                  Go to Login
                </button>
                <button
                  onClick={onClose}
                  className="w-full border border-gray-800 hover:bg-white/5 text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all"
                >
                  Got it, close
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
