/**
 * A class for creating standardized, successful API responses.
 * This ensures that data sent to the client follows a consistent format.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - The HTTP status code for the response.
   * @param {object} data - The data payload to be sent to the client.
   * @param {string} message - A success message.
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; // Success is true if status code is in the 2xx or 3xx range.
  }
}

export { ApiResponse };
