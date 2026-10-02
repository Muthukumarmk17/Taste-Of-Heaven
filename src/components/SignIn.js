import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";
import API_BASE_URL from "../api";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

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

  // =====================================================
  // STATES
  // =====================================================

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);


  const navigate = useNavigate();

  const location = useLocation();


  // =====================================================
  // GOOGLE LOGIN RESULT
  // =====================================================

  useEffect(() => {

    const params =
      new URLSearchParams(
        location.search
      );

    const googleStatus =
      params.get("google");


    if (googleStatus === "success") {

      handleGoogleSuccess();

    }


    if (googleStatus === "failed") {

      setError(
        "Google sign in failed. Please try again."
      );

      window.history.replaceState(
        {},
        document.title,
        "/login"
      );

    }

  }, [location.search]);


  // =====================================================
  // GET GOOGLE USER FROM BACKEND
  // =====================================================

  const handleGoogleSuccess = async () => {

    try {

      setGoogleLoading(true);

      setError("");


      const response =
        await axios.get(
          `${API_BASE_URL}/api/auth/google/success`,
          {
            withCredentials: true,
          }
        );


      const userData =
        response.data;


      console.log(
        "Google logged in user:",
        userData
      );


      // -------------------------------------------------
      // SAVE USER
      // -------------------------------------------------

      localStorage.setItem(
        "user",
        JSON.stringify(userData)
      );


      // -------------------------------------------------
      // UPDATE APP USER STATE
      // -------------------------------------------------

      onLogin(userData);


      // -------------------------------------------------
      // REMOVE GOOGLE QUERY
      // -------------------------------------------------

      window.history.replaceState(
        {},
        document.title,
        "/login"
      );


      // -------------------------------------------------
      // GO HOME
      // -------------------------------------------------

      navigate("/");

    } catch (error) {

      console.error(
        "Google login error:",
        error
      );


      setError(
        error.response?.data?.error ||
          "Google sign in failed. Please try again."
      );

    } finally {

      setGoogleLoading(false);

    }

  };


  // =====================================================
  // NORMAL LOGIN
  // =====================================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");


    // -------------------------------------------------
    // EMAIL VALIDATION
    // -------------------------------------------------

    if (!email.trim()) {

      setError(
        "Please enter your email."
      );

      return;

    }


    // -------------------------------------------------
    // PASSWORD VALIDATION
    // -------------------------------------------------

    if (!password) {

      setError(
        "Please enter your password."
      );

      return;

    }


    setLoading(true);


    try {

      // -------------------------------------------------
      // LOGIN REQUEST
      // -------------------------------------------------

      const response =
        await axios.post(
          `${API_BASE_URL}/api/login`,
          {
            email:
              email
                .trim()
                .toLowerCase(),

            password:
              password,
          }
        );


      // -------------------------------------------------
      // USER DATA
      // -------------------------------------------------

      const userData =
        response.data;


      console.log(
        "Logged in user:",
        userData
      );


      // -------------------------------------------------
      // SAVE USER
      // -------------------------------------------------

      localStorage.setItem(
        "user",
        JSON.stringify(userData)
      );


      // -------------------------------------------------
      // UPDATE APP USER STATE
      // -------------------------------------------------

      onLogin(userData);


      // -------------------------------------------------
      // GO HOME
      // -------------------------------------------------

      navigate("/");

    } catch (err) {

      console.error(
        "Login error:",
        err
      );


      setError(
        err.response?.data?.error ||
          "Login failed. Please check your email and password."
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  const handleGoogleLogin = () => {

    setError("");

    setGoogleLoading(true);


    window.location.href =
      `${API_BASE_URL}/api/auth/google`;

  };


  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  const handleForgotPassword = (e) => {

    e.preventDefault();

    setError(
      "Forgot password functionality is not connected yet."
    );

  };


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="auth-page">

      {/* =================================================
          BACKGROUND CONTENT
      ================================================= */}

      <div className="auth-content">


        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <section className="auth-hero">

          <div className="auth-hero-content">

            <div className="auth-welcome">

              WELCOME TO TASTE OF HEAVEN

            </div>


            <div className="auth-title-line"></div>


            <h1>

              Good Food
              <br />

              Brings People{" "}

              <span>Together</span>

            </h1>


            <p className="auth-description">

              Discover delicious recipes,
              share your favourites, and
              be part of a community that
              loves food.

            </p>

          </div>

        </section>


        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <section className="auth-form-section">


          {/* =================================================
              SIGN IN CARD
          ================================================= */}

          <div className="auth-card">


            {/* =================================================
                TOP DECORATION
            ================================================= */}

            <div className="auth-card-decoration">

              <span></span>

              <FaLeaf />

              <span></span>

            </div>


            {/* =================================================
                TITLE
            ================================================= */}

            <h2>

              Sign In

            </h2>


            <p className="auth-subtitle">

              Welcome back to Taste of Heaven

            </p>


            <p className="auth-subtitle-small">

              Explore, save and enjoy your favourite recipes.

            </p>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

              <div className="auth-error">

                {error}

              </div>

            )}


            {/* =================================================
                FORM
            ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="auth-form"
            >


              {/* =================================================
                  EMAIL
              ================================================= */}

              <div className="auth-form-group">

                <label htmlFor="email">

                  <FaEnvelope />

                  <span>Email</span>

                </label>


                <div className="auth-input-wrapper">

                  <FaEnvelope
                    className="auth-input-icon"
                  />


                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    autoComplete="email"
                    required
                  />

                </div>

              </div>


              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div className="auth-form-group">

                <label htmlFor="password">

                  <FaLock />

                  <span>Password</span>

                </label>


                <div className="auth-input-wrapper">

                  <FaLock
                    className="auth-input-icon"
                  />


                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    autoComplete="current-password"
                    required
                  />


                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}

                  </button>

                </div>

              </div>


              {/* =================================================
                  FORGOT PASSWORD
              ================================================= */}

              <div className="forgot-password-wrapper">

                <a
                  href="#forgot-password"
                  onClick={
                    handleForgotPassword
                  }
                >

                  Forgot Password?

                </a>

              </div>


              {/* =================================================
                  SIGN IN BUTTON
              ================================================= */}

              <button
                type="submit"
                className="auth-submit-button"
                disabled={loading}
              >

                <span>

                  {loading
                    ? "Signing In..."
                    : "Sign In"}

                </span>


                {!loading && (

                  <FaArrowRight />

                )}

              </button>


            </form>


            {/* =================================================
                OR DIVIDER
            ================================================= */}

            <div className="auth-divider">

              <span></span>

              <strong>OR</strong>

              <span></span>

            </div>


            {/* =================================================
                GOOGLE LOGIN
            ================================================= */}

            <button
              type="button"
              className="google-login-button"
              onClick={
                handleGoogleLogin
              }
              disabled={googleLoading}
            >

              <FaGoogle />

              <span>

                {googleLoading
                  ? "Connecting to Google..."
                  : "Continue with Google"}

              </span>

            </button>


            {/* =================================================
                SIGN UP
            ================================================= */}

            <p className="auth-switch">

              Don't have an account?

              {" "}

              <Link to="/signup">

                Sign Up

              </Link>

            </p>


          </div>

        </section>

      </div>

    </div>

  );

};


export default SignIn;