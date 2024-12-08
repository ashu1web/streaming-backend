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
    //TODO: get all liked videos
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}