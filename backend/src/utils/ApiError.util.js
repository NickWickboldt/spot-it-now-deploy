/**
 * A custom Error class for handling API errors in a structured way.
 * This allows us to send consistent, detailed error responses to the client.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - The HTTP status code for the error.
   * @param {string} message - A descriptive error message.
   * @param {Array} errors - An optional array of more specific error details.
   * @param {string} stack - An optional error stack trace.
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null; // This field is included for consistency with ApiResponse.
    this.message = message;
    this.success = false; // Indicates that the request was not successful.
    this.errors = errors;

    // Capture the stack trace if provided, otherwise generate a new one.
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };