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

import "./App.css";

function App() {
  // =====================================================
  // USER STATE
  // =====================================================

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  // =====================================================
  // RECIPE STATE
  // =====================================================

  const [recipes, setRecipes] = useState([]);

  const [selectedCuisine, setSelectedCuisine] =
    useState("");

  const [selectedRating, setSelectedRating] =
    useState(null);

  // "Veg" | "Non-veg" | ""
  const [selectedType, setSelectedType] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  // =====================================================
  // FETCH RECIPES
  // NEW: reusable function so AdminDashboard can
  // refresh the home page after add / edit / delete
  // =====================================================

  const fetchRecipes = () => {
    axios
      .get("http://localhost:5000/recipes")
      .then((response) => {
        console.log(
          "Recipes:",
          response.data
        );

        setRecipes(response.data);
      })
      .catch((error) => {
        console.error(
          "Error fetching recipes:",
          error
        );
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
      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = (userData) => {
    console.log(
      "Logged in user:",
      userData
    );

    setUser(userData);

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );
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

  const handleCuisineSelect = (
    cuisine
  ) => {
    setSelectedCuisine(cuisine);
  };

  // =====================================================
  // RATING FILTER
  // =====================================================

  const handleRatingSelect = (
    rating
  ) => {
    setSelectedRating(rating);
  };

  // =====================================================
  // VEG / NON-VEG FILTER
  // =====================================================

  const handleTypeSelect = (type) => {
    setSelectedType(type);
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  // =====================================================
  // PROFILE PICTURE
  // SAVE TO MONGODB
  // =====================================================

  const handleProfilePictureSelect =
    async (picture) => {
      if (!user) {
        return;
      }

      try {
        const response =
          await axios.put(
            "http://localhost:5000/api/users/profile-picture",
            {
              email: user.email,
              profilePicture: picture,
            }
          );

        const updatedUser =
          response.data.user;

        setUser(updatedUser);

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );

        console.log(
          "Profile picture updated:",
          updatedUser.profilePicture
        );

      } catch (error) {
        console.error(
          "Error updating profile picture:",
          error
        );

        alert(
          error.response?.data?.error ||
            "Unable to update profile picture."
        );
      }
    };

  // =====================================================
  // VEG CHECK (from the recipe name)
  // Same rule as the badge in RecipePanel
  // =====================================================

  const isVegRecipe = (name = "") => {
    const isNonVegName =
      /\bnon[\s_-]?veg\b/i.test(name);

    const isVegName =
      /\bveg\b/i.test(name);

    return isVegName && !isNonVegName;
  };

  // =====================================================
  // FILTER RECIPES
  // =====================================================

  const filteredRecipes =
    recipes.filter((recipe) => {
      const matchesCuisine =
        selectedCuisine
          ? recipe.cuisine ===
            selectedCuisine
          : true;

      let matchesRating = true;

      if (selectedRating === 4) {
        matchesRating =
          Number(recipe.rating) >= 4 &&
          Number(recipe.rating) < 5;
      }

      if (selectedRating === 5) {
        matchesRating =
          Number(recipe.rating) === 5;
      }

      let matchesType = true;

      if (selectedType === "Veg") {
        matchesType = isVegRecipe(
          recipe.name
        );
      }

      if (selectedType === "Non-veg") {
        matchesType = !isVegRecipe(
          recipe.name
        );
      }

      const matchesSearchTerm =
        recipe.name
          ?.toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          );

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

        {/* =========================
            TOP BAR
        ========================== */}

        <TopBar
          user={user}
          onLogout={handleLogout}
          onCuisineSelect={
            handleCuisineSelect
          }
          onRatingSelect={
            handleRatingSelect
          }
          onTypeSelect={
            handleTypeSelect
          }
          onSearch={handleSearch}
        />

        {/* =========================
            PAGE CONTENT
        ========================== */}

        <div className="content">

          <Routes>

            {/* =========================
                HOME
            ========================== */}

            <Route
              path="/"
              element={
                <div className="recipe-grid">

                  {filteredRecipes.length ===
                  0 ? (
                    <p>
                      Loading recipes...
                    </p>
                  ) : (
                    filteredRecipes.map(
                      (recipe) => (
                        <RecipePanel
                          key={
                            recipe._id
                          }
                          recipe={recipe}
                          isLoggedIn={
                            !!user
                          }
                        />
                      )
                    )
                  )}

                </div>
              }
            />

            {/* =========================
                RECIPE DETAILS
            ========================== */}

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
                          console.log(
                            "Cancel review"
                          )
                        }
                      />
                    ) : null
                  }
                />
              }
            />

            {/* =========================
                LOGIN
            ========================== */}

            <Route
              path="/login"
              element={
                <SignIn
                  onLogin={handleLogin}
                />
              }
            />

            {/* =========================
                SIGN UP
            ========================== */}

            <Route
              path="/signup"
              element={
                <SignUp />
              }
            />

            {/* =========================
                PROFILE
            ========================== */}

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

            {/* =========================
                ADMIN
            ========================== */}

            <Route
              path="/admin"
              element={
                user?.role === "admin" ? (
                  <AdminDashboard
                    user={user}
                    onRecipesChanged={
                      fetchRecipes
                    }
                  />
                ) : (
                  <Navigate
                    to="/"
                    replace
                  />
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