import React from "react";
import "./LikeAnimation.css";

function LikeAnimation({ show }) {
  if (!show) {
    return null;
  }

  return (
    <div className="like-animation-overlay">
      <div className="like-animation-content">

        <div className="heart-3d">
          ♥
        </div>

        <div className="like-text">
          Liked!
        </div>

      </div>
    </div>
  );
}

export default LikeAnimation;