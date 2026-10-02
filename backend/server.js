require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { google } = require("googleapis");
const crypto = require("crypto");

const User = require("./models/User");
const LikedRecipe = require("./models/LikedRecipe");
const Comment = require("./models/Comment");

const app = express();


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
  })
  .catch((error) => {
    console.error(
      "MongoDB connection error:",
      error
    );
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
        enum: ["Veg", "Non-veg"],
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
        // Your User model uses password-based login,
        // so Google-created accounts receive a random
        // unusable password hash.
        const randomPassword =
          crypto.randomBytes(32)
            .toString("hex");

        const hashedPassword =
          await bcrypt.hash(
            randomPassword,
            10
          );

        const fallbackUsername =
          normalizedEmail.split("@")[0];

        user = new User({
          username:
            String(
              googleName ||
                fallbackUsername
            ).trim(),

          email:
            normalizedEmail,

          password:
            hashedPassword,

          role: "user",

          ...(googlePicture
            ? {
                profilePicture:
                  googlePicture,
              }
            : {}),
        });

        await user.save();
      } else if (
        googlePicture &&
        !user.profilePicture
      ) {
        // Keep the existing user's account data,
        // but use the Google profile image if they
        // do not already have one.
        user.profilePicture =
          googlePicture;

        await user.save();
      }

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


// =====================================================
// USER REGISTRATION
// =====================================================

app.post(
  "/api/register",
  async (req, res) => {
    const {
      username,
      email,
      password,
    } = req.body;

    try {
      if (
        !username ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          error:
            "Username, email and password are required.",
        });
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const existingUser =
        await User.findOne({
          email: normalizedEmail,
        });

      if (existingUser) {
        return res.status(400).json({
          error:
            "Email already exists.",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const newUser =
        new User({
          username:
            username.trim(),

          email:
            normalizedEmail,

          password:
            hashedPassword,

          role: "user",
        });

      await newUser.save();

      res.status(201).json({
        message:
          "User created successfully!",
      });
    } catch (error) {
      console.error(
        "Error creating user:",
        error
      );

      res.status(500).json({
        error:
          "Error creating user",
      });
    }
  }
);


// =====================================================
// USER LOGIN
// =====================================================

app.post(
  "/api/login",
  async (req, res) => {
    const {
      email,
      password,
    } = req.body;

    try {
      if (!email || !password) {
        return res.status(400).json({
          error:
            "Email and password are required.",
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
        return res.status(400).json({
          error:
            "User not found",
        });
      }

      const isMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!isMatch) {
        return res.status(400).json({
          error:
            "Invalid credentials",
        });
      }

      const {
        password: _,
        ...userInfo
      } = user.toObject();

      res.json(userInfo);
    } catch (error) {
      console.error(
        "Error logging in user:",
        error
      );

      res.status(500).json({
        error:
          "Server error",
      });
    }
  }
);


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

      // -----------------------------------------
      // SEND REVIEW TO N8N
      // -----------------------------------------

      try {
        const n8nWebhook =
          process.env
            .N8N_REVIEW_WEBHOOK_URL;

        if (n8nWebhook) {
          await fetch(
            n8nWebhook,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                reviewId:
                  newComment._id.toString(),

                recipeName:
                  newComment.recipeName,

                username:
                  newComment.username,

                email:
                  newComment.email,

                rating:
                  newComment.rating,

                comments:
                  newComment.comments,

                createdAt:
                  newComment.createdAt,
              }),
            }
          );

          console.log(
            "Review sent to n8n"
          );
        }
      } catch (error) {
        console.error(
          "Error sending review to n8n:",
          error.message
        );
      }

      res.status(201).json(
        newComment
      );
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

      const analyses =
        await ReviewAnalysis.find({
          recipeName,
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