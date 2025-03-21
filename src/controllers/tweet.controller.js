import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {userid,content}=req.body

    if(!userid || !content){
        throw new ApiError(400,"UserId and the content is required")
    }

    if(!isValidObjectId(userid)){
        throw new ApiError(400,"InValid userId")
    }

    const user=await User.findById(userid)
    if(!user){
        throw new ApiError(400,"User with this Id does not exist")
    }

    const tweet=await Tweet.create({
        content:content,
        owner:userid
    })

    return res.status(201). json(
        new ApiResponse(201,tweet,'Tweet created successfully')
    )

})

const getUserTweets = asyncHandler(async (req, res) => { 
    const { userId } = req.params;
    const { page = 1, limit = 5 } = req.query; // Default limit to 5 if not provided

    const trimmedUserId = userId.trim();

    if (!trimmedUserId) {
        throw new ApiError(400, "User Id is required");
    }

    if (!isValidObjectId(trimmedUserId)) {
        throw new ApiError(400, "Invalid userId");
    }

    // Fetch user tweets with pagination using aggregation
    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(trimmedUserId), // Ensure userId is ObjectId type
            }
        },
        {
            $lookup: {
                from: "users", // Collection to join
                localField: "owner", // Field from the tweets collection
                foreignField: "_id", // Field from the users collection
                as: "userDetails" // Alias to store user data
            }
        },
        {
            $unwind: "$userDetails" // Flatten the user details array
        },
        {
            $project: {
                _id: 1,
                content: 1, // Include tweet content
                createdAt: 1,
                "userDetails.username": 1, // Include username from userDetails
                "userDetails.avatar": 1, // Include coverImage from userDetails
            }
        },
        {
            $skip: (page - 1) * limit // Skip previous pages
        },
        {
            $limit: parseInt(limit) // Limit the number of tweets per page
        }
    ]);

  
    if (!userTweets.length) {
        throw new ApiError(404, "No tweets found for this user");
    }

    
    return res.status(200).json(new ApiResponse(200, userTweets, "User tweets fetched successfully"));
});


const updateTweet = asyncHandler(async (req, res) => {
   
   
    const {tweetId}=req.params;
   
    const {content}=req.body;
    if(!tweetId){
        throw new ApiError(400,"TweetId is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"InValid TweetId")
    }
    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const updatedtweet=await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
               content:content
            }
        },
        {
            new:true,
        }
    )

    if (!updatedtweet) {
        throw new ApiError(404, "Tweet not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedtweet, "Tweet details updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params; 
   
    if (!tweetId) {
        throw new ApiError(400, "TweetId is required");
    }

   
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid TweetId");
    }
 
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

   
    console.log(deletedTweet);

  
    if (!deletedTweet) {
        throw new ApiError(404, "Tweet not found");
    }

    
    return res.status(200).json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}