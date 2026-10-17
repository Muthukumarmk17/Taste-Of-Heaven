
import React, { useState, useEffect, useRef } from "react";
import {
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./TopBar.css";
import NotificationBell from "./NotificationBell";

function TopBar({
  user,
  onLogout,
  onCuisineSelect,
  onRatingSelect,
  onSearch,
  onTypeSelect,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const pendingRecipeScroll = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // CHANGE NAVBAR APPEARANCE WHEN SCROLLING
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // SCROLL TO RECIPES AFTER NAVIGATION TO HOME
  useEffect(() => {
    if (
      location.pathname !== "/" ||
      !pendingRecipeScroll.current
    ) {
      return;
    }

    pendingRecipeScroll.current = false;

    let secondFrame;

    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const recipePanel =
          document.getElementById("recipe-results");

        if (recipePanel) {
          recipePanel.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);

      if (secondFrame) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [location.pathname]);

  // NAVIGATE TO HOME AND SHOW RECIPES
  const goToRecipes = () => {
    setCuisineOpen(false);
    setFilterOpen(false);

    if (location.pathname !== "/") {
      pendingRecipeScroll.current = true;
      navigate("/");
      return;
    }

    pendingRecipeScroll.current = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("recipe-results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  // SEARCH
  const changeSearch = (event) => {
    const value = event.target.value;
    setSearchTerm(value);

    if (onSearch) {
      onSearch(value);
    }
  };

  // RESET FILTERS AND GO HOME
  // RESET FILTERS AND GO HOME
const resetHome = () => {
  setCuisineOpen(false);
  setFilterOpen(false);
  setSearchTerm("");

  // Cancel any pending scroll to recipes
  pendingRecipeScroll.current = false;

  // Reset filters
  onCuisineSelect?.("");
  onRatingSelect?.(null);
  onTypeSelect?.("");
  onSearch?.("");

  // Navigate home if on another page
  if (location.pathname !== "/") {
    navigate("/", { replace: false });
  }

  // Return to the top after navigation/rendering
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    });
  });
};

  // CUISINE FILTER
  const chooseCuisine = (value) => {
    if (onCuisineSelect) {
      onCuisineSelect(value);
    }

    goToRecipes();
  };

  // RATING FILTER
  const chooseRating = (value) => {
    if (onRatingSelect) {
      onRatingSelect(value);
    }

    goToRecipes();
  };

  // LOGOUT
  const logout = () => {
    if (onLogout) {
      onLogout();
    }

    pendingRecipeScroll.current = false;
    navigate("/");
  };

  return (
    <header
      className={`th-header ${
        scrolled ? "th-header-scrolled" : ""
      }`}
    >
      {/* BRAND LOGO */}
      <Link
        to="/"
        className="th-brand"
        onClick={resetHome}
        aria-label="Taste of Heaven home"
      >
        <img
          src="/taste-of-heaven-logo.png"
          alt="Taste of Heaven"
          className="th-brand-logo"
          onError={(event) => {
            event.currentTarget.style.display = "none";

            const fallback =
              event.currentTarget.nextElementSibling;

            if (fallback) {
              fallback.style.display = "block";
            }
          }}
        />

        <span
          className="th-brand-fallback"
          style={{ display: "none" }}
        >
          <strong>
            Taste of <em>Heaven</em>
          </strong>
          <small>FOOD · RECIPES · COMMUNITY</small>
        </span>
      </Link>

      {/* NAVIGATION */}
      <nav className="th-nav" aria-label="Main navigation">
        {/* HOME */}
        <Link
          to="/"
          className="th-home-link"
          onClick={resetHome}
        >
          <span>Home</span>
        </Link>

        {/* CUISINE DROPDOWN */}
        <div className="th-menu">
          <button
            type="button"
            className="th-nav-button"
            aria-expanded={cuisineOpen}
            onClick={() => {
              setCuisineOpen((value) => !value);
              setFilterOpen(false);
            }}
          >
            <span>Cuisine</span>
            <span
              className={
                cuisineOpen
                  ? "th-chevron is-open"
                  : "th-chevron"
              }
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {cuisineOpen && (
            <div className="th-dropdown">
              {["Indian", "Italian", "Chinese"].map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => chooseCuisine(item)}
                >
                  {item}
                </button>
              ))}

              <button
                type="button"
                onClick={() => chooseCuisine("")}
              >
                All cuisines
              </button>
            </div>
          )}
        </div>

        {/* RATING FILTER DROPDOWN */}
        <div className="th-menu">
          <button
            type="button"
            className="th-nav-button"
            aria-expanded={filterOpen}
            onClick={() => {
              setFilterOpen((value) => !value);
              setCuisineOpen(false);
            }}
          >
            <span>Filter</span>
            <span
              className={
                filterOpen
                  ? "th-chevron is-open"
                  : "th-chevron"
              }
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {filterOpen && (
            <div className="th-dropdown">
              <button
                type="button"
                onClick={() => chooseRating(5)}
              >
                5 Star
              </button>

              <button
                type="button"
                onClick={() => chooseRating(4)}
              >
                4 Star
              </button>

              <button
                type="button"
                onClick={() => chooseRating(3)}
              >
                3 Star
              </button>

              <button
                type="button"
                onClick={() => chooseRating(null)}
              >
                All ratings
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* SEARCH BAR WITH ICON */}
      <label className="th-header-search">
        <svg
          className="th-search-svg"
          xmlns="http://www.w3.org/2000/svg"
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>

        <input
          type="search"
          value={searchTerm}
          onChange={changeSearch}
          placeholder="Search recipes, ingredients..."
          aria-label="Search recipes and ingredients"
        />
      </label>

      {/* USER ACCOUNT */}
      <div className="th-account">
        <NotificationBell user={user} />

        {user?.role === "admin" ? (
          <Link to="/admin" className="th-profile-link">
            <span>Admin Dashboard</span>
          </Link>
        ) : user ? (
          <Link to="/profile" className="th-profile-link">
            <img
              src={
                user.profilePicture ||
                "/default-profile.png"
              }
              alt=""
              className="th-avatar"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src =
                  "/default-profile.png";
              }}
            />

            <span className="th-username">
              {user.username || "Profile"}
            </span>
          </Link>
        ) : (
          <Link to="/login" className="th-login">
            Login
          </Link>
        )}

        {user && (
          <button
            type="button"
            className="th-signout"
            onClick={logout}
          >
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default TopBar;
