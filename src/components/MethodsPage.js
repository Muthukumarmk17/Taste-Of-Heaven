import React from "react";
import { useParams } from "react-router-dom";

function MethodsPage({ recipes }) {
  const { name } = useParams();
  const recipe = recipes.find((r) => r.name === name);

  if (!recipe) {
    return <p> Recipe not found! </p>;
  }

  return (
    <div>
      <h2> {recipe.name} - Cooking Methods </h2>{" "}
      <ol>
        {" "}
        {recipe.methods.map((method, index) => (
          <li key={index}> {method} </li>
        ))}{" "}
      </ol>{" "}
    </div>
  );
}

export default MethodsPage;
