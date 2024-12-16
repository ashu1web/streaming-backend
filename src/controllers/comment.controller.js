import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query


      // Convert page and limit to integers
      const pageNumber = parseInt(page, 10);
      const pageLimit = parseInt(limit, 10);
  
      // Calculate the skip value for pagination
      const skip = (pageNumber - 1) * pageLimit;
  
      try {
        
          const comments = await Comment.aggregate([
              {
                  $match: {
                      video: mongoose.Types.ObjectId(videoId) 
                  }
              },
              {
                  $lookup: {
                      from: "users", 
                      localField: "owner", 
                      foreignField: "_id", 
                      as: "ownerDetails" 
                  }
              },
              {
                  $unwind: "$ownerDetails" 
              },
              {
                  $project: {
                      _id: 1,
                      content: 1,
                      createdAt: 1,
                      "ownerDetails.username": 1,
                      "ownerDetails.avatar": 1 
                  }
              },
              {
                  $skip: skip 
              },
              {
                  $limit: pageLimit 
              },
              {
                  $sort: { createdAt: -1 } 
              }
          ]);
  
          
          const totalComments = await Comment.countDocuments({ video: videoId });
  
          
          if (!comments.length) {
              throw new ApiError(404, "No comments found for this video");
          }
  
          
          res.status(200).json(
              new ApiResponse(200, {
                  comments,
                  totalComments,
                  totalPages: Math.ceil(totalComments / pageLimit),
                  currentPage: pageNumber,
              }, "Comments retrieved successfully")
          );
      } catch (error) {
         
          if (error instanceof ApiError) {
              return res.status(error.statusCode).json(error);
          }
         
          return res.status(500).json(
              new ApiError(500, "Failed to retrieve comments", [], error.stack)
          );
      }
    
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { content } = req.body
    const { videoId } = req.params

    if (!content.trim()) {
        throw new ApiError(400, "Comment cont not be empty")
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
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
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
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
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
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }