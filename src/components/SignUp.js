import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../api";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaEnvelope,
  FaLeaf,
  FaLock,
  FaUser,
} from "react-icons/fa";
import "./Auth.css";

const SignUp = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // =====================================================
  // HANDLE SIGN UP
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    // -----------------------------
    // PASSWORD LENGTH
    // -----------------------------

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    // -----------------------------
    // CONFIRM PASSWORD
    // -----------------------------

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      // -----------------------------
      // SEND REGISTER REQUEST
      // -----------------------------

      const response = await axios.post(
        `${API_BASE_URL}/api/register`,
        {
          username: username.trim(),

          email: email
            .trim()
            .toLowerCase(),

          password: password,
        }
      );

      console.log(
        "Registration response:",
        response.data
      );

      // -----------------------------
      // SUCCESS MESSAGE
      // -----------------------------

      setSuccess(
        "Account created successfully!"
      );

      // -----------------------------
      // CLEAR FORM
      // -----------------------------

      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // -----------------------------
      // REDIRECT TO LOGIN
      // -----------------------------

      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (err) {
      console.error(
        "Registration error:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="auth-page auth-page--signup">
      <div className="auth-content">

        {/* LEFT HERO */}
        <section className="auth-hero">
          <div className="auth-hero-content">
            <div className="auth-welcome">WELCOME TO TASTE OF HEAVEN</div>
            <div className="auth-title-line"></div>
            <h1>
              Good Food
              <br />
              Brings People{" "}
              <span>Together</span>
            </h1>
            <p className="auth-description">
              Discover delicious recipes, share your favourites, and be part
              of a community that loves food.
            </p>
          </div>
        </section>

        {/* RIGHT CARD */}
        <section className="auth-form-section">
          <div className="auth-card">

            <div className="auth-card-decoration">
              <span></span>
              <FaLeaf />
              <span></span>
            </div>

            <h2>Create Account</h2>
            <p className="auth-subtitle">Join Taste of Heaven</p>
            <p className="auth-subtitle-small">
              Create an account and start sharing your favourite recipes.
            </p>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <form onSubmit={handleSubmit} className="auth-form">

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
                    onChange={(e) => setUsername(e.target.value)}
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
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <small className="auth-field-hint">
                  Password must contain at least 6 characters.
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {/* SIGNUP BUTTON */}
              <button
                type="submit"
                className="auth-submit-button"
                disabled={loading}
              >
                <span>{loading ? "Creating Account..." : "Create Account"}</span>
                {!loading && <FaArrowRight />}
              </button>

            </form>

            <p className="auth-switch">
              Already have an account? <a href="/login">Sign In</a>
            </p>

          </div>
        </section>

      </div>
    </div>
  );
};

export default SignUp;