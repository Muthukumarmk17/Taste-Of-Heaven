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
          "http://localhost:5000/api/likedRecipes",
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

  useEffect(() => {

    const fetchReviewAnalysis = async () => {

      try {

        setReviewLoading(true);


        const response = await axios.get(
          "http://localhost:5000/api/reviewAnalyses",
          {
            params: {
              recipeName:
                recipe.name,
            },
          }
        );


        const data =
          response.data || {};


        const total =
          Number(data.total) || 0;


        const positive =
          Number(data.positive) || 0;


        const percentage =
          total > 0
            ? Math.round(
                (positive / total) * 100
              )
            : 0;


        setReviewStats({
          total,
          positive,
          percentage,
        });

      } catch (error) {

        console.error(
          "Error fetching review analysis:",
          error
        );


        setReviewStats({
          total: 0,
          positive: 0,
          percentage: 0,
        });

      } finally {

        setReviewLoading(false);

      }

    };


    fetchReviewAnalysis();

  }, [recipe.name]);


  // =====================================================
  // LIKE / UNLIKE
  // =====================================================

  const handleLikeClick = async (e) => {

    e.preventDefault();

    e.stopPropagation();


    // -----------------------------------------------
    // ADMIN PROTECTION
    // -----------------------------------------------

    if (isAdmin) {

      alert(
        "Admin accounts cannot like or unlike recipes."
      );

      return;

    }


    // -----------------------------------------------
    // LOADING PROTECTION
    // -----------------------------------------------

    if (likeLoading) {

      return;

    }


    // -----------------------------------------------
    // LOGIN CHECK
    // -----------------------------------------------

    if (!isLoggedIn) {

      alert(
        "You must be logged in to like a recipe."
      );

      return;

    }


    const user =
      getCurrentUser();


    // -----------------------------------------------
    // USER CHECK
    // -----------------------------------------------

    if (!user) {

      alert(
        "Please log in to like a recipe."
      );

      return;

    }


    // -----------------------------------------------
    // SECOND ADMIN CHECK
    // -----------------------------------------------

    if (
      user.role?.toLowerCase() === "admin"
    ) {

      alert(
        "Admin accounts cannot like or unlike recipes."
      );

      return;

    }


    try {

      setLikeLoading(true);


      const action =
        liked
          ? "unlike"
          : "like";


      const response =
        await axios.post(
          "http://localhost:5000/api/likedRecipes",
          {
            recipeName:
              recipe.name,

            rating:
              recipe.rating,

            cuisine:
              recipe.cuisine,

            image:
              recipe.image,

            username:
              user.username,

            email:
              user.email,

            action:
              action,
          }
        );


      if (response.data.message) {

        setLiked(
          action === "like"
        );


        // -------------------------------------------
        // LIKE ANIMATION
        // -------------------------------------------

        if (
          action === "like"
        ) {

          setShowLikeAnimation(true);


          setTimeout(() => {

            setShowLikeAnimation(false);

          }, 1800);

        }


        // -------------------------------------------
        // NOTIFY OTHER COMPONENTS
        // -------------------------------------------

        window.dispatchEvent(
          new Event(
            "likedRecipesUpdated"
          )
        );

      }

    } catch (error) {

      console.error(
        "Error processing like/unlike:",
        error
      );


      alert(
        error.response?.data?.message ||
        "Something went wrong! Please try again."
      );

    } finally {

      setLikeLoading(false);

    }

  };


  // =====================================================
  // DIET TYPE (decided from the recipe name)
  // Non-veg: "non-veg", "non veg", "nonveg", "Non_Veg"
  // Veg: the word "veg" on its own, e.g. "(Veg)", "Veg Biryani"
  // Names like "Vegetable Curry" are NOT treated as veg
  // =====================================================

  const recipeName = recipe?.name || "";

  const isNonVegName = /\bnon[\s_-]?veg\b/i.test(recipeName);

  const isVegName = /\bveg\b/i.test(recipeName);

  const isVeg = isVegName && !isNonVegName;

  const dietLabel = isVeg ? "Veg" : "Non-veg";


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

  if (selectedType === "Non-veg" && isVeg) {
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
              isVeg
                ? "diet-veg"
                : "diet-nonveg"
            }`}
          >

            {isVeg ? (
              <FaLeaf />
            ) : (
              <FaDrumstickBite />
            )}


            <span>
              {dietLabel}
            </span>

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