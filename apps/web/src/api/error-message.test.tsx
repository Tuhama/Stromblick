import { renderHook } from "@testing-library/react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { tooManyRequestsMessage } from "./error-message";

function message(error: unknown) {
  const { result } = renderHook(() => {
    const { t } = useTranslation();
    return tooManyRequestsMessage(t, error);
  });
  return result.current;
}

describe("tooManyRequestsMessage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("names the wait in English", () => {
    expect(message(new ApiError(429, undefined, 30))).toBe(
      "Too many requests. Please try again in 30 seconds.",
    );
    expect(message(new ApiError(429, undefined, 1))).toBe(
      "Too many requests. Please try again in 1 second.",
    );
  });

  it("names the wait in German", async () => {
    await i18n.changeLanguage("de");
    expect(message(new ApiError(429, undefined, 30))).toBe(
      "Zu viele Anfragen. Bitte versuche es in 30 Sekunden erneut.",
    );
    expect(message(new ApiError(429, undefined, 1))).toBe(
      "Zu viele Anfragen. Bitte versuche es in 1 Sekunde erneut.",
    );
  });

  it("still helps when the API sent no wait", async () => {
    expect(message(new ApiError(429))).toBe(
      "Too many requests. Please wait a moment and try again.",
    );
    await i18n.changeLanguage("de");
    expect(message(new ApiError(429))).toBe(
      "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
    );
  });

  it("leaves every other error alone", () => {
    expect(message(new ApiError(500))).toBeUndefined();
    expect(message(new TypeError("Failed to fetch"))).toBeUndefined();
    expect(message(undefined)).toBeUndefined();
  });
});
