import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { type Testimonial } from "@/components/ui/sign-in";

// --- Testimonials data (2 cards only) ---
const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "DialerJazz transformed our outbound flow. The power dialer saves us hours every day!",
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "Clean UI, incredibly fast calling. Our SDR team tripled their connect rates.",
  },
];

// --- Google Icon ---
const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// --- Glass Input Wrapper ---
const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

// --- Testimonial Card ---
const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div
    className={`animate-testimonial ${delay} flex items-start gap-3 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 p-4 w-60 shrink-0`}
  >
    <img
      src={testimonial.avatarSrc}
      className="size-9 object-cover rounded-xl flex-shrink-0"
      alt={testimonial.name}
    />
    <div className="text-xs leading-snug min-w-0">
      <p className="font-semibold text-white truncate">{testimonial.name}</p>
      <p className="text-white/50 text-[11px]">{testimonial.handle}</p>
      <p className="mt-1 text-white/75 line-clamp-2">{testimonial.text}</p>
    </div>
  </div>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    signIn,
    signUp,
    verifyEmail,
    resendVerificationEmail,
    signInWithGoogle,
    resetPassword,
    exchangeResetPasswordToken,
    confirmPasswordReset,
    user,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "verify-email" | "forgot-step1" | "forgot-step2">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // --- Handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgot-step1") {
      if (!email) return toast.error("Please enter your email address.");
      setIsLoading(true);
      try {
        await resetPassword(email);
        toast.success("Recovery code sent! Check your inbox.");
        setMode("forgot-step2");
      } catch (err: any) {
        toast.error(err?.message || "Failed to send recovery email.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (mode === "forgot-step2") {
      if (!otp || !password) return toast.error("Enter the 6-digit code and a new password.");
      setIsLoading(true);
      try {
        const token = await exchangeResetPasswordToken(email, otp);
        await confirmPasswordReset(password, token);
        toast.success("Password updated! You can now sign in.");
        setMode("signin");
        setPassword("");
        setOtp("");
      } catch (err: any) {
        toast.error(err?.message || "Invalid or expired recovery code.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (mode === "verify-email") {
      if (!otp) return toast.error("Please enter the 6-digit verification code.");
      setIsLoading(true);
      try {
        await verifyEmail(email, otp);
        toast.success("Email verified! Welcome to DialerJazz.");
      } catch (err: any) {
        toast.error(err?.message || "Invalid or expired verification code.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "signup") {
        const result = await signUp(email, password);
        if (result.requireEmailVerification) {
          toast.success("Account created! Check your email for a verification code.");
          setPassword("");
          setOtp("");
          setMode("verify-email");
        } else {
          toast.success("Account created successfully. Preparing your dashboard...");
        }
      } else {
        await signIn(email, password);
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const titleMap: Record<string, string> = {
    signin: "Welcome back",
    signup: "Create Account",
    "verify-email": "Verify Email",
    "forgot-step1": "Reset Password",
    "forgot-step2": "New Password",
  };

  const descMap: Record<string, string> = {
    signin: "Sign in to your DialerJazz dashboard and start dialing",
    signup: "Enter your details to create a new account",
    "verify-email": `Enter the 6-digit code sent to ${email}`,
    "forgot-step1": "Enter your email to receive a recovery code",
    "forgot-step2": `Enter the code sent to ${email}`,
  };

  const btnLabel = isLoading
    ? mode === "signin"
      ? "Signing in..."
      : mode === "signup"
        ? "Creating account..."
        : mode === "verify-email"
          ? "Verifying..."
          : "Sending..."
    : mode === "signin"
      ? "Sign In"
      : mode === "signup"
        ? "Create Account"
        : mode === "verify-email"
          ? "Verify Email"
          : mode === "forgot-step1"
            ? "Send Recovery Code"
            : "Update Password";

  // --- Render ---

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw] bg-background text-foreground">
      {/* ─── LEFT: Sign-in form ─── */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            {/* Logo for mobile */}
            <div className="md:hidden flex justify-center mb-2">
              <img src="/logo.png" alt="DialerJazz" className="h-20 w-auto object-contain" />
            </div>

            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              <span className="font-light text-foreground tracking-tighter">{titleMap[mode]}</span>
            </h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">{descMap[mode]}</p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email — hidden during verify-email and forgot-step2 */}
              {mode !== "forgot-step2" && mode !== "verify-email" && (
                <div className="animate-element animate-delay-300">
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <GlassInputWrapper>
                    <input
                      name="email"
                      type="email"
                      placeholder="sales@jazzcaller.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      required
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                    />
                  </GlassInputWrapper>
                </div>
              )}

              {/* OTP — verify-email and forgot-step2 */}
              {(mode === "forgot-step2" || mode === "verify-email") && (
                <div className="animate-element animate-delay-300">
                  <label className="text-sm font-medium text-muted-foreground">
                    {mode === "verify-email" ? "Verification Code" : "Recovery Code"}
                  </label>
                  <GlassInputWrapper>
                    <input
                      name="otp"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      required
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-center text-2xl tracking-[0.5em] font-mono"
                    />
                  </GlassInputWrapper>
                </div>
              )}

              {/* Password — hidden during verify-email and forgot-step1 */}
              {mode !== "forgot-step1" && mode !== "verify-email" && (
                <div className="animate-element animate-delay-400">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      {mode === "forgot-step2" ? "New Password" : "Password"}
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot-step1")}
                        className="text-sm text-violet-400 hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                        ) : (
                          <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              )}

              {/* Remember me — signin only */}
              {mode === "signin" && (
                <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                    <span className="text-foreground/90">Keep me signed in</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {btnLabel}
              </button>
            </form>

            {/* Divider + Google — signin/signup only */}
            {(mode === "signin" || mode === "signup") && (
              <>
                <div className="animate-element animate-delay-700 relative flex items-center justify-center">
                  <span className="w-full border-t border-border"></span>
                  <span className="px-4 text-sm text-muted-foreground bg-background absolute">Or continue with</span>
                </div>

                <button
                  onClick={signInWithGoogle}
                  className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </>
            )}

            {/* Bottom link */}
            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              {mode === "signin" && (
                <>
                  New to DialerJazz?{" "}
                  <button onClick={() => setMode("signup")} className="text-violet-400 hover:underline transition-colors">
                    Create Account
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setMode("signin")} className="text-violet-400 hover:underline transition-colors">
                    Sign In
                  </button>
                </>
              )}
              {mode === "verify-email" && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await resendVerificationEmail(email);
                        toast.success("Verification code resent! Check your inbox.");
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to resend code.");
                      }
                    }}
                    className="text-violet-400 hover:underline transition-colors"
                  >
                    Resend verification code
                  </button>
                  {" · "}
                  <button
                    onClick={() => {
                      setMode("signin");
                      setOtp("");
                    }}
                    className="text-violet-400 hover:underline transition-colors"
                  >
                    Back to Sign In
                  </button>
                </>
              )}
              {(mode === "forgot-step1" || mode === "forgot-step2") && (
                <>
                  Remember your password?{" "}
                  <button
                    onClick={() => {
                      setMode("signin");
                      setOtp("");
                    }}
                    className="text-violet-400 hover:underline transition-colors"
                  >
                    Back to Sign In
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ─── RIGHT: Hero image + Testimonial cards ─── */}
      <section className="hidden md:flex flex-1 relative p-4">
        {/* Logo with full gradient background */}
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-300/40 via-violet-200/30 to-amber-200/30"
        >
          <img
            src="/logo.png"
            alt="DialerJazz"
            className="size-full object-cover"
          />
        </div>

        {/* Testimonial cards — pinned to bottom, 2 cards */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10 max-w-full px-6">
          <TestimonialCard testimonial={sampleTestimonials[0]} delay="animate-delay-1000" />
          <TestimonialCard testimonial={sampleTestimonials[1]} delay="animate-delay-1200" />
        </div>
      </section>
    </div>
  );
}
