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
  await user.click(screen.getByRole("button", { name: /Retain run/ }));
  await user.selectOptions(screen.getByLabelText("Optimizer"), "adam");
  expect(screen.getByText("gd / 0.08")).toBeInTheDocument();
  expect(screen.getByText("adam / 0.08")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Retain run/ }));
  expect(screen.getByRole("button", { name: /Retain run/ })).toBeDisabled();
});
it("clears comparisons when the common starting point changes", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /Retain run/ }));
  fireEvent.change(screen.getByLabelText("x", { exact: true }), {
    target: { value: "1" },
  });
  expect(screen.getByRole("button", { name: /Retain run/ })).toHaveTextContent(
    "(0/2)",
  );
});
it("has nonvisual metrics and an explicit transformed display scale", () => {
  render(<App />);
  expect(
    screen.getByRole("img", { name: "Loss landscape visualization" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("table")).toHaveAccessibleName(
    "Run comparison at the selected iteration",
  );
  expect(screen.getByText(/Colour uses normalized/)).toBeInTheDocument();
});
