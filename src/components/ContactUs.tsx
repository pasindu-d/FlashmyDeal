import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, CheckCircle2, AlertCircle, ArrowLeft, MessageSquare, User, Tag } from 'lucide-react';

interface ContactUsProps {
  onBack: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  initialUserEmail?: string;
  initialUserName?: string;
}

export default function ContactUs({ onBack, showToast, initialUserEmail, initialUserName }: ContactUsProps) {
  const [name, setName] = useState(initialUserName || '');
  const [email, setEmail] = useState(initialUserEmail || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!email.trim()) {
      showToast('Please enter your email', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Please enter a subject', 'error');
      return;
    }
    if (!message.trim()) {
      showToast('Please enter your message', 'error');
      return;
    }

    setIsSending(true);
    setError(null);

    const targetEmail = "wmpdhananjaya@gmail.com";

    try {
      // 1. Store locally for state confirmation / message history
      const savedMessages = JSON.parse(localStorage.getItem('contact-messages') || '[]');
      savedMessages.push({
        name,
        email,
        subject,
        message,
        date: new Date().toISOString()
      });
      localStorage.setItem('contact-messages', JSON.stringify(savedMessages));

      // 2. Real API Submission via FormSubmit AJAX (Option A)
      const response = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          _subject: subject || "FlashmyDeal Marketplace Inquiry",
          name: name,
          email: email,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error("FormSubmit response not OK");
      }

      setSubmitted(true);
      setSubject('');
      setMessage('');
      showToast('Your message has been sent successfully!', 'success');
    } catch (err: any) {
      console.warn("API submission failed, falling back to mailto client...", err);
      
      // Fallback: If offline or service is unreachable, trigger mailto client gracefully
      const mailtoLink = `mailto:${targetEmail}?subject=${encodeURIComponent(subject || 'FlashmyDeal Enquiry')}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
      
      const link = document.createElement('a');
      link.href = mailtoLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSubmitted(true);
      setSubject('');
      setMessage('');
      showToast('Redirected to mail client to send message.', 'success');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back navigation */}
      <button
        onClick={onBack}
        className="group mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-vibrant-teal transition-colors cursor-pointer"
        id="contact-back-btn"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to listings
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-gray-800 bg-obsidian-950/60 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6"
      >
        {submitted ? (
          <div className="text-center py-12 space-y-4" id="contact-success-screen">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white uppercase tracking-tight sm:text-2xl">
                Message Sent!
              </h2>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Thank you for contacting us, <span className="text-white font-semibold">{name}</span>. Your message has been dispatched securely to our team.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={onBack}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition-all cursor-pointer uppercase tracking-wider"
                id="contact-success-back-btn"
              >
                Return to Marketplace
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" id="contact-form">
            <div className="space-y-1.5 border-b border-gray-800/80 pb-4">
              <h2 className="text-xl font-extrabold tracking-tight text-white uppercase flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-vibrant-teal" />
                Contact Us
              </h2>
              <p className="text-xs text-gray-500">
                Have a question or feedback? Drop us a message and we'll get straight back to you.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Name field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-obsidian-900 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal font-medium"
                  id="contact-name-input"
                />
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  Your Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-obsidian-900 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal font-medium"
                  id="contact-email-input"
                />
              </div>

              {/* Subject field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gray-500" />
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="What is this regarding?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-obsidian-900 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal font-medium"
                  id="contact-subject-input"
                />
              </div>

              {/* Message field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  Message
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-obsidian-900 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-vibrant-teal font-medium resize-none leading-relaxed"
                  id="contact-message-textarea"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-vibrant-teal to-blue-600 text-obsidian-950 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_15px_rgba(0,242,254,0.2)] transition-all uppercase tracking-wider cursor-pointer min-w-[140px]"
                id="contact-submit-btn"
              >
                {isSending ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-obsidian-950 border-t-transparent"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 fill-current" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
