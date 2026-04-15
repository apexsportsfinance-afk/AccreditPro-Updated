import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Shield, Mail, Lock, AlertCircle, Waves, Droplets } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../contexts/AuthContext";
import SwimmingBackground from "../../components/ui/SwimmingBackground";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate("/admin");
      } else {
        setError(result.error);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login_page" className="min-h-screen flex items-center justify-center p-4 relative bg-[linear-gradient(135deg,#050d1f_0%,#0c4a6e_100%)] overflow-hidden">
      {/* Decorative premium elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ocean-500/10 rounded-full blur-[120px]" />
      
      <div className="absolute top-20 left-10 opacity-10">
        <Droplets className="w-12 h-12 text-cyan-400 animate-bounce" style={{ animationDuration: "4s" }} />
      </div>
      <div className="absolute bottom-20 right-10 opacity-10">
        <Waves className="w-20 h-20 text-blue-400 animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="w-24 h-24 rounded-3xl bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-2xl relative group"
          >
            <Shield className="w-12 h-12 text-primary-400 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-primary-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tight text-white mb-3 uppercase italic">
            Swim<span className="text-primary-500">Accredit</span>
          </h1>
          <p className="text-slate-400 font-medium tracking-[0.3em] uppercase text-xs">Premium Portal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="glass-panel rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative z-10"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-200">{error}</p>
            </motion.div>
          )}

          <div className="space-y-6 relative z-10">
            <div className="relative group">
              <Mail className="absolute left-4 top-[42px] w-5 h-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@accreditpro.com"
                className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 h-14 rounded-2xl"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-[42px] w-5 h-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 h-14 rounded-2xl"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-400 text-white h-14 rounded-2xl text-lg font-black shadow-[0_8px_32px_-8px_rgba(14,165,233,0.5)] active:scale-[0.98] transition-all"
            loading={loading}
          >
            Authenticate
          </Button>

          <div className="text-center pt-4 border-t border-white/5">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Access Credentials</p>
            <div className="inline-flex gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-xs text-slate-400">admin@company.com</span>
              <span className="text-xs text-primary-500/50 font-black">/</span>
              <span className="text-xs text-slate-400">admin</span>
            </div>
          </div>
        </form>

        <p className="text-center mt-8">
          <Link to="/" className="text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <span>←</span> Home Portal
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
