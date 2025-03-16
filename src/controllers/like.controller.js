import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

//this function is toggle a like of a  video
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;


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

    const isLiked = await Like.findOne({       //The findOne() method in Mongoose (MongoDB) is used to find a single document
        video: videoId,
        likedBy: userId,
    });


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


//this function is toggle a like of a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?._id;


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


        if (!liked) {
            throw new ApiError(500, "Error while liking comment");
        }
    }

    return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Comment liked update successfully"));
});


//this function is toggle a like of a tweet 
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


//this is function is get likes of a  videos
const getLikedVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,                 //Pagination divide the data into small data
        limit = 10,
    } = req.query;

    const likedVideo = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),       //req.user._id saved during middleware
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'video',
                pipeline: [
                    {
                        $match: { isPublished: true },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner" //the owner array changed to object
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                video: {
                    $first: "$video"
                }
            }
        },
        {
            $match: {
                video: { $exists: true },     // Only videos are return which exists
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: (page - 1) * limit,      //Page 1: (1 - 1) * 10 = 0 → Skip 0 results (start from the first document).
                                            //Page 2: (2 - 1) * 10 = 10 → Skip 10 results (start from the 11th document).
        },                            
        {
            $limit: parseInt(limit),
        }
    ]);

    if (!likedVideo) {
        throw new ApiError(500, "Error while retrieved liked videos")
    }

    return res.status(200)
        .json(new ApiResponse(200,
            likedVideo,
            "Liked video retrieved successfully"));
});


export {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike, 
    toggleVideoLike
};



/*
    Output
    BEFORE-----> flatening owner and video 
    [
  {
    "_id": "like1",
    "likedBy": "user1",
    "video": [
      {
        "_id": "video1",
        "title": "Node.js Tutorial",
        "owner": "user2",
        "isPublished": true
      }
    ],
    "owner": [
      {
        "fullName": "Alice Doe",
        "username": "alice",
        "avatar": "alice.jpg"
      }
    ],
    "createdAt": "2025-02-28T10:00:00Z"
  },
  {
    "_id": "like2",
    "likedBy": "user1",
    "video": [
      {
        "_id": "video2",
        "title": "MongoDB Guide",
        "owner": "user3",
        "isPublished": true
      }
    ],
    "owner": [
      {
        "fullName": "Bob Smith",
        "username": "bob",
        "avatar": "bob.jpg"
      }
    ],
    "createdAt": "2025-02-28T11:00:00Z"
  }
]


AFTER--->

[
  {
    "_id": "like1",
    "likedBy": "user1",
    "video": {
      "_id": "video1",
      "title": "Node.js Tutorial",
      "owner": {
        "fullName": "Alice Doe",
        "username": "alice",
        "avatar": "alice.jpg"
      },
      "isPublished": true
    },
    "createdAt": "2025-02-28T10:00:00Z"
  },
  {
    "_id": "like2",
    "likedBy": "user1",
    "video": {
      "_id": "video2",
      "title": "MongoDB Guide",
      "owner": {
        "fullName": "Bob Smith",
        "username": "bob",
        "avatar": "bob.jpg"
      },
      "isPublished": true
    },
    "createdAt": "2025-02-28T11:00:00Z"
  }
]


*/