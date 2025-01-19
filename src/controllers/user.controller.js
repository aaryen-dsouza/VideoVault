import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// get user details from frontend
// validate if the values are not empty
// check if the user already exists
// check if avatar and cover image are present
// upload avatar and cover image to cloudinary
// create user in DB
// remove password and refresh token from response
// check for user creation success
// send response

const registerUser = asyncHandler(async (req, res) => {
  const { username, password, email, fullname } = req.body;

  if (
    [username, password, email, fullname].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser)
    throw new ApiError(409, "User with this email or username already exists");

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalPath = req.files.coverImage[0].path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");

  const avatarLoaded = await uploadOnCloudinary(avatarLocalPath);
  const coverImageLoaded = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarLoaded)
    throw new ApiError(500, "Avatar upload failed on cloudinary");

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    avatar: avatarLoaded.url,
    coverImage: coverImageLoaded?.url || "",
    password,
  });

  // console.log(req.body);
  // console.log(req.files);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) throw new ApiError(500, "User creation failed");

  res
    .status(201)
    .json(
      new ApiResponse(200, createdUser, "Successfully registered the user")
    );
});

export { registerUser };
