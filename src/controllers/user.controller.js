import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while geerating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validate if the values are not empty
  // check if the user already exists
  // check if avatar and cover image are present
  // upload avatar and cover image to cloudinary
  // create user in DB
  // remove password and refresh token from response
  // check for user creation success
  // send response
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

const loginUser = asyncHandler(async (req, res) => {
  // req body —> data
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookie
  const { email, username, password } = req.body;

  if (!(username || email))
    throw new ApiError(400, "Username or email is required");

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(401, "User does not exist");

  const isPasswordMatch = await user.isPasswordMatch(password);

  if (!isPasswordMatch) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User has successfully logged in"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findOneAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User has successfully logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(400, "Unauthorized Request");

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) throw new ApiError(401, "Invalid Refresh Token");

    if (user?.refreshToken !== incomingRefreshToken)
      throw new ApiError(401, "Refresh token is expired or used");

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "new Access token generated successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token", error);
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = user.isPasswordMatch(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "Old password is incorrect");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) throw new ApiError(400, "Username is required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { username },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Username updated successfully"));
});

const updateFullname = asyncHandler(async (req, res) => {
  const { fullname } = req.body;

  if (!fullname) throw new ApiError(400, "Fullname is required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullname },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Fullname updated successfully"));
});

const updateEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { email },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Email updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  const avatarUpload = await uploadOnCloudinary(avatarLocalPath);

  if (!avatarUpload.url)
    throw new ApiError(500, "Avatar upload failed on cloudinary");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { avatar: avatarUpload.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar uploaded successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover image file is required");

  const coverImageUpload = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImageUpload.url)
    throw new ApiError(500, "Cover image upload failed on cloudinary");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { coverImage: coverImageUpload.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cover image uploaded successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUsername,
  updateFullname,
  updateEmail,
  updateUserAvatar,
  updateUserCoverImage,
};
