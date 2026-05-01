import { fireEvent, render } from "@testing-library/react";
import { VirtualDPad } from "./VirtualDPad";

describe("VirtualDPad", () => {
  it("renders the DPad container", () => {
    const { container } = render(<VirtualDPad onInput={jest.fn()} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("calls onInput with zero values when released", () => {
    const onInput = jest.fn();
    const { container } = render(<VirtualDPad onInput={onInput} />);

    const dpad = container.firstChild as HTMLElement;
    fireEvent.mouseDown(dpad, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(dpad);

    expect(onInput).toHaveBeenCalledWith({ dx: 0, dy: 0 });
  });

  it("calls onInput with direction when dragged right", () => {
    const onInput = jest.fn();
    const { container } = render(<VirtualDPad onInput={onInput} />);

    const dpad = container.firstChild as HTMLElement;
    const rect = dpad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    fireEvent.mouseDown(dpad, { clientX: centerX, clientY: centerY });
    fireEvent.mouseMove(dpad, { clientX: centerX + 50, clientY: centerY });
    fireEvent.mouseUp(dpad);

    expect(onInput).toHaveBeenLastCalledWith(expect.objectContaining({ dx: expect.any(Number) }));
  });
});