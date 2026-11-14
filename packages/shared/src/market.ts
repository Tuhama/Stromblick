/**
 * The market's clock. A delivery day is a calendar day in this zone, so the API groups readings by
 * it and the web app shows days and times in it. Both must agree, which is why it lives here.
 */
export const MARKET_TIME_ZONE = "Europe/Berlin";

/** Key of the day-ahead electricity price series, the one the overview is built around. */
export const DAY_AHEAD_PRICE_KEY = "price-day-ahead";
