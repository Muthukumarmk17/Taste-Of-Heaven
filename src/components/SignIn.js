
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaLock,
  FaLeaf,
} from "react-icons/fa";
import "./Auth.css";

const SignIn = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OTP verification state
  const [googleOtpRequired, setGoogleOtpRequired] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef([]);

  const navigate = useNavigate();
  const location = useLocation();

  const otp = otpDigits.join("");

  // Handle redirects from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleOtp = params.get("googleOtpRequired");
    const googleEmail = params.get("email");
    const googleStatus = params.get("google");

    if (googleOtp === "true") {
      setGoogleOtpRequired(true);
      setEmail((googleEmail || "").trim().toLowerCase());
      setPassword("");
      setOtpDigits(["", "", "", "", "", ""]);
      setError("");

      window.history.replaceState({}, document.title, "/login");
      return;
    }

    if (googleStatus === "success") {
      handleGoogleSuccess();
      return;
    }

    if (googleStatus === "failed") {
      setError("Google sign-in failed. Please try again.");
      window.history.replaceState({}, document.title, "/login");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Retrieve the logged-in Google user from the backend
  const handleGoogleSuccess = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/auth/google/success`,
        { withCredentials: true }
      );

      const userData = response.data;

      localStorage.setItem("user", JSON.stringify(userData));

      if (onLogin) {
        onLogin(userData);
      }

      window.history.replaceState({}, document.title, "/login");
      navigate("/");
    } catch (err) {
      console.error("Google login error:", err);
      setError(
        err.response?.data?.error ||
          "Google sign-in failed. Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // Normal email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/login`,
        {
          email: email.trim().toLowerCase(),
          password,
        },
        { withCredentials: true }
      );

      const userData = response.data;

      localStorage.setItem("user", JSON.stringify(userData));

      if (onLogin) {
        onLogin(userData);
      }

      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.error ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  // Start Google OAuth
  const handleGoogleLogin = () => {
    setError("");
    setGoogleLoading(true);
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  // Update one OTP box and move focus to the next
  const handleOtpDigitChange = (index, rawValue) => {
    const digits = rawValue.replace(/\D/g, "");

    if (!digits) {
      setOtpDigits((current) =>
        current.map((digit, i) => (i === index ? "" : digit))
      );
      return;
    }

    // Support typing or pasting multiple digits
    const pasted = digits.slice(0, 6).split("");

    setOtpDigits((current) => {
      const next = [...current];

      if (pasted.length > 1) {
        next.fill("");

        pasted.forEach((digit, offset) => {
          if (offset < 6) {
            next[offset] = digit;
          }
        });
      } else {
        next[index] = pasted[0];
      }

      return next;
    });

    if (pasted.length > 1) {
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    } else if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Backspace and arrow-key navigation
  const handleOtpKeyDown = (index, e) => {
    if (
      e.key === "Backspace" &&
      !otpDigits[index] &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Support pasting the complete code
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    e.preventDefault();

    const next = ["", "", "", "", "", ""];

    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });

    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // Verify OTP received after Google sign-in
  const handleGoogleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the six-digit verification code.");
      return;
    }

    if (!email.trim()) {
      setError(
        "Your email address is missing. Please try Google sign-in again."
      );
      return;
    }

    setOtpLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/verify-email`,
        {
          email: email.trim().toLowerCase(),
          otp,
          googleOtpLogin: true,
        },
        { withCredentials: true }
      );

      const userData = response.data.user;

      if (response.data.loggedIn !== true || !userData) {
        setError(
          response.data.message ||
            "Your email was verified, but login was not completed. Please sign in again."
        );
        return;
      }

      localStorage.setItem("user", JSON.stringify(userData));

      if (onLogin) {
        onLogin(userData);
      }

      setGoogleOtpRequired(false);
      navigate("/");
    } catch (err) {
      console.error("Google OTP verification error:", err);
      setError(
        err.response?.data?.error ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setError("Forgot password functionality is not connected yet.");
  };

  // Return from OTP verification to normal sign-in
  const returnToSignIn = () => {
    setGoogleOtpRequired(false);
    setOtpDigits(["", "", "", "", "", ""]);
    setError("");
    navigate("/login", { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-content">
        {/* Left-side welcome section */}
        <section className="auth-hero">
          <div className="auth-hero-content">
            <div className="auth-welcome">
              WELCOME TO TASTE OF HEAVEN
            </div>

            <div className="auth-title-line" />

            <h1>
              Good Food
              <br />
              Brings People <span>Together</span>
            </h1>

            <p className="auth-description">
              Discover delicious recipes, share your favourites,
              and be part of a community that loves food.
            </p>
          </div>
        </section>

        {/* Right-side sign-in / OTP section */}
        <section
          className={`auth-form-section ${
            googleOtpRequired ? "auth-form-section--otp" : ""
          }`}
        >
          <div
            className={`auth-card ${
              googleOtpRequired ? "auth-card--google-otp" : ""
            }`}
          >
            <div className="auth-card-decoration">
              <span />
              <FaLeaf />
              <span />
            </div>

            <h2>
              {googleOtpRequired ? "Verify Your Email" : "Sign In"}
            </h2>

            {googleOtpRequired ? (
              <>
                <p className="auth-subtitle auth-otp-intro">
                  We&apos;ve sent a 6-digit verification code to
                </p>

                <p className="auth-otp-email">{email}</p>

                {error && (
                  <div className="auth-error" role="alert">
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleGoogleOtpSubmit}
                  className="auth-form auth-otp-form"
                >
                  {/* Six separate OTP boxes */}
                  <div
                    className="auth-otp-boxes"
                    role="group"
                    aria-label="Six-digit verification code"
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpRefs.current[index] = element;
                        }}
                        className="auth-otp-digit"
                        type="text"
                        inputMode="numeric"
                        autoComplete={
                          index === 0 ? "one-time-code" : "off"
                        }
                        aria-label={`Verification digit ${index + 1}`}
                        maxLength={6}
                        value={digit}
                        onChange={(e) =>
                          handleOtpDigitChange(index, e.target.value)
                        }
                        onKeyDown={(e) =>
                          handleOtpKeyDown(index, e)
                        }
                        onPaste={handleOtpPaste}
                        required
                      />
                    ))}
                  </div>

                  <p className="auth-otp-help">
                    Enter the 6-digit code to complete your sign in
                    with Google.
                  </p>

                  <button
                    type="submit"
                    className="auth-submit-button auth-otp-submit"
                    disabled={otpLoading || otp.length !== 6}
                  >
                    <span>
                      {otpLoading ? "Verifying..." : "Verify Code"}
                    </span>
                    {!otpLoading && <FaArrowRight />}
                  </button>

                  <div className="auth-divider auth-otp-divider">
                    <span />
                    <strong>OR</strong>
                    <span />
                  </div>

                  <button
                    type="button"
                    className="auth-text-button auth-otp-back"
                    onClick={returnToSignIn}
                  >
                    <span aria-hidden="true">←</span>
                    Back to Sign In
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="auth-subtitle">
                  Welcome back to Taste of Heaven
                </p>

                <p className="auth-subtitle-small">
                  Explore, save and enjoy your favourite recipes.
                </p>

                {error && (
                  <div className="auth-error" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="auth-form-group">
                    <label htmlFor="email">
                      <FaEnvelope />
                      <span>Email</span>
                    </label>

                    <div className="auth-input-wrapper">
                      <FaEnvelope className="auth-input-icon" />
                      <input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="password">
                      <FaLock />
                      <span>Password</span>
                    </label>

                    <div className="auth-input-wrapper">
                      <FaLock className="auth-input-icon" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className="forgot-password-wrapper">
                    <a
                      href="#forgot-password"
                      onClick={handleForgotPassword}
                    >
                      Forgot Password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-button"
                    disabled={loading}
                  >
                    <span>
                      {loading ? "Signing In..." : "Sign In"}
                    </span>
                    {!loading && <FaArrowRight />}
                  </button>
                </form>

                <div className="auth-divider">
                  <span />
                  <strong>OR</strong>
                  <span />
                </div>

                <button
                  type="button"
                  className="google-login-button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  <FaGoogle />
                  <span>
                    {googleLoading
                      ? "Connecting to Google..."
                      : "Continue with Google"}
                  </span>
                </button>

                <p className="auth-switch">
                  Don&apos;t have an account?{" "}
                  <Link to="/signup">Sign Up</Link>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SignIn;
