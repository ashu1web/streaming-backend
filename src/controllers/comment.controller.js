import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

//this function is a get comments by videos
const getVideoComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {
        page = 1,
        limit = 10
    } = req.query;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "No valid video Id found")
    }

    const getComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit)
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $project: {
                _id: 1,
                username: 1,
                avatar: 1,
                content: 1,
                createdAt: 1,
                owner: 1,
            }
        }
    ])

    if (!getComments) {
        throw new ApiError(501, "Error while retrieving comments")
    }

    return res.status(200)
        .json(new ApiResponse(200,
            getComments,
            "Comments are retrieved successfully"
        ))
})


//this function is adding the comment on the videos
const addComments = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { videoId } = req.params

    if (!content.trim()) {
        throw new ApiError(400, "Comment can not be empty")
    }

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        throw new ApiError(500, "Error while adding comment on a video")
    }

    return res.status(200)
        .json(new ApiResponse(200,
            comment,
            "Comment added successfully"));
});


//updated comment on videos
const updateComments = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { commentId } = req.params;

    // //debug
    // console.log(content)
    // console.log(commentId)
    
    if (!content || !content.trim()) {
        throw new ApiError(400, "Comment not be empty")
    }

    //debugging
    // console.log("check content:", content)

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id")
    }

    const comment = await Comment.findById(commentId);

    //debug
    // console.log("Fetched comment:", comment)

    if (!comment) {
        throw new ApiError(500, "Comment not found")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401,
            "You do not have permission to update this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, {
        $set: { content },
    },
        {
            new: true
        }
    );

    if (!updatedComment) {
        throw new ApiError(400, "Error while updating comments")
    }

    return res.status(200)
    .json(new ApiResponse(200,
        updatedComment,
        "Comment update successfully"));
});


//delete comment on videos
const deleteComments = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id")
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(500, "Comment not found")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401,
            "You do not have permission to delete this comment");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(400, "Error while updating comments")
    }

    return res.status(200)
        .json(new ApiResponse(200,
            deletedComment,
            "Comment deleted successfully"));
});


export {
    addComments,
    deleteComments,
    getVideoComment,
    updateComments
}