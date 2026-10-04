/**
 * Hover lift and press scale for a clickable card. Movement runs only when the user allows motion.
 * Add it to the className of a Card or of a link styled as a card. Tailwind v4 moves with the
 * translate and scale properties, so the transition names them (not transform).
 */
export const cardHoverClassName =
  "hover:shadow-md motion-safe:transition-[box-shadow,translate,scale] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.985]";
