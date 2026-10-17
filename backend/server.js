require("dotenv").config();

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { google } = require("googleapis");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");


const User = require("./models/User");
const LikedRecipe = require("./models/LikedRecipe");
const Comment = require("./models/Comment");
const analyzeReview = require("./utils/analyzeReview");
const Notification = require("./models/Notification");

// Gmail email configuration
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const app = express();
app.set("trust proxy", 1);


// =====================================================
// MIDDLEWARE
// =====================================================

const allowedOrigins = [
  "http://localhost:3000",
  "https://taste-of-heaven-phi.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));


// =====================================================
// SESSION - GOOGLE OAUTH
// =====================================================


app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "CHANGE_THIS_SESSION_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);



// =====================================================
// MONGODB CONNECTION
// =====================================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");

    // Analyze existing reviews missing AI analysis
    analyzeMissingReviews();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// =====================================================
// REVIEW ANALYSIS MODEL
// =====================================================

const reviewAnalysisSchema =
  new mongoose.Schema(
    {
      reviewId: String,
      recipeName: String,
      username: String,
      email: String,
      rating: Number,
      comments: String,
      sentiment: String,
      category: String,
      keywords: [String],
      summary: String,
      analyzedAt: String,
    },
    {
      collection: "reviewanalyses",
    }
  );

const ReviewAnalysis =
  mongoose.model(
    "ReviewAnalysis",
    reviewAnalysisSchema
  );

  // =====================================================
// ANALYZE REVIEWS THAT FAILED EARLIER
// =====================================================

let backfillRunning = false;

async function analyzeMissingReviews() {
  if (backfillRunning) return;
  backfillRunning = true;

  try {
    const analyzed = await ReviewAnalysis.find().select("reviewId").lean();
    const analyzedIds = analyzed
      .map((a) => a.reviewId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const missing = await Comment.find({
      _id: { $nin: analyzedIds },
    }).limit(5);

    for (const review of missing) {
      try {
        const ai = await analyzeReview(review.comments, review.rating);

        await ReviewAnalysis.create({
          reviewId: review._id.toString(),
          recipeName: review.recipeName,
          username: review.username,
          email: review.email,
          rating: review.rating,
          comments: review.comments,
          sentiment: ai.sentiment,
          category: ai.category,
          keywords: ai.keywords,
          summary: ai.summary,
          analyzedAt: new Date().toISOString(),
        });

        console.log("Missing analysis completed for", review._id.toString());
      } catch (error) {
        console.error("Backfill stopped:", error.message);
        break;
      }
    }
  } catch (error) {
    console.error("Backfill error:", error.message);
  } finally {
    backfillRunning = false;
  }
}

// =====================================================
// RECIPE SCHEMA
// =====================================================

const recipeSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      image: {
        type: String,
        required: true,
        trim: true,
      },

      cuisine: {
        type: String,
        required: true,
        trim: true,
      },

      type: {
        type: String,
        enum: ["Veg", "Non-veg", "Desserts"],
        default: "Veg",
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },

      cookingTime: {
        type: Number,
        default: 0,
      },

      servings: {
        type: Number,
        default: 0,
      },

      tags: {
        type: [String],
        default: [],
      },

      ingredients: {
        type: [String],
        default: [],
      },

      methods: {
        type: [String],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

const Recipe =
  mongoose.model(
    "Recipe",
    recipeSchema
  );


// =====================================================
// ADMIN AUTHENTICATION
// =====================================================

const requireAdmin =
  async (req, res, next) => {
    try {
      const email = String(
        req.headers["user-email"] || ""
      )
        .trim()
        .toLowerCase();

      if (!email) {
        return res.status(401).json({
          error:
            "Admin authentication required.",
        });
      }

      const user =
        await User.findOne({
          email: email.toLowerCase(),
        });

      if (!user) {
        return res.status(401).json({
          error: "User not found.",
        });
      }

      if (
        String(user.role || "")
          .trim()
          .toLowerCase() !== "admin"
      ) {
        return res.status(403).json({
          error:
            "Admin access is required.",
        });
      }

      req.admin = user;

      next();
    } catch (error) {
      console.error(
        "Admin authentication error:",
        error
      );

      return res.status(500).json({
        error:
          "Admin authentication failed.",
      });
    }
  };


// =====================================================
// GET ALL RECIPES
// =====================================================

app.get(
  "/recipes",
  async (req, res) => {
    try {
      const recipes =
        await Recipe.find()
          .sort({
            createdAt: -1,
          });

      res.json(recipes);
    } catch (error) {
      console.error(
        "Error fetching recipes:",
        error
      );

      res.status(500).json({
        error:
          "Error fetching recipes",
      });
    }
  }
);


// =====================================================
// GET SINGLE RECIPE
// =====================================================

app.get(
  "/api/recipes/:id",
  async (req, res) => {
    try {
      const recipe =
        await Recipe.findById(
          req.params.id
        );

      if (!recipe) {
        return res.status(404).json({
          error:
            "Recipe not found.",
        });
      }

      res.json(recipe);
    } catch (error) {
      console.error(
        "Error fetching recipe:",
        error
      );

      res.status(500).json({
        error:
          "Error fetching recipe.",
      });
    }
  }
);


// =====================================================
// GOOGLE OAUTH CONFIGURATION
// =====================================================
//
// Required .env values:
//
// GOOGLE_CLIENT_ID=your_google_client_id
// GOOGLE_CLIENT_SECRET=your_google_client_secret
// GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
// GOOGLE_FRONTEND_SUCCESS_URL=http://localhost:3000/login?google=success
// GOOGLE_FRONTEND_FAILURE_URL=http://localhost:3000/login?google=failed
// SESSION_SECRET=your_long_random_secret
//
// The redirect URI above must exactly match the URI configured\n// in Google Cloud Console.
// =====================================================

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID;

const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET;

const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  process.env.GOOGLE_REDIRECT_URI;

const GOOGLE_FRONTEND_SUCCESS_URL =
  process.env.GOOGLE_FRONTEND_SUCCESS_URL ||
  "http://localhost:3000/login?google=success";

const GOOGLE_FRONTEND_FAILURE_URL =
  process.env.GOOGLE_FRONTEND_FAILURE_URL ||
  "http://localhost:3000/login?google=failed";


// =====================================================
// GOOGLE OAUTH CLIENT
// =====================================================

const googleOAuthClient =
  GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_SECRET &&
  GOOGLE_CALLBACK_URL
    ? new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_CALLBACK_URL
      )
    : null;


// =====================================================
// GOOGLE LOGIN - START
// =====================================================

app.get(
  "/api/auth/google",
  (req, res) => {
    try {
      if (!googleOAuthClient) {
        console.error(
          "Google OAuth is not configured. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL."
        );

        return res.redirect(
          GOOGLE_FRONTEND_FAILURE_URL
        );
      }

      const state =
        crypto.randomBytes(32).toString("hex");

      // Store state in the server session so the callback
      // can verify that the OAuth request came from this browser.
      req.session.googleOAuthState =
        state;

      const authorizationUrl =
        googleOAuthClient.generateAuthUrl({
          access_type: "online",

          scope: [
            "openid",
            "email",
            "profile",
          ],

          include_granted_scopes: true,

          prompt: "select_account",

          state,
        });

      return res.redirect(
        authorizationUrl
      );
    } catch (error) {
      console.error(
        "Google OAuth start error:",
        error
      );

      return res.redirect(
        GOOGLE_FRONTEND_FAILURE_URL
      );
    }
  }
);


// =====================================================
// GOOGLE LOGIN - CALLBACK
// =====================================================

app.get(
  "/api/auth/google/callback",
  async (req, res) => {
    try {
      if (!googleOAuthClient) {
        return res.redirect(
          GOOGLE_FRONTEND_FAILURE_URL
        );
      }

      const {
        code,
        state,
        error: googleError,
      } = req.query;

      // User cancelled the Google consent screen.
      if (googleError) {
        console.error(
          "Google OAuth returned an error:",
          googleError
        );

        return res.redirect(
          GOOGLE_FRONTEND_FAILURE_URL
        );
      }

      // Validate the OAuth state.
      if (
        !state ||
        !req.session.googleOAuthState ||
        state !==
          req.session.googleOAuthState
      ) {
        console.error(
          "Google OAuth state mismatch."
        );

        delete req.session
          .googleOAuthState;

        return res.redirect(
          GOOGLE_FRONTEND_FAILURE_URL
        );
      }

      // State is one-time-use.
      delete req.session.googleOAuthState;

      if (!code) {
        return res.redirect(
          GOOGLE_FRONTEND_FAILURE_URL
        );
      }

      // Exchange the authorization code
      // for Google tokens.
      const { tokens } =
        await googleOAuthClient.getToken(
          code
        );

      if (!tokens.id_token) {
        throw new Error(
          "Google did not return an ID token."
        );
      }

      // Verify the Google ID token.
      const ticket =
        await googleOAuthClient.verifyIdToken(
          {
            idToken:
              tokens.id_token,

            audience:
              GOOGLE_CLIENT_ID,
          }
        );

      const payload =
        ticket.getPayload();

      if (!payload) {
        throw new Error(
          "Unable to read Google account information."
        );
      }

      const {
        sub: googleId,
        email: googleEmail,
        email_verified:
          emailVerified,
        name: googleName,
        picture: googlePicture,
      } = payload;

      if (
        !googleId ||
        !googleEmail ||
        !emailVerified
      ) {
        throw new Error(
          "Google account email could not be verified."
        );
      }

      const normalizedEmail =
        String(googleEmail)
          .trim()
          .toLowerCase();

      // Find an existing Taste of Heaven account
      // using the verified Google email.
      let user =
        await User.findOne({
          email:
            normalizedEmail,
        });

      
if (!user) {
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);
  const fallbackUsername = normalizedEmail.split("@")[0];

  user = new User({
    username: String(googleName || fallbackUsername).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "user",
    isVerified: false,
    welcomeEmailSent: false,
    ...(googlePicture ? { profilePicture: googlePicture } : {}),
  });
} else if (googlePicture && !user.profilePicture) {
  user.profilePicture = googlePicture;
}

// Require OTP verification for new or unverified Google users.
if (user.isVerified !== true) {
  const otp = crypto.randomInt(100000, 1000000).toString();

  user.emailVerificationOtpHash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  user.emailVerificationOtpExpires = new Date(
    Date.now() + 10 * 60 * 1000
  );

  user.emailVerificationAttempts = 0;

  await user.save();

  try {
await emailTransporter.sendMail({
  from: process.env.EMAIL_USER,
  to: normalizedEmail,
  subject: "Verify your Taste of Heaven account",

  text: `Hello ${user.username},

Welcome to Taste of Heaven!

Your Google sign-in verification code is: ${otp}

This code expires in 10 minutes.

If you did not attempt to sign in, you can ignore this email.`,

  html: `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 500px;
      margin: auto;
      padding: 24px;
      border: 1px solid #eeeeee;
      border-radius: 12px;
      color: #262626;
      line-height: 1.6;
      background: #ffffff;
    ">
      <h2 style="margin-top: 0;">
        Welcome to Taste of Heaven!
      </h2>

      <p>Hello ${escapeHtml(user.username)},</p>

      <p>
        Please use the verification code below
        to verify your Google sign-in.
      </p>

      <div style="
        font-size: 30px;
        font-weight: bold;
        letter-spacing: 8px;
        padding: 16px;
        background: #f5f5f5;
        text-align: center;
        border-radius: 8px;
        margin: 16px 0;
      ">
        ${otp}
      </div>

      <p>
        This code expires in
        <strong>10 minutes</strong>.
      </p>

      <p>
        If you did not attempt to sign in,
        you can ignore this email.
      </p>

      <p>Taste of Heaven Team</p>
    </div>
  `,
});

  } catch (emailError) {
    console.error("Google OTP email failed:", emailError.message);
    return res.redirect(GOOGLE_FRONTEND_FAILURE_URL);
  }

  const otpRedirectUrl = new URL(
    process.env.GOOGLE_FRONTEND_OTP_URL ||
      "http://localhost:3000/login"
  );

  otpRedirectUrl.searchParams.set("googleOtpRequired", "true");
  otpRedirectUrl.searchParams.set("email", normalizedEmail);

  return res.redirect(otpRedirectUrl.toString());
}

// Existing verified Google users continue below.


      // Never store the password in the session.
      const {
        password: _password,
        ...userInfo
      } = user.toObject();

      req.session.user =
        userInfo;

      req.session.googleLogin =
        true;

      // Save the session before redirecting so the
      // frontend can immediately retrieve the user.
      req.session.save(
        (sessionError) => {
          if (sessionError) {
            console.error(
              "Google session save error:",
              sessionError
            );

            return res.redirect(
              GOOGLE_FRONTEND_FAILURE_URL
            );
          }

          return res.redirect(
            GOOGLE_FRONTEND_SUCCESS_URL
          );
        }
      );
    } catch (error) {
      console.error(
        "Google OAuth callback error:",
        error
      );

      return res.redirect(
        GOOGLE_FRONTEND_FAILURE_URL
      );
    }
  }
);


// =====================================================
// GOOGLE LOGIN - GET SESSION USER
// =====================================================
//
// SignIn.js can call this endpoint after the
// browser returns to /login?google=success.
// =====================================================

app.get(
  "/api/auth/google/success",
  (req, res) => {
    try {
      if (
        !req.session ||
        !req.session.user
      ) {
        return res.status(401).json({
          error:
            "Google login session not found.",
        });
      }

      return res.status(200).json(
        req.session.user
      );
    } catch (error) {
      console.error(
        "Google session user error:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to retrieve Google login session.",
      });
    }
  }
);


// =====================================================
// GOOGLE / SESSION LOGOUT
// =====================================================

app.post(
  "/api/auth/logout",
  (req, res) => {
    if (!req.session) {
      return res.status(200).json({
        message:
          "Logged out successfully.",
      });
    }

    req.session.destroy(
      (error) => {
        if (error) {
          console.error(
            "Session logout error:",
            error
          );

          return res.status(500).json({
            error:
              "Unable to log out.",
          });
        }

        res.clearCookie(
          "connect.sid"
        );

        return res.status(200).json({
          message:
            "Logged out successfully.",
        });
      }
    );
  }
);



/* =====================================================
   USER REGISTRATION
===================================================== */

app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      return res.status(400).json({
        error: "Username is required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long.",
      });
    }

    // Check whether the email already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        error: "Email already exists.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Hash the OTP before saving it
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // Create the unverified user
    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      isVerified: false,
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpires: new Date(
        Date.now() + 10 * 60 * 1000
      ),
      emailVerificationAttempts: 0,
      welcomeEmailSent: false,
    });

    await newUser.save();

    // Send the verification OTP to Gmail
    try {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: "Verify your Taste of Heaven account",

        text: `Hello ${normalizedUsername},

Welcome to Taste of Heaven!

Your email verification code is: ${otp}

This code expires in 10 minutes.

If you did not create this account, you can ignore this email.`,

        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: auto;
            padding: 24px;
            border: 1px solid #eeeeee;
            border-radius: 12px;
          ">
            <h2>Welcome to Taste of Heaven!</h2>

            <p>Hello ${normalizedUsername},</p>

            <p>
              Please use the verification code below
              to verify your email address.
            </p>

            <div style="
              font-size: 30px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 16px;
              background: #f5f5f5;
              text-align: center;
              border-radius: 8px;
            ">
              ${otp}
            </div>

            <p>
              This code expires in
              <strong>10 minutes</strong>.
            </p>

            <p>
              If you did not create this account,
              you can ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      // Delete the unverified account if email delivery fails
      await User.deleteOne({ _id: newUser._id });

      console.error(
        "OTP email sending failed:",
        emailError.message
      );

      return res.status(500).json({
        error:
          "Unable to send verification email. Please try again.",
      });
    }

    return res.status(201).json({
      message: "Verification code sent to your email address.",
      requiresEmailVerification: true,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: "Email already exists.",
      });
    }

    return res.status(500).json({
      error: "Error creating account.",
    });
  }
});

// VERIFY EMAIL OTP
app.post("/api/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. Validate input
    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and verification code are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const enteredOtp = String(otp).trim();

    if (!/^\d{6}$/.test(enteredOtp)) {
      return res.status(400).json({
        error: "Please enter a valid six-digit verification code.",
      });
    }

    // 2. Find the user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        error: "Account not found. Please register again.",
      });
    }

    // 3. Check whether the account is already verified
    if (user.isVerified === true) {
      return res.status(200).json({
        message: "Your email is already verified. You can log in.",
        verified: true,
      });
    }

    // 4. Check whether an OTP exists
    if (
      !user.emailVerificationOtpHash ||
      !user.emailVerificationOtpExpires
    ) {
      return res.status(400).json({
        error: "No active verification code found. Please register again or request a new code.",
      });
    }

    // 5. Limit incorrect attempts
    if (user.emailVerificationAttempts >= 5) {
      return res.status(429).json({
        error: "Too many incorrect attempts. Please request a new verification code.",
      });
    }

    // 6. Check OTP expiration
    if (user.emailVerificationOtpExpires.getTime() <= Date.now()) {
      return res.status(400).json({
        error: "Your verification code has expired. Please request a new code.",
      });
    }

    // 7. Hash the submitted OTP
    const enteredOtpHash = crypto
      .createHash("sha256")
      .update(enteredOtp)
      .digest();

    const storedOtpHash = Buffer.from(
      user.emailVerificationOtpHash,
      "hex"
    );

    // Compare hashes safely
    const otpMatches =
      storedOtpHash.length === enteredOtpHash.length &&
      crypto.timingSafeEqual(storedOtpHash, enteredOtpHash);

    // 8. Reject an incorrect OTP
    if (!otpMatches) {
      user.emailVerificationAttempts += 1;
      await user.save();

      const remainingAttempts = Math.max(
        0,
        5 - user.emailVerificationAttempts
      );

      return res.status(400).json({
        error: "Incorrect verification code.",
        remainingAttempts,
      });
    }

    // 9. Verify the account and invalidate the OTP
    user.isVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationOtpExpires = undefined;
    user.emailVerificationAttempts = 0;

    await user.save();
    
try {
  const normalizedEmail = String(user.email || "").trim().toLowerCase();

  // One welcome notification document for this recipient.
  const existingWelcome = await Notification.findOne({
    type: "update",
    title: "Welcome to Taste of Heaven!",
    "recipients.email": normalizedEmail,
  });

  if (!existingWelcome && normalizedEmail) {
    await Notification.create({
      type: "update",
      title: "Welcome to Taste of Heaven!",
      message:
        "Your email has been verified successfully. Welcome to our food-loving community!",
      recipients: [{ email: normalizedEmail, status: "pending", isRead: false }],
    });
  }
} catch (notificationError) {
  console.error("Could not create welcome notification:", notificationError);
}


    
// 10. Send the welcome email in the background
// Account verification will not wait for Gmail.

emailTransporter
  .sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Welcome to Taste of Heaven!",

    text: `Hello ${user.username},

Welcome to Taste of Heaven!

Your email has been successfully verified, and your account is ready to use.

You can now discover recipes, share your cooking experiences, rate dishes, and connect with our food-loving community.

We're happy to have you here!

Happy cooking,
The Taste of Heaven Team`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;
                  margin: auto; padding: 24px; color: #26352a;
                  line-height: 1.7; background: #ffffff;">

        <div style="text-align: center; margin-bottom: 24px;">
          <img src="cid:tasteofheavenlogo"
               alt="Taste of Heaven Logo"
               style="width: 120px; max-width: 100%; height: auto;
                      display: block; margin: 0 auto;" />
        </div>

        <h2 style="color: #155b32; text-align: center;">
          Welcome to Taste of Heaven!
        </h2>

        <p>Hi ${escapeHtml(user.username)},</p>

        <p>
          Your email has been successfully verified, and your account
          is ready to use.
        </p>

        <p>
          You can now discover recipes, share your cooking experiences,
          rate dishes, and connect with our food-loving community.
        </p>

        <p>We're happy to have you here!</p>

        <p>
          Happy cooking,<br />
          <strong style="color: #155b32;">
            The Taste of Heaven Team
          </strong>
        </p>
      </div>
    `,

    attachments: [
      {
        filename: "taste-of-heaven-logo.png",
        path: path.join(
          __dirname,
          "assets",
          "taste-of-heaven-logo.png"
        ),
        cid: "tasteofheavenlogo",
      },
    ],
  })
  .then(async () => {
    await User.updateOne(
      { _id: user._id },
      { $set: { welcomeEmailSent: true } }
    );

    console.log("Welcome email sent to:", user.email);
  })
  .catch((emailError) => {
    console.error(
      "Welcome email sending failed:",
      emailError.message
    );
  });

    
    // 11. Establish a login session for Google OTP verification.
    const googleOtpLogin =
      req.body.googleOtpLogin === true ||
      req.body.googleOtpLogin === "true";

    if (googleOtpLogin) {
      const { password: _password, ...userInfo } = user.toObject();

      req.session.user = userInfo;
      req.session.googleLogin = true;

      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      return res.status(200).json({
        message: "Email verified successfully. You are now logged in.",
        verified: true,
        loggedIn: true,
        user: userInfo,
        welcomeEmailSent: user.welcomeEmailSent === true,
      });
    }

    
    // Normal email/password registration keeps its existing behavior.
    return res.status(200).json({
      message: "Email verified successfully. You can now log in.",
      verified: true,
      loggedIn: false,
      welcomeEmailSent: user.welcomeEmailSent === true,
    });

  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      error: "An error occurred while verifying your email.",
    });
  }
});



// =====================================================
// USER LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid email or password.",
      });
    }

    // Block login until email verification is complete
    if (user.isVerified !== true) {
      return res.status(403).json({
        error: "Please verify your email before logging in.",
        requiresEmailVerification: true,
        email: user.email,
      });
    }

    const {
      password: _,
      emailVerificationOtpHash: __,
      emailVerificationOtpExpires: ___,
      emailVerificationAttempts: ____,
      ...userInfo
    } = user.toObject();

    return res.json(userInfo);
  } catch (error) {
    console.error("Error logging in user:", error);

    return res.status(500).json({
      error: "Server error",
    });
  }
});

// =====================================================
// UPDATE PROFILE PICTURE
// =====================================================

app.put(
  "/api/users/profile-picture",
  async (req, res) => {
    try {
      const {
        email,
        profilePicture,
      } = req.body;

      if (
        !email ||
        !profilePicture
      ) {
        return res.status(400).json({
          error:
            "Email and profile picture are required.",
        });
      }

      const user =
        await User.findOne({
          email:
            email
              .trim()
              .toLowerCase(),
        });

      if (!user) {
        return res.status(404).json({
          error:
            "User not found.",
        });
      }

      user.profilePicture =
        profilePicture;

      await user.save();

      const {
        password: _,
        ...userInfo
      } = user.toObject();

      res.status(200).json({
        message:
          "Profile picture updated successfully.",

        user: userInfo,
      });
    } catch (error) {
      console.error(
        "Error updating profile picture:",
        error
      );

      res.status(500).json({
        error:
          "Unable to update profile picture.",
      });
    }
  }
);


// =====================================================
// GET LIKED RECIPES
// =====================================================

app.get(
  "/api/likedRecipes",
  async (req, res) => {
    const {
      username,
      email,
      recipeName,
    } = req.query;

    try {
      const likedRecipe =
        await LikedRecipe.findOne({
          username,
          email,
        });

      if (!likedRecipe) {
        if (recipeName) {
          return res.json({
            found: false,
          });
        }

        return res.json({
          recipes: [],
        });
      }

      if (recipeName) {
        const isLiked =
          likedRecipe.recipes.some(
            (recipe) =>
              recipe.name ===
              recipeName
          );

        return res.json({
          found: isLiked,
        });
      }

      return res.json({
        recipes:
          likedRecipe.recipes,
      });
    } catch (error) {
      console.error(
        "Error fetching liked recipes:",
        error
      );

      res.status(500).json({
        message:
          "Error checking liked recipes.",
      });
    }
  }
);


// =====================================================
// LIKE OR UNLIKE RECIPE
// =====================================================

app.post(
  "/api/likedRecipes",
  async (req, res) => {
    const {
      username,
      email,
      recipeName,
      rating,
      cuisine,
      image,
      action,
    } = req.body;

    try {
      if (!email || !recipeName || !action) {
        return res.status(400).json({
          message:
            "Email, recipe name and action are required.",
        });
      }

      // Get the real user from MongoDB.
      // Admin accounts are not allowed to like/unlike recipes.
      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      });

      if (!user) {
        return res.status(401).json({
          message: "User not found.",
        });
      }

      if (
        String(user.role || "")
          .trim()
          .toLowerCase() === "admin"
      ) {
        return res.status(403).json({
          message:
            "Admin accounts cannot like or unlike recipes.",
        });
      }

      if (action !== "like" && action !== "unlike") {
        return res.status(400).json({
          message: "Invalid action.",
        });
      }

      let likedRecipe =
        await LikedRecipe.findOne({
          email: user.email,
        });

      if (!likedRecipe) {
        likedRecipe =
          new LikedRecipe({
            username: user.username || username,
            email: user.email,
            recipes: [],
          });
      }

      if (action === "like") {
        const alreadyLiked =
          likedRecipe.recipes.some(
            (recipe) =>
              recipe.name === recipeName
          );

        if (!alreadyLiked) {
          likedRecipe.recipes.push({
            name: recipeName,
            rating,
            cuisine,
            image,
          });
        }
      } else {
        likedRecipe.recipes =
          likedRecipe.recipes.filter(
            (recipe) =>
              recipe.name !== recipeName
          );
      }

      await likedRecipe.save();

      return res.status(200).json({
        message:
          action === "like"
            ? "Recipe liked successfully!"
            : "Recipe unliked successfully!",
        liked: action === "like",
      });
    } catch (error) {
      console.error(
        "Error processing like/unlike:",
        error
      );

      return res.status(500).json({
        message:
          "Something went wrong!",
      });
    }
  }
);


// =====================================================
// GET REVIEWS
// =====================================================

app.get(
  "/api/reviews",
  async (req, res) => {
    const {
      recipeName,
      email,
      username,
    } = req.query;

    try {
      let query = {};

      if (recipeName) {
        query.recipeName =
          recipeName;
      } else if (email) {
        query.email = email;
      } else if (username) {
        query.username =
          username;
      }

      const reviews =
        await Comment.find(query)
          .sort({
            createdAt: -1,
          });

      res.status(200).json(
        reviews
      );
    } catch (error) {
      console.error(
        "Error fetching reviews:",
        error
      );

      res.status(500).json({
        error:
          "Error fetching reviews",
      });
    }
  }
);


// =====================================================
// SUBMIT NEW REVIEW
// =====================================================

app.post(
  "/api/reviews",
  async (req, res) => {
    const {
      recipeName,
      username,
      email,
      rating,
      comments,
    } = req.body;

    try {
      if (!email) {
        return res.status(400).json({
          message: "User email is required.",
        });
      }

      // Check the actual account in MongoDB.
      // Admin accounts are allowed to VIEW reviews through the
      // admin dashboard, but they cannot CREATE a review.
      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      });

      if (!user) {
        return res.status(401).json({
          message: "User not found.",
        });
      }

      if (
        String(user.role || "")
          .trim()
          .toLowerCase() === "admin"
      ) {
        return res.status(403).json({
          message:
            "Admin accounts cannot give reviews.",
        });
      }

      const newComment =
        new Comment({
          recipeName,
          username,
          email,
          rating,
          comments,
        });

      await newComment.save();

      console.log(
        "New review saved:",
        newComment
      );
      res.status(201).json(newComment);
      // -----------------------------------------
      // AI REVIEW ANALYSIS (GEMINI)
      // -----------------------------------------

      try {
        const ai = await analyzeReview(
          newComment.comments,
          newComment.rating
        );

        await ReviewAnalysis.create({
          reviewId: newComment._id.toString(),
          recipeName: newComment.recipeName,
          username: newComment.username,
          email: newComment.email,
          rating: newComment.rating,
          comments: newComment.comments,
          sentiment: ai.sentiment,
          category: ai.category,
          keywords: ai.keywords,
          summary: ai.summary,
          analyzedAt: new Date().toISOString(),
        });

        console.log("Review analysis saved");
        analyzeMissingReviews();
      } catch (error) {
        console.error(
          "AI analysis failed:",
          error.message
        );
      }

      
    } catch (error) {
      console.error(
        "Error saving review:",
        error
      );

      res.status(500).json({
        error:
          "Error saving review",
      });
    }
  }
);


// =====================================================
// DELETE REVIEW - USER
// =====================================================

app.delete(
  "/api/reviews/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const { email } =
        req.body;

      if (!email) {
        return res.status(400).json({
          message:
            "User email is required.",
        });
      }

      const review =
        await Comment.findById(id);

      if (!review) {
        return res.status(404).json({
          message:
            "Review not found.",
        });
      }

      const reviewEmail = String(
        review.email || ""
      )
        .trim()
        .toLowerCase();

      const requestEmail = String(
        email || ""
      )
        .trim()
        .toLowerCase();

      if (
        !reviewEmail ||
        reviewEmail !== requestEmail
      ) {
        return res.status(403).json({
          message:
            "You can delete only your own review.",
        });
      }

      await Comment.findByIdAndDelete(
        id
      );
      await ReviewAnalysis.deleteMany({
  reviewId: id,
});

      res.status(200).json({
        message:
          "Review deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Error deleting review:",
        error
      );

      res.status(500).json({
        message:
          "Error deleting review.",
      });
    }
  }
);


// =====================================================
// GET REVIEW ANALYSIS FOR ONE RECIPE
// =====================================================

app.get(
  "/api/reviewAnalyses",
  async (req, res) => {
    try {
      const { recipeName } =
        req.query;

      if (!recipeName) {
        return res.status(400).json({
          message:
            "recipeName is required.",
        });
      }

      const reviews = await Comment.find({ recipeName })
  .select("_id")
  .lean();

const reviewIds = reviews.map(
  (review) => review._id.toString()
);

const analyses = await ReviewAnalysis.find({
  recipeName,
  reviewId: { $in: reviewIds },
}).lean();

      const total =
        analyses.length;

      const positive =
        analyses.filter(
          (review) =>
            String(
              review.sentiment || ""
            )
              .trim()
              .toLowerCase() ===
            "positive"
        ).length;

      const percentage =
        total > 0
          ? Math.round(
              (positive / total) *
                100
            )
          : 0;

      return res.status(200).json({
        total,
        positive,
        percentage,
      });
    } catch (error) {
      console.error(
        "Error fetching review analysis:",
        error
      );

      return res.status(500).json({
        message:
          "Error fetching review analysis.",
      });
    }
  }
);


// =====================================================
// ADMIN - DASHBOARD STATISTICS
// =====================================================

app.get(
  "/api/admin/stats",
  requireAdmin,
  async (req, res) => {
    try {
      const [
        totalUsers,
        totalRecipes,
        totalReviews,
        likedDocuments,
      ] = await Promise.all([
        User.countDocuments(),

        Recipe.countDocuments(),

        Comment.countDocuments(),

        LikedRecipe.find().lean(),
      ]);

      let totalFavorites = 0;

      likedDocuments.forEach(
        (document) => {
          if (
            Array.isArray(
              document.recipes
            )
          ) {
            totalFavorites +=
              document.recipes.length;
          }
        }
      );

      const recentRecipes =
        await Recipe.find()
          .sort({
            createdAt: -1,
          })
          .limit(5)
          .lean();

      res.json({
        totalUsers,
        totalRecipes,
        totalReviews,
        totalFavorites,
        recentRecipes,
      });
    } catch (error) {
      console.error(
        "Admin stats error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load dashboard statistics.",
      });
    }
  }
);


// =====================================================
// ADMIN - GET USERS
// =====================================================

app.get(
  "/api/admin/users",
  requireAdmin,
  async (req, res) => {
    try {
      const users =
        await User.find()
          .select(
            "-password"
          )
          .sort({
            username: 1,
          })
          .lean();

      res.json(users);
    } catch (error) {
      console.error(
        "Admin users error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load users.",
      });
    }
  }
);


// =====================================================
// ADMIN - DELETE USER
// =====================================================

app.delete(
  "/api/admin/users/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          error:
            "User not found.",
        });
      }

      if (
        user._id.toString() ===
        req.admin._id.toString()
      ) {
        return res.status(400).json({
          error:
            "You cannot delete your own admin account.",
        });
      }

      await User.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
          "User deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Admin delete user error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to delete user.",
      });
    }
  }
);


// =====================================================
// ADMIN - UPDATE USER ROLE
// =====================================================

app.put(
  "/api/admin/users/:id/role",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        role,
      } = req.body;

      if (
        !["user", "admin"].includes(
          role
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid role.",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            role,
          },
          {
            new: true,
          }
        ).select(
          "-password"
        );

      if (!user) {
        return res.status(404).json({
          error:
            "User not found.",
        });
      }

      res.json(user);
    } catch (error) {
      console.error(
        "Admin role update error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to update user role.",
      });
    }
  }
);


// =====================================================
// ADMIN - GET REVIEWS
// =====================================================

app.get(
  "/api/admin/reviews",
  requireAdmin,
  async (req, res) => {
    try {
      const reviews =
        await Comment.find()
          .sort({
            createdAt: -1,
          })
          .lean();

      res.json(reviews);
    } catch (error) {
      console.error(
        "Admin reviews error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load reviews.",
      });
    }
  }
);


// =====================================================
// ADMIN - DELETE REVIEW
// =====================================================

app.delete(
  "/api/admin/reviews/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const review =
        await Comment.findByIdAndDelete(
          req.params.id
        );
        await ReviewAnalysis.deleteMany({
  reviewId: req.params.id,
});

      if (!review) {
        return res.status(404).json({
          error:
            "Review not found.",
        });
      }

      res.json({
        message:
          "Review deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Admin delete review error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to delete review.",
      });
    }
  }
);


// =====================================================
// ADMIN - GET FAVORITES
// =====================================================

app.get(
  "/api/admin/favorites",
  requireAdmin,
  async (req, res) => {
    try {
      const favorites =
        await LikedRecipe.find()
          .lean();

      res.json(favorites);
    } catch (error) {
      console.error(
        "Admin favorites error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load favorites.",
      });
    }
  }
);


// =====================================================
// ADMIN - GET ALL REVIEW ANALYSES
// =====================================================

app.get(
  "/api/admin/reviewAnalyses",
  requireAdmin,
  async (req, res) => {
    try {
      const analyses =
        await ReviewAnalysis.find()
          .sort({
            analyzedAt: -1,
          })
          .lean();

      res.json(analyses);
    } catch (error) {
      console.error(
        "Admin review analysis error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load review analyses.",
      });
    }
  }
);


// =====================================================
// ADMIN - ADD RECIPE
// =====================================================

app.post(
  "/api/admin/recipes",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        name,
        image,
        cuisine,
        type,
        description,
        rating,
        cookingTime,
        servings,
        tags,
        ingredients,
        methods,
      } = req.body;

      if (
        !name ||
        !image ||
        !cuisine
      ) {
        return res.status(400).json({
          error:
            "Recipe name, image and cuisine are required.",
        });
      }

      const existingRecipe =
        await Recipe.findOne({
          name: name.trim(),
        });

      if (existingRecipe) {
        return res.status(400).json({
          error:
            "A recipe with this name already exists.",
        });
      }

      const newRecipe =
        new Recipe({
          name:
            name.trim(),

          image:
            image.trim(),

          cuisine:
            cuisine.trim(),

          type:
  type === "Non-veg"
    ? "Non-veg"
    : type === "Desserts"
    ? "Desserts"
    : "Veg",

          description:
            description || "",

          rating:
            Number(rating) || 0,

          cookingTime:
            Number(cookingTime) || 0,

          servings:
            Number(servings) || 0,

          tags:
            Array.isArray(tags)
              ? tags
              : [],

          ingredients:
            Array.isArray(
              ingredients
            )
              ? ingredients
              : [],

          methods:
            Array.isArray(
              methods
            )
              ? methods
              : [],
        });

      await newRecipe.save();
      

try {
  const registeredUsers = await User.find(
    {
      role: "user",
      email: { $exists: true, $ne: "" },
    },
    { email: 1 }
  ).lean();

  // Store ONE recipe notification document; each user has their own read status.
  const recipients = [...new Set(
    registeredUsers
      .map((registeredUser) => String(registeredUser.email || "").trim().toLowerCase())
      .filter(Boolean)
  )].map((email) => ({ email, status: "pending", isRead: false }));

  if (recipients.length > 0) {
    await Notification.create({
      type: "recipe",
      title: "New Recipe Added!",
      message: `${newRecipe.name} has been added to Taste of Heaven. Explore the recipe now!`,
      recipeId: newRecipe._id,
      recipeName: newRecipe.name,
      recipeImage: newRecipe.image,
      cuisine: newRecipe.cuisine,
      rating: newRecipe.rating || 0,
      recipients,
    });
  }

  console.log(`Created one recipe notification for ${recipients.length} users: ${newRecipe.name}`);
} catch (notificationError) {
  console.error("Could not create recipe notification:", notificationError);
}


      res.status(201).json({
        message:
          "Recipe created successfully.",

        recipe: newRecipe,
      });
    } catch (error) {
      console.error(
        "Admin add recipe error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to create recipe.",
      });
    }
  }
);


// =====================================================
// ADMIN - UPDATE RECIPE
// =====================================================

app.put(
  "/api/admin/recipes/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        name,
        image,
        cuisine,
        type,
        description,
        rating,
        cookingTime,
        servings,
        tags,
        ingredients,
        methods,
      } = req.body;

      const recipe =
        await Recipe.findByIdAndUpdate(
          req.params.id,
          {
            name:
              name?.trim(),

            image:
              image?.trim(),

            cuisine:
              cuisine?.trim(),

            type:
  type === "Non-veg"
    ? "Non-veg"
    : type === "Desserts"
    ? "Desserts"
    : "Veg",

            description:
              description || "",

            rating:
              Number(rating) || 0,

            cookingTime:
              Number(cookingTime) || 0,

            servings:
              Number(servings) || 0,

            tags:
              Array.isArray(tags)
                ? tags
                : [],

            ingredients:
              Array.isArray(
                ingredients
              )
                ? ingredients
                : [],

            methods:
              Array.isArray(
                methods
              )
                ? methods
                : [],
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!recipe) {
        return res.status(404).json({
          error:
            "Recipe not found.",
        });
      }

      res.json({
        message:
          "Recipe updated successfully.",

        recipe,
      });
    } catch (error) {
      console.error(
        "Admin update recipe error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to update recipe.",
      });
    }
  }
);


// =====================================================
// ADMIN - DELETE RECIPE
// =====================================================

app.delete(
  "/api/admin/recipes/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const recipe =
        await Recipe.findByIdAndDelete(
          req.params.id
        );

      if (!recipe) {
        return res.status(404).json({
          error:
            "Recipe not found.",
        });
      }

      res.json({
        message:
          "Recipe deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Admin delete recipe error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to delete recipe.",
      });
    }
  }
);


// =====================================================
// ADMIN - GET CUISINES
// =====================================================

app.get(
  "/api/admin/cuisines",
  requireAdmin,
  async (req, res) => {
    try {
      const cuisines =
        await Recipe.distinct(
          "cuisine"
        );

      const result =
        await Promise.all(
          cuisines.map(
            async (cuisine) => ({
              name: cuisine,

              totalRecipes:
                await Recipe.countDocuments(
                  { cuisine }
                ),
            })
          )
        );

      res.json(result);
    } catch (error) {
      console.error(
        "Admin cuisines error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load cuisines.",
      });
    }
  }
);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "OK",

      message:
        "Taste of Heaven backend is running.",
    });
  }
);


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      error:
        "Internal server error.",
    });
  }
);

const normalizeEmail = (value) =>
  String(value || "").trim().toLowerCase();

// GET notifications for the logged-in user
app.get("/api/notifications", async (req, res) => {
  try {
    const email = normalizeEmail(req.headers["user-email"]);

    if (!email) {
      return res.status(401).json({
        error: "User email is required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: "Registered user not found.",
      });
    }

    const notifications = await Notification.find({
      "recipients.email": email,
    })
      .populate("recipeId", "name image cuisine rating")
      .sort({ createdAt: -1 })
      .lean();

    // Return only the current user's recipient information.
    const userNotifications = notifications.map((notification) => {
      const recipient = notification.recipients.find(
        (item) => item.email.toLowerCase() === email
      );

      return {
        ...notification,
        isRead: recipient?.isRead ?? false,
        status: recipient?.status ?? "pending",
      };
    });

    return res.json(userNotifications);
  } catch (error) {
    console.error("Fetch notifications error:", error);

    return res.status(500).json({
      error: "Unable to fetch notifications.",
    });
  }
});

// Mark a notification as read for the current user only.
app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const email = normalizeEmail(req.headers["user-email"]);

    if (!email) {
      return res.status(401).json({
        error: "User email is required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Registered user authentication required.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        "recipients.email": email,
      },
      {
        $set: {
          "recipients.$.isRead": true,
        },
      },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({
        error: "Notification not found for this user.",
      });
    }

    const recipient = notification.recipients.find(
      (item) => item.email.toLowerCase() === email
    );

    return res.json({
      message: "Notification marked as read.",
      isRead: recipient?.isRead ?? true,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      error: "Unable to mark notification as read.",
    });
  }
});

// Mark every notification belonging to this user as read.
app.patch(
  "/api/notifications/read-all",
  async (req, res) => {
    try {
      const email = normalizeEmail(req.headers["user-email"]);

      if (!email || !(await User.findOne({ email }))) {
        return res.status(401).json({
          error: "Registered user authentication required.",
        });
      }

      const result = await Notification.updateMany(
        {
          "recipients.email": email,
          "recipients.isRead": false,
        },
        {
          $set: { "recipients.$[recipient].isRead": true },
        },
        {
          arrayFilters: [
            { "recipient.email": email, "recipient.isRead": false },
          ],
        }
      );

      res.json({
        message: "All notifications marked as read.",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({
        error: "Unable to update notifications.",
      });
    }
  }
);



// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);