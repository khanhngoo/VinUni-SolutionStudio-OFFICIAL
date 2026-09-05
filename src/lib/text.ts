/**
 * Two initials for an avatar monogram. Lived in the student fixture only
 * because that is where the first caller happened to be; it is a pure string
 * helper and survives the fixtures.
 */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Full day names for the weekly availability grid's accessible labels. */
export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
