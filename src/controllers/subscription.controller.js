import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"



const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel Id");
    }

    if (channelId.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Cannot subscribe your own channel");
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId,
    });


    if (isSubscribed) {
        const unsubscribe = await Subscription.findByIdAndDelete(isSubscribed)

        if (!unsubscribe) {
            throw new ApiError(500, "Error while Unsubscrbing")
        }
    } else {
        const subscribe = await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId,
        });

        if (!subscribe) {
            throw new ApiError(500, "Error while subscribing")
        }
    }

    return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Subscription toggled successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
   
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
                path: "$subscriberDetails",   //$unwind is used to deconstruct an array field, creating separate documents for each element in the array.
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



export {
    toggleSubscription,
    getUserChannelSubscribers,
}



/*
subscribers output---->
{
    "statusCode": 200,
    "data": {
        "subscribers": [
            {
                "_id": "65f0987654321abcdef67890",
                "username": "john_doe",
                "avatar": "https://example.com/avatar1.jpg",
                "fullName": "John Doe"
            },
            {
                "_id": "65f087654321abcdef67891",
                "username": "jane_doe",
                "avatar": "https://example.com/avatar2.jpg",
                "fullName": "Jane Doe"
            }
        ],
        "subscriberCount": 2
    },
    "message": "Subscribers retrieved successfully"
}


*/