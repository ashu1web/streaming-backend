import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js"
import { Playlist } from "../models/playlist.model.js"

//this function use for create a playlist 
const createPlaylist = asyncHandler( async (req, res) => {
    const { name, description } = req.body;
    
    //check- validation
    if(!name || !description) {
        throw new ApiError(404, "Playlist name and description is missing")
    }

    //now create new playlist
    const createdPlaylist = await Playlist.create({
        name: name,
        description: description,
        video: [],
        owner:new mongoose.Types.ObjectId(req.user._id)
    })

    if (!createdPlaylist) {
        throw new ApiError(400, "Could not create a playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,
        createdPlaylist,
        "Playlist created successfully"
    ))
})


//this file is get user playlist in dashboard
const getUserPlaylist = asyncHandler(async (req, res) => {
    const { userId } = req.params;

   

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(404, "User not found")
    }

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    }
                ]
            }
        }
    ]);

    if (!userPlaylists) {
        throw new ApiError(400, "Cloud not fetch user playlists")
    }

    return res.status(200)
    .json(new ApiResponse(200,
        userPlaylists,
        "User playlists fetched successfully"
    ));
});


//add video to playlist
const addVideoToPlaylist = asyncHandler( async (req, res) => {
    const { playlistId, videoId} = req.params;

   
    if (!playlistId || !videoId) {
        throw new ApiError(404, "Playlist Id and Video Id is missing")
    }

    const fetchedPlaylist = await Playlist.findById(playlistId);
    if (!fetchedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }

    const fetchedVideo = await Video.findById(videoId);
    if (!fetchedVideo) {
        throw new ApiError(404, "Requested videos are not found")
    }

    if (!fetchedPlaylist.videos) {
        fetchedPlaylist.videos = []  || fetchedPlaylist.videos
    }

    if (!fetchedPlaylist.videos.includes(fetchedVideo._id.toString())) {
        const videoAddedToPlaylist = await Playlist.findByIdAndUpdate(playlistId,
            {
                $push: {
                    videos: fetchedVideo._id,
                },
            },
            {
                new: true
            }
        );

        if (!videoAddedToPlaylist) {
            throw new ApiError(500, "Could not add videos in the playlist")
        }

    return res.status(200)
    .json(new ApiResponse(200,
        {"videos added to the playlist: ": fetchedVideo},
        "videos added to the playlist successfully"));
    } else {
        throw new ApiError(400, "Video already exists in the playlist")
    }
    });
    

//delete video from playlist
const removeVideoFromPlaylist = asyncHandler( async (req, res) => {
    const { playlistId, videoId} = req.params;


    //check-validation
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(404, "Invalid playlist link")
    }
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(404, "Invalid video link")
    }

    const fetchedPlaylist = await Playlist.findById(playlistId);
    if (!fetchedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }

   
    if (fetchedPlaylist.videos.length === 0) {
        throw new ApiError(400, "Playlist has no videos to remove was a empty")
    }


    //video is present in playlist or not check
    let isVideoPresent = fetchedPlaylist.videos.some((video) => video.equals(videoId));
   
    if (!isVideoPresent) {
        throw new ApiError(404, "Video dose not exist in the playlist")
    }

    //here is the remove/delete video from the playlist
    const videoRemovedFromPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId)  //to delete this video from videos array
            }
        },
        {
            new: true
        }
    );

    if (!videoRemovedFromPlaylist) {
        throw new ApiError(400, "Could not delete video from the playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,
        {
            "Updated playlist: ": videoRemovedFromPlaylist
        },
        "Video deleted from the playlist successfully"
    ));

});


//detele playlist
const deletePlaylist = asyncHandler( async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletePlaylist) {
        throw new ApiError(400, "Could not delete the playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,
        deletePlaylist,
        "Playlist deleted successfully"));
});


//update the playlist
const updatePlaylist = asyncHandler(async(req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

   
    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }
    if (!name || !description) {
        throw new ApiError(404, "Invalid name and description")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Could not update the playlist")
    }


    return res.status(200)
    .json(new ApiResponse(200,
        updatedPlaylist,
        "Playlist updated successfully"));
});


//get videos from the playlist
const getVideoPlaylist = asyncHandler( async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!playlistId || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
        }

        const playlist = await Playlist.findById(playlistId);
        
        if (!playlist) {
            throw new ApiError(404, "Playlist not found")
        }

    const videoExists = playlist.videos.some((video) => video.equals(videoId));
    if (!videoExists) {
        throw new ApiError(404, "Video is found in playlist")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video details are not found")
    }

    return res.status(200)
    .json(new ApiResponse(200,
        playlistId,
        video,
        "Video found in playlist successfully"));

});


export{
    createPlaylist,
    getUserPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getVideoPlaylist
}