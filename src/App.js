
import React, { useState, useEffect } from "react";
import axios from "axios";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import TopBar from "./components/TopBar";
import RecipePanel from "./components/RecipePanel";
import RecipeDetails from "./components/RecipeDetails";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import ProfilePage from "./components/ProfilePage";
import ReviewForm from "./components/ReviewForm";
import AdminDashboard from "./components/AdminDashboard";
import HomeHero from "./components/HomeHero";

import "./App.css";

// =====================================================
// API BASE URL
// =====================================================

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

// =====================================================
// RECIPE CATEGORY DETECTION
// 1. Use database type/category when recognized.
// 2. Otherwise, classify using the recipe name.
// =====================================================

const getRecipeType = (recipe) => {
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

  const recipeName = String(recipe?.name || "").trim();
  const type = normalize(recipe?.type);
  const category = normalize(recipe?.category);

  const vegTypes = ["veg", "vegetarian"];
  const nonVegTypes = [
    "non-veg",
    "nonveg",
    "non-vegetarian",
    "nonvegetarian",
  ];
  const dessertTypes = ["dessert", "desserts"];

  // STEP 1: Non-veg takes priority over Veg.
  const bracketMatch = recipeName.match(/\(([^()]*)\)\s*$/);

  const nameLabel = bracketMatch
    ? bracketMatch[1].trim().toLowerCase().replace(/\s+/g, " ")
    : "";

  const nameIsNonVeg = [
    "non-veg",
    "non veg",
    "nonveg",
    "non-vegetarian",
    "non vegetarian",
    "nonvegetarian",
  ].includes(nameLabel);

  if (
    nonVegTypes.includes(type) ||
    nonVegTypes.includes(category) ||
    nameIsNonVeg
  ) {
    return "Non-veg";
  }

  // STEP 2: Check the remaining database types.
  if (vegTypes.includes(type)) return "Veg";
  if (dessertTypes.includes(type)) return "Dessert";

  if (vegTypes.includes(category)) return "Veg";
  if (dessertTypes.includes(category)) return "Dessert";

  // STEP 3: Identify Veg from the recipe name.
  if (["veg", "vegetarian"].includes(nameLabel)) {
    return "Veg";
  }

  

  return "Unknown";
};


// =====================================================
// APP
// =====================================================

function App() {
  // =====================================================
  // USER STATE
  // =====================================================

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Error reading saved user:", error);
      return null;
    }
  });

  // =====================================================
  // RECIPE STATE
  // =====================================================

  const [recipes, setRecipes] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // =====================================================
  // FETCH RECIPES
  // =====================================================

  const fetchRecipes = () => {
    axios
      .get(`${API_BASE_URL}/recipes`)
      .then((response) => {
        const data = Array.isArray(response.data)
          ? response.data
          : [];

        console.log("Recipes:", data);
        setRecipes(data);
      })
      .catch((error) => {
        console.error("Error fetching recipes:", error);
      });
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // =====================================================
  // SAVE USER TO LOCAL STORAGE
  // =====================================================

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = (userData) => {
    console.log("Logged in user:", userData);

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // =====================================================
  // CUISINE FILTER
  // =====================================================

  const handleCuisineSelect = (cuisine) => {
    setSelectedCuisine(cuisine || "");
  };

  // =====================================================
  // RATING FILTER
  // =====================================================

  const handleRatingSelect = (rating) => {
    setSelectedRating(rating);
  };

  // =====================================================
  // CATEGORY FILTER
  // =====================================================

  const handleTypeSelect = (type) => {
    const normalizedType = String(type || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

    if (["veg", "vegetarian"].includes(normalizedType)) {
      setSelectedType("Veg");
    } else if (
      [
        "non-veg",
        "nonveg",
        "non-vegetarian",
        "nonvegetarian",
      ].includes(normalizedType)
    ) {
      setSelectedType("Non-veg");
    } else if (
      ["dessert", "desserts"].includes(normalizedType)
    ) {
      setSelectedType("Dessert");
    } else {
      // An empty value clears the category filter.
      setSelectedType("");
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = (term) => {
    setSearchTerm(term || "");
  };

  // =====================================================
  // PROFILE PICTURE - SAVE TO MONGODB
  // =====================================================

  const handleProfilePictureSelect = async (picture) => {
    if (!user) {
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/users/profile-picture`,
        {
          email: user.email,
          profilePicture: picture,
        }
      );

      const updatedUser = response.data.user;

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      console.log(
        "Profile picture updated:",
        updatedUser.profilePicture
      );
    } catch (error) {
      console.error("Error updating profile picture:", error);

      alert(
        error.response?.data?.error ||
          "Unable to update profile picture."
      );
    }
  };

  // =====================================================
  // FILTER RECIPES
  // =====================================================

  const filteredRecipes = recipes.filter((recipe) => {
    // Cuisine filter
    const matchesCuisine = selectedCuisine
      ? String(recipe?.cuisine || "").trim().toLowerCase() ===
        String(selectedCuisine).trim().toLowerCase()
      : true;

    // Rating filter - preserve existing behavior
    let matchesRating = true;

    if (selectedRating === 4) {
      const rating = Number(recipe?.rating);
      matchesRating = rating >= 4 && rating < 5;
    }

    if (selectedRating === 5) {
      matchesRating = Number(recipe?.rating) === 5;
    }

    // Category filter
    const recipeType = getRecipeType(recipe);

    const matchesType =
      !selectedType || recipeType === selectedType;

    // Search filter
    const normalizedSearch = String(searchTerm || "")
      .trim()
      .toLowerCase();

    const matchesSearchTerm = String(recipe?.name || "")
      .toLowerCase()
      .includes(normalizedSearch);

    // All active filters must match.
    return (
      matchesCuisine &&
      matchesRating &&
      matchesType &&
      matchesSearchTerm
    );
  });

  // =====================================================
  // UI
  // =====================================================

  return (
    <Router>
      <div className="app-container">
        {/* TOP BAR */}

        <TopBar
          user={user}
          onLogout={handleLogout}
          onCuisineSelect={handleCuisineSelect}
          onRatingSelect={handleRatingSelect}
          onTypeSelect={handleTypeSelect}
          onSearch={handleSearch}
        />

        {/* PAGE CONTENT */}

        <div className="content">
          <Routes>
            {/* =========================================
                HOME PAGE
            ========================================= */}

            <Route
              path="/"
              element={
                <>
                  <HomeHero
                    onSearch={handleSearch}
                    onTypeSelect={handleTypeSelect}
                  />

                  {/* RECIPES HEADING AND RECIPE GRID */}

                  <section className="recipes-section">
                    <h2 className="recipes-heading">
                      {selectedType
                        ? `${selectedType} Recipes`
                        : "Recipes"}
                    </h2>

                    <div
                      className="recipe-grid"
                      id="recipe-results"
                    >
                      {filteredRecipes.length === 0 ? (
                        <p className="no-recipes-message">
                          {recipes.length === 0
                            ? "Loading recipes..."
                            : "No recipes found. Try changing your search or filters."}
                        </p>
                      ) : (
                        filteredRecipes.map((recipe) => (
                          <RecipePanel
                            key={recipe._id || recipe.name}
                            recipe={recipe}
                            isLoggedIn={!!user}
                          />
                        ))
                      )}
                    </div>
                  </section>
                </>
              }
            />

            {/* =========================================
                RECIPE DETAILS
            ========================================= */}

            <Route
              path="/recipe/:name"
              element={
                <RecipeDetails
                  recipes={recipes}
                  userSignedIn={!!user}
                  ReviewForm={
                    user ? (
                      <ReviewForm
                        recipeName="Spaghetti Bolognese"
                        user={user}
                        onCancel={() =>
                          console.log("Cancel review")
                        }
                      />
                    ) : null
                  }
                />
              }
            />

            {/* =========================================
                LOGIN
            ========================================= */}

            <Route
              path="/login"
              element={<SignIn onLogin={handleLogin} />}
            />

            {/* =========================================
                SIGN UP
            ========================================= */}

            <Route
              path="/signup"
              element={<SignUp />}
            />

            {/* =========================================
                PROFILE
            ========================================= */}

            <Route
              path="/profile"
              element={
                <ProfilePage
                  user={user}
                  allRecipes={recipes}
                  onProfilePictureSelect={
                    handleProfilePictureSelect
                  }
                />
              }
            />

            {/* =========================================
                ADMIN DASHBOARD
            ========================================= */}

            <Route
              path="/admin"
              element={
                user?.role?.toLowerCase() === "admin" ? (
                  <AdminDashboard
                    user={user}
                    onRecipesChanged={fetchRecipes}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
