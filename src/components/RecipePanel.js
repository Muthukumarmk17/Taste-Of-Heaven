import React, { useState, useEffect } from "react";

import {

  FaHeart,

  FaRegHeart,

  FaLeaf,

  FaDrumstickBite,

  FaUtensils,

  FaSmile,

  FaArrowRight,

} from "react-icons/fa";

import { Link } from "react-router-dom";

import axios from "axios";

import API_BASE_URL from "../api";

import LikeAnimation from "./LikeAnimation";

import "./RecipePanel.css";

// selectedType: "Veg" | "Non-veg" | "" (comes from TopBar via the parent)

function RecipePanel({ recipe, isLoggedIn, selectedType = "" }) {

  // =====================================================

  // GET CURRENT USER

  // =====================================================

  const getCurrentUser = () => {

    try {

      return JSON.parse(

        localStorage.getItem("user") || "null"

      );

    } catch (error) {

      console.error(

        "Error reading user from localStorage:",

        error

      );

      return null;

    }

  };

  // =====================================================

  // USER

  // =====================================================

  const [currentUser, setCurrentUser] =

    useState(getCurrentUser());

  // =====================================================

  // LIKE STATES

  // =====================================================

  const [liked, setLiked] = useState(false);

  const [showLikeAnimation, setShowLikeAnimation] =

    useState(false);

  const [likeLoading, setLikeLoading] =

    useState(false);

  // =====================================================

  // ADMIN CHECK

  // =====================================================

  const isAdmin =

    currentUser?.role?.toLowerCase() === "admin";

  // =====================================================

  // REVIEW ANALYSIS STATES

  // =====================================================

  const [reviewStats, setReviewStats] = useState({

    total: 0,

    positive: 0,

    percentage: 0,

  });

  const [reviewLoading, setReviewLoading] =

    useState(true);

  // =====================================================

  // UPDATE USER WHEN LOGIN STATE CHANGES

  // =====================================================

  useEffect(() => {

    const updateCurrentUser = () => {

      setCurrentUser(

        getCurrentUser()

      );

    };

    updateCurrentUser();

    window.addEventListener(

      "storage",

      updateCurrentUser

    );

    window.addEventListener(

      "userUpdated",

      updateCurrentUser

    );

    return () => {

      window.removeEventListener(

        "storage",

        updateCurrentUser

      );

      window.removeEventListener(

        "userUpdated",

        updateCurrentUser

      );

    };

  }, [isLoggedIn]);

  // =====================================================

  // CHECK WHETHER RECIPE IS ALREADY LIKED

  // =====================================================

  useEffect(() => {

    const checkIfLiked = async () => {

      // -----------------------------------------------

      // Not logged in

      // -----------------------------------------------

      if (!isLoggedIn) {

        setLiked(false);

        return;

      }

      const user = getCurrentUser();

      // -----------------------------------------------

      // No user

      // -----------------------------------------------

      if (!user) {

        setLiked(false);

        return;

      }

      // -----------------------------------------------

      // ADMIN

      //

      // Admin cannot have/use recipe likes.

      // We keep liked=false so the admin heart

      // never appears as an editable user like.

      // -----------------------------------------------

      if (

        user.role?.toLowerCase() === "admin"

      ) {

        setLiked(false);

        return;

      }

      try {

        const response = await axios.get(

          `${API_BASE_URL}/api/likedRecipes`,

          {

            params: {

              recipeName:

                recipe.name,

              username:

                user.username,

              email:

                user.email,

            },

          }

        );

        setLiked(

          response.data.found === true

        );

      } catch (error) {

        console.error(

          "Error checking liked recipe:",

          error

        );

        setLiked(false);

      }

    };

    checkIfLiked();

  }, [

    recipe.name,

    isLoggedIn,

  ]);

  // =====================================================

  // GET AI REVIEW ANALYSIS

  // =====================================================

// =====================================================

// GET AI REVIEW ANALYSIS

// Automatically refresh the AI percentage

// =====================================================

useEffect(() => {

  let cancelled = false;

  let attempts = 0;

  let intervalId;

  const fetchReviewAnalysis = async () => {

    try {

      const response = await axios.get(

        `${API_BASE_URL}/api/reviewAnalyses`,

        {

          params: {

            recipeName: recipe.name,

          },

        }

      );

      if (cancelled) return;

      const data = response.data || {};

      const total = Number(data.total) || 0;

      const positive = Number(data.positive) || 0;

      const percentage =

        total > 0

          ? Math.round((positive / total) * 100)

          : 0;

      setReviewStats({

        total,

        positive,

        percentage,

      });

    } catch (error) {

      console.error(

        "Error fetching AI review analysis:",

        error

      );

    } finally {

      if (!cancelled) {

        setReviewLoading(false);

      }

    }

  };

  // Fetch immediately

  fetchReviewAnalysis();

  // Retry every 2 seconds for up to 30 seconds

  intervalId = setInterval(() => {

    attempts += 1;

    if (attempts >= 15) {

      clearInterval(intervalId);

      return;

    }

    fetchReviewAnalysis();

  }, 2000);

  return () => {

    cancelled = true;

    clearInterval(intervalId);

  };

}, [recipe.name]);

  // =====================================================

  // LIKE / UNLIKE

  // =====================================================

  const handleLikeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Admin protection
    if (isAdmin) {
      alert("Admin accounts cannot like or unlike recipes.");
      return;
    }

    // Prevent multiple clicks while a request is running
    if (likeLoading) return;

    // Login check
    if (!isLoggedIn) {
      alert("You must be logged in to like a recipe.");
      return;
    }

    const user = getCurrentUser();

    if (!user) {
      alert("Please log in to like a recipe.");
      return;
    }

    // Admin check
    if (user.role?.toLowerCase() === "admin") {
      alert("Admin accounts cannot like or unlike recipes.");
      return;
    }

    const action = liked ? "unlike" : "like";
    const previousLiked = liked;

    // Start the animation immediately, before the API request.
    if (action === "like") {
      setShowLikeAnimation(true);
      setTimeout(() => {
        setShowLikeAnimation(false);
      }, 900);
    }

    // Update the heart immediately for a responsive UI.
    setLiked(action === "like");
    setLikeLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/likedRecipes`,
        {
          recipeName: recipe.name,
          rating: recipe.rating,
          cuisine: recipe.cuisine,
          image: recipe.image,
          username: user.username,
          email: user.email,
          action,
        }
      );

      if (response.data.message) {
        setLiked(action === "like");
        window.dispatchEvent(new Event("likedRecipesUpdated"));
      } else {
        setLiked(previousLiked);
        setShowLikeAnimation(false);
      }
    } catch (error) {
      console.error("Error processing like/unlike:", error);
      setLiked(previousLiked);
      setShowLikeAnimation(false);

      alert(
        error.response?.data?.message ||
          "Something went wrong! Please try again."
      );
    } finally {
      setLikeLoading(false);
    }
  };


  // =====================================================
  // RECIPE BADGE — EXPLICIT NAME LABEL, THEN DATABASE TYPE
  // Dessert is a separate category and is not Veg/Non-veg.
  // =====================================================

 
const recipeName = String(recipe?.name || "").trim();

const normalizedType = String(
  recipe?.type || recipe?.category || ""
)
  .trim()
  .toLowerCase()
  .replace(/[_\s]+/g, "-");

// Method 2: Identify category from a label in the recipe name.
const bracketMatch = recipeName.match(/\(([^()]*)\)\s*$/);
const nameLabel = bracketMatch
  ? bracketMatch[1].trim().toLowerCase()
  : "";

const nameSaysNonVeg = [
  "non-veg",
  "non veg",
  "nonveg",
  "non-vegetarian",
  "nonvegetarian",
].includes(nameLabel);

const nameSaysVeg = ["veg", "vegetarian"].includes(nameLabel);

// Method 1: Identify category from type/category in the database.
const typeIsDessert = ["dessert", "desserts"].includes(normalizedType);
const typeIsVeg = ["veg", "vegetarian"].includes(normalizedType);

const typeIsNonVeg = [
  "non-veg",
  "nonveg",
  "non-vegetarian",
  "nonvegetarian",
].includes(normalizedType);

// Identify desserts by name when the type is missing or unrecognized.
const nameSuggestsDessert =
  /\b(dessert|tiramisu|brownies?|cake|ice cream|pudding|cheesecake|cookies?|pastry)\b/i.test(
    recipeName
  );

// Explicit Veg/Non-veg labels in the name take priority.
const isDessert =
  !nameSaysVeg &&
  !nameSaysNonVeg &&
  (typeIsDessert ||
    ((!typeIsVeg && !typeIsNonVeg) && nameSuggestsDessert));

const isNonVeg =
  !isDessert &&
  (nameSaysNonVeg || (!nameSaysVeg && typeIsNonVeg));

const isVeg =
  !isDessert &&
  !isNonVeg &&
  (nameSaysVeg || typeIsVeg);

const dietLabel = isDessert
  ? "Dessert"
  : isVeg
  ? "Veg"
  : isNonVeg
  ? "Non-veg"
  : "Unknown";

  // =====================================================

  // VEG / NON-VEG FILTER

  //

  // Placed after all hooks so hook order never changes.

  // Hides this card when it doesn't match the filter

  // chosen in the TopBar.

  // =====================================================

  if (selectedType === "Veg" && !isVeg) {

    return null;

  }

  if (selectedType === "Non-veg" && !isNonVeg) {

    return null;

  }
  if (selectedType === "Dessert" && !isDessert) {
  return null;
}

  // =====================================================

  // REVIEW MESSAGE

  // =====================================================

  const getReviewMessage = () => {

    const percentage =

      reviewStats.percentage;

    if (

      reviewStats.total === 0

    ) {

      return "No reviews yet!";

    }

    if (

      percentage >= 90

    ) {

      return "Loved by most users!";

    }

    if (

      percentage >= 75

    ) {

      return "Great taste and feedback!";

    }

    if (

      percentage >= 50

    ) {

      return "Good feedback from users!";

    }

    return "More feedback coming soon!";

  };

  // =====================================================

  // RETURN

  // =====================================================

  return (

    <>

      {/* =================================================

          3D LIKE POPUP

      ================================================= */}

      <LikeAnimation

        show={showLikeAnimation}

      />

      {/* =================================================

          RECIPE CARD

      ================================================= */}

      <div className="recipe-panel">

        {/* =================================================

            RECIPE IMAGE AREA

        ================================================= */}

        <div className="recipe-image-wrapper">

          {/* =================================================

              DIET BADGE

          ================================================= */}

          <div
            className={`diet-badge ${
              isDessert ? "diet-dessert" : isVeg ? "diet-veg" : isNonVeg ? "diet-nonveg" : "diet-unknown"
            }`}
          >
            {isDessert ? <FaUtensils /> : isVeg ? <FaLeaf /> : isNonVeg ? <FaDrumstickBite /> : <FaUtensils />}
            <span>{dietLabel}</span>
          </div>

          {/* =================================================

              HEART

          ================================================= */}

          {!isAdmin && (

            <button

              type="button"

              className={`heart-icon ${

                liked ? "liked" : ""

              }`}

              onClick={handleLikeClick}

              disabled={likeLoading}

              aria-label={

                liked

                  ? "Unlike recipe"

                  : "Like recipe"

              }

              title={

                liked

                  ? "Unlike recipe"

                  : "Like recipe"

              }

            >

              {liked ? (

                <FaHeart />

              ) : (

                <FaRegHeart />

              )}

            </button>

          )}

          {/* =================================================

              IMAGE

          ================================================= */}

          <img

            src={recipe.image}

            alt={recipe.name}

          />

        </div>

        {/* =================================================

            RECIPE NAME

        ================================================= */}

        <h3 className="recipe-name">

          {recipe.name}

        </h3>

        {/* =================================================

            CUISINE

        ================================================= */}

        <div className="cuisine-badge">

          <FaUtensils />

          <strong>

            Cuisine:

          </strong>

          <span>

            {recipe.cuisine || "Indian"}

          </span>

        </div>

        {/* =================================================

            RATING

        ================================================= */}

        <div className="recipe-rating-row">

          <span className="rating-stars">

            ★★★★★

          </span>

          <strong className="rating-value">

            {Number(

              recipe.rating || 0

            ).toFixed(1)}

          </strong>

          <span className="review-count">

            (

            {reviewStats.total}

            {" "}

            {

              reviewStats.total === 1

                ? "review"

                : "reviews"

            }

            )

          </span>

        </div>

        {/* =================================================

            OVERALL REVIEW PANEL

        ================================================= */}

        <div className="overall-review-box">

          {/* =================================================

              CIRCULAR PERCENTAGE

          ================================================= */}

          <div

            className="review-donut"

            style={{

              "--review-percentage":

                `${reviewStats.percentage}%`,

            }}

          >

            <div className="review-donut-inner">

              {reviewLoading ? (

                <span className="review-loading-text">

                  ...

                </span>

              ) : (

                <span>

                  {reviewStats.percentage}%

                </span>

              )}

            </div>

          </div>

          {/* =================================================

              REVIEW INFORMATION

          ================================================= */}

          <div className="review-summary">

            <div className="review-summary-title">

              Positive Reviews

            </div>

            <div className="review-summary-percentage">

              {reviewStats.percentage}%

              {" "}

              positive reviews

            </div>

            {/* =================================================

                PROGRESS BAR

            ================================================= */}

            <div className="review-progress">

              <div

                className="review-progress-fill"

                style={{

                  width:

                    `${reviewStats.percentage}%`,

                }}

              />

            </div>

            <div className="review-count-text">

              {reviewStats.positive}

              {" "}

              of

              {" "}

              {reviewStats.total}

              {" "}

              reviews are positive

            </div>

          </div>

          {/* =================================================

              FEEDBACK MESSAGE

          ================================================= */}

          <div className="review-feedback">

            <div className="review-smile">

              <FaSmile />

            </div>

            <span>

              {getReviewMessage()}

            </span>

          </div>

        </div>

        {/* =================================================

            VIEW DETAILS

        ================================================= */}

        <Link

          to={`/recipe/${encodeURIComponent(

            recipe.name

          )}`}

          className="view-details-link"

        >

          <button

            type="button"

            className="view-details-button"

          >

            <span>

              View Details

            </span>

            <FaArrowRight />

          </button>

        </Link>

      </div>

    </>

  );

}

export default RecipePanel;