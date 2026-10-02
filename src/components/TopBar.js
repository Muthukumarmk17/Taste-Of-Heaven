import React, { useState } from "react";
import { Link } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faHouseChimney,
  faUtensils,
  faFilter,
  faSearch,
  faRightFromBracket,
  faChevronDown,
  faUserGear,
  faLeaf,
  faDrumstickBite,
  faStar,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import "./TopBar.css";

function TopBar({
  user,
  onLogout,
  onCuisineSelect,
  onRatingSelect,
  onTypeSelect,
  onSearch,
}) {

  // =====================================================
  // STATES
  // =====================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);


  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearchChange = (event) => {

    const term = event.target.value;

    setSearchTerm(term);

    if (onSearch) {
      onSearch(term);
    }
  };


  // =====================================================
  // HOME
  // =====================================================

  const handleHomeClick = () => {

    if (onCuisineSelect) {
      onCuisineSelect("");
    }

    if (onRatingSelect) {
      onRatingSelect(null);
    }

    if (onTypeSelect) {
      onTypeSelect("");
    }

    setSearchTerm("");

    if (onSearch) {
      onSearch("");
    }

    setCuisineOpen(false);
    setFilterOpen(false);
  };


  // =====================================================
  // CUISINE
  // =====================================================

  const handleCuisineClick = (cuisine) => {

    if (onCuisineSelect) {
      onCuisineSelect(cuisine);
    }

    setCuisineOpen(false);
  };


  // =====================================================
  // RATING FILTER
  // =====================================================

  const handleRatingClick = (rating) => {

    if (onRatingSelect) {
      onRatingSelect(rating);
    }

    setFilterOpen(false);
  };


  // =====================================================
  // VEG / NON-VEG FILTER
  // =====================================================

  const handleTypeClick = (type) => {

    if (onTypeSelect) {
      onTypeSelect(type);
    }

    setFilterOpen(false);
  };


  // =====================================================
  // ALL RECIPES
  // =====================================================

  const handleAllRecipesClick = () => {

    if (onCuisineSelect) {
      onCuisineSelect("");
    }

    if (onRatingSelect) {
      onRatingSelect(null);
    }

    if (onTypeSelect) {
      onTypeSelect("");
    }

    setSearchTerm("");

    if (onSearch) {
      onSearch("");
    }

    setFilterOpen(false);
    setCuisineOpen(false);
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {

    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    }
  };


  // =====================================================
  // UI
  // =====================================================

  return (

    <header className="top-bar">

      {/* =================================================
          DECORATIVE LEAVES - LEFT
      ================================================= */}

      <div
        className="header-leaves header-leaves-left"
        aria-hidden="true"
      >

        <span className="leaf leaf-1"></span>
        <span className="leaf leaf-2"></span>
        <span className="leaf leaf-3"></span>
        <span className="leaf leaf-4"></span>

      </div>


      {/* =================================================
          DECORATIVE LEAVES - RIGHT
      ================================================= */}

      <div
        className="header-leaves header-leaves-right"
        aria-hidden="true"
      >

        <span className="leaf leaf-5"></span>
        <span className="leaf leaf-6"></span>
        <span className="leaf leaf-7"></span>

      </div>


      {/* =================================================
          BRAND
      ================================================= */}

      <div className="brand-section">

        <div className="brand-logo">

          <div className="chef-logo">

            <div className="chef-hat">
              ♨
            </div>

          </div>


          <div className="brand-text">

            <h1>
              TASTE OF <span>HEAVEN</span>
            </h1>

            <p>
              RECIPES FOR A HAPPIER YOU
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav className="nav-container">


        {/* =================================================
            HOME
        ================================================= */}

        <Link
          to="/"
          className="nav-home"
          onClick={handleHomeClick}
        >

          <FontAwesomeIcon icon={faHouseChimney} />

          <span>
            Home
          </span>

        </Link>


        {/* =================================================
            CUISINE
        ================================================= */}

        <div className="nav-dropdown">

          <button
            type="button"
            className="nav-button"
            onClick={() => {

              setCuisineOpen(
                (previous) => !previous
              );

              setFilterOpen(false);

            }}
          >

            <FontAwesomeIcon
              icon={faUtensils}
            />

            <span>
              Cuisine
            </span>

            <FontAwesomeIcon
              icon={faChevronDown}
              className={
                cuisineOpen
                  ? "dropdown-arrow rotate"
                  : "dropdown-arrow"
              }
            />

          </button>


          {cuisineOpen && (

            <div className="dropdown-content cuisine-dropdown">

              <button
                type="button"
                onClick={() =>
                  handleCuisineClick("Indian")
                }
              >
                🍛 Indian
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCuisineClick("Italian")
                }
              >
                🍝 Italian
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCuisineClick("Chinese")
                }
              >
                🥢 Chinese
              </button>

            </div>

          )}

        </div>


        {/* =================================================
            FILTER
        ================================================= */}

        <div className="nav-dropdown">

          <button
            type="button"
            className={
              filterOpen
                ? "nav-button filter-active"
                : "nav-button"
            }
            onClick={() => {

              setFilterOpen(
                (previous) => !previous
              );

              setCuisineOpen(false);

            }}
          >

            <FontAwesomeIcon
              icon={faFilter}
            />

            <span>
              Filter
            </span>

            <FontAwesomeIcon
              icon={faChevronDown}
              className={
                filterOpen
                  ? "dropdown-arrow rotate"
                  : "dropdown-arrow"
              }
            />

          </button>


          {filterOpen && (

            <div className="dropdown-content filter-dropdown">


              {/* =================================================
                  VEG
              ================================================= */}

              <button
                type="button"
                className="filter-option veg-option"
                onClick={() =>
                  handleTypeClick("Veg")
                }
              >

                <FontAwesomeIcon
                  icon={faLeaf}
                  className="filter-option-icon"
                />

                <span>
                  Veg
                </span>

              </button>


              {/* =================================================
                  NON VEG
              ================================================= */}

              <button
                type="button"
                className="filter-option nonveg-option"
                onClick={() =>
                  handleTypeClick("Non-veg")
                }
              >

                <FontAwesomeIcon
                  icon={faDrumstickBite}
                  className="filter-option-icon"
                />

                <span>
                  Non-veg
                </span>

              </button>


              <div className="dropdown-separator"></div>


              {/* =================================================
                  5 STAR
              ================================================= */}

              <button
                type="button"
                className="filter-option rating-option"
                onClick={() =>
                  handleRatingClick(5)
                }
              >

                <FontAwesomeIcon
                  icon={faStar}
                  className="filter-star-icon"
                />

                <span>
                  5 Star
                </span>

              </button>


              {/* =================================================
                  4 STAR
              ================================================= */}

              <button
                type="button"
                className="filter-option rating-option"
                onClick={() =>
                  handleRatingClick(4)
                }
              >

                <FontAwesomeIcon
                  icon={faStar}
                  className="filter-star-icon"
                />

                <span>
                  4 Star
                </span>

              </button>


              <div className="dropdown-separator"></div>


              {/* =================================================
                  ALL RECIPES
              ================================================= */}

              <button
                type="button"
                className="filter-option all-option"
                onClick={handleAllRecipesClick}
              >

                <FontAwesomeIcon
                  icon={faRotate}
                  className="filter-all-icon"
                />

                <span>
                  All Recipes
                </span>

              </button>

            </div>

          )}

        </div>

      </nav>


      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="search-container">

        <FontAwesomeIcon
          icon={faSearch}
          className="search-icon"
        />

        <input
          type="text"
          className="search-input"
          placeholder="Search recipes, ingredients..."
          value={searchTerm}
          onChange={handleSearchChange}
        />

      </div>


      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      {user?.role === "admin" ? (

        <div className="profile-section">


          {/* =================================================
              ADMIN
          ================================================= */}

          <Link
            to="/admin"
            className="admin-link"
          >

            <FontAwesomeIcon
              icon={faUserGear}
            />

            <span>
              Admin
            </span>

          </Link>


          {/* =================================================
              SIGN OUT
          ================================================= */}

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >

            <FontAwesomeIcon
              icon={faRightFromBracket}
            />

            <span>
              Sign Out
            </span>

          </button>

        </div>

      ) : user ? (

        <div className="profile-section">


          {/* =================================================
              USER PROFILE
          ================================================= */}

          <Link
            to="/profile"
            className="profile-link"
          >

            <img
              src={
                user.profilePicture ||
                "/default-profile.png"
              }
              alt="Profile"
              className="profile-image"
            />

            <span className="username">
              {user.username}
            </span>

            <FontAwesomeIcon
              icon={faChevronDown}
              className="profile-arrow"
            />

          </Link>


          {/* =================================================
              SIGN OUT
          ================================================= */}

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >

            <FontAwesomeIcon
              icon={faRightFromBracket}
            />

            <span>
              Sign Out
            </span>

          </button>

        </div>

      ) : (

        <Link
          to="/login"
          className="login-button"
        >
          Login
        </Link>

      )}

    </header>
  );
}

export default TopBar;