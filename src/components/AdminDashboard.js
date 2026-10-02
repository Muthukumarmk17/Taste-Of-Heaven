import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDisplay, faBrain } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";

const API = "http://localhost:5000";

const EMPTY_RECIPE_FORM = {
  name: "",
  image: "",
  cuisine: "",
  type: "Veg",
  description: "",
  cookingTime: "",
  servings: "",
  rating: "",
  tags: "",
  ingredients: "",
  methods: "",
};

// =====================================================
// FAVORITE RECIPE TYPE — DETERMINE FROM RECIPE NAME
// =====================================================
// The Favorites API may contain an incorrect/missing `type` field.
// Therefore the Favorites page does NOT use recipe.type to decide
// the filter. It determines Veg / Non-veg directly from recipe.name.
const getRecipeTypeFromName = (value) => {
  const name = String(value || "")
    .toLowerCase()
    .trim();

  // Explicit labels in the recipe name have highest priority.
  if (
    /\(\s*non[\s-]*veg\s*\)/i.test(name) ||
    /\[\s*non[\s-]*veg\s*\]/i.test(name) ||
    /(?:^|[\s_-])non[\s-]*veg(?:$|[\s_-])/i.test(name)
  ) {
    return "Non-veg";
  }

  if (
    /\(\s*veg\s*\)/i.test(name) ||
    /\[\s*veg\s*\]/i.test(name) ||
    /(?:^|[\s_-])veg(?:$|[\s_-])/i.test(name)
  ) {
    return "Veg";
  }

  // If there is no explicit label, use common non-vegetarian food
  // words in the recipe name itself.
  const nonVegWords = [
    "chicken",
    "mutton",
    "fish",
    "prawn",
    "prawns",
    "shrimp",
    "crab",
    "lobster",
    "beef",
    "pork",
    "lamb",
    "turkey",
    "duck",
    "goat",
    "seafood",
    "meat",
    "bacon",
    "ham",
    "salmon",
    "tuna",
    "anchovy",
    "sardine",
  ];

  const containsNonVegWord = nonVegWords.some((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    return pattern.test(name);
  });

  // "eggless" is vegetarian and must not be classified as non-veg
  // merely because it contains the word "egg".
  if (containsNonVegWord) {
    return "Non-veg";
  }

  if (/\begg(?!less)\b/i.test(name)) {
    return "Non-veg";
  }

  // For this Favorites page, recipes without a non-veg indicator
  // are treated as Veg so the Veg filter remains useful for names
  // such as Paneer Butter Masala, Dal Fry, Veg Fried Rice, etc.
  return "Veg";
};

// NEW: onRecipesChanged prop (refreshes the home page recipes in App.js)
const AdminDashboard = ({ user, onRecipesChanged }) => {
  const navigate = useNavigate();

  // =====================================================
  // PAGE
  // =====================================================

  const [activePage, setActivePage] = useState("dashboard");

  // =====================================================
  // DATA
  // =====================================================

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecipes: 0,
    totalReviews: 0,
    totalFavorites: 0,
  });

  const [recipes, setRecipes] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [analyses, setAnalyses] = useState([]);

  // =====================================================
  // GENERAL STATES
  // =====================================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =====================================================
  // SEARCH
  // =====================================================

  const [recipeSearch, setRecipeSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");

  // =====================================================
  // FAVORITES FILTERS
  // =====================================================

  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [favoriteCuisine, setFavoriteCuisine] = useState("all");
  const [favoriteType, setFavoriteType] = useState("all");
  const [favoriteSort, setFavoriteSort] = useState("latest");

  // =====================================================
  // PAGINATION
  // =====================================================

  const ITEMS_PER_PAGE = 10;

  const [recipePage, setRecipePage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [favoritePage, setFavoritePage] = useState(1);

  // =====================================================
  // AI REVIEW ANALYTICS — FILTERS
  // =====================================================

  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsSentiment, setAnalyticsSentiment] = useState("all");
  const [analyticsRating, setAnalyticsRating] = useState("all");
  const [analyticsCategory, setAnalyticsCategory] = useState("all");
  const [analyticsRange, setAnalyticsRange] = useState("all");
  const [analyticsPage, setAnalyticsPage] = useState(1);

  // =====================================================
  // RECIPE EDIT / FORM
  // =====================================================

  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeForm, setRecipeForm] = useState(EMPTY_RECIPE_FORM);
  const [formErrors, setFormErrors] = useState({});

  // =====================================================
  // ADMIN HEADERS
  // =====================================================

  const adminConfig = {
    headers: {
      "user-email": user?.email || "",
    },
  };

  // =====================================================
  // ADMIN CHECK
  // =====================================================

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    if (user?.role === "admin") {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        statsResponse,
        recipesResponse,
        usersResponse,
        reviewsResponse,
        favoritesResponse,
        analysesResponse,
      ] = await Promise.all([
        axios.get(`${API}/api/admin/stats`, adminConfig),
        axios.get(`${API}/recipes`),
        axios.get(`${API}/api/admin/users`, adminConfig),
        axios.get(`${API}/api/admin/reviews`, adminConfig),
        axios.get(`${API}/api/admin/favorites`, adminConfig),
        axios.get(`${API}/api/admin/reviewAnalyses`, adminConfig),
      ]);

      setStats(statsResponse.data);
      setRecipes(recipesResponse.data);
      setUsers(usersResponse.data);
      setReviews(reviewsResponse.data);
      setFavorites(favoritesResponse.data);
      setAnalyses(analysesResponse.data);
    } catch (err) {
      console.error("Admin dashboard error:", err);
      showError(
        err.response?.data?.error || "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // MESSAGES
  // =====================================================

  const showMessage = (text) => {
    setError("");
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  const showError = (text) => {
    setMessage("");
    setError(text);
    setTimeout(() => setError(""), 4000);
  };

  // =====================================================
  // CUISINES
  // =====================================================

  const cuisines = useMemo(
    () => [...new Set(recipes.map((recipe) => recipe.cuisine).filter(Boolean))],
    [recipes]
  );

  // =====================================================
  // POSITIVE REVIEWS
  // =====================================================

  const positivePercentage =
    analyses.length > 0
      ? Math.round(
          (analyses.filter(
            (item) =>
              String(item.sentiment || "")
                .toLowerCase()
                .trim() === "positive"
          ).length /
            analyses.length) *
            100
        )
      : 0;

  // =====================================================
  // DYNAMIC CUISINE CHART DATA
  // =====================================================

  const cuisineChartData = useMemo(
    () =>
      cuisines
        .map((cuisine, index) => ({
          name: cuisine,
          count: recipes.filter((recipe) => recipe.cuisine === cuisine).length,
          colorIndex: index,
        }))
        .filter((item) => item.count > 0)
        .slice(0, 6),
    [cuisines, recipes]
  );

  const cuisineColors = [
    "#10ad58",
    "#f3a51e",
    "#e85621",
    "#4b90e2",
    "#a6b8ad",
    "#8a6ed8",
  ];

  const cuisineTotal = cuisineChartData.reduce(
    (total, item) => total + item.count,
    0
  );

  const cuisineGradient = (() => {
    if (cuisineTotal === 0) return "#dfe8e1";

    let currentDegree = 0;

    const segments = cuisineChartData.map((item, index) => {
      const percentage = (item.count / cuisineTotal) * 360;
      const startDegree = currentDegree;
      currentDegree += percentage;
      return `${cuisineColors[index % cuisineColors.length]} ${startDegree}deg ${currentDegree}deg`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  })();

  // =====================================================
  // RECIPE FORM HANDLERS
  // =====================================================

  const handleRecipeChange = (event) => {
    const { name, value } = event.target;

    setRecipeForm((previous) => ({ ...previous, [name]: value }));

    // clear the error for the field being edited
    setFormErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const resetRecipeForm = () => {
    setRecipeForm(EMPTY_RECIPE_FORM);
    setFormErrors({});
    setEditingRecipe(null);
  };

  const openAddRecipe = () => {
    resetRecipeForm();
    setActivePage("add-recipe");
  };

  const openEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setFormErrors({});

    setRecipeForm({
      name: recipe.name || "",
      image: recipe.image || "",
      cuisine: recipe.cuisine || "",
      type: recipe.type || "Veg",
      description: recipe.description || "",
      cookingTime: recipe.cookingTime || "",
      servings: recipe.servings || "",
      rating: recipe.rating ?? "",
      tags: Array.isArray(recipe.tags) ? recipe.tags.join(", ") : "",
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.join("\n")
        : "",
      methods: Array.isArray(recipe.methods) ? recipe.methods.join("\n") : "",
    });

    setActivePage("add-recipe");
  };

  // =====================================================
  // VALIDATE RECIPE FORM
  // Name, Cuisine, Type, Ingredients, Instructions,
  // Image URL and Rating are ALL mandatory.
  // =====================================================

  const validateRecipeForm = () => {
    const errors = {};

    if (!recipeForm.name.trim()) {
      errors.name = "Recipe name is required.";
    }

    if (!recipeForm.cuisine.trim()) {
      errors.cuisine = "Cuisine is required.";
    }

    if (!["Veg", "Non-veg"].includes(recipeForm.type)) {
      errors.type = "Please select a recipe type.";
    }

    const ingredientLines = recipeForm.ingredients
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (ingredientLines.length === 0) {
      errors.ingredients = "Please enter at least one ingredient.";
    }

    const methodLines = recipeForm.methods
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (methodLines.length === 0) {
      errors.methods = "Please enter at least one instruction step.";
    }

    if (!recipeForm.image.trim()) {
      errors.image = "Image URL is required.";
    }

    const ratingText = String(recipeForm.rating).trim();
    const ratingNumber = Number(ratingText);

    if (ratingText === "") {
      errors.rating = "Rating is required.";
    } else if (
      Number.isNaN(ratingNumber) ||
      ratingNumber < 0 ||
      ratingNumber > 5
    ) {
      errors.rating = "Rating must be a number between 0 and 5.";
    }

    return errors;
  };

  // =====================================================
  // SAVE RECIPE
  // =====================================================

  const saveRecipe = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const errors = validateRecipeForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showError("Please fill in all the required fields.");
      return;
    }

    setFormErrors({});

    const recipeData = {
      name: recipeForm.name.trim(),
      image: recipeForm.image.trim(),
      cuisine: recipeForm.cuisine.trim(),
      type: recipeForm.type,
      description: recipeForm.description.trim(),
      cookingTime: Number(recipeForm.cookingTime) || 0,
      servings: Number(recipeForm.servings) || 0,
      rating: Number(recipeForm.rating),
      tags: recipeForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      ingredients: recipeForm.ingredients
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      methods: recipeForm.methods
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
      if (editingRecipe) {
        await axios.put(
          `${API}/api/admin/recipes/${editingRecipe._id}`,
          recipeData,
          adminConfig
        );
        showMessage("Recipe updated successfully.");
      } else {
        await axios.post(`${API}/api/admin/recipes`, recipeData, adminConfig);
        showMessage("Recipe added successfully.");
      }

      resetRecipeForm();
      await loadDashboardData();
      // NEW: refresh the home page recipes
      if (onRecipesChanged) onRecipesChanged();
      setActivePage("recipes");
    } catch (err) {
      console.error("Recipe save error:", err);
      showError(err.response?.data?.error || "Unable to save recipe.");
    }
  };

  // =====================================================
  // DELETE ACTIONS
  // =====================================================

  const deleteRecipe = async (id) => {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;

    try {
      await axios.delete(`${API}/api/admin/recipes/${id}`, adminConfig);
      showMessage("Recipe deleted successfully.");
      await loadDashboardData();
      // NEW: refresh the home page recipes
      if (onRecipesChanged) onRecipesChanged();
    } catch (err) {
      showError(err.response?.data?.error || "Unable to delete recipe.");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`${API}/api/admin/users/${id}`, adminConfig);
      showMessage("User deleted successfully.");
      await loadDashboardData();
    } catch (err) {
      showError(err.response?.data?.error || "Unable to delete user.");
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Delete this review?")) return;

    try {
      await axios.delete(`${API}/api/admin/reviews/${id}`, adminConfig);
      showMessage("Review deleted successfully.");
      await loadDashboardData();
    } catch (err) {
      showError(err.response?.data?.error || "Unable to delete review.");
    }
  };

  const deleteAnalysis = async (id) => {
    if (!id) {
      showError("This analysis has no ID and cannot be deleted.");
      return;
    }

    if (!window.confirm("Delete this analyzed review?")) return;

    try {
      await axios.delete(`${API}/api/admin/reviewAnalyses/${id}`, adminConfig);

      // remove instantly from the screen, then re-sync with the server
      setAnalyses((previous) => previous.filter((item) => item._id !== id));

      showMessage("Analysis deleted successfully.");
      await loadDashboardData();
    } catch (err) {
      console.error("Delete analysis error:", err);
      showError(err.response?.data?.error || "Unable to delete analysis.");
    }
  };

  // =====================================================
  // FILTERED LISTS
  // =====================================================

  const filteredRecipes = recipes.filter((recipe) => {
    const search = recipeSearch.toLowerCase().trim();
    return (
      recipe.name?.toLowerCase().includes(search) ||
      recipe.cuisine?.toLowerCase().includes(search)
    );
  });

  const filteredUsers = users.filter((item) => {
    const search = userSearch.toLowerCase().trim();
    return (
      item.username?.toLowerCase().includes(search) ||
      item.email?.toLowerCase().includes(search)
    );
  });

  const filteredReviews = reviews.filter((item) => {
    const search = reviewSearch.toLowerCase().trim();
    return (
      item.username?.toLowerCase().includes(search) ||
      item.recipeName?.toLowerCase().includes(search) ||
      item.comments?.toLowerCase().includes(search)
    );
  });

  // =====================================================
  // PAGINATED DATA
  // =====================================================

  const recipeTotalPages = Math.max(
    1,
    Math.ceil(filteredRecipes.length / ITEMS_PER_PAGE)
  );
  const userTotalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  );
  const reviewTotalPages = Math.max(
    1,
    Math.ceil(filteredReviews.length / ITEMS_PER_PAGE)
  );

  const recipeStartIndex = (recipePage - 1) * ITEMS_PER_PAGE;
  const userStartIndex = (userPage - 1) * ITEMS_PER_PAGE;
  const reviewStartIndex = (reviewPage - 1) * ITEMS_PER_PAGE;

  const paginatedRecipes = filteredRecipes.slice(
    recipeStartIndex,
    recipeStartIndex + ITEMS_PER_PAGE
  );
  const paginatedUsers = filteredUsers.slice(
    userStartIndex,
    userStartIndex + ITEMS_PER_PAGE
  );
  const paginatedReviews = filteredReviews.slice(
    reviewStartIndex,
    reviewStartIndex + ITEMS_PER_PAGE
  );

  const getPageNumbers = (currentPage, totalPages) => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (currentPage > 4) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i += 1) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (currentPage < totalPages - 3) pages.push("...");

    if (!pages.includes(totalPages)) pages.push(totalPages);

    return pages;
  };

  useEffect(() => {
    if (recipePage > recipeTotalPages) setRecipePage(recipeTotalPages);
  }, [recipePage, recipeTotalPages]);

  useEffect(() => {
    if (userPage > userTotalPages) setUserPage(userTotalPages);
  }, [userPage, userTotalPages]);

  useEffect(() => {
    if (reviewPage > reviewTotalPages) setReviewPage(reviewTotalPages);
  }, [reviewPage, reviewTotalPages]);

  // =====================================================
  // AI ANALYTICS — DATA
  // =====================================================

  const parseAnalysisDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatAnalysisDate = (value) => {
    const date = parseAnalysisDate(value);
    if (!date) return value || "—";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const rangedAnalyses = useMemo(() => {
    const now = new Date();

    return [...analyses]
      .filter((item) => {
        if (analyticsRange === "all") return true;

        const date = parseAnalysisDate(item.analyzedAt);
        if (!date) return true;

        if (analyticsRange === "month") {
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        }

        return now - date <= Number(analyticsRange) * 24 * 60 * 60 * 1000;
      })
      .sort(
        (a, b) =>
          (parseAnalysisDate(b.analyzedAt)?.getTime() || 0) -
          (parseAnalysisDate(a.analyzedAt)?.getTime() || 0)
      );
  }, [analyses, analyticsRange]);

  const analytics = useMemo(() => {
    const total = rangedAnalyses.length;

    const countSentiment = (label) =>
      rangedAnalyses.filter(
        (item) =>
          String(item.sentiment || "")
            .toLowerCase()
            .trim() === label
      ).length;

    const positive = countSentiment("positive");
    const neutral = countSentiment("neutral");
    const negative = countSentiment("negative");

    const percent = (value) =>
      total > 0 ? Math.round((value / total) * 100) : 0;

    const ratings = rangedAnalyses
      .map((item) => Number(item.rating) || 0)
      .filter((rating) => rating > 0);

    const averageRating = ratings.length
      ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
      : "0.0";

    const ratingCounts = [1, 2, 3, 4, 5].map(
      (star) =>
        rangedAnalyses.filter(
          (item) => Math.round(Number(item.rating) || 0) === star
        ).length
    );

    const countBy = (getKeys) => {
      const map = {};
      rangedAnalyses.forEach((item) => {
        getKeys(item).forEach((key) => {
          if (key) map[key] = (map[key] || 0) + 1;
        });
      });
      return map;
    };

    const sortEntries = (map) =>
      Object.entries(map).sort((a, b) => b[1] - a[1]);

    const topKeywords = sortEntries(
      countBy((item) =>
        (Array.isArray(item.keywords) ? item.keywords : []).map((k) =>
          String(k).toLowerCase().trim()
        )
      )
    )
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    const topRecipes = sortEntries(countBy((item) => [item.recipeName]))
      .slice(0, 4)
      .map(([name, count]) => {
        const recipe = recipes.find((r) => r.name === name) || {};
        return { name, count, image: recipe.image, type: recipe.type };
      });

    const cuisineMap = {};

    cuisines.forEach((cuisine) => {
      cuisineMap[cuisine] = 0;
    });

    rangedAnalyses.forEach((item) => {
      const recipe = recipes.find((r) => r.name === item.recipeName);
      if (recipe?.cuisine) {
        cuisineMap[recipe.cuisine] = (cuisineMap[recipe.cuisine] || 0) + 1;
      }
    });

    const cuisineReviews = sortEntries(cuisineMap)
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    const topCategory =
      sortEntries(countBy((item) => [item.category]))[0]?.[0] || "";

    return {
      total,
      positive,
      neutral,
      negative,
      positivePct: percent(positive),
      neutralPct: percent(neutral),
      negativePct: percent(negative),
      averageRating,
      ratingCounts,
      topKeywords,
      topRecipes,
      cuisineReviews,
      topCategory,
    };
  }, [rangedAnalyses, recipes, cuisines]);

  const sentimentGradient = (() => {
    if (analytics.total === 0) return "#dfe8e1";

    const positiveEnd = (analytics.positive / analytics.total) * 360;
    const neutralEnd =
      positiveEnd + (analytics.neutral / analytics.total) * 360;

    return `conic-gradient(#10ad58 0deg ${positiveEnd}deg, #f3a51e ${positiveEnd}deg ${neutralEnd}deg, #e5484d ${neutralEnd}deg 360deg)`;
  })();

  const analysisCategories = useMemo(
    () => [
      ...new Set(analyses.map((item) => item.category).filter(Boolean)),
    ],
    [analyses]
  );

  const filteredAnalyses = rangedAnalyses.filter((item) => {
    const search = analyticsSearch.toLowerCase().trim();

    const matchesSearch =
      !search ||
      [item.recipeName, item.username, item.comments, item.summary].some(
        (value) => String(value || "").toLowerCase().includes(search)
      );

    const matchesSentiment =
      analyticsSentiment === "all" ||
      String(item.sentiment || "")
        .toLowerCase()
        .trim() === analyticsSentiment;

    const matchesRating =
      analyticsRating === "all" ||
      Math.round(Number(item.rating) || 0) === Number(analyticsRating);

    const matchesCategory =
      analyticsCategory === "all" || item.category === analyticsCategory;

    return matchesSearch && matchesSentiment && matchesRating && matchesCategory;
  });

  const analyticsTotalPages = Math.max(
    1,
    Math.ceil(filteredAnalyses.length / ITEMS_PER_PAGE)
  );

  const analyticsStartIndex = (analyticsPage - 1) * ITEMS_PER_PAGE;

  const paginatedAnalyses = filteredAnalyses.slice(
    analyticsStartIndex,
    analyticsStartIndex + ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (analyticsPage > analyticsTotalPages) {
      setAnalyticsPage(analyticsTotalPages);
    }
  }, [analyticsPage, analyticsTotalPages]);

  // =====================================================
  // SIDEBAR
  // =====================================================

  const sidebarItems = [
    { id: "dashboard", icon: <FontAwesomeIcon icon={faDisplay} />, label: "Dashboard" },
    { id: "recipes", icon: "🍴", label: "Manage Recipes" },
    { id: "add-recipe", icon: "＋", label: "Add New Recipe" },
    { id: "cuisines", icon: "♨", label: "Manage Cuisines" },
    { id: "users", icon: "♟", label: "Manage Users" },
    { id: "reviews", icon: "★", label: "Reviews" },
    { id: "favorites", icon: "♥", label: "Favorites" },
    { id: "ai-analytics", icon: <FontAwesomeIcon icon={faBrain} />, label: "AI Review Analytics" },
  ];

  const renderSidebar = () => (
    <aside className="admin-sidebar">
      <div className="sidebar-menu">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={
              activePage === item.id ? "sidebar-item active" : "sidebar-item"
            }
            onClick={() => {
              if (item.id === "add-recipe") {
                openAddRecipe();
              } else {
                setActivePage(item.id);
              }
            }}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-food" aria-hidden="true"></div>
    </aside>
  );

  // =====================================================
  // PAGINATION COMPONENT
  // =====================================================

  const Pagination = ({
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    pageSize,
    onPageChange,
    label,
  }) => {
    if (totalItems === 0) return null;

    const firstItem = startIndex + 1;
    const lastItem = Math.min(startIndex + pageSize, totalItems);

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Showing <strong>{firstItem}</strong>–<strong>{lastItem}</strong> of{" "}
          <strong>{totalItems}</strong> {label}
        </div>

        <div className="pagination-controls">
          <button
            type="button"
            className="pagination-btn pagination-arrow"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label={`Previous ${label} page`}
          >
            ‹ <span>Previous</span>
          </button>

          {getPageNumbers(currentPage, totalPages).map((page, index) =>
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                …
              </span>
            ) : (
              <button
                type="button"
                key={page}
                className={
                  currentPage === page
                    ? "pagination-btn pagination-number active"
                    : "pagination-btn pagination-number"
                }
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            className="pagination-btn pagination-arrow"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label={`Next ${label} page`}
          >
            <span>Next</span> ›
          </button>
        </div>
      </div>
    );
  };

  // =====================================================
  // RECIPE TABLE
  // =====================================================

  const RecipeTable = ({ tableRecipes, startIndex = 0 }) => (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Image</th>
            <th>Recipe Name</th>
            <th>Cuisine</th>
            <th>Type</th>
            <th>Rating</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {tableRecipes.length === 0 ? (
            <tr>
              <td colSpan="8" className="empty-cell">
                No recipes found.
              </td>
            </tr>
          ) : (
            tableRecipes.map((recipe, index) => (
              <tr key={recipe._id}>
                <td>{startIndex + index + 1}</td>

                <td>
                  <img
                    className="table-recipe-image"
                    src={recipe.image}
                    alt={recipe.name}
                  />
                </td>

                <td>
                  <strong>{recipe.name}</strong>
                </td>

                <td>{recipe.cuisine}</td>

                <td>
  {(() => {
    const displayType = getRecipeTypeFromName(recipe.name);

    return (
      <span
        className={
          displayType === "Non-veg"
            ? "type-badge nonveg"
            : "type-badge veg"
        }
      >
        {displayType}
      </span>
    );
  })()}
</td>

                <td>
                  <span className="rating">★ {recipe.rating || "—"}</span>
                </td>

                <td>
                  <span className="status active-status">● Active</span>
                </td>

                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => openEditRecipe(recipe)}
                      title="Edit"
                    >
                      ✎
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deleteRecipe(recipe._id)}
                      title="Delete"
                    >
                      🗑
                    </button>

                    <button
                      className="view-btn"
                      onClick={() =>
                        navigate(`/recipe/${encodeURIComponent(recipe.name)}`)
                      }
                      title="View"
                    >
                      👁
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // =====================================================
  // DASHBOARD
  // =====================================================

  const renderDashboard = () => (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage your recipes, cuisines, users and more</p>
        </div>

        <div className="today-card">
          <span>▣</span>
          <div>
            <strong>Today</strong>
            <small>
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </small>
          </div>
        </div>
      </div>

      {/* STATISTICS */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">🍴</div>
          <div>
            <span>Total Recipes</span>
            <strong>{stats.totalRecipes}</strong>
            <small>↗ Recipes available</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">♨</div>
          <div>
            <span>Cuisines</span>
            <strong>{cuisines.length}</strong>
            <small>↗ Recipe categories</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div>
            <span>Registered Users</span>
            <strong>{stats.totalUsers}</strong>
            <small>↗ Community members</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">★</div>
          <div>
            <span>Total Reviews</span>
            <strong>{stats.totalReviews}</strong>
            <small>↗ {positivePercentage}% positive</small>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}

      <div className="dashboard-columns">
        <div className="dashboard-card large-card">
          <div className="card-heading">
            <div>
              <h2>▣ Recent Recipes</h2>
              <p>Latest recipes added</p>
            </div>

            <button
              className="small-outline-btn"
              onClick={() => setActivePage("recipes")}
            >
              View All →
            </button>
          </div>

          <RecipeTable tableRecipes={recipes.slice(0, 5)} />
        </div>

        <div className="dashboard-side">
          <div className="dashboard-card">
            <div className="card-heading">
              <h2>⚡ Quick Actions</h2>
            </div>

            <div className="quick-grid">
              <button onClick={openAddRecipe}>
                <span>＋</span>
                <small>Add New Recipe</small>
              </button>

              <button onClick={() => setActivePage("cuisines")}>
                <span>♨</span>
                <small>Manage Cuisines</small>
              </button>

              <button onClick={() => setActivePage("users")}>
                <span>♟</span>
                <small>Manage Users</small>
              </button>

              <button onClick={() => setActivePage("ai-analytics")}>
                <span>🧠</span>
                <small>AI Review Analytics</small>
              </button>
            </div>
          </div>

          <div className="dashboard-card cuisine-card">
            <h2>Recipes by Cuisine</h2>

            <div className="donut" style={{ background: cuisineGradient }}>
              <div>
                <strong>{stats.totalRecipes}</strong>
                <span>Recipes</span>
              </div>
            </div>

            <div className="cuisine-list">
              {cuisineChartData.map((item, index) => (
                <div className="cuisine-row" key={item.name}>
                  <span>
                    <i className={`dot dot-${index}`} />
                    {item.name}
                  </span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // =====================================================
  // MANAGE RECIPES
  // =====================================================

  const renderRecipes = () => (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <h1>Manage Recipes</h1>
          <p>View, edit or delete your recipes</p>
        </div>

        <button className="primary-btn" onClick={openAddRecipe}>
          ＋ Add New Recipe
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          🔍
          <input
            type="text"
            placeholder="Search recipes..."
            value={recipeSearch}
            onChange={(e) => {
              setRecipeSearch(e.target.value);
              setRecipePage(1);
            }}
          />
        </div>
      </div>

      <div className="dashboard-card">
        <RecipeTable
          tableRecipes={paginatedRecipes}
          startIndex={recipeStartIndex}
        />

        <Pagination
          currentPage={recipePage}
          totalPages={recipeTotalPages}
          totalItems={filteredRecipes.length}
          startIndex={recipeStartIndex}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setRecipePage}
          label="recipes"
        />
      </div>
    </div>
  );

  // =====================================================
  // ADD / EDIT RECIPE
  // =====================================================

  const renderAddRecipe = () => {
    const groupClass = (field) =>
      formErrors[field] ? "form-group-admin has-error" : "form-group-admin";

    const fieldError = (field) =>
      formErrors[field] ? (
        <div className="field-error">{formErrors[field]}</div>
      ) : null;

    return (
      <div className="admin-page">
        <div className="page-heading">
          <div>
            <h1>{editingRecipe ? "Edit Recipe" : "Add New Recipe"}</h1>
            <p>
              {editingRecipe
                ? "Update your recipe information"
                : "Fill in the details to add a new recipe"}
            </p>
          </div>

          <button
            className="back-btn"
            onClick={() => {
              resetRecipeForm();
              setActivePage("recipes");
            }}
          >
            ← Back to Recipes
          </button>
        </div>

        <form className="recipe-form" onSubmit={saveRecipe} noValidate>
          <div className="recipe-form-grid">
            {/* LEFT */}

            <div className="form-card">
              <h2>Recipe Information</h2>

              <div className={groupClass("name")}>
                <label>Recipe Name *</label>
                <input
                  name="name"
                  value={recipeForm.name}
                  onChange={handleRecipeChange}
                  placeholder="Enter recipe name"
                />
                {fieldError("name")}
              </div>

              <div className="form-row">
                <div className={groupClass("cuisine")}>
                  <label>Cuisine *</label>
                  <input
                    name="cuisine"
                    value={recipeForm.cuisine}
                    onChange={handleRecipeChange}
                    placeholder="e.g. Indian"
                  />
                  {fieldError("cuisine")}
                </div>

                <div className={groupClass("type")}>
                  <label>Type *</label>

                  <div className="radio-row">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="type"
                        value="Veg"
                        checked={recipeForm.type === "Veg"}
                        onChange={handleRecipeChange}
                      />
                      <span>Veg</span>
                    </label>

                    <label className="radio-label">
                      <input
                        type="radio"
                        name="type"
                        value="Non-veg"
                        checked={recipeForm.type === "Non-veg"}
                        onChange={handleRecipeChange}
                      />
                      <span>Non-veg</span>
                    </label>
                  </div>
                  {fieldError("type")}
                </div>
              </div>

              <div className="form-group-admin">
                <label>Short Description</label>
                <textarea
                  name="description"
                  value={recipeForm.description}
                  onChange={handleRecipeChange}
                  placeholder="Enter a short description..."
                  rows="3"
                />
              </div>

              <div className={groupClass("ingredients")}>
                <label>Ingredients *</label>
                <textarea
                  name="ingredients"
                  value={recipeForm.ingredients}
                  onChange={handleRecipeChange}
                  placeholder="Enter one ingredient per line..."
                  rows="7"
                />
                {fieldError("ingredients")}
              </div>

              <div className={groupClass("methods")}>
                <label>Instructions *</label>
                <textarea
                  name="methods"
                  value={recipeForm.methods}
                  onChange={handleRecipeChange}
                  placeholder="Enter one cooking step per line..."
                  rows="7"
                />
                {fieldError("methods")}
              </div>
            </div>

            {/* RIGHT */}

            <div className="form-card">
              <h2>Recipe Image</h2>

              <div className="image-upload-box">
                {recipeForm.image ? (
                  <img src={recipeForm.image} alt="Preview" />
                ) : (
                  <div>
                    <div className="upload-icon">⇧</div>
                    <strong>Recipe Image</strong>
                    <span>Paste an image URL below</span>
                  </div>
                )}
              </div>

              <div className={groupClass("image")}>
                <label>Image URL *</label>
                <input
                  name="image"
                  value={recipeForm.image}
                  onChange={handleRecipeChange}
                  placeholder="https://example.com/image.jpg"
                />
                {fieldError("image")}
              </div>

              <h2>Additional Details</h2>

              <div className="form-row">
                <div className="form-group-admin">
                  <label>Cooking Time (minutes)</label>
                  <input
                    type="number"
                    name="cookingTime"
                    min="0"
                    value={recipeForm.cookingTime}
                    onChange={handleRecipeChange}
                    placeholder="e.g. 30"
                  />
                </div>

                <div className="form-group-admin">
                  <label>Servings</label>
                  <input
                    type="number"
                    name="servings"
                    min="0"
                    value={recipeForm.servings}
                    onChange={handleRecipeChange}
                    placeholder="e.g. 4"
                  />
                </div>
              </div>

              <div className={groupClass("rating")}>
                <label>Rating *</label>
                <input
                  type="number"
                  name="rating"
                  min="0"
                  max="5"
                  step="0.1"
                  value={recipeForm.rating}
                  onChange={handleRecipeChange}
                  placeholder="e.g. 4.5"
                />
                {fieldError("rating")}
              </div>

              <div className="form-group-admin">
                <label>Tags</label>
                <input
                  name="tags"
                  value={recipeForm.tags}
                  onChange={handleRecipeChange}
                  placeholder="quick, easy, healthy"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    resetRecipeForm();
                    setActivePage("recipes");
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn">
                  ✓ {editingRecipe ? "Update Recipe" : "Save Recipe"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  };

  // =====================================================
  // CUISINES
  // =====================================================

  const renderCuisines = () => (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <h1>Manage Cuisines</h1>
          <p>Cuisines currently used by your recipes</p>
        </div>

        <button className="primary-btn" onClick={openAddRecipe}>
          ＋ Add Cuisine
        </button>
      </div>

      <div className="dashboard-card">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cuisine Name</th>
                <th>Total Recipes</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {cuisines.map((cuisine, index) => {
                const count = recipes.filter(
                  (recipe) => recipe.cuisine === cuisine
                ).length;

                return (
                  <tr key={cuisine}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{cuisine}</strong>
                    </td>
                    <td>{count}</td>
                    <td>
                      <span className="status active-status">● Active</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // =====================================================
  // USERS
  // =====================================================

  const renderUsers = () => (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <h1>Manage Users</h1>
          <p>View and manage registered users</p>
        </div>

        <div className="search-box">
          🔍
          <input
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setUserPage(1);
            }}
          />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map((item, index) => (
                <tr key={item._id}>
                  <td>{userStartIndex + index + 1}</td>

                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {item.username?.charAt(0)?.toUpperCase()}
                      </div>
                      <strong>{item.username}</strong>
                    </div>
                  </td>

                  <td>{item.email}</td>

                  <td>
                    <span
                      className={
                        item.role === "admin"
                          ? "role-badge admin-role"
                          : "role-badge"
                      }
                    >
                      {item.role || "user"}
                    </span>
                  </td>

                  <td>
                    <span className="status active-status">● Active</span>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        className="delete-btn"
                        disabled={item.email === user.email}
                        onClick={() => deleteUser(item._id)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={userPage}
          totalPages={userTotalPages}
          totalItems={filteredUsers.length}
          startIndex={userStartIndex}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setUserPage}
          label="users"
        />
      </div>
    </div>
  );

  // =====================================================
  // REVIEWS
  // =====================================================

  const renderReviews = () => (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <h1>Reviews Management</h1>
          <p>View and manage user reviews</p>
        </div>

        <div className="search-box">
          🔍
          <input
            placeholder="Search reviews..."
            value={reviewSearch}
            onChange={(e) => {
              setReviewSearch(e.target.value);
              setReviewPage(1);
            }}
          />
        </div>
      </div>

      <div className="review-summary-grid">
        <div className="mini-stat">
          <span>⭐</span>
          <div>
            <small>Total Reviews</small>
            <strong>{reviews.length}</strong>
          </div>
        </div>

        <div className="mini-stat">
          <span>😊</span>
          <div>
            <small>Positive</small>
            <strong>{positivePercentage}%</strong>
          </div>
        </div>

        <div className="mini-stat">
          <span>🍴</span>
          <div>
            <small>Reviewed Recipes</small>
            <strong>
              {new Set(reviews.map((item) => item.recipeName)).size}
            </strong>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Recipe</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedReviews.map((review, index) => (
                <tr key={review._id}>
                  <td>{reviewStartIndex + index + 1}</td>

                  <td>
                    <strong>{review.username}</strong>
                  </td>

                  <td>{review.recipeName}</td>

                  <td>
                    <span className="stars">
                      {"★".repeat(Number(review.rating) || 0)}
                    </span>
                  </td>

                  <td>
                    <span className="comment-text">{review.comments}</span>
                  </td>

                  <td>
                    {review.createdAt
                      ? new Date(review.createdAt).toLocaleDateString()
                      : "—"}
                  </td>

                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => deleteReview(review._id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={reviewPage}
          totalPages={reviewTotalPages}
          totalItems={filteredReviews.length}
          startIndex={reviewStartIndex}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setReviewPage}
          label="reviews"
        />
      </div>
    </div>
  );

  // =====================================================
  // FAVORITES
  // =====================================================

  const renderFavorites = () => {
    // IMPORTANT:
    // Recipe type for Favorites is determined ONLY from the recipe name.
    // We intentionally do not use master.type or favoriteRecipe.type.
    const recipeLookup = new Map(
      recipes.map((recipe) => [
        String(recipe.name || "").trim().toLowerCase(),
        recipe,
      ])
    );

    const favoriteRows = [];

    favorites.forEach((item) => {
      if (!Array.isArray(item.recipes)) return;

      item.recipes.forEach((favoriteRecipe) => {
        const favoriteName = String(favoriteRecipe?.name || "").trim();
        const master =
          recipeLookup.get(favoriteName.toLowerCase()) || {};

        // Type comes from the recipe NAME, not from the stored type field.
        const nameBasedType = getRecipeTypeFromName(favoriteName);

        favoriteRows.push({
          username: item.username || "Unknown User",
          email: item.email || "",
          recipe: {
            ...favoriteRecipe,
            image: favoriteRecipe?.image || master.image,
            cuisine: master.cuisine || favoriteRecipe?.cuisine,
            rating: master.rating ?? favoriteRecipe?.rating,
            type: nameBasedType,
          },
        });
      });
    });

    const favoriteCuisines = [
      ...new Set(
        favoriteRows.map((item) => item.recipe?.cuisine).filter(Boolean)
      ),
    ];

    const filteredFavorites = [...favoriteRows]
      .filter((item) => {
        const recipe = item.recipe || {};
        const search = favoriteSearch.toLowerCase().trim();

        const matchesSearch =
          !search ||
          String(item.username || "").toLowerCase().includes(search) ||
          String(item.email || "").toLowerCase().includes(search) ||
          String(recipe.name || "").toLowerCase().includes(search) ||
          String(recipe.cuisine || "").toLowerCase().includes(search);

        const matchesCuisine =
          favoriteCuisine === "all" || recipe.cuisine === favoriteCuisine;

        // Recipe type is already derived from recipe.name above.
        const matchesType =
          favoriteType === "all" || recipe.type === favoriteType;

        return matchesSearch && matchesCuisine && matchesType;
      })
      .sort((a, b) => {
        if (favoriteSort === "rating-high") {
          return Number(b.recipe?.rating || 0) - Number(a.recipe?.rating || 0);
        }

        if (favoriteSort === "rating-low") {
          return Number(a.recipe?.rating || 0) - Number(b.recipe?.rating || 0);
        }

        if (favoriteSort === "name") {
          return String(a.recipe?.name || "").localeCompare(
            String(b.recipe?.name || "")
          );
        }

        return 0;
      });

    const favoriteTotalPages = Math.max(
      1,
      Math.ceil(filteredFavorites.length / ITEMS_PER_PAGE)
    );

    const safeFavoritePage = Math.min(favoritePage, favoriteTotalPages);
    const favoriteStartIndex = (safeFavoritePage - 1) * ITEMS_PER_PAGE;

    const paginatedFavorites = filteredFavorites.slice(
      favoriteStartIndex,
      favoriteStartIndex + ITEMS_PER_PAGE
    );

    return (
      <div className="admin-page">
        {/* HEADER */}

        <div className="favorites-header">
          <div className="favorites-title-wrap">
            <div className="favorites-title-icon">♥</div>

            <div>
              <h1>Favorites Management</h1>
              <p>View and manage recipes liked by users</p>
            </div>
          </div>

          <div className="favorites-total-card">
            <div className="favorites-total-icon">♥</div>

            <div>
              <small>Total Favorites</small>
              <strong>{favoriteRows.length}</strong>
            </div>
          </div>
        </div>

        {/* FILTER TOOLBAR (reset button removed) */}

        <div className="favorites-toolbar">
          <div className="favorites-search">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search by user, recipe name or cuisine..."
              value={favoriteSearch}
              onChange={(e) => {
                setFavoriteSearch(e.target.value);
                setFavoritePage(1);
              }}
            />
          </div>

          <div className="favorites-filter">
            <label>Cuisine</label>
            <select
              value={favoriteCuisine}
              onChange={(e) => {
                setFavoriteCuisine(e.target.value);
                setFavoritePage(1);
              }}
            >
              <option value="all">All Cuisines</option>
              {favoriteCuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
          </div>

          <div className="favorites-filter">
            <label>Recipe Type</label>
            <select
              value={favoriteType}
              onChange={(e) => {
                setFavoriteType(e.target.value);
                setFavoritePage(1);
              }}
            >
              <option value="all">All Types</option>
              <option value="Veg">Veg</option>
              <option value="Non-veg">Non-Veg</option>
            </select>
          </div>

          <div className="favorites-filter">
            <label>Sort By</label>
            <select
              value={favoriteSort}
              onChange={(e) => {
                setFavoriteSort(e.target.value);
                setFavoritePage(1);
              }}
            >
              <option value="name">Recipe Name</option>
              <option value="rating-high">Rating: High to Low</option>
              <option value="rating-low">Rating: Low to High</option>
              
            </select>
          </div>
        </div>

        {/* TABLE */}

        <div className="dashboard-card">
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Recipe</th>
                  <th>Cuisine</th>
                  <th>Type</th>
                  <th>Rating</th>
                </tr>
              </thead>

              <tbody>
                {filteredFavorites.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      <div style={{ padding: "45px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "38px", marginBottom: "10px" }}>
                          ♥
                        </div>

                        <strong>No favorites found</strong>

                        <div
                          style={{
                            marginTop: "7px",
                            fontSize: "13px",
                            color: "#7a8a81",
                          }}
                        >
                          Try changing your search or filters.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedFavorites.map((item, index) => {
                    const recipe = item.recipe || {};

                    return (
                      <tr key={`${item.email}-${recipe.name}-${index}`}>
                        <td>{favoriteStartIndex + index + 1}</td>

                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">
                              {item.username?.charAt(0)?.toUpperCase() || "U"}
                            </div>

                            <div>
                              <strong>{item.username}</strong>

                              <small
                                style={{
                                  display: "block",
                                  marginTop: "2px",
                                  color: "#7a8a81",
                                  fontSize: "11px",
                                  fontWeight: 500,
                                }}
                              >
                                {item.email}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="favorite-recipe">
                            {recipe.image ? (
                              <img
                                src={recipe.image}
                                alt={recipe.name || "Recipe"}
                                onError={(e) => {
                                  e.currentTarget.style.visibility = "hidden";
                                }}
                              />
                            ) : null}

                            <span>{recipe.name || "Unnamed Recipe"}</span>
                          </div>
                        </td>

                        <td>{recipe.cuisine || "—"}</td>

                        <td>
                          <span
                            className={
                              recipe.type === "Non-veg"
                                ? "favorite-type nonveg"
                                : "favorite-type veg"
                            }
                          >
                            {recipe.type === "Non-veg" ? "Non-Veg" : "Veg"}
                          </span>
                        </td>

                        <td>
                          <span className="rating">★ {recipe.rating ?? "—"}</span>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={safeFavoritePage}
            totalPages={favoriteTotalPages}
            totalItems={filteredFavorites.length}
            startIndex={favoriteStartIndex}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={setFavoritePage}
            label="favorites"
          />
        </div>
      </div>
    );
  };

  // =====================================================
  // AI REVIEW ANALYTICS
  // =====================================================

  const renderAIAnalytics = () => {
    const ratingColors = ["#e5484d", "#f3733a", "#f3a51e", "#8fd5a6", "#0d9a48"];

    const barColors = [
      "#10ad58",
      "#f3a51e",
      "#4b90e2",
      "#e85621",
      "#8a6ed8",
      "#e5799b",
    ];

    const maxRating = Math.max(1, ...analytics.ratingCounts);
    const maxKeyword = Math.max(1, ...analytics.topKeywords.map((k) => k.count));
    const maxRecipe = Math.max(1, ...analytics.topRecipes.map((r) => r.count));
    const maxCuisine = Math.max(
      1,
      ...analytics.cuisineReviews.map((c) => c.count)
    );

    const insights = [];

    if (analytics.total > 0) {
      insights.push(
        analytics.positive === analytics.total
          ? "All reviews are positive, showing high user satisfaction."
          : `${analytics.positivePct}% of reviews are positive.`
      );

      if (analytics.negative > 0) {
        insights.push(
          `${analytics.negative} negative review${
            analytics.negative > 1 ? "s" : ""
          } need attention.`
        );
      }

      if (analytics.topRecipes[0]) {
        insights.push(`Most reviewed recipe is ${analytics.topRecipes[0].name}.`);
      }

      insights.push(`Average rating is ${analytics.averageRating} out of 5.`);

      if (analytics.topKeywords.length > 0) {
        insights.push(
          `Common keywords: ${analytics.topKeywords
            .map((k) => k.word)
            .join(", ")}.`
        );
      }

      if (analytics.topCategory) {
        insights.push(`Most discussed category: ${analytics.topCategory}.`);
      }
    }

    return (
      <div className="admin-page ai-analytics-page">
        {/* HEADER */}

        <div className="page-heading">
          <div className="ai-title-wrap">
            <div className="ai-title-icon">
              <FontAwesomeIcon icon={faBrain} />
            </div>

            <div>
              <h1>AI Review Analytics</h1>
              <p>Analyze user reviews with AI insights</p>
            </div>
          </div>

          <div className="ai-range">
            <select
              value={analyticsRange}
              onChange={(e) => {
                setAnalyticsRange(e.target.value);
                setAnalyticsPage(1);
              }}
            >
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="month">This month</option>
            </select>
          </div>
        </div>

        {/* STAT CARDS */}

        <div className="ai-stats-grid">
          <div className="stat-card ai-stat total">
            <div className="stat-icon blue">💬</div>
            <div>
              <span>Total Analyzed Reviews</span>
              <strong>{analytics.total}</strong>
              <small>↗ All analyzed reviews</small>
            </div>
          </div>

          <div className="stat-card ai-stat positive">
            <div className="stat-icon green">😊</div>
            <div>
              <span>Positive Reviews</span>
              <strong>{analytics.positive}</strong>
              <small>↗ {analytics.positivePct}% of total</small>
            </div>
          </div>

          <div className="stat-card ai-stat neutral">
            <div className="stat-icon orange">😐</div>
            <div>
              <span>Neutral Reviews</span>
              <strong>{analytics.neutral}</strong>
              <small className="muted">↘ {analytics.neutralPct}% of total</small>
            </div>
          </div>

          <div className="stat-card ai-stat negative">
            <div className="stat-icon red">☹️</div>
            <div>
              <span>Negative Reviews</span>
              <strong>{analytics.negative}</strong>
              <small className="down">↘ {analytics.negativePct}% of total</small>
            </div>
          </div>

          <div className="stat-card ai-stat rating">
            <div className="stat-icon yellow">⭐</div>
            <div>
              <span>Average Rating</span>
              <strong>{analytics.averageRating}</strong>
              <small className="muted">out of 5</small>
            </div>
          </div>
        </div>

        {/* ROW 1 */}

        <div className="ai-grid-row row-one">
          {/* SENTIMENT */}

          <div className="dashboard-card ai-card">
            <div className="ai-card-title">
              <h2>Sentiment Distribution</h2>
              <span className="ai-info">i</span>
            </div>

            <div className="ai-sentiment">
              <div className="ai-donut" style={{ background: sentimentGradient }}>
                <div>
                  <strong>{analytics.total}</strong>
                  <span>Reviews</span>
                </div>
              </div>

              <div className="ai-legend">
                <div className="ai-legend-row">
                  <span>
                    <i className="ai-dot" style={{ background: "#10ad58" }} />
                    Positive
                  </span>
                  <strong>
                    {analytics.positive} ({analytics.positivePct}%)
                  </strong>
                </div>

                <div className="ai-legend-row">
                  <span>
                    <i className="ai-dot" style={{ background: "#f3a51e" }} />
                    Neutral
                  </span>
                  <strong>
                    {analytics.neutral} ({analytics.neutralPct}%)
                  </strong>
                </div>

                <div className="ai-legend-row">
                  <span>
                    <i className="ai-dot" style={{ background: "#e5484d" }} />
                    Negative
                  </span>
                  <strong>
                    {analytics.negative} ({analytics.negativePct}%)
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* RATING DISTRIBUTION */}

          <div className="dashboard-card ai-card">
            <div className="ai-card-title">
              <h2>Rating Distribution</h2>
              <span className="ai-info">i</span>
            </div>

            <div className="ai-rating-chart">
              {analytics.ratingCounts.map((count, index) => (
                <div className="ai-rating-col" key={index}>
                  <strong>{count}</strong>
                  <div
                    className="ai-rating-bar"
                    style={{
                      height: `${(count / maxRating) * 78}%`,
                      background: ratingColors[index],
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="ai-rating-labels">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>{star} ★</span>
              ))}
            </div>
          </div>

          {/* TOP KEYWORDS */}

          <div className="dashboard-card ai-card">
            <div className="ai-card-title">
              <h2>Top Keywords</h2>
              <span className="ai-info">i</span>
            </div>

            {analytics.topKeywords.length === 0 ? (
              <div className="ai-empty">No keywords yet.</div>
            ) : (
              <div className="ai-bar-list">
                {analytics.topKeywords.map((item, index) => (
                  <div className="ai-bar-row" key={item.word}>
                    <div className="ai-bar-label">
                      <span>{item.word}</span>
                    </div>

                    <div className="ai-bar-track">
                      <div
                        className="ai-bar-fill"
                        style={{
                          width: `${(item.count / maxKeyword) * 100}%`,
                          background: barColors[index % barColors.length],
                        }}
                      />
                    </div>

                    <div className="ai-bar-count">{item.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ROW 2 */}

        <div className="ai-grid-row row-two">
          {/* MOST REVIEWED */}

          <div className="dashboard-card ai-card">
            <div className="ai-card-title">
              <h2>Most Reviewed Recipes</h2>
              <span className="ai-info">i</span>
            </div>

            {analytics.topRecipes.length === 0 ? (
              <div className="ai-empty">No reviewed recipes yet.</div>
            ) : (
              <div className="ai-bar-list">
                {analytics.topRecipes.map((item, index) => (
                  <div className="ai-bar-row with-image" key={item.name}>
                    <div className="ai-bar-label">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.style.visibility = "hidden";
                          }}
                        />
                      )}
                      <span>
                        {item.name}
                        {item.type ? ` (${item.type})` : ""}
                      </span>
                    </div>

                    <div className="ai-bar-track">
                      <div
                        className="ai-bar-fill"
                        style={{
                          width: `${(item.count / maxRecipe) * 100}%`,
                          background: barColors[index % barColors.length],
                        }}
                      />
                    </div>

                    <div className="ai-bar-count">{item.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CUISINE-WISE */}

          <div className="dashboard-card ai-card">
            <div className="ai-card-title">
              <h2>Cuisine-wise Reviews</h2>
              <span className="ai-info">i</span>
            </div>

            {analytics.cuisineReviews.length === 0 ? (
              <div className="ai-empty">No cuisines yet.</div>
            ) : (
              <div className="ai-bar-list">
                {analytics.cuisineReviews.map((item, index) => (
                  <div className="ai-bar-row" key={item.name}>
                    <div className="ai-bar-label">
                      <i
                        className="ai-dot"
                        style={{ background: barColors[index % barColors.length] }}
                      />
                      <span>{item.name}</span>
                    </div>

                    <div className="ai-bar-track">
                      <div
                        className="ai-bar-fill"
                        style={{
                          width: `${(item.count / maxCuisine) * 100}%`,
                          background: barColors[index % barColors.length],
                        }}
                      />
                    </div>

                    <div className="ai-bar-count">{item.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INSIGHTS */}

          <div className="dashboard-card ai-card">
            <div className="ai-card-title">
              <h2>Recent AI Insights</h2>
              <span className="ai-info">i</span>
            </div>

            {insights.length === 0 ? (
              <div className="ai-empty">No analyzed reviews yet.</div>
            ) : (
              <ul className="ai-insights">
                {insights.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ANALYZED REVIEWS TABLE */}

        <div className="dashboard-card ai-table-card">
          <div className="ai-table-head">
            <div>
              <h2>AI Analyzed Reviews</h2>
              <p className="ai-table-sub">
                {filteredAnalyses.length} result
                {filteredAnalyses.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="ai-table-filters">
              <div className="ai-search">
                🔍
                <input
                  type="text"
                  placeholder="Search by recipe, user, comment..."
                  value={analyticsSearch}
                  onChange={(e) => {
                    setAnalyticsSearch(e.target.value);
                    setAnalyticsPage(1);
                  }}
                />
              </div>

              <select
                className="ai-select"
                value={analyticsSentiment}
                onChange={(e) => {
                  setAnalyticsSentiment(e.target.value);
                  setAnalyticsPage(1);
                }}
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>

              <select
                className="ai-select"
                value={analyticsRating}
                onChange={(e) => {
                  setAnalyticsRating(e.target.value);
                  setAnalyticsPage(1);
                }}
              >
                <option value="all">All Ratings</option>
                {[5, 4, 3, 2, 1].map((star) => (
                  <option key={star} value={star}>
                    {star} ★
                  </option>
                ))}
              </select>

              <select
                className="ai-select"
                value={analyticsCategory}
                onChange={(e) => {
                  setAnalyticsCategory(e.target.value);
                  setAnalyticsPage(1);
                }}
              >
                <option value="all">All Categories</option>
                {analysisCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="admin-table ai-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recipe</th>
                  <th>User</th>
                  <th>Rating</th>
                  <th>Review Comment</th>
                  <th>Sentiment</th>
                  <th>Category</th>
                  <th>Keywords</th>
                  <th>AI Summary</th>
                  <th>Analyzed At</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedAnalyses.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="empty-cell">
                      No analyzed reviews found.
                    </td>
                  </tr>
                ) : (
                  paginatedAnalyses.map((item, index) => {
                    const recipe =
                      recipes.find((r) => r.name === item.recipeName) || {};

                    const sentiment = String(item.sentiment || "neutral")
                      .toLowerCase()
                      .trim();

                    const keywords = Array.isArray(item.keywords)
                      ? item.keywords
                      : [];

                    return (
                      <tr key={item._id || `${item.reviewId}-${index}`}>
                        <td>{analyticsStartIndex + index + 1}</td>

                        <td>
                          <div className="ai-recipe-cell">
                            {recipe.image && (
                              <img
                                src={recipe.image}
                                alt={item.recipeName}
                                onError={(e) => {
                                  e.currentTarget.style.visibility = "hidden";
                                }}
                              />
                            )}
                            <span>
                              {item.recipeName}
                              {recipe.type ? ` (${recipe.type})` : ""}
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong>{item.username}</strong>
                        </td>

                        <td>
                          <span className="rating">★ {item.rating ?? "—"}</span>
                        </td>

                        <td>
                          <span className="comment-text" title={item.comments}>
                            {item.comments}
                          </span>
                        </td>

                        <td>
                          <span className={`ai-badge ${sentiment}`}>
                            ● {sentiment}
                          </span>
                        </td>

                        <td>{item.category || "—"}</td>

                        <td>
                          {keywords.length === 0
                            ? "—"
                            : keywords.slice(0, 2).map((word) => (
                                <span className="ai-keyword-pill" key={word}>
                                  {word}
                                </span>
                              ))}
                        </td>

                        <td>
                          <span className="ai-summary" title={item.summary}>
                            {item.summary || "—"}
                          </span>
                        </td>

                        <td className="ai-date">
                          {formatAnalysisDate(item.analyzedAt)}
                        </td>

                        <td>
                          <div className="action-buttons ai-actions">
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => deleteAnalysis(item._id)}
                              title="Delete"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={analyticsPage}
            totalPages={analyticsTotalPages}
            totalItems={filteredAnalyses.length}
            startIndex={analyticsStartIndex}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={setAnalyticsPage}
            label="analyzed reviews"
          />
        </div>
      </div>
    );
  };

  // =====================================================
  // PAGE ROUTER
  // =====================================================

  const renderPage = () => {
    switch (activePage) {
      case "recipes":
        return renderRecipes();
      case "add-recipe":
        return renderAddRecipe();
      case "cuisines":
        return renderCuisines();
      case "users":
        return renderUsers();
      case "reviews":
        return renderReviews();
      case "favorites":
        return renderFavorites();
      case "ai-analytics":
        return renderAIAnalytics();
      default:
        return renderDashboard();
    }
  };

  // =====================================================
  // MAIN
  // =====================================================

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="admin-layout">
      <div className="admin-body">
        {renderSidebar()}

        <main className="admin-main">
          {message && (
            <div className="admin-message success-message">✓ {message}</div>
          )}

          {error && (
            <div className="admin-message error-message">⚠ {error}</div>
          )}

          {loading && <div className="loading-bar">Loading dashboard...</div>}

          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;