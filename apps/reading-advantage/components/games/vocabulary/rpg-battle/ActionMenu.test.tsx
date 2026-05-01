import { render, screen, fireEvent } from "@testing-library/react";
import { ActionMenu } from "./ActionMenu";

const actions = [
  { id: "fireball", label: "Fireball", power: "power" as const },
  { id: "slash", label: "Sword Slash", power: "basic" as const },
];

describe("ActionMenu", () => {
  it("renders available actions", () => {
    render(
      <ActionMenu
        actions={actions}
        value=""
        onChange={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText("Fireball")).toBeInTheDocument();
    expect(screen.getByText("Sword Slash")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = jest.fn();

    render(
      <ActionMenu
        actions={actions}
        value=""
        onChange={onChange}
        onSubmit={jest.fn()}
      />
    );

    const input = screen.getByLabelText("Action input");
    fireEvent.change(input, { target: { value: "Fuego" } });
    expect(onChange).toHaveBeenCalledWith("Fuego");
  });

  it("submits trimmed input on button click", () => {
    const onSubmit = jest.fn();

    render(
      <ActionMenu
        actions={actions}
        value="  Fuego  "
        onChange={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cast/i }));
    expect(onSubmit).toHaveBeenCalledWith("Fuego");
  });

  it("focuses the input when it becomes enabled", () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <ActionMenu
        actions={actions}
        value=""
        onChange={onChange}
        onSubmit={jest.fn()}
        disabled
      />
    );

    const input = screen.getByLabelText("Action input") as HTMLInputElement;
    expect(input).not.toHaveFocus();

    rerender(
      <ActionMenu
        actions={actions}
        value=""
        onChange={onChange}
        onSubmit={jest.fn()}
        disabled={false}
      />
    );

    expect(input).toHaveFocus();
  });
});
