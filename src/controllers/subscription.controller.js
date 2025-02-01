import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channel } = req.params; // The channel ID to subscribe or unsubscribe to

  if (!channel.trim()) throw new ApiError(400, "Channel ID is required");

  const pastState = await User.findOne({
    $and: [{ subscriber: req.user._id }, { channel }],
  });

  if (!pastState) {
    const subscription = await Subscription.create({
      subscriber: req.user._id,
      channel,
    });

    const createdSubscription = await Subscription.findById(subscription._id);

    if (!createdSubscription)
      throw new ApiError(
        409,
        "Something went wrong when subscribing to the channel"
      );

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          createdSubscription,
          "Channel subscribed successfully"
        )
      );
  }

  const deleteRes = await Subscription.findByIdAndDelete(pastState._id);
  if (!deleteRes)
    throw new ApiError(
      409,
      "Something went wrong when unsubscribing from the channel"
    );

  return res
    .status(200)
    .json(new ApiResponse(200, deleteRes, "Channel unsubscribed successfully"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId?.trim()) throw new ApiError(400, "Channel ID is required");

  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: channelId.toLowerCase() },
    },
    {
      $addFields: {
        subscriber: "$subscriber",
      },
    },
    {
      $project: {
        subscriber: 1,
      },
    },
  ]);

  if (!subscribers?.length) throw new ApiError(404, "Channel does not exist");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "User Subscribers List fetched successfully"
      )
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId?.trim())
    throw new ApiError(400, "Subscriber ID is required");

  const channels = await Subscription.aggregate([
    {
      $match: { subscriber: subscriberId.toLowerCase() },
    },
    {
      $addFields: {
        channel: "$channel",
      },
    },
    {
      $project: {
        channel: 1,
      },
    },
  ]);

  if (!channels?.length)
    throw new ApiError(404, "No channels found for the subscriber");

  return res
    .status(200)
    .json(
      new ApiResponse(200, channels, "User channel List fetched successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
