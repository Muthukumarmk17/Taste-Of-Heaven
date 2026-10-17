
import { jsPDF } from "jspdf";

const CHEF_NOTE =
  "Every great recipe begins with a little passion and a love for good food. " +
  "Follow each step carefully, adjust the seasonings to suit your taste, " +
  "and use fresh ingredients for the best results. Take your time, enjoy " +
  "the cooking process, and make every dish your own. Good food is even " +
  "better when shared with the people you love!";

const CHEF_QUOTE = '"Cook with love, serve with joy!"';

const CLOSING_MESSAGE =
  "Thank you for cooking with Taste of Heaven. We hope every recipe " +
  "brings happiness to your kitchen, warmth to your home, and beautiful " +
  "memories to your table.";

const CLOSING_QUOTE =
  '"Good food, made with love, shared with joy!"';

export const downloadRecipe = (recipe) => {
  if (!recipe) {
    alert("Recipe details are unavailable.");
    return;
  }

  const logo = new Image();
  logo.src = `${
    process.env.PUBLIC_URL || ""
  }/taste-of-heaven-logo.png`;

  logo.onload = () => createRecipePDF(recipe, logo);
  logo.onerror = () => createRecipePDF(recipe, null);
};

const createRecipePDF = (recipe, logo) => {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const bottomMargin = 24;

    let y = 20;

    const colors = {
      green: [23, 76, 50],
      lightGreen: [235, 243, 230],
      orange: [245, 130, 32],
      brown: [116, 44, 18],
      text: [55, 61, 54],
      muted: [115, 120, 112],
      white: [255, 255, 255],
      divider: [222, 231, 218],
    };

    // Convert ingredient and method data into readable text.
    const getText = (item) => {
      if (typeof item === "string" || typeof item === "number") {
        return String(item);
      }

      if (item && typeof item === "object") {
        if (item.instruction) return String(item.instruction);
        if (item.description) return String(item.description);
        if (item.ingredient) return String(item.ingredient);

        const quantity = item.quantity ?? item.amount ?? "";
        const unit = item.unit ?? "";
        const name = item.name ?? item.text ?? "";

        return [quantity, unit, name]
          .filter(Boolean)
          .join(" ");
      }

      return "";
    };

    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];

    const methods = Array.isArray(recipe.methods)
      ? recipe.methods
      : Array.isArray(recipe.instructions)
        ? recipe.instructions
        : Array.isArray(recipe.method)
          ? recipe.method
          : [];

    // Add a new page if a block will exceed the available space.
    const ensureSpace = (requiredHeight = 10) => {
      if (y + requiredHeight > pageHeight - bottomMargin) {
        pdf.addPage();
        y = 20;
      }
    };

    // Taste of Heaven branding header.
    const addBrandHeader = () => {
      const headerY = 10;
      const headerHeight = 34;

      pdf.setFillColor(...colors.lightGreen);
      pdf.roundedRect(
        margin,
        headerY,
        contentWidth,
        headerHeight,
        3,
        3,
        "F"
      );

      if (logo) {
        try {
          const maxWidth = 42;
          const maxHeight = 22;

          const originalWidth = logo.naturalWidth || logo.width;
          const originalHeight = logo.naturalHeight || logo.height;

          const ratio = Math.min(
            maxWidth / originalWidth,
            maxHeight / originalHeight
          );

          const logoWidth = originalWidth * ratio;
          const logoHeight = originalHeight * ratio;

          pdf.addImage(
            logo,
            "PNG",
            (pageWidth - logoWidth) / 2,
            headerY + 1,
            logoWidth,
            logoHeight
          );
        } catch (error) {
          console.error("Could not add logo to PDF:", error);
        }
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.setTextColor(...colors.green);

        pdf.text(
          "TASTE OF HEAVEN",
          pageWidth / 2,
          headerY + 13,
          { align: "center" }
        );
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.muted);

      pdf.text(
        "FOOD  |  RECIPES  |  COMMUNITY",
        pageWidth / 2,
        headerY + 29,
        { align: "center" }
      );

      y = 52;
    };

    // Section heading.
    const addSectionTitle = (title) => {
      ensureSpace(18);

      pdf.setFillColor(...colors.green);
      pdf.roundedRect(
        margin,
        y,
        contentWidth,
        10,
        2,
        2,
        "F"
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...colors.white);
      pdf.text(title, margin + 4, y + 6.5);

      y += 16;
    };

    // Numbered ingredients and cooking instructions.
    const addNumberedItem = (number, text, prefix = "") => {
      const itemText = String(text || "").trim();

      if (!itemText) return;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const numberText = prefix
        ? `${prefix} ${number}:`
        : `${number}.`;

      const numberWidth = pdf.getTextWidth(numberText) + 3;

      const lines = pdf.splitTextToSize(
        itemText,
        contentWidth - numberWidth - 2
      );

      const lineHeight = 5.5;
      let lineIndex = 0;

      while (lineIndex < lines.length) {
        ensureSpace(lineHeight + 2);

        const availableLines = Math.max(
          1,
          Math.floor(
            (pageHeight - bottomMargin - y) / lineHeight
          )
        );

        const pageLines = lines.slice(
          lineIndex,
          lineIndex + availableLines
        );

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.green);

        pdf.text(
          lineIndex === 0 ? numberText : "",
          margin + 1,
          y
        );

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.text);

        pdf.text(pageLines, margin + numberWidth, y);

        y += pageLines.length * lineHeight + 3;
        lineIndex += pageLines.length;
      }
    };

    // Shaded information card with body text and an orange quote.
    const addTextCard = ({
      title,
      body,
      quote,
      iconText = "",
    }) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const bodyLines = pdf.splitTextToSize(
        body,
        contentWidth - 12
      );

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);

      const quoteLines = pdf.splitTextToSize(
        quote,
        contentWidth - 12
      );

      const bodyLineHeight = 5.5;
      const quoteLineHeight = 5;

      const cardHeight =
        10 +
        bodyLines.length * bodyLineHeight +
        5 +
        quoteLines.length * quoteLineHeight +
        9;

      ensureSpace(cardHeight + 4);

      pdf.setFillColor(...colors.lightGreen);
      pdf.roundedRect(
        margin,
        y,
        contentWidth,
        cardHeight,
        3,
        3,
        "F"
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...colors.green);

      pdf.text(
        `${iconText}${iconText ? " " : ""}${title}`,
        margin + 6,
        y + 9
      );

      let textY = y + 17;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...colors.text);

      pdf.text(bodyLines, margin + 6, textY);

      textY += bodyLines.length * bodyLineHeight + 5;

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.orange);

      pdf.text(quoteLines, margin + 6, textY);

      y += cardHeight + 8;
    };

    // =================================
    // 1. BRAND HEADER
    // =================================
    addBrandHeader();

    // =================================
    // 2. CHEF'S NOTE — BEFORE RECIPE NAME
    // =================================
    addTextCard({
      title: "Chef's Note",
      body: CHEF_NOTE,
      quote: CHEF_QUOTE,
    });

    // =================================
    // 3. RECIPE TITLE
    // =================================
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(...colors.brown);

    const titleLines = pdf.splitTextToSize(
      String(recipe.name || "Untitled Recipe"),
      contentWidth
    );

    ensureSpace(titleLines.length * 8 + 10);

    pdf.text(titleLines, pageWidth / 2, y, {
      align: "center",
    });

    y += titleLines.length * 8 + 4;

    pdf.setDrawColor(...colors.divider);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 9;

    // =================================
    // 4. CUISINE
    // =================================
    ensureSpace(12);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.green);

    pdf.text("Cuisine:", margin, y);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.text);

    pdf.text(
      String(recipe.cuisine || "Not specified"),
      margin + 20,
      y
    );

    y += 10;

    pdf.setDrawColor(...colors.divider);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 9;

    // =================================
    // 5. INGREDIENTS
    // =================================
    addSectionTitle("INGREDIENTS");

    if (ingredients.length === 0) {
      ensureSpace(10);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...colors.muted);

      pdf.text("No ingredients available.", margin + 2, y);
      y += 8;
    } else {
      ingredients.forEach((ingredient, index) => {
        addNumberedItem(index + 1, getText(ingredient));
      });
    }

    y += 5;

    // =================================
    // 6. COOKING METHOD
    // =================================
    addSectionTitle("COOKING METHOD");

    if (methods.length === 0) {
      ensureSpace(10);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...colors.muted);

      pdf.text(
        "No cooking instructions available.",
        margin + 2,
        y
      );

      y += 8;
    } else {
      methods.forEach((method, index) => {
        addNumberedItem(index + 1, getText(method), "Step");
      });
    }

    // =================================
    // 7. MADE WITH LOVE — CLOSING
    // =================================
    y += 5;

    addTextCard({
      title: "Made with Love",
      body: CLOSING_MESSAGE,
      quote: CLOSING_QUOTE,
    });

    // Closing signature.
    ensureSpace(18);

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.muted);

    pdf.text("With love,", pageWidth / 2, y, {
      align: "center",
    });

    y += 6;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...colors.green);

    pdf.text("Taste of Heaven", pageWidth / 2, y, {
      align: "center",
    });

    y += 10;

    // =================================
    // 8. FOOTER AND PAGE NUMBERS
    // =================================
    const pageCount = pdf.internal.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);

      pdf.setDrawColor(...colors.divider);
      pdf.line(
        margin,
        pageHeight - 14,
        pageWidth - margin,
        pageHeight - 14
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.muted);

      pdf.text(
        "Taste of Heaven",
        margin,
        pageHeight - 8
      );

      pdf.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" }
      );
    }

    // =================================
    // 9. SAVE PDF
    // =================================
    const safeName = String(recipe.name || "Recipe")
      .replace(/[<>:"/\\|?*]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    pdf.save(`${safeName || "Recipe"}.pdf`);
  } catch (error) {
    console.error("Recipe PDF download failed:", error);

    alert("Unable to download the recipe. Please try again.");
  }
};
