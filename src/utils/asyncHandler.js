const asyncHandler = (reqHandler) => {
  (req, res, next) => {
    Promise.resolve(reqHandler(req, res, next)).catch((err) => next(err));
  };
};

// asyncHandler is a wrapper function which accepts fn function as argument then req, res and next as arguments are passed to the fn function to use it when fn function is called. If there is an error in the fn function, it will be caught and the error message will be sent as a response to the client with the status code of the error. This way, we don't have to write try-catch blocks in every route handler function.

/*
const asyncHandler = (fn = async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
});
*/
