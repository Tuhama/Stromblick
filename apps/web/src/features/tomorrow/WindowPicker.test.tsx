import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import { WindowPicker } from "./WindowPicker";

describe("WindowPicker", () => {
  it("offers 1 to 4 hours as one group, with the chosen length checked", () => {
    render(<WindowPicker value={2} available={[1, 2, 3, 4]} onChange={() => undefined} />);

    const group = screen.getByRole("group", { name: "Window length" });
    expect(group).toBeInTheDocument();
    expect(
      screen.getAllByRole("radio").map((radio) => radio.getAttribute("id") && radio),
    ).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "1 hour" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "2 hours" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "4 hours" })).not.toBeChecked();
  });

  it("reports the length that was picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WindowPicker value={2} available={[1, 2, 3, 4]} onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "3 hours" }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("can't pick a length that has no window", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WindowPicker value={1} available={[1, 2]} onChange={onChange} />);

    expect(screen.getByRole("radio", { name: "4 hours" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "4 hours" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves between the lengths with the arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WindowPicker value={2} available={[1, 2, 3, 4]} onChange={onChange} />);

    screen.getByRole("radio", { name: "2 hours" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("is written in German in German", async () => {
    await i18n.changeLanguage("de");
    render(<WindowPicker value={1} available={[1, 2, 3, 4]} onChange={() => undefined} />);

    expect(screen.getByRole("group", { name: "Länge des Zeitfensters" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "1 Stunde" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "3 Stunden" })).toBeInTheDocument();
  });
});
