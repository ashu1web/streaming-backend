import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: toggle subscription
    if (!channelId || !isValidObjectId(channelId)) throw new ApiError(400, "Invalid Channel Link");

  
    const fetchedChannel = await User.findById(channelId);
    if (!fetchedChannel) throw new ApiError(404, "Channel not found");
  
    const isSubscribedToChannel = await Subscription.findOne(
      {
        subscriber: req.user._id,
        channel: channelId,
      }
    );
    if (isSubscribedToChannel) {
      await Subscription.findByIdAndDelete(isSubscribedToChannel._id);
    } else {
      const subscribeToChannel = await Subscription.create({
        subscriber: req.user._id,
        channel: new mongoose.Types.ObjectId(channelId),
      });
      if (!subscribeToChannel)
        throw new ApiError(500, "Failed to subscribe to channel");
    }
  
    return res.status(200).json(
      new ApiResponse(
        200,
        { 
          "Subscribed/Unsubscribed to/from channel: ": fetchedChannel.username
        },
        "Successfully subscribed/unsubscribed to channel"
      )
    );

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // console.log("Inside getUserChannelSubscribers Controller");

    // console.log(req.params)

    const { channelId } = req.params;
   


    //debug
    // console.log(req.params)
    // console.log("Channel Id:", channelId)
    console.log(channelId)
    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel Id");
    }

    const channelExists = await Subscription.findOne({ channel: channelId });
    if (!channelExists) {
        throw new ApiError(404, "channel not found")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
            }
        },
        {
            $unwind: {
                path: "$subscriberDetails",
                preserveNullAndEmptyArrays: true,
            }
        },
        {
            $group: {
                _id: null,
                subscribers: { $push: "$subscriberDetails" },
                totalSubscribers: { $sum: 1 },
            }
        },
        {
            $project: {
                _id: 0,
                subscribers: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                    fullName: 1,
                },
                subscriberCount: "$totalSubscribers",
            }
        }
    ]);

    if (!subscribers || subscribers.length === 0) {
        throw new ApiError(400, "Subscribers not found")
    }

    return res.status(200)
        .json(new ApiResponse(200,
            subscribers[0],
            "Subscribers retrieved successfully"));
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    //debug
    // console.log(req.params)
    // console.log(subscriberId)

    if (!subscriberId || !isValidObjectId(subscriberId)) {
        throw new ApiError(400, "No valid subscriber Id found")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "channel",
                foreignField: "channel",
                as: "channelSubscribers"
            }
        },
        {
            $addFields: {
                "channelDetails.isSubscribed": {
                    $cond: {
                        if: {
                            $in: [
                                new mongoose.Types.ObjectId(req.user?._id),
                                "$channelSubscribers.subscriber",
                            ]
                        },
                        then: true,
                        else: false
                    }
                },
                "channelDetails.subscribersCount": {
                    $size: "$channelSubscribers",
                },
            }
        },
        {
            $group: {
                _id: null,
                channels: { $push: "$channelDetails" },
                totalChannels: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                channels: {
                    _id: 1,
                    isSubscribed: 1,
                    subscriberCount: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                },
                channelsCount: "$totalChannels"
            }
        }
    ]);

    if (!subscribedChannels || subscribedChannels === 0) {
        throw new ApiError(404, "Channels are not found")
    }

    return res.status(200)
        .json(new ApiResponse(200,
            subscribedChannels[0],
            "Subscribed channel retrived successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}

/*
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!channelId) {
        throw new ApiError(400, "ChannelId required");
    }

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "ChannelId is Invalid");
    }

    const channelinfo = await Subscription.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(channelId), // Match against the given channelId
            },
        },
        {
            $lookup: {
                from: "users", 
                localField: "subscriber", 
                foreignField: "_id", 
                as: "channelsubscribers", // Alias for the list of subscribers
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions", // Lookup to find who each subscriber has subscribed to
                            localField: "_id", // Match the current subscriber's _id field
                            foreignField: "subscriber", // Find documents in subscriptions where this user is a subscriber
                            as: "subscribersOfsubscriber", // Alias for the nested subscribers
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            fullName: 1, 
                            avatar: 1,
                            subscribersCount: { $size: "$subscribersOfsubscriber" }, // Count how many people have subscribed to this user
                        },
                    },
                ],
            },
        },
    ]);

    if (!channelinfo) {
        throw new ApiError(400, "Channel does not exist");
    }

    return res.status(200).json(
        new ApiResponse(200, channelinfo, "Channel subscriber info")
    );
});

*/