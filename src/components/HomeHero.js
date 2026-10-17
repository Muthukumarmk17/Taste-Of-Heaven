
import React, { useEffect, useState } from "react";
import "./HomeHero.css";

const heroImages = [
  {
    name: "Chicken Biryani",
    category: "Non-Veg",
    image:
      "https://images.openai.com/static-rsc-4/rMuUmXU9GBG3sb_HHSg6x00Q370gc5LnDXEEEL9g1dO7SxIDIPuhPPYmsUosAS2CRxx3WfkepGwvDXjDBkpn32E1m-5rQ5e_5l2nF-01FjF82ejLp6fnx4CMZPoK3k0bvgwzvw_pHk3B060TOrcyKnrE-G32GkeTFqa2ZBxiCuI?purpose=inline",
  },
  {
    name: "Paneer Butter Masala",
    category: "Veg",
    image:
      "https://images.openai.com/static-rsc-4/pe1jnpnzpQ1IorOpKBKD4UsLkVJugLpSV5xI3XJA1ZZoS2ZZj0Lr_g6fD_B2_UGK3clrqpjAwNZxwYtdoJE083g4WnurEdMSYECxJF4csv4icZOmAwyUCin62oo3PuqcO91tZK65ZJgFSHdEU_xibr4RFfq5OEcG074NPo-bHZs?purpose=inline",
  },
  {
    name: "Masala Dosa",
    category: "Veg",
    image:
      "https://images.openai.com/static-rsc-4/toXA92XMa63Z6x7VntOIo6LbnOT0EeVqsSSw8EIm3I5PRED1i8ytz-e-4Its4B68q9CdTpwNOHk4QUIOTZBe-g-u8IkMi594VBrZLA28RgUiH0ImsvIfD9zlV08-z99LbpNCx4-Sz7MtssPrKrMOUohfQhW_d5GwDKXZYTSbvEg?purpose=inline",
  },
  {
    name: "Chicken Shawarma",
    category: "Non-Veg",
    image:
      "https://images.openai.com/static-rsc-4/r1O2MuHDV_XV5CrBd8ikpM-neIyiiue3Jk0s-tGZdhJqT9_2WOB0vd8vHid-XUnGIcwGEjtHc06S4jvsMAOOm16azqADUG46l5BZ76Ks1IHzHHonO1hr-_FhPArcl0rqeQ2m1ByAqMF2Lp7cKlo8vRLvL_8scBBOG0xlJ_GHqqA?purpose=inline",
  },
  {
    name: "Chocolate Brownie",
    category: "Dessert",
    image:
      "https://images.openai.com/static-rsc-4/-tCWj4BCQwpvBrT3QCRbN6Dt1Zx_vV0r3R6u5GpJtopz5Tsm4r2Cc2A_-A-saNr4OU_AIcMzZKEAOCTfK8JGZYB3FFkd7n4zazBhLPTW9lwWeI-19rE-mSPkaFsyXDHUacNKUUZwF4aiD9Nct5kpDFw2BUWnj-QSuuUDw5aj_tU?purpose=inline",
  },
];

// Identify recipes by both type and name.


const getRecipeDietLabel = (recipe) => {
  const recipeName = String(recipe?.name || "").trim();

  const normalizedType = String(
    recipe?.type || recipe?.category || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  // Identify category from a label at the end of the recipe name.
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

  // Identify category from the database.
  const typeIsDessert = ["dessert", "desserts"].includes(normalizedType);
  const typeIsVeg = ["veg", "vegetarian"].includes(normalizedType);

  const typeIsNonVeg = [
    "non-veg",
    "nonveg",
    "non-vegetarian",
    "nonvegetarian",
  ].includes(normalizedType);

  // Identify desserts by name if type is missing or unrecognized.
  const nameSuggestsDessert =
    /\b(dessert|tiramisu|brownies?|cake|ice cream|pudding|cheesecake|cookies?|pastry)\b/i.test(
      recipeName
    );

  // Preserve your existing classification rules.
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

  return isDessert
    ? "Dessert"
    : isVeg
    ? "Veg"
    : isNonVeg
    ? "Non-veg"
    : "Unknown";
};


function HomeHero({ onSearch, onTypeSelect }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchText, setSearchText] = useState("");

  // Automatically change the featured image every 5 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex(
        (current) => (current + 1) % heroImages.length
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const previousImage = () => {
    setActiveIndex(
      (current) =>
        (current - 1 + heroImages.length) % heroImages.length
    );
  };

  const nextImage = () => {
    setActiveIndex(
      (current) => (current + 1) % heroImages.length
    );
  };

  const handleSearch = (value) => {
    setSearchText(value);

    if (onSearch) {
      onSearch(value);
    }
  };

  const selectCategory = (category) => {
    if (onTypeSelect) {
      onTypeSelect(category);
    }
  };

  const activeImage = heroImages[activeIndex];
  const activeDietLabel = getRecipeDietLabel(activeImage);

  return (
    <section className="home-hero">
      <div className="home-hero-content">
        <span className="hero-eyebrow">
          <span className="hero-eyebrow-line"></span>
          MADE WITH LOVE
        </span>

        <h1>
          Delicious Recipes
          <br />
          Made for <em>Real Life</em>
        </h1>

        <p className="hero-description">
          Discover easy, tasty and inspiring recipes for every mood,
          occasion and skill level.
        </p>

        <form
          className="hero-search"
          onSubmit={(event) => {
            event.preventDefault();

            if (onSearch) {
              onSearch(searchText);
            }
          }}
        >
          <span className="hero-search-icon">⌕</span>

          <input
            type="search"
            placeholder="Search your favorite recipes..."
            value={searchText}
            onChange={(event) => handleSearch(event.target.value)}
            aria-label="Search recipes"
          />

          <button type="submit">Search</button>
        </form>

        <div className="hero-popular">
          <span className="popular-label">POPULAR:</span>

          <button
            type="button"
            className="popular-chip vegetarian-chip"
            onClick={() => selectCategory("Veg")}
          >
            <span>●</span> Vegetarian
          </button>

          <button
            type="button"
            className="popular-chip nonveg-chip"
            onClick={() => selectCategory("Non-veg")}
          >
            <span>●</span> Non-Veg
          </button>

          <button
            type="button"
            className="popular-chip dessert-chip"
            onClick={() => selectCategory("Dessert")}
          >
            <span>●</span> Dessert
          </button>
        </div>
      </div>

      <div className="home-hero-visual">
        <div className="hero-image-frame">
          <img
            key={activeImage.image}
            src={activeImage.image}
            alt={activeImage.name}
            className="hero-food-image"
            onError={(event) => {
              event.currentTarget.style.opacity = "0.25";
            }}
          />

          <div className="hero-image-caption">
            <span>FEATURED RECIPE</span>
            <h2>{activeImage.name}</h2>
            <p>{activeDietLabel}</p>
          </div>

          <button
            type="button"
            className="hero-arrow hero-arrow-left"
            onClick={previousImage}
            aria-label="Previous image"
          >
            &#8592;
          </button>

          <button
            type="button"
            className="hero-arrow hero-arrow-right"
            onClick={nextImage}
            aria-label="Next image"
          >
            &#8594;
          </button>
        </div>

        <div className="hero-image-dots">
          {heroImages.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={`hero-dot ${
                index === activeIndex ? "active" : ""
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${item.name}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export { heroImages, getRecipeDietLabel };
export default HomeHero;
