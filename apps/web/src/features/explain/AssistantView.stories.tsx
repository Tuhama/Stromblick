import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AssistantView } from "./AssistantView";

const meta = {
  title: "Explain/Assistant",
  component: AssistantView,
  args: {
    messages: [],
    busy: false,
    lookingUp: false,
    problem: null,
    onAsk: fn(),
    onStop: fn(),
    onRetry: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof AssistantView>;

export default meta;
type Story = StoryObj<typeof meta>;

const QUESTION = {
  id: 1,
  role: "user",
  text: "What was the day-ahead price range yesterday?",
} as const;
const ANSWER = {
  id: 2,
  role: "assistant",
  text: "Yesterday (2026-11-17, German time) the day-ahead price ranged from -4.50 EUR/MWh at 13:00 to 142.30 EUR/MWh at 18:00. The average was 87.10 EUR/MWh.",
} as const;

/** Nothing asked yet: starter questions and the privacy note. */
export const Empty: Story = {};

/** The question is sent and the model has not started writing. */
export const Thinking: Story = {
  args: { busy: true, messages: [QUESTION, { id: 2, role: "assistant", text: "" }] },
};

/** The model is reading data with one of its tools. */
export const LookingUpData: Story = {
  args: {
    busy: true,
    lookingUp: true,
    messages: [QUESTION, { id: 2, role: "assistant", text: "" }],
  },
};

/** The answer is arriving. */
export const Streaming: Story = {
  args: {
    busy: true,
    messages: [
      QUESTION,
      { ...ANSWER, text: "Yesterday (2026-11-17, German time) the day-ahead price ranged from" },
    ],
  },
};

export const Answered: Story = { args: { messages: [QUESTION, ANSWER] } };

export const CutOff: Story = {
  args: { messages: [QUESTION, { ...ANSWER, truncated: true }] },
};

/** One story per failure, so every message can be read in both languages (use the language switch). */
export const QuotaUsedUp: Story = { args: { messages: [QUESTION], problem: "rate_limited" } };
export const ServiceDown: Story = { args: { messages: [QUESTION], problem: "unavailable" } };
export const Blocked: Story = { args: { messages: [QUESTION], problem: "blocked" } };
export const Failed: Story = { args: { messages: [QUESTION], problem: "failed" } };
export const TooManyQuestions: Story = { args: { messages: [QUESTION], problem: "busy" } };
export const SwitchedOff: Story = { args: { messages: [QUESTION], problem: "off" } };
export const ConnectionLost: Story = {
  args: {
    messages: [QUESTION, { ...ANSWER, text: "Yesterday the day-ahead" }],
    problem: "network",
  },
};
