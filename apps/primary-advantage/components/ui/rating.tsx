// You would typically place this file in src/components/ui/rating.tsx or similar.
// Ensure you have Lucide React installed: npm install lucide-react
// Ensure you have Tailwind CSS configured in your Next.js project.

"use client"; // This component needs client-side interactivity

import React, { useState } from "react";
import { Star, StarHalf } from "lucide-react"; // Import both Star and StarHalf icons from Lucide React

interface StarRatingProps {
  /**
   * The initial rating to display. Can be a half-star value (e.g., 3.5).
   * @default 0
   */
  initialRating?: number;
  /**
   * The maximum number of full stars for the rating.
   * @default 5
   */
  maxRating?: number;
  /**
   * The size of the stars.
   * Tailwind class for sizing (e.g., 'w-5 h-5', 'w-6 h-6').
   * @default 'w-5 h-5'
   */
  starSizeClass?: string;
  /**
   * Callback function when the rating changes.
   * Receives the new rating as an argument (can be a half-star value).
   */
  onRatingChange?: (rating: number) => void;
  /**
   * Determines if the rating component is interactive or read-only.
   * If true, it only displays the rating and cannot be changed.
   * @default false
   */
  readOnly?: boolean;
}

/**
 * A reusable Star Rating component with half-star support, built with React,
 * Shadcn UI styling (Tailwind CSS), and Lucide React icons.
 * Allows users to select a rating with a visual star representation, including half-star increments.
 */
const StarRating: React.FC<StarRatingProps> = ({
  initialRating = 0,
  maxRating = 5,
  starSizeClass = "w-4 h-4",
  onRatingChange,
  readOnly = false,
}) => {
  // State to manage the current rating selected by the user. Can be a float.
  // Initialize currentRating by rounding initialRating to the nearest 0.5 to ensure correct display.
  const [currentRating, setCurrentRating] = useState(
    () => Math.round(initialRating * 2) / 2,
  );
  // State to manage the hover rating for visual feedback. Can be a float.
  const [hoverRating, setHoverRating] = useState(0);

  // Determine the active rating for display (hovered rating takes precedence over currentRating)
  // If no hover, it uses the currentRating.
  // We clamp activeRating to be between 0 and maxRating to prevent display issues
  const activeRating = Math.min(
    Math.max(0, hoverRating || currentRating),
    maxRating,
  );

  // Round the active rating to the nearest 0.5 for accurate half-star display logic
  const roundedActiveRating = Math.round(activeRating * 2) / 2;

  /**
   * Handles the click event on a star segment.
   * Sets the new rating based on the currently hovered value and triggers the onRatingChange callback.
   * The hoverRating is set by onMouseMove, which determines half or full star.
   */
  const handleClick = () => {
    if (readOnly) return;
    // Use the hoverRating (which is already rounded to 0.5) if it's currently active,
    // otherwise default to currentRating (which is also rounded to 0.5 due to useState initializer)
    const newRating = hoverRating > 0 ? hoverRating : currentRating;
    setCurrentRating(newRating);
    onRatingChange?.(newRating); // Call the provided callback with the new rounded rating
  };

  /**
   * Handles the mouse leave event from the entire rating container.
   * Resets the hoverRating state to 0, reverting to the currentRating display.
   */
  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  return (
    <div
      className="flex items-center"
      onMouseLeave={handleMouseLeave}
      role="radiogroup" // For accessibility, indicates a group of radio buttons (stars)
      aria-label="Product Rating" // General label for the rating component
    >
      {[...Array(maxRating)].map((_, index) => {
        const fullStarValue = index + 1; // Represents the value if this star were fully selected (1, 2, 3...)

        // Determine if the star should be full, half, or empty based on the rounded active rating
        const isFullStar = fullStarValue <= Math.floor(roundedActiveRating);
        const isHalfStar =
          fullStarValue === Math.ceil(roundedActiveRating) &&
          roundedActiveRating % 1 !== 0;

        // Determine which Lucide icon to render (Star or StarHalf)
        const StarIcon = isHalfStar ? StarHalf : Star;

        // Determine the fill color based on whether it's filled, half-filled, or empty
        const starColorClass =
          isFullStar || isHalfStar
            ? "fill-current text-yellow-500"
            : "text-gray-300";

        // Construct aria-label for the individual star segment for screen readers
        let ariaLabelText = `Star ${fullStarValue} of ${maxRating}`;
        if (isFullStar) {
          ariaLabelText += " (filled)";
        } else if (isHalfStar) {
          ariaLabelText += " (half-filled)";
        } else {
          ariaLabelText += " (empty)";
        }

        return (
          <div
            key={fullStarValue}
            // Use 'relative inline-flex' to ensure each star is a separate interactive area for mouse events
            className={`relative inline-flex items-center ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            onMouseMove={(e) => {
              if (readOnly) return;
              const starElement = e.currentTarget;
              const { left, width } = starElement.getBoundingClientRect();
              // Calculate mouse position relative to the current star div
              const x = e.clientX - left;
              const halfWidth = width / 2;

              let newHoverRating;
              if (x < halfWidth) {
                // If mouse is on the first half, set hover rating to X.5 (previous whole star + 0.5)
                newHoverRating = fullStarValue - 0.5;
              } else {
                // If mouse is on the second half, set hover rating to X.0 (current whole star)
                newHoverRating = fullStarValue;
              }
              setHoverRating(newHoverRating);
            }}
            onClick={handleClick} // Use the consolidated click handler
            role="radio" // Each star acts like a radio button in the group for accessibility
            // aria-checked reflects the actual current selected rating, not the hover state
            aria-checked={
              roundedActiveRating >= fullStarValue - 0.5 &&
              roundedActiveRating < fullStarValue + 0.5
            }
            tabIndex={readOnly ? -1 : 0} // Make stars focusable only if not readOnly
            aria-label={ariaLabelText} // Specific label for each star
          >
            <StarIcon
              className={`${starSizeClass} ${starColorClass} transition-colors duration-200 ease-in-out`}
              // role="img" is typically implied for SVG elements, but can be added if needed
            />
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;

/*
// Example Usage in a Next.js Page or Component:
// app/page.tsx or app/some-component/page.tsx

'use client'; // If this component is interactive, it needs to be a client component

import React, { useState } from 'react';
import StarRating from '@/components/ui/rating'; // Adjust path based on your file structure

export default function Home() {
  const [userRating, setUserRating] = useState(3.5); // Example initial rating with half-star

  const handleRatingChange = (newRating: number) => {
    console.log('User rated:', newRating);
    setUserRating(newRating);
    // You can send this rating to your backend here
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Rate Our Product!</h1>

      <div className="bg-white p-8 rounded-lg shadow-xl border border-gray-200">
        <p className="text-lg text-gray-700 mb-4">Your current rating: <span className="font-semibold text-blue-600">{userRating}</span> stars</p>
        
        // Interactive Rating Component
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">Interactive Rating:</h2>
          <StarRating
            initialRating={userRating}
            maxRating={5}
            onRatingChange={handleRatingChange}
            starSizeClass="w-7 h-7"
          />
        </div>

        // Read-Only Rating Component (e.g., showing an average rating from data)
        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-700">Read-Only Display (e.g., Average Rating):</h2>
          <StarRating
            initialRating={4.7} // Can be a float for display, demonstrates half-star display
            maxRating={5}
            readOnly={true}
            starSizeClass="w-6 h-6"
          />
           <p className="text-lg text-gray-700 mt-2">Example: 2.25 stars (rounds to 2.5):</p>
           <StarRating
            initialRating={2.25}
            maxRating={5}
            readOnly={true}
            starSizeClass="w-6 h-6"
          />
          <p className="text-lg text-gray-700 mt-2">Example: 2.75 stars (rounds to 3.0):</p>
           <StarRating
            initialRating={2.75}
            maxRating={5}
            readOnly={true}
            starSizeClass="w-6 h-6"
          />
        </div>
      </div>
    </div>
  );
}
*/
