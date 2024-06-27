import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect } from "vitest";
import App from "./App";
it("starts paused, steps, and resets the same experiment", async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(
    screen.getByRole("button", { name: "Run animation" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Function")).toHaveValue("bowl");
  await user.click(screen.getByRole("button", { name: "Step", exact: true }));
  expect(screen.getByText(/Paused · Step 1/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reset", exact: true }));
  expect(screen.getByText(/Paused · Step 0/)).toBeInTheDocument();
});
it("retains a comparison with its original parameters", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /Add(?:ed)? to comparison/ }));
  await user.selectOptions(screen.getByLabelText("Optimizer"), "adam");
  expect(screen.getByRole("table")).toHaveTextContent(
    "Gradient descent · α 0.08",
  );
  expect(screen.getByRole("table")).toHaveTextContent("Adam · α 0.08");
  await user.click(screen.getByRole("button", { name: /Add(?:ed)? to comparison/ }));
  expect(
    screen.getByRole("button", { name: /Add(?:ed)? to comparison/ }),
  ).toBeDisabled();
});
it("clears comparisons when the common starting point changes", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /Add(?:ed)? to comparison/ }));
  fireEvent.change(screen.getByLabelText("x", { exact: true }), {
    target: { value: "1" },
  });
  expect(screen.getByText("0 of 2 saved · current run also shown")).toBeInTheDocument();
});
it("has nonvisual metrics and an explicit transformed display scale", () => {
  render(<App />);
  expect(
    screen.getByRole("img", { name: "Loss landscape visualization" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByText(/Height and colour: loss/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "3D View" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
it("saving preserves the playhead, rejects duplicates, and removes individual runs", async () => {
  const user = userEvent.setup(); render(<App />);
  await user.click(screen.getByRole("button", { name: "Step", exact: true }));
  await user.click(screen.getByRole("button", { name: "Add to comparison", exact: true }));
  expect(screen.getByText(/Paused · Step 1/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Added to comparison" })).toBeDisabled();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Optimizer"), "adam");
  expect(screen.getByRole("table")).toHaveTextContent("Gradient descent · α 0.08");
  await user.click(screen.getByRole("button", { name: "Remove Gradient descent · α 0.08" }));
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
it("undo restores the saved experiment and iteration after a different objective", async () => {
  const user = userEvent.setup(); render(<App />);
  await user.click(screen.getByRole("button", { name: "Step", exact: true }));
  await user.click(screen.getByRole("button", { name: "Add to comparison", exact: true }));
  await user.selectOptions(screen.getByLabelText("Function"), "saddle");
  expect(screen.queryByRole("button", { name: /Remove Gradient/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo", exact: true }));
  expect(screen.getByLabelText("Function")).toHaveValue("bowl");
  expect(screen.getByText(/Paused · Step 1/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Remove Gradient/ })).toBeInTheDocument();
});
it("commits an exact learning rate and announces the rate rather than its logarithm", async () => {
  const user = userEvent.setup(); render(<App />);
  let field = screen.getByRole("spinbutton", { name: "Learning rate α" });
  await user.clear(field); await user.type(field, "0.0123"); await user.tab();
  expect(screen.getByRole("slider", { name: "Learning rate slider" })).toHaveAttribute("aria-valuetext", "0.0123");
  field = screen.getByRole("spinbutton", { name: "Learning rate α" });
  await user.clear(field); await user.type(field, "4"); await user.tab();
  expect(screen.getByRole("alert")).toHaveTextContent("between 0.00001 and 1");
  expect(screen.getByRole("slider", { name: "Learning rate slider" })).toHaveAttribute("aria-valuetext", "0.0123");
});
