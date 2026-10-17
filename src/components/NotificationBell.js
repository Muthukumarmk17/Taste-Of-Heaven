
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";

const API_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 5;
const NEW_RECIPE_WINDOW = 60 * 60 * 1000;

function NotificationBell({ user }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const email = user?.email?.trim().toLowerCase();

  // Load notifications for the current user.
  const loadNotifications = useCallback(async () => {
    if (!email || user?.role === "admin") {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications`,
        {
          method: "GET",
          headers: { "user-email": email },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load notifications.");
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [email, user?.role]);

  // Initial load and refresh every minute.
  useEffect(() => {
    if (!email || user?.role === "admin") {
      setNotifications([]);
      return undefined;
    }

    loadNotifications();

    const intervalId = setInterval(loadNotifications, 60000);
    return () => clearInterval(intervalId);
  }, [email, user?.role, loadNotifications]);

  // The backend returns isRead for this specific recipient.
  const unreadCount = notifications.filter(
    (item) => !item.isRead
  ).length;

  // Filter notifications.
  const filteredNotifications = useMemo(() => {
    const now = Date.now();
    const term = search.trim().toLowerCase();

    return notifications.filter((item) => {
      if (activeTab === "recipe") {
        if (item.type !== "recipe") return false;

        const createdAt = new Date(item.createdAt).getTime();

        if (
          !Number.isFinite(createdAt) ||
          now - createdAt < 0 ||
          now - createdAt > NEW_RECIPE_WINDOW
        ) {
          return false;
        }
      }

      if (activeTab === "update" && item.type !== "update") {
        return false;
      }

      const recipe =
        item.recipeId && typeof item.recipeId === "object"
          ? item.recipeId
          : null;

      const searchableText = [
        item.title,
        item.message,
        item.recipeName,
        item.recipeImage,
        recipe?.name,
        recipe?.cuisine,
        item.cuisine,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !term || searchableText.includes(term);
    });
  }, [notifications, activeTab, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / PAGE_SIZE)
  );

  const visibleNotifications = filteredNotifications.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Mark one notification as read for this user only.
  const markRead = async (id) => {
    if (!email || !id || updatingId === id) return;

    setUpdatingId(id);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: { "user-email": email },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Could not mark notification as read.");
      }

      setNotifications((items) =>
        items.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );
    } catch (err) {
      setError(err.message || "Unable to update notification.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark all notifications as read for this user.
  const markAllRead = async () => {
    if (!email || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: "PATCH",
          headers: { "user-email": email },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Could not mark all notifications as read.");
      }

      setNotifications((items) =>
        items.map((item) => ({ ...item, isRead: true }))
      );
    } catch (err) {
      setError(err.message || "Unable to update notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString();
  };

  // Open recipe details and mark the notification as read.
  const openRecipe = async (item) => {
    const recipe =
      item.recipeId && typeof item.recipeId === "object"
        ? item.recipeId
        : null;

    if (!recipe?.name) {
      setError(
        "Recipe details are unavailable. Please check the backend response."
      );
      return;
    }

    if (!item.isRead) {
      await markRead(item._id);
    }

    setOpen(false);

    // Keep this route consistent with your App.js.
    navigate(`/recipe/${encodeURIComponent(recipe.name)}`);
  };

  // Hide the bell for logged-out users and admins.
  if (!user || user.role === "admin") {
    return null;
  }

  return (
    <div className="notification-center">
      <button
        type="button"
        className="notification-bell"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);

          if (nextOpen) {
            loadNotifications();
          }
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="notification-backdrop"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />

          <section
            className="notification-panel"
            aria-label="Notifications"
          >
            <div className="notification-panel-heading">
              <div>
                <h2>Notifications</h2>
                <p>
                  {unreadCount} unread notification
                  {unreadCount === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                className="notification-close"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>

            <div className="notification-tabs">
              <button
                type="button"
                className={activeTab === "all" ? "active" : ""}
                onClick={() => setActiveTab("all")}
              >
                All Notifications
              </button>

              <button
                type="button"
                className={activeTab === "recipe" ? "active" : ""}
                onClick={() => setActiveTab("recipe")}
              >
                New Recipes
              </button>

              <button
                type="button"
                className={activeTab === "update" ? "active" : ""}
                onClick={() => setActiveTab("update")}
              >
                Updates
              </button>
            </div>

            <div className="notification-actions">
              <input
                type="search"
                placeholder="Search recipe or message..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search notifications"
              />

              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0 || markingAll}
              >
                {markingAll ? "Updating..." : "Mark all as read"}
              </button>
            </div>

            {error && (
              <p className="notification-error" role="alert">
                {error}
              </p>
            )}

            {loading && (
              <p className="notification-empty">
                Loading notifications...
              </p>
            )}

            {!loading && visibleNotifications.length === 0 && (
              <p className="notification-empty">
                {activeTab === "recipe"
                  ? "No new recipes were added in the last hour."
                  : activeTab === "update"
                  ? "No updates found."
                  : "No notifications found."}
              </p>
            )}

            <div className="notification-list">
              {visibleNotifications.map((item) => {
                const recipe =
                  item.recipeId &&
                  typeof item.recipeId === "object"
                    ? item.recipeId
                    : null;

                const isRecipe = item.type === "recipe";

                const recipeName =
                  recipe?.name || item.recipeName || "New Recipe";

                const imageUrl =
                  recipe?.image ||
                  item.recipeImage ||
                  item.image ||
                  "";

                const rating = Number(
                  recipe?.rating ?? item.rating
                );

                const hasRating =
                  (recipe?.rating ?? item.rating) !== null &&
                  (recipe?.rating ?? item.rating) !== undefined &&
                  (recipe?.rating ?? item.rating) !== "" &&
                  Number.isFinite(rating);

                const cuisine = recipe?.cuisine || item.cuisine;

                return (
                  <article
                    key={item._id}
                    className={`notification-item ${
                      item.isRead ? "read" : "unread"
                    }`}
                  >
                    {isRecipe ? (
                      <div className="notification-recipe-card">
                        {imageUrl ? (
                          <img
                            className="notification-recipe-image"
                            src={imageUrl}
                            alt={recipeName}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="notification-recipe-image notification-recipe-placeholder">
                            🍲
                          </div>
                        )}

                        <div className="notification-recipe-details">
                          <div className="notification-recipe-label">
                            {!item.isRead && (
                              <span
                                className="notification-unread-dot"
                                aria-label="Unread"
                              />
                            )}
                            <span>New Recipe Added!</span>
                          </div>

                          <h3>{recipeName}</h3>

                          <p>
                            {item.message ||
                              `${recipeName} has been added to Taste of Heaven. Explore the recipe now!`}
                          </p>

                          {cuisine && (
                            <span className="notification-cuisine">
                              {cuisine}
                            </span>
                          )}

                          {hasRating && (
                            <span className="notification-rating">
                              <span aria-hidden="true">★</span>{" "}
                              {rating.toFixed(1)}
                            </span>
                          )}

                          <time dateTime={item.createdAt}>
                            {formatDate(item.createdAt)}
                          </time>
                        </div>

                        <button
                          type="button"
                          className="notification-open-recipe"
                          onClick={() => openRecipe(item)}
                          aria-label={`View recipe ${recipeName}`}
                          title="Explore recipe"
                        >
                          →
                        </button>
                      </div>
                    ) : (
                      <div className="notification-item-top">
                        <span
                          className="notification-item-icon"
                          aria-hidden="true"
                        >
                          👋
                        </span>

                        <div className="notification-item-copy">
                          <h3>
                            {item.title || "Welcome to Taste of Heaven!"}
                          </h3>

                          <p>
                            {item.message ||
                              "Your account has been verified successfully. Welcome to Taste of Heaven!"}
                          </p>

                          <time dateTime={item.createdAt}>
                            {formatDate(item.createdAt)}
                          </time>
                        </div>
                      </div>
                    )}

                    {!item.isRead && (
                      <button
                        type="button"
                        className="notification-read-button"
                        disabled={updatingId === item._id}
                        onClick={() => markRead(item._id)}
                      >
                        {updatingId === item._id
                          ? "Updating..."
                          : "Mark as read"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>

            {filteredNotifications.length > 0 && (
              <div className="notification-pagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((current) => current - 1)
                  }
                >
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
