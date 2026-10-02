import React, {
  useState,
  useEffect,
} from "react";

import {
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  FaHeart,
  FaRegHeart,
  FaStar,
  FaTrash,
} from "react-icons/fa";

import axios from "axios";
import API_BASE_URL from "../api";

import ReviewForm from "./ReviewForm";

import LikeAnimation from "./LikeAnimation";

import "./RecipeDetails.css";


function RecipeDetails({
  recipes,
  userSignedIn,
}) {

  const { name } =
    useParams();

  const navigate =
    useNavigate();


  // ==================================================
  // FIND RECIPE
  // ==================================================

  const decodedName =
    decodeURIComponent(name);


  const recipe =
    recipes.find(
      (r) =>
        r.name === decodedName ||
        r.name === name
    );


  // ==================================================
  // STATES
  // ==================================================

  const [liked, setLiked] =
    useState(false);

  const [reviews, setReviews] =
    useState([]);

  const [showReviewForm, setShowReviewForm] =
    useState(false);

  const [alertMessage, setAlertMessage] =
    useState("");

  const [showLikeAnimation, setShowLikeAnimation] =
    useState(false);

  const [likeLoading, setLikeLoading] =
    useState(false);

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [reviewToDelete, setReviewToDelete] =
    useState(null);

  const [deleteLoading, setDeleteLoading] =
    useState(false);


  // ==================================================
  // CHECK LIKE STATUS
  // ==================================================

  useEffect(() => {

    const checkIfLiked = async () => {

      if (!recipe) {
        return;
      }


      if (!userSignedIn) {

        setLiked(false);

        return;
      }


      const user =
        JSON.parse(
          localStorage.getItem("user")
        );


      if (!user) {

        setLiked(false);

        return;
      }


      const {
        username,
        email,
      } = user;


      try {

        const response =
          await axios.get(
            `${API_BASE_URL}/api/likedRecipes`,
            {
              params: {

                recipeName:
                  recipe.name,

                username,

                email,

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
    recipe,
    userSignedIn,
  ]);


  // ==================================================
  // LIKE / UNLIKE
  // ==================================================

  const handleLikeClick = async () => {

    const currentUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    if (
      currentUser?.role?.toLowerCase() === "admin"
    ) {
      alert("Admin accounts cannot like or unlike recipes.");
      return;
    }

    if (likeLoading) {
      return;
    }


    // Login check

    if (!userSignedIn) {

      navigate("/login");

      return;
    }


    const user =
      JSON.parse(
        localStorage.getItem("user")
      );


    if (!user) {

      navigate("/login");

      return;
    }


    const {
      username,
      email,
    } = user;


    try {

      setLikeLoading(true);


      // Determine action

      const action =
        liked
          ? "unlike"
          : "like";


      // Send request

      const response =
        await axios.post(
          `${API_BASE_URL}/api/likedRecipes`,
          {

            recipeName:
              recipe.name,

            rating:
              recipe.rating,

            cuisine:
              recipe.cuisine,

            image:
              recipe.image,

            username,

            email,

            action,

          }
        );


      if (
        response.data.message
      ) {

        // Update heart immediately

        setLiked(
          action === "like"
        );


        // ==========================================
        // SHOW 3D HEART WHEN LIKING
        // ==========================================

        if (
          action === "like"
        ) {

          setShowLikeAnimation(
            true
          );


          setTimeout(() => {

            setShowLikeAnimation(
              false
            );

          }, 1800);

        }

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


  // ==================================================
  // FETCH REVIEWS
  // ==================================================

  useEffect(() => {

    const fetchReviews =
      async () => {

        if (!recipe) {
          return;
        }


        try {

          const response =
            await axios.get(
              `${API_BASE_URL}/api/reviews?recipeName=${encodeURIComponent(
  recipe.name
)}`
            );


          if (
            response.status === 200
          ) {

            setReviews(
              response.data
            );

          }

        } catch (error) {

          console.error(
            "Error fetching reviews:",
            error
          );

        }

      };


    fetchReviews();

  }, [recipe]);


  // ==================================================
  // OPEN REVIEW FORM
  // ==================================================

  const handleAddReview = () => {

    const currentUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    // Admin accounts cannot give reviews.
    if (
      currentUser?.role &&
      currentUser.role.toLowerCase() === "admin"
    ) {
      alert("Admin accounts cannot give reviews.");
      return;
    }

    if (userSignedIn) {

      setShowReviewForm(
        true
      );

      setAlertMessage("");

    } else {

      navigate("/login");

    }

  };


  // ==================================================
  // REVIEW SUBMITTED
  // ==================================================

  const handleReviewSubmitted = (
    newReview
  ) => {

    setReviews(
      (previousReviews) => [

        ...previousReviews,

        newReview,

      ]
    );


    setShowReviewForm(
      false
    );


    setAlertMessage(
      "Thank you for your review!"
    );


    setTimeout(() => {

      setAlertMessage("");

    }, 10000);

  };


  // ==================================================
  // DELETE REVIEW - OPEN CONFIRMATION
  // ==================================================

  const handleDeleteReview = (review) => {
    const currentUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    if (!currentUser?.email) {
      alert("Please login to delete your review.");
      return;
    }

    const isAdmin =
      String(currentUser?.role || "")
        .trim()
        .toLowerCase() === "admin";

    // Normal users can delete only their own review.
    // Admins can delete any user review.
    if (!isAdmin) {
      const reviewEmail = String(review?.email || "")
        .trim()
        .toLowerCase();
      const currentEmail = String(currentUser.email || "")
        .trim()
        .toLowerCase();

      if (!reviewEmail || reviewEmail !== currentEmail) {
        alert("You can delete only your own review.");
        return;
      }
    }

    const reviewId = review._id || review.id;

    if (!reviewId) {
      alert("Review ID not found.");
      return;
    }

    // Open custom Yes / No confirmation popup.
    setReviewToDelete(review);
    setShowDeleteConfirm(true);
  };


  // ==================================================
  // CANCEL DELETE
  // ==================================================

  const handleCancelDelete = () => {
    if (deleteLoading) {
      return;
    }

    setShowDeleteConfirm(false);
    setReviewToDelete(null);
  };


  // ==================================================
  // CONFIRM DELETE REVIEW
  // ==================================================

  const handleConfirmDelete = async () => {
    if (!reviewToDelete || deleteLoading) {
      return;
    }

    const currentUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    const isAdmin =
      String(currentUser?.role || "")
        .trim()
        .toLowerCase() === "admin";

    const reviewId =
      reviewToDelete._id || reviewToDelete.id;

    if (!reviewId) {
      alert("Review ID not found.");
      return;
    }

    try {
      setDeleteLoading(true);

      if (isAdmin) {
        await axios.delete(
          `${API_BASE_URL}/api/admin/reviews/${reviewId}`,
          {
            headers: {
              "user-email": currentUser.email,
            },
          }
        );
      } else {
        await axios.delete(
          `${API_BASE_URL}/api/reviews/${reviewId}`,
          {
            data: {
              email: currentUser.email,
            },
          }
        );
      }

      // Remove the review immediately from the page.
      setReviews((previousReviews) =>
        previousReviews.filter(
          (item) =>
            (item._id || item.id) !== reviewId
        )
      );

      // Close popup.
      setShowDeleteConfirm(false);
      setReviewToDelete(null);

      // Refresh ProfilePage review data.
      window.dispatchEvent(
        new Event("reviewsUpdated")
      );

      setAlertMessage(
        "Review deleted successfully."
      );

      setTimeout(() => {
        setAlertMessage("");
      }, 5000);

    } catch (error) {
      console.error(
        "Error deleting review:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to delete review. Please try again."
      );

    } finally {
      setDeleteLoading(false);
    }
  };


  // ==================================================
  // CANCEL REVIEW
  // ==================================================

  const handleCancelReview = () => {

    setShowReviewForm(
      false
    );

  };


  // ==================================================
  // RECIPE NOT FOUND
  // ==================================================

  if (!recipe) {

    return (

      <div className="recipe-not-found">

        <h2>
          Recipe not found
        </h2>

      </div>

    );

  }


  // ==================================================
  // PAGE
  // ==================================================

  return (

    <div className="recipe-page">


      {/* ==========================================
          3D HEART ANIMATION
      ========================================== */}

      <LikeAnimation
        show={
          showLikeAnimation
        }
      />


      <div className="recipe-container">


        {/* ==========================================
            HERO
        ========================================== */}

        <section className="recipe-hero">


          {/* IMAGE */}

          <div className="hero-image-section">

            <img
              src={recipe.image}
              alt={recipe.name}
              className="hero-recipe-image"
            />


            <div className="vegetarian-badge">

              🌿 Vegetarian

            </div>

          </div>



          {/* CONTENT */}

          <div className="hero-content">


            <div className="cuisine-label">

              {recipe.cuisine} CUISINE

            </div>


            <h1>

              {recipe.name}

            </h1>


            <p className="recipe-description">

              A simple, delicious and wholesome
              recipe loaded with fresh vegetables,
              aromatic spices and perfectly
              prepared ingredients.

            </p>


            <div className="rating-row">


              <span className="big-star">

                <FaStar />

              </span>


              <span className="big-rating">

                {recipe.rating}

              </span>


              


              <span className="rating-divider">

                |

              </span>


              <span className="cuisine-pill">

                🍜 {recipe.cuisine} Cuisine

              </span>


            </div>


          </div>



          {/* ========================================
              FAVORITE BUTTON
          ======================================== */}

          <button
            type="button"
            className={
              `favorite-button ${
                liked
                  ? "liked"
                  : ""
              }`
            }
            onClick={
              handleLikeClick
            }
            disabled={
              likeLoading
            }
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


        </section>



        {/* ==========================================
            INGREDIENTS + METHOD
        ========================================== */}

        <section className="recipe-main-grid">


          {/* INGREDIENTS */}

          <div className="ingredients-card">


            <div className="card-heading ingredients-heading">

              <span className="heading-icon">

                🛍️

              </span>


              <h2>

                Ingredients

              </h2>

            </div>


            <div className="heading-line green-line"></div>


            <div className="ingredients-list">

              {recipe.ingredients.map(
                (ingredient, index) => (

                  <div
                    className="ingredient-row"
                    key={index}
                  >

                    <span className="ingredient-dot">

                      •

                    </span>


                    <span>

                      {ingredient}

                    </span>

                  </div>

                )
              )}

            </div>


            <div className="ingredient-decoration">

              🥕 🫛

            </div>


          </div>



          {/* METHOD */}

          <div className="method-card">


            <div className="card-heading method-heading">

              <span className="heading-icon">

                👨‍🍳

              </span>


              <h2>

                Method

              </h2>

            </div>


            <div className="heading-line orange-line"></div>


            <div className="method-list">

              {recipe.methods.map(
                (method, index) => (

                  <div
                    className="method-row"
                    key={index}
                  >

                    <div className="step-circle">

                      {index + 1}

                    </div>


                    <p>

                      {method}

                    </p>

                  </div>

                )
              )}

            </div>


            <div className="method-decoration">

              🍲

            </div>


          </div>


        </section>



        {/* ==========================================
            REVIEWS
        ========================================== */}

        <section className="reviews-section">


          <div className="reviews-top">


            <div className="reviews-heading">

              <span className="reviews-icon">

                💬

              </span>


              <h2>

                What People Say

              </h2>

            </div>


            {(() => {
              const currentUser = JSON.parse(
                localStorage.getItem("user") || "{}"
              );

              const isAdmin =
                currentUser?.role?.toLowerCase() === "admin";

              return !isAdmin ? (
                <button
                  type="button"
                  className="write-review-button"
                  onClick={handleAddReview}
                >
                  ✎ &nbsp; Write a Review
                </button>
              ) : null;
            })()}


          </div>


          <div className="heading-line reviews-line"></div>


          {alertMessage && (

            <div className="success-message">

              ✓ {alertMessage}

            </div>

          )}


          {reviews.length > 0 ? (

            <div className="reviews-grid">

              {reviews.map(
                (review, index) => {

                  const rating =
                    Math.min(
                      5,
                      Math.max(
                        0,
                        Number(
                          review.rating
                        ) || 0
                      )
                    );

                  const currentUser =
                    JSON.parse(
                      localStorage.getItem(
                        "user"
                      ) || "{}"
                    );

                  const isAdmin =
                    String(currentUser?.role || "")
                      .trim()
                      .toLowerCase() === "admin";

                  const isMyReview =
                    currentUser?.email &&
                    review?.email &&
                    String(currentUser.email).trim().toLowerCase() ===
                      String(review.email).trim().toLowerCase();

                  return (

                    <div
                      className="review-card"
                      key={
                        review._id ||
                        review.id ||
                        `${review.email}-${index}`
                      }
                    >

                      {/* =====================================
                          REVIEW TOP
                      ====================================== */}

                      <div className="review-card-top">

                        <div className="review-user">

                          <div
                            className={
                              `review-avatar avatar-${
                                index % 4
                              }`
                            }
                          >

                            {review.username
                              ? review.username
                                  .charAt(0)
                                  .toUpperCase()
                              : "U"}

                          </div>


                          <div className="review-user-info">

                            <h3>

                              {review.username ||
                                "User"}

                            </h3>

                            <p>

                              {review.email || ""}

                            </p>

                          </div>

                        </div>


                        {/* DELETE BUTTON */}

                        {(isAdmin || isMyReview) && (

                          <button
                            type="button"
                            className="delete-review-button"
                            onClick={() =>
                              handleDeleteReview(
                                review
                              )
                            }
                            title={
                              isAdmin
                                ? "Delete review"
                                : "Delete your review"
                            }
                            aria-label={
                              isAdmin
                                ? "Delete review"
                                : "Delete your review"
                            }
                          >

                            <FaTrash />

                          </button>

                        )}

                      </div>


                      {/* =====================================
                          RATING
                      ====================================== */}

                      <div className="review-rating-row">

                        <span className="review-stars">

                          {"★".repeat(
                            Math.round(rating)
                          )}

                          <span className="empty-review-stars">

                            {"★".repeat(
                              5 -
                                Math.round(
                                  rating
                                )
                            )}

                          </span>

                        </span>


                        <span className="review-number">

                          {rating.toFixed(
                            1
                          )}

                        </span>

                      </div>


                      {/* =====================================
                          COMMENT
                      ====================================== */}

                      <p className="review-text">

                        {review.comments ||
                          "No comment provided."}

                      </p>


                      {/* =====================================
                          DATE
                      ====================================== */}

                      <div className="review-date">

                        <span className="calendar-icon">
                          📅
                        </span>

                        {review.createdAt
                          ? new Date(
                              review.createdAt
                            ).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Recently"}

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          ) : (

            <div className="no-reviews">

              <div className="no-reviews-icon">

                💬

              </div>

              <h3>

                No reviews yet

              </h3>

              <p>

                Be the first to share your experience!

              </p>

            </div>

          )}


        </section>



        {/* ==========================================
            DELETE REVIEW CONFIRMATION MODAL
        ========================================== */}

        {showDeleteConfirm && reviewToDelete && (

          <div
            className="delete-confirm-overlay"
            onClick={handleCancelDelete}
          >

            <div
              className="delete-confirm-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="delete-confirm-icon">
                <FaTrash />
              </div>

              <h3>
                Delete Review?
              </h3>

              <p>
                Are you sure you want to delete
                this review?
              </p>

              <div className="delete-confirm-review">

                <strong>
                  {reviewToDelete.username ||
                    "Your review"}
                </strong>

                <span>
                  {reviewToDelete.comments ||
                    "This review will be permanently deleted."}
                </span>

              </div>

              <div className="delete-confirm-actions">

                <button
                  type="button"
                  className="delete-no-button"
                  onClick={handleCancelDelete}
                  disabled={deleteLoading}
                >
                  No
                </button>

                <button
                  type="button"
                  className="delete-yes-button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading
                    ? "Deleting..."
                    : "Yes"}
                </button>

              </div>

            </div>

          </div>

        )}


        {/* ==========================================
            REVIEW FORM
        ========================================== */}

        {showReviewForm && (

          <ReviewForm
            recipeName={
              recipe.name
            }

            onReviewSubmitted={
              handleReviewSubmitted
            }

            onCancel={
              handleCancelReview
            }
          />

        )}


      </div>

    </div>

  );
}


export default RecipeDetails;