import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    //debug
    // console.log("toggleVideoLike:", videoId);
    // console.log("toggleVideoLike:", userId);

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    if (!userId) {
        throw new ApiError(401, "Unauthorized: User is not logged in")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video is not found")
    }

    const isLiked = await Like.findOne({
        video: videoId,
        likedBy: userId,
    });

    //debug
    // console.log("isLiked:", isLiked);

    if (isLiked) {
        const removedLike = await Like.findByIdAndDelete(isLiked?._id);

        if (!removedLike) {
            throw new ApiError(500, "Error while removing like");
        }

        return res.status(200)
        .json(
            new ApiResponse(200,
                {},
                "Like removed successfully"));

    } else {
        const liked = await Like.create({
            video: videoId,
            likedBy: userId,
            tweet: null,
            comment: null,
        });

        if (!liked) {
            throw new ApiError(500, "Error while liking video");
        }
        
        return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Video like successfully"));
    }
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?._id;

    //debug
    // console.log("commentId:", commentId);
    // console.log("userId:", userId);

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "No valid comment Id found");
    }

    if (!userId) {
        throw new ApiError(401, "Unauthorized: User not logged in")
    }


    const isLiked = await Like.findOne({
        comment: commentId,
        likedBy: userId,
    });

    //debug
    // console.log("isLiked:", isLiked);

    if (isLiked) {
        const removedLike = await Like.findByIdAndDelete(isLiked?._id);

        if (!removedLike) {
            throw new ApiError(500, "Error while removing like");
        }

        return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Comment like removed successfully"));
        
    } else {
        const liked = await Like.create({
            comment: commentId,
            likedBy: userId,
        });

        //debug
        // console.log("liked:", liked);

        if (!liked) {
            throw new ApiError(500, "Error while liking comment");
        }
    }

    return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Comment liked update successfully"));
});


const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { userId } = req.body;

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "No valid comment Id found");
    }

    if (!userId) {
        throw new ApiError(401, "Unauthorized: User not logged in")
    }
    

    const isLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: userId,
    });

    if (isLiked) {
        const removedLike = await Like.findByIdAndDelete(isLiked._id);

        if (!removedLike) {
            throw new ApiError(500, "Error while removing like");
        }

        return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Tweet liked status updated successfully"));

    } else {
        const liked = await Like.create({
            tweet: tweetId,
            likedBy: userId,
        });

        if (!liked) {
            throw new ApiError(500, "Error while liking tweet");
        }
    }

    return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Tweet like status updated"));
});


const getLikedVideos = asyncHandler(async (req, res) => {
   
    try {
      
        const userId = req.user.id;

       
        const likedVideos = await Like.aggregate([
            {
                $match: {
                    likedBy: userId, 
                    video: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: "videos", // Name of the collection (Video model)
                    localField: "video", // Field in `Like` model to match
                    foreignField: "_id", // Field in `Video` model to match
                    as: "videoDetails" // The result will be an array, so we alias it to `videoDetails`
                }
            },
            {
                $unwind: "$videoDetails" // Unwind the array so we can get the actual video object
            },
            {
                $project: {
                    _id: 1,
                    video: "$videoDetails", 
                    likedBy: 1, 
                    createdAt: 1,
                    updatedAt: 1 
                }
            }
        ]);

        // Check if there are liked videos
        if (!likedVideos.length) {
            throw new ApiError(404, "No liked videos found for this user");
        }

        // Format and send the response
        res.status(200).json(
            new ApiResponse(200, likedVideos, "Liked videos retrieved successfully")
        );
    } catch (error) {
        // Handle errors with ApiError or unexpected issues
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(error);
        }

        // Unexpected errors
        return res.status(500).json(
            new ApiError(500, "Failed to retrieve liked videos", [], error.stack)
        );
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}