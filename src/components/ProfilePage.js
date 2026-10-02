import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import API_BASE_URL from "../api";

function ProfilePage({
  user,
  allRecipes = [],
  onProfilePictureSelect,
}) {
  const [activeSection, setActiveSection] = useState("overview");

  const [likedRecipes, setLikedRecipes] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [showProfilePictureModal, setShowProfilePictureModal] =
    useState(false);
  const [savingProfilePicture, setSavingProfilePicture] = useState(false);

  const currentUser =
    user || JSON.parse(localStorage.getItem("user") || "null");

  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 6;

  const [likedPage, setLikedPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);

  const profilePictures = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyh9ZR7j2Oi5JHGSIe2mt2cgeVlwQb4mXg3kXIaPgEJQ&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZoUCWyo0v99yE5-EXx56NlHdIsvsnOT0lFvj4CPqtJw&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ87aEo0KuaeHwEiuj3ApS75AfpRj9YFuSm-nwS16IaQg&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2UkBT5WS6XREGhBK_uW5LxLrbyoO9_QaPEqvuY536Zg&s=10",
  ];

  const [profilePicture, setProfilePicture] = useState(
    user?.profilePicture ||
      JSON.parse(localStorage.getItem("user") || "{}")?.profilePicture ||
      profilePictures[0]
  );

  // =====================================================
  // FETCH LIKED RECIPES
  // =====================================================

  const fetchLikedRecipes = async () => {
    if (!currentUser?.email) {
      setLikedRecipes([]);
      return;
    }

    try {
      setLoadingLikes(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/likedRecipes`,
        {
          params: {
            username: currentUser.username,
            email: currentUser.email,
          },
        }
      );

      console.log("Liked recipes response:", response.data);

      if (response.status === 200) {
        setLikedRecipes(
          Array.isArray(response.data.recipes)
            ? response.data.recipes
            : []
        );
      }
    } catch (error) {
      console.error("Error loading liked recipes:", error);
      console.error("Backend response:", error.response?.data);
      setLikedRecipes([]);
    } finally {
      setLoadingLikes(false);
    }
  };

  // =====================================================
  // FETCH USER REVIEWS
  // =====================================================

  const fetchReviews = async () => {
    if (!currentUser?.email) {
      setReviews([]);
      return;
    }

    try {
      setLoadingReviews(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/reviews`,
        {
          params: {
            email: currentUser.email,
          },
        }
      );

      console.log("User reviews response:", response.data);

      if (response.status === 200) {
        setReviews(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      console.error("Backend response:", error.response?.data);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchLikedRecipes();
    fetchReviews();
  }, [currentUser?.email]);

  // =====================================================
  // REFRESH LIKED RECIPES
  // =====================================================

  useEffect(() => {
    const refreshLikedRecipes = () => {
      fetchLikedRecipes();
    };

    window.addEventListener(
      "likedRecipesUpdated",
      refreshLikedRecipes
    );

    return () => {
      window.removeEventListener(
        "likedRecipesUpdated",
        refreshLikedRecipes
      );
    };
  }, [currentUser?.email]);

  // =====================================================
  // REFRESH REVIEWS
  // =====================================================

  useEffect(() => {
    const refreshReviews = () => {
      fetchReviews();
    };

    window.addEventListener("reviewsUpdated", refreshReviews);

    return () => {
      window.removeEventListener("reviewsUpdated", refreshReviews);
    };
  }, [currentUser?.email]);

  // =====================================================
  // PROFILE PICTURE
  // =====================================================

  const handleProfilePictureSelect = async (image) => {
    if (!currentUser || savingProfilePicture) {
      return;
    }

    try {
      setSavingProfilePicture(true);

      setProfilePicture(image);

      const updatedUser = {
        ...currentUser,
        profilePicture: image,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      if (onProfilePictureSelect) {
        await onProfilePictureSelect(image);
      }

      console.log("Profile picture updated:", image);

      setShowProfilePictureModal(false);
    } catch (error) {
      console.error("Profile picture update failed:", error);

      alert(
        "Unable to save your profile picture. Please try again."
      );
    } finally {
      setSavingProfilePicture(false);
    }
  };

  const closeProfilePictureModal = () => {
    if (savingProfilePicture) {
      return;
    }

    setShowProfilePictureModal(false);
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return value.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =====================================================
  // RENDER STARS
  // =====================================================

  const renderStars = (rating) => {
    const value = Number(rating) || 0;

    return (
      <div className="review-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={
              star <= value ? "star filled" : "star"
            }
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // =====================================================
  // FIND RECIPE IMAGE
  // =====================================================

  const getRecipeImage = (recipeName) => {
    const recipe = allRecipes.find(
      (item) =>
        item.name === recipeName ||
        item.recipeName === recipeName
    );

    return recipe?.image || "";
  };

  // =====================================================
  // PAGINATION
  // =====================================================

  const likedTotalPages = Math.max(
    1,
    Math.ceil(likedRecipes.length / ITEMS_PER_PAGE)
  );

  const reviewsTotalPages = Math.max(
    1,
    Math.ceil(reviews.length / ITEMS_PER_PAGE)
  );

  const likedStartIndex =
    (likedPage - 1) * ITEMS_PER_PAGE;

  const paginatedLikedRecipes = likedRecipes.slice(
    likedStartIndex,
    likedStartIndex + ITEMS_PER_PAGE
  );

  const reviewsStartIndex =
    (reviewsPage - 1) * ITEMS_PER_PAGE;

  const paginatedReviews = reviews.slice(
    reviewsStartIndex,
    reviewsStartIndex + ITEMS_PER_PAGE
  );

  const goToRecipeDetails = (recipeName) => {
    if (!recipeName) {
      return;
    }

    navigate(`/recipe/${encodeURIComponent(recipeName)}`);
  };

  useEffect(() => {
    setLikedPage((page) =>
      Math.min(page, likedTotalPages)
    );
  }, [likedTotalPages]);

  useEffect(() => {
    setReviewsPage((page) =>
      Math.min(page, reviewsTotalPages)
    );
  }, [reviewsTotalPages]);

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!currentUser) {
    return (
      <div className="profile-page">
        <div className="profile-login-card">
          <div className="login-icon">
            ⌂
          </div>

          <h2>Please Sign In</h2>

          <p>
            Sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN PROFILE PAGE
  // =====================================================

  return (
    <div className="profile-page">

      {/* PROFILE HEADER */}

      <section className="profile-header">

        <div className="profile-avatar-section">

          <div className="profile-avatar-wrapper">
            <img
              src={
                profilePicture ||
                profilePictures[0]
              }
              alt="Profile"
              className="profile-avatar"
            />
          </div>

          <button
            type="button"
            className="change-picture-button"
            onClick={() =>
              setShowProfilePictureModal(true)
            }
          >
            <svg
              className="camera-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M9 4.5h6l1.5 2H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3.5L9 4.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />

              <circle
                cx="12"
                cy="12.5"
                r="3.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />

              <circle
                cx="17.8"
                cy="9.3"
                r="0.9"
                fill="currentColor"
              />
            </svg>

            <span>Change Picture</span>
          </button>

        </div>

        <div className="profile-header-info">

          <span className="profile-label">
            MY PROFILE
          </span>

          <h1>
            {currentUser.username}
          </h1>

          <p>
            {currentUser.email}
          </p>

        </div>

      </section>

      {/* PROFILE BODY */}

      <section className="profile-body">

        {/* SIDEBAR */}

        <aside className="profile-sidebar">

          <div className="sidebar-title">
            ACCOUNT
          </div>

          {/* OVERVIEW */}

          <button
            type="button"
            className={
              activeSection === "overview"
                ? "profile-nav active"
                : "profile-nav"
            }
            onClick={() =>
              setActiveSection("overview")
            }
          >
            <span>⌂</span>

            <span>Overview</span>
          </button>

          {/* LIKED RECIPES */}

          <button
            type="button"
            className={
              activeSection === "liked"
                ? "profile-nav active"
                : "profile-nav"
            }
            onClick={() => {
              setActiveSection("liked");
              setLikedPage(1);
              fetchLikedRecipes();
            }}
          >
            <span>♥</span>

            <span>Liked Recipes</span>

            <b>
              {likedRecipes.length}
            </b>
          </button>

          {/* REVIEWS */}

          <button
            type="button"
            className={
              activeSection === "reviews"
                ? "profile-nav active"
                : "profile-nav"
            }
            onClick={() => {
              setActiveSection("reviews");
              setReviewsPage(1);
              fetchReviews();
            }}
          >
            <span>★</span>

            <span>Reviews</span>

            <b>
              {reviews.length}
            </b>
          </button>

        </aside>

        {/* MAIN */}

        <main className="profile-main">

          {/* =====================================================
              OVERVIEW
          ===================================================== */}

          {activeSection === "overview" && (
            <section className="profile-card">

              <div className="section-heading">

                <span>
                  WELCOME BACK
                </span>

                <h2>
                  Hello, {currentUser.username}
                </h2>

                <p>
                  Your personal activity on
                  Taste of Heaven.
                </p>

              </div>

              <div className="stats-container">

                <div
                  className="stat-card"
                  onClick={() => {
                    setActiveSection("liked");
                    setLikedPage(1);
                    fetchLikedRecipes();
                  }}
                >
                  <div className="stat-icon">
                    ♥
                  </div>

                  <div>
                    <p>Liked Recipes</p>

                    <h3>
                      {likedRecipes.length}
                    </h3>
                  </div>
                </div>

                <div
                  className="stat-card"
                  onClick={() => {
                    setActiveSection("reviews");
                    setReviewsPage(1);
                    fetchReviews();
                  }}
                >
                  <div className="stat-icon">
                    ★
                  </div>

                  <div>
                    <p>Reviews</p>

                    <h3>
                      {reviews.length}
                    </h3>
                  </div>
                </div>

              </div>

              <div className="overview-message">

                <div className="overview-symbol">
                  ✦
                </div>

                <div>

                  <h3>
                    Your Taste of Heaven
                  </h3>

                  <p>
                    Discover delicious recipes,
                    save your favourites and share
                    your thoughts with the community.
                  </p>

                </div>

              </div>

            </section>
          )}

          {/* =====================================================
              LIKED RECIPES
          ===================================================== */}

          {activeSection === "liked" && (
            <section className="profile-card">

              <div className="section-heading">

                <span>
                  YOUR FAVOURITES
                </span>

                <h2>
                  Liked Recipes
                </h2>

                <p>
                  Your favourite recipes in one place.
                </p>

              </div>

              {loadingLikes ? (

                <div className="loading-state">

                  <div className="spinner"></div>

                  <p>
                    Loading your favourites...
                  </p>

                </div>

              ) : likedRecipes.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-icon">
                    ♥
                  </div>

                  <h3>
                    No liked recipes
                  </h3>

                  <p>
                    When you like a recipe,
                    it will appear here.
                  </p>

                </div>

              ) : (

                /*
                 * IMPORTANT:
                 * Fragment wraps recipe grid + pagination.
                 * This fixes the Babel syntax error.
                 */

                <>

                  <div className="recipe-grid">

                    {paginatedLikedRecipes.map(
                      (recipe, index) => (

                        <article
                          className="recipe-card"
                          key={
                            recipe._id ||
                            recipe.id ||
                            index
                          }
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            goToRecipeDetails(
                              recipe.name ||
                              recipe.recipeName
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();

                              goToRecipeDetails(
                                recipe.name ||
                                recipe.recipeName
                              );
                            }
                          }}
                        >

                          {recipe.image ? (

                            <img
                              src={recipe.image}
                              alt={
                                recipe.name ||
                                recipe.recipeName ||
                                "Recipe"
                              }
                            />

                          ) : (

                            <div className="recipe-image-placeholder">
                              🍽️
                            </div>

                          )}

                          <div className="recipe-card-content">

                            <h3>
                              {recipe.name ||
                                recipe.recipeName ||
                                "Recipe"}
                            </h3>

                            {recipe.cuisine && (
                              <span className="cuisine">
                                {recipe.cuisine}
                              </span>
                            )}

                            <div className="recipe-rating">
                              ★{" "}
                              {recipe.rating || 0}
                            </div>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                  {/* LIKED RECIPES PAGINATION */}

                  {likedTotalPages > 1 && (

                    <div className="profile-pagination">

                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() =>
                          setLikedPage((page) =>
                            Math.max(1, page - 1)
                          )
                        }
                        disabled={likedPage === 1}
                      >
                        Previous
                      </button>

                      {Array.from(
                        {
                          length: likedTotalPages,
                        },
                        (_, index) => index + 1
                      ).map((page) => (

                        <button
                          key={page}
                          type="button"
                          className={
                            page === likedPage
                              ? "pagination-button active"
                              : "pagination-button"
                          }
                          onClick={() =>
                            setLikedPage(page)
                          }
                        >
                          {page}
                        </button>

                      ))}

                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() =>
                          setLikedPage((page) =>
                            Math.min(
                              likedTotalPages,
                              page + 1
                            )
                          )
                        }
                        disabled={
                          likedPage === likedTotalPages
                        }
                      >
                        Next
                      </button>

                    </div>

                  )}

                </>

              )}

            </section>
          )}

          {/* =====================================================
              REVIEWS
          ===================================================== */}

          {activeSection === "reviews" && (
            <section className="profile-card">

              <div className="section-heading">

                <span>
                  YOUR REVIEWS
                </span>

                <h2>
                  My Reviews
                </h2>

                <p>
                  Your ratings and thoughts about
                  the recipes you've tried.
                </p>

              </div>

              {loadingReviews ? (

                <div className="loading-state">

                  <div className="spinner"></div>

                  <p>
                    Loading your reviews...
                  </p>

                </div>

              ) : reviews.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-icon">
                    ★
                  </div>

                  <h3>
                    No reviews yet
                  </h3>

                  <p>
                    Your submitted reviews will
                    appear here.
                  </p>

                </div>

              ) : (

                /*
                 * IMPORTANT:
                 * Fragment wraps reviews list + pagination.
                 * This fixes the Babel syntax error.
                 */

                <>

                  <div className="reviews-list">

                    {paginatedReviews.map(
                      (review, index) => {

                        const image =
                          getRecipeImage(
                            review.recipeName
                          );

                        return (

                          <article
                            className="review-card"
                            key={
                              review._id ||
                              index
                            }
                          >

                            {/* REVIEW IMAGE */}

                            {image ? (

                              <img
                                src={image}
                                alt={
                                  review.recipeName ||
                                  "Recipe"
                                }
                                className="review-image"
                              />

                            ) : (

                              <div className="review-image-placeholder">
                                🍽️
                              </div>

                            )}

                            {/* REVIEW BODY */}

                            <div className="review-body">

                              <div className="review-top">

                                <div>

                                  <span>
                                    RECIPE
                                  </span>

                                  <h3>
                                    {review.recipeName}
                                  </h3>

                                </div>

                                <time>
                                  {formatDate(
                                    review.createdAt
                                  )}
                                </time>

                              </div>

                              {/* RATING */}

                              <div className="review-rating">

                                {renderStars(
                                  review.rating
                                )}

                                <strong>
                                  {review.rating}/5
                                </strong>

                              </div>

                              {/* COMMENT */}

                              <p className="review-text">
                                "{review.comments}"
                              </p>

                              {/* AUTHOR */}

                              <div className="review-author">

                                Reviewed by{" "}

                                <strong>
                                  {review.username}
                                </strong>

                              </div>

                            </div>

                          </article>

                        );
                      }
                    )}

                  </div>

                  {/* REVIEWS PAGINATION */}

                  {reviewsTotalPages > 1 && (

                    <div className="profile-pagination">

                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() =>
                          setReviewsPage((page) =>
                            Math.max(1, page - 1)
                          )
                        }
                        disabled={reviewsPage === 1}
                      >
                        Previous
                      </button>

                      {Array.from(
                        {
                          length: reviewsTotalPages,
                        },
                        (_, index) => index + 1
                      ).map((page) => (

                        <button
                          key={page}
                          type="button"
                          className={
                            page === reviewsPage
                              ? "pagination-button active"
                              : "pagination-button"
                          }
                          onClick={() =>
                            setReviewsPage(page)
                          }
                        >
                          {page}
                        </button>

                      ))}

                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() =>
                          setReviewsPage((page) =>
                            Math.min(
                              reviewsTotalPages,
                              page + 1
                            )
                          )
                        }
                        disabled={
                          reviewsPage === reviewsTotalPages
                        }
                      >
                        Next
                      </button>

                    </div>

                  )}

                </>

              )}

            </section>
          )}

        </main>

      </section>

      {/* =====================================================
          PROFILE PICTURE MODAL
      ===================================================== */}

      {showProfilePictureModal && (

        <div
          className="profile-picture-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeProfilePictureModal();
            }

          }}
        >

          <div
            className="profile-picture-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-picture-title"
          >

            <div className="profile-picture-modal-header">

              <div>

                <span>
                  PROFILE PHOTO
                </span>

                <h2 id="profile-picture-title">
                  Choose Your Picture
                </h2>

                <p>
                  Select a profile picture for
                  your Taste of Heaven account.
                </p>

              </div>

              <button
                type="button"
                className="profile-picture-modal-close"
                onClick={closeProfilePictureModal}
                disabled={savingProfilePicture}
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <div className="modal-profile-picture-grid">

              {profilePictures.map(
                (image, index) => (

                  <button
                    key={index}
                    type="button"
                    className={
                      profilePicture === image
                        ? "modal-picture-option selected"
                        : "modal-picture-option"
                    }
                    onClick={() =>
                      handleProfilePictureSelect(
                        image
                      )
                    }
                    disabled={savingProfilePicture}
                    aria-label={
                      `Choose profile picture ${
                        index + 1
                      }`
                    }
                  >

                    <img
                      src={image}
                      alt={
                        `Profile option ${
                          index + 1
                        }`
                      }
                    />

                    {profilePicture === image && (

                      <span className="modal-selected-check">
                        ✓
                      </span>

                    )}

                  </button>

                )
              )}

            </div>

            {savingProfilePicture && (

              <div className="profile-picture-saving">

                <span className="modal-spinner"></span>

                <span>
                  Saving your profile picture...
                </span>

              </div>

            )}

            <div className="profile-picture-modal-footer">
            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default ProfilePage;