import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../api";
import "./ReviewForm.css";

function ReviewForm({
  recipeName,
  onReviewSubmitted,
  onCancel,
}) {
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Submit button clicked");

    // Validate rating
    if (!rating) {
      setNotification("Please select a rating.");
      return;
    }

    // Validate comments
    if (!comments.trim()) {
      setNotification("Please enter your comments.");
      return;
    }

    // Get logged-in user
    const loggedInUser = JSON.parse(
      localStorage.getItem("user")
    );

    console.log("Logged in user:", loggedInUser);

    // Check user
    if (
      !loggedInUser ||
      !loggedInUser.username ||
      !loggedInUser.email
    ) {
      setNotification("Please log in to submit a review.");
      return;
    }

    // Review data
    const reviewData = {
      recipeName: recipeName,
      username: loggedInUser.username,
      email: loggedInUser.email,
      rating: rating,
      comments: comments.trim(),
    };

    console.log("Review data:", reviewData);

    try {
      setLoading(true);
      setNotification("");

      // POST review to backend
      const response = await axios.post(
        `${API_BASE_URL}/api/reviews`,
        reviewData
      );

      console.log("POST response:", response.data);

      // Successful response
      if (
        response.status === 200 ||
        response.status === 201
      ) {
        setNotification(
          "Your review has been submitted successfully!"
        );

        // Send new review to RecipeDetails
        if (onReviewSubmitted) {
          onReviewSubmitted(response.data);
        }

        // Clear form
        setRating("");
        setComments("");
      }
    } catch (error) {
      console.error(
        "Error submitting review:",
        error
      );

      console.error(
        "Backend response:",
        error.response?.data
      );

      setNotification(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to submit review. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-modal-overlay">

      <div className="review-form">

        <h3>Add Your Review</h3>

        {/* Notification */}
        {notification && (
          <div className="notification">
            {notification}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Rating */}
          <label>
            Rating:

            <select
              value={rating}
              onChange={(e) =>
                setRating(e.target.value)
              }
              required
            >
              <option value="">
                Select
              </option>

              <option value="5">
                5 - Excellent
              </option>

              <option value="4">
                4 - Very Good
              </option>

              <option value="3">
                3 - Good
              </option>

              <option value="2">
                2 - Fair
              </option>

              <option value="1">
                1 - Poor
              </option>
            </select>
          </label>

          {/* Comments */}
          <label>
            Comments:

            <textarea
              value={comments}
              onChange={(e) =>
                setComments(e.target.value)
              }
              placeholder="Write your review..."
              required
            />
          </label>

          {/* Buttons */}
          <div className="review-buttons">

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading
                ? "Submitting..."
                : "Submit"}
            </button>

            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default ReviewForm;