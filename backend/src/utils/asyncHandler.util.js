/**
 * A utility function that wraps asynchronous Express route handlers.
 * It catches any errors that occur in the async function and passes them
 * to Express's next error-handling middleware.
 * This avoids the need to write try-catch blocks in every controller.
 *
 * @param {Function} requestHandler - The asynchronous controller function to wrap.
 * @returns {Function} An Express middleware function.
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    // The Promise.resolve() ensures that even if a non-promise is returned,
    // it gets wrapped in a promise so .catch() can be used.
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
