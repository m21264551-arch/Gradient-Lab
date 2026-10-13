export default function LearningGuide() {
  return (
    <section
      id="how-to-use"
      className="learning-guide"
      aria-labelledby="guide-title"
      tabIndex={-1}
    >
      <h2 id="guide-title">How to use Gradient Lab</h2>
      <p>
        The surface shows how a loss value changes as two parameters, x and y,
        change. An optimizer chooses their next values using the local slope.
        Lower loss is the goal. The point represents the current parameters.
        Each movement is one optimizer update.
      </p>
      <ol className="guide-steps">
        <li>
          <h3>Run the bowl</h3>
          <p>
            Press Run to watch gradient descent move towards the minimum. Use
            Step to inspect one update, or Reset to return to the same start.
            The loss chart records the progress you see above.
          </p>
        </li>
        <li>
          <h3>Increase the learning rate</h3>
          <p>
            Try Large learning rate. Larger steps can overshoot and leave the
            picture. The coordinates keep moving outside the view; a safety stop
            is different from reaching a minimum.
          </p>
        </li>
        <li>
          <h3>Compare momentum</h3>
          <p>
            Return to Stable descent, then Add to comparison. Select Momentum
            without changing the start or learning rate and press Run. Compare
            the paths and loss curves. Equal learning rates do not mean equally
            tuned optimizers.
          </p>
        </li>
      </ol>
      <p>
        <strong>Reading the surface:</strong> cool colours indicate lower loss;
        warm colours indicate higher loss. A white ring marks the current point
        and green marks a known minimum. Contour gives an overhead view and lets
        you place a starting point.
      </p>
      <p>
        Neural networks use the same update rules after backpropagation computes
        gradients. These two-dimensional functions help explain those rules, but
        cannot represent all the behaviour of a large trained model.
      </p>
      <a href="#tool">Back to tool ↑</a>
    </section>
  );
}
