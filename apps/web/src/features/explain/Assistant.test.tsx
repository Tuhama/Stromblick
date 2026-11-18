import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import type { AssistantStreamEvent } from "@stromblick/shared";
import { Assistant } from "./Assistant";

const encoder = new TextEncoder();

/** An answer whose events the test sends one by one, like a model that is still writing. */
function liveAnswer() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
    send: (event: AssistantStreamEvent) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    },
    end: () => {
      controller.close();
    },
    /** What a real fetch does to the body when the request is aborted. */
    abort: () => {
      controller.error(new DOMException("The operation was aborted.", "AbortError"));
    },
  };
}

/** Answers with the live answer, and breaks its stream when the request is aborted. */
function stubLiveAnswer(live: ReturnType<typeof liveAnswer>) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((_input, init) => {
      init?.signal?.addEventListener("abort", live.abort);
      return Promise.resolve(live.response);
    }),
  );
}

/** A finished answer. */
function answer(...events: AssistantStreamEvent[]): Response {
  return new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });
}

const problem = (status: number) =>
  Response.json(
    { type: "about:blank", title: "x", status },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

const text = (value: string): AssistantStreamEvent => ({ type: "text", text: value });
const done: AssistantStreamEvent = { type: "done", truncated: false };

function stubAnswers(...responses: (Response | Error)[]) {
  const queue = [...responses];
  const fetchMock = vi.fn<typeof fetch>(() => {
    const next = queue.shift();
    if (next === undefined) return Promise.reject(new Error("No more answers were scripted"));
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The JSON body of the n-th request. */
function sentBody(fetchMock: ReturnType<typeof stubAnswers>, n = 0): unknown {
  const body = fetchMock.mock.calls[n]?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "null");
}

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(screen.getByRole("textbox", { name: "Your question" }), question);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("Assistant", () => {
  it("offers starter questions and the privacy note when the chat is empty", () => {
    render(<Assistant />);
    expect(screen.getByRole("button", { name: /day-ahead price range yesterday/ })).toBeVisible();
    expect(screen.getByText(/sent to Google's Gemini service/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("sends a starter question when it is clicked", async () => {
    const fetchMock = stubAnswers(answer(text("It ranged."), done));
    render(<Assistant />);
    await userEvent.setup().click(screen.getByRole("button", { name: /wind and solar/ }));

    expect(await screen.findByText("It ranged.")).toBeVisible();
    expect(sentBody(fetchMock)).toEqual({
      question: "How much electricity did wind and solar produce yesterday?",
      history: [],
    });
  });

  it("shows the answer as it arrives, with a status while the model looks up data", async () => {
    const live = liveAnswer();
    stubAnswers(live.response);
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "Price today?");

    expect(await screen.findByText("Thinking…")).toBeVisible();
    expect(screen.getByText("Price today?")).toBeVisible();
    expect(screen.getByRole("button", { name: "Stop" })).toBeVisible();

    act(() => {
      live.send({ type: "tool", name: "get_readings" });
    });
    expect(await screen.findByText("Looking up data…")).toBeVisible();

    act(() => {
      live.send(text("The price is "));
    });
    expect(await screen.findByText("The price is")).toBeVisible();
    expect(screen.queryByText("Looking up data…")).not.toBeInTheDocument();

    act(() => {
      live.send(text("80 EUR/MWh."));
      live.send(done);
      live.end();
    });
    expect(await screen.findByText("The price is 80 EUR/MWh.")).toBeVisible();
    expect(await screen.findByRole("button", { name: "Send" })).toBeVisible();
  });

  it("sends Enter as a question, but Shift+Enter makes a new line", async () => {
    const fetchMock = stubAnswers(answer(text("Ok."), done));
    const user = userEvent.setup();
    render(<Assistant />);
    const box = screen.getByRole("textbox", { name: "Your question" });

    await user.type(box, "Line one{Shift>}{Enter}{/Shift}Line two");
    expect(fetchMock).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Ok.")).toBeVisible();
    expect(sentBody(fetchMock)).toMatchObject({ question: "Line one\nLine two" });
    expect(box).toHaveValue("");
  });

  it("sends the earlier questions and answers with the next question", async () => {
    const fetchMock = stubAnswers(answer(text("First."), done), answer(text("Second."), done));
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "One?");
    await screen.findByText("First.");
    await ask(user, "Two?");
    await screen.findByText("Second.");

    expect(sentBody(fetchMock, 1)).toEqual({
      question: "Two?",
      history: [
        { role: "user", text: "One?" },
        { role: "assistant", text: "First." },
      ],
    });
  });

  it("explains a failure after the stream started, and asks again on retry", async () => {
    const fetchMock = stubAnswers(
      answer({ type: "error", code: "rate_limited" }),
      answer(text("Now it works."), done),
    );
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "Price?");

    expect(await screen.findByText(/used up its free quota/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Now it works.")).toBeVisible();
    expect(screen.queryByText(/used up its free quota/)).not.toBeInTheDocument();
    // The failed question was not sent as history, and it is not shown twice.
    expect(sentBody(fetchMock, 1)).toEqual({ question: "Price?", history: [] });
    expect(screen.getAllByText("Price?")).toHaveLength(1);
  });

  it.each([
    [429, /Too many questions/, true],
    [503, /switched off/, false],
    [400, /couldn't be sent/, false],
  ])("explains the error response %i", async (status, message, canRetry) => {
    stubAnswers(problem(status));
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "Price?");

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try again" }) !== null).toBe(canRetry);
  });

  it("says so when there is no connection, or the stream breaks off", async () => {
    stubAnswers(new TypeError("Failed to fetch"), answer(text("Half an answ")));
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "One?");
    expect(await screen.findByText(/connection was interrupted/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    // The text that did arrive stays, with the warning below it.
    expect(await screen.findByText("Half an answ")).toBeVisible();
    expect(screen.getByText(/connection was interrupted/)).toBeVisible();
  });

  it("stops an answer on request and keeps the text so far, without an error", async () => {
    const live = liveAnswer();
    stubLiveAnswer(live);
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "Long answer?");
    act(() => {
      live.send(text("Partial"));
    });
    await screen.findByText("Partial");

    await user.click(screen.getByRole("button", { name: "Stop" }));

    expect(await screen.findByRole("button", { name: "Send" })).toBeVisible();
    expect(screen.getByText("Partial")).toBeVisible();
    expect(screen.queryByText(/went wrong|interrupted/)).not.toBeInTheDocument();
  });

  it("warns when an answer was cut off at the length limit", async () => {
    stubAnswers(answer(text("It was"), { type: "done", truncated: true }));
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "Price?");
    expect(await screen.findByText(/reached its length limit/)).toBeVisible();
  });

  it("starts over with a new conversation", async () => {
    const fetchMock = stubAnswers(answer(text("First."), done), answer(text("Fresh."), done));
    const user = userEvent.setup();
    render(<Assistant />);
    await ask(user, "One?");
    await screen.findByText("First.");

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    expect(screen.queryByText("First.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /day-ahead price range/ }));
    await screen.findByText("Fresh.");
    expect(sentBody(fetchMock, 1)).toMatchObject({ history: [] });
  });

  it("speaks German when the language is German", async () => {
    await i18n.changeLanguage("de");
    stubAnswers(answer({ type: "error", code: "unavailable" }));
    const user = userEvent.setup();
    render(<Assistant />);
    expect(screen.getByText(/Googles Gemini-Dienst/)).toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Deine Frage" }), "Preis?");
    await user.click(screen.getByRole("button", { name: "Senden" }));
    expect(await screen.findByText(/Modelldienst ist gerade nicht erreichbar/)).toBeVisible();
  });
});
