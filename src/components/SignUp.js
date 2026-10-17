
import React, { useState, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../api";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaEnvelope,
  FaLeaf,
  FaLock,
  FaUser,
  FaShieldAlt,
} from "react-icons/fa";
import "./Auth.css";

const SignUp = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [verificationMode, setVerificationMode] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const otpInputRefs = useRef([]);
  const navigate = useNavigate();

  // REGISTER USER
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const response = await axios.post(
        `${API_BASE_URL}/api/register`,
        {
          username: username.trim(),
          email: normalizedEmail,
          password,
        }
      );

      setEmail(normalizedEmail);
      setOtp("");
      setVerificationMode(true);

      setSuccess(
        response.data.message ||
          "Verification code sent to your email."
      );

      setPassword("");
      setConfirmPassword("");

      // Focus the first OTP box after the screen updates.
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // VERIFY EMAIL OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const response = await axios.post(
        `${API_BASE_URL}/api/verify-email`,
        {
          email: normalizedEmail,
          otp: otp.trim(),
        }
      );

      setSuccess(
        response.data.message ||
          "Email verified successfully!"
      );

      setOtp("");

      // Redirect to Sign In after successful verification.
      setTimeout(() => {
        navigate("/login", {
          state: {
            verifiedEmail: normalizedEmail,
          },
        });
      }, 1200);
    } catch (err) {
      console.error("OTP verification error:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle typing in individual OTP boxes.
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const digits = otp.split("");

    digits[index] = digit;

    const nextOtp = digits.join("").slice(0, 6);
    setOtp(nextOtp);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace and arrow-key navigation.
  const handleOtpKeyDown = (e, index) => {
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      otpInputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Support pasting the complete six-digit code.
  const handleOtpPaste = (e) => {
    e.preventDefault();

    const pastedOtp = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedOtp) return;

    setOtp(pastedOtp);

    const nextIndex = Math.min(pastedOtp.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="auth-page auth-page--signup">
      <div className="auth-content">
        {/* LEFT HERO */}
        <section className="auth-hero">
          <div className="auth-hero-content">
            <div className="auth-welcome">
              WELCOME TO TASTE OF HEAVEN
            </div>

            <div className="auth-title-line"></div>

            <h1>
              Good Food
              <br />
              Brings People <span>Together</span>
            </h1>

            <p className="auth-description">
              Discover delicious recipes, share your
              favourites, and be part of a community
              that loves food.
            </p>
          </div>
        </section>

        {/* RIGHT CARD */}
        <section className="auth-form-section">
          <div
            className={`auth-card ${
              verificationMode ? "auth-card--google-otp" : ""
            }`}
          >
            <div className="auth-card-decoration">
              <span></span>
              <FaLeaf />
              <span></span>
            </div>

            {verificationMode ? (
              <>
                <h2>Verify Your Email</h2>

                <p className="auth-otp-intro">
                  One last step to join Taste of Heaven
                </p>

                <p className="auth-otp-intro">
                  Enter the 6-digit verification code sent to:
                </p>

                <p className="auth-otp-email">{email}</p>

                {error && (
                  <div className="auth-error">{error}</div>
                )}

                {success && (
                  <div className="auth-success">{success}</div>
                )}

                <form
                  onSubmit={handleVerifyOtp}
                  className="auth-form"
                >
                  <div className="auth-form-group">
                    <label>
                      <FaShieldAlt />
                      <span>Verification Code</span>
                    </label>

                    <div className="auth-otp-boxes">
                      {Array.from({ length: 6 }, (_, index) => (
                        <input
                          key={index}
                          ref={(element) => {
                            otpInputRefs.current[index] = element;
                          }}
                          className="auth-otp-digit"
                          type="text"
                          inputMode="numeric"
                          autoComplete={
                            index === 0 ? "one-time-code" : "off"
                          }
                          aria-label={`Verification digit ${index + 1}`}
                          value={otp[index] || ""}
                          maxLength={1}
                          required
                          disabled={loading}
                          onChange={(e) =>
                            handleOtpChange(index, e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleOtpKeyDown(e, index)
                          }
                          onPaste={handleOtpPaste}
                        />
                      ))}
                    </div>

                    <p className="auth-otp-help">
                      Your verification code expires 10 minutes
                      after it is sent.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="auth-otp-submit"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify Email"}
                    {!loading && <FaArrowRight />}
                  </button>
                </form>

                <div className="auth-otp-divider">
                  <span></span>
                  <strong>OR</strong>
                  <span></span>
                </div>

                <Link to="/login" className="auth-otp-back">
                  Already verified? Sign In
                </Link>
              </>
            ) : (
              <>
                <h2>Create Account</h2>

                <p className="auth-subtitle">
                  Join Taste of Heaven
                </p>

                <p className="auth-subtitle-small">
                  Create an account and start sharing your
                  favourite recipes.
                </p>

                {error && (
                  <div className="auth-error">{error}</div>
                )}

                {success && (
                  <div className="auth-success">{success}</div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="auth-form"
                >
                  {/* USERNAME */}
                  <div className="auth-form-group">
                    <label htmlFor="username">
                      <FaUser />
                      <span>Username</span>
                    </label>

                    <div className="auth-input-wrapper">
                      <FaUser className="auth-input-icon" />

                      <input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value)
                        }
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
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
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div className="auth-form-group">
                    <label htmlFor="password">
                      <FaLock />
                      <span>Password</span>
                    </label>

                    <div className="auth-input-wrapper">
                      <FaLock className="auth-input-icon" />

                      <input
                        id="password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <small className="auth-field-hint">
                      Password must contain at least 8 characters.
                    </small>
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div className="auth-form-group">
                    <label htmlFor="confirmPassword">
                      <FaLock />
                      <span>Confirm Password</span>
                    </label>

                    <div className="auth-input-wrapper">
                      <FaLock className="auth-input-icon" />

                      <input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(e.target.value)
                        }
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  {/* REGISTER BUTTON */}
                  <button
                    type="submit"
                    className="auth-submit-button"
                    disabled={loading}
                  >
                    <span>
                      {loading
                        ? "Creating Account..."
                        : "Create Account"}
                    </span>

                    {!loading && <FaArrowRight />}
                  </button>
                </form>

                <p className="auth-switch">
                  Already have an account?{" "}
                  <Link to="/login">Sign In</Link>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SignUp;
