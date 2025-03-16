import fs from "fs";
import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloud } from "../utils/fileUpload.js";
import { unlinkPath } from "../utils/UnlinkPath.js";

// function unlinkPath(videoLocalPath, thumbnailLocalPath) {
//     if (videoLocalPath)
//         fs.unlinkSync(videoLocalPath);
//     if (thumbnailLocalPath)
//         fs.unlinkSync(thumbnailLocalPath);
// }

//function retrives indiviual videos fron a db
const  getVideoById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id")
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            },
        },
        {
            $match: { isPublished: true }
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
                            avatar: 1,
                            username: 1,
                            fullName: 1,
                        },
                    },
                ]
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                _id: 1,
                owner: 1,
                videoFile: 1,
                thumbnail: 1,
                createdAt: 1,
                description: 1,
                title: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
            }
        }
    ]);

    if (!videos) {
        throw new ApiError(404, "Error While fetching videos")
    }


    return res.status(200)
        .json(new ApiResponse(
            200,
            videos,
            "Videos retrived successfully"));

});

//toggle published status function
const  togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(404, "Invalid video Id")
    }

    const videos = await Video.findById(videoId)

    //debugging
    // console.log(videos)

    if (!videos) {
        throw new ApiError(404, "Video is not found")
    }

    if (videos?.owner.toString() !== req.user?._id.toString()) {
        if (!videos) {
            throw new ApiError(401, "You do not have the permission to perform to this action")
        }
    }

    const updatevideo = await Video.findByIdAndUpdate(videoId, {
        $set: {
            isPublished: !videos?.isPublished
        },
    },
        {
            new: true
        }
    );

    return res.status(200)
        .json(new ApiResponse(200,
            updatevideo,
            "Video published status updated successfully"));
})

//this function is published a video
const  publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body;
        const videoLocalPath = req.files?.videoFile[0]?.path;
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    
       
        
        if (!title || title.trim() === '') {
            unlinkPath(videoLocalPath, thumbnailLocalPath);
            throw new ApiError(400, "Title is required");
        }
    
        if (!videoLocalPath) {
            unlinkPath(videoLocalPath, thumbnailLocalPath);
            throw new ApiError(400, "Video file is required");
        }
    
        if (!thumbnailLocalPath) {
            unlinkPath(videoLocalPath, thumbnailLocalPath);
            throw new ApiError(400, "Thumbnail is required")
        }
    
        const videoFile = await uploadOnCloud(videoLocalPath);
        const thumbnail = await uploadOnCloud(thumbnailLocalPath);
    
    
        if (!videoFile || !thumbnail) {
            throw new ApiError(400, "Video and thumbnail files are missing")
        }
    
        const video = await Video.create({
            videoFile: videoFile?.secure_url,
            thumbnail: thumbnail?.secure_url,
            title,
            duration: videoFile?.duration,
            description: description || "",
            owner: req.user?._id,
            isPublished: true,
        });
    
        if (!video) {
            throw new ApiError(500, "Error while uploading videos")
        }
    
        return res.status(200)
            .json(new ApiResponse(
                200,
                video,
                "Video uploaded successfully"))
    } catch (error) {
        console.log(error)
        return res.status(new ApiError(500, "Internal Server error"))
    }
})

//To delete the video
const  deleteVideo= asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video is not found")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "You do not have permission to delete this video")
    }

    await Video.findByIdAndDelete(videoId);


    return res.status(200)
        .json(new ApiResponse(200,
            {},
            "Video has been deleted successfully"));
})


export {
    getVideoById,
    togglePublishStatus,
    deleteVideo,
    publishAVideo,
};