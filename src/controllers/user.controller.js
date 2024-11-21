import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError}  from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse}  from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userID) => {
    try {
        // Remove .lean() to keep Mongoose document methods
        const user = await User.findById(userID);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken; // Save refresh token in DB encoded token
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        console.error("Error in generateAccessAndRefreshToken:", error);  // Log the exact error
        throw new ApiError(500, "Something went wrong while generating Tokens");
    }
};

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    
    const trimmedBody = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [key.trim(), value])
    );
    
    const { fullName, email, username, password } = trimmedBody;
    
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);  files access bcoz of multer

    //console.log("Files received in multer:", req.files);
     if (!req.files || !req.files.avatar || req.files.avatar.length === 0) {
         throw new ApiError(400, "Avatar file is required");
      }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler(async (req, res) => {
     //req body->data
     //username or email
     //find the user
     //password check
     //access and refresh token
     //send cookie

    const trimmedBody = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [key.trim(), value])
    );

    const { email, username, password } = trimmedBody;

    if (!email && !username) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Retrieve the user data without sensitive fields and convert it to a plain object
    const loggedUser = await User.findById(user._id).select("-password -refreshToken").lean();

    const options = {
        httpOnly: true,
        secure: true
    };
  

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        );
});

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)    //storing tokens in cookie
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAcessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.       //token coming from client req 
    refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
   const {oldPassword, newPassword} = req.body
   
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,                    //middleware req.user=user
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel=await User.aggregate([    //we have added two more fields in user document subscribers and subscribedTo
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            } 
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:" subcriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsubcribed:{
                    $size:"$subscribedTo"
                },
                issubcribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                subscribedTo:1,
                email:1,
                coverImage:1,
                avatar:1,
                issubcribed:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel does not exists")
    }

    return res.
    status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel details fetched")
    )
})


const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAcessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserCoverImage,
    updateUserAvatar,
    getUserChannelProfile,
    getWatchHistory
}



/*
Output of channel
[
    {
        fullName: 'John Doe',
        username: 'johndoe',
        subscribersCount: 2,
        subscribedTo: [
            { channel: ObjectId("channel2"), subscriber: ObjectId("user1") },
            { channel: ObjectId("channel3"), subscriber: ObjectId("user1") }
        ],
        email: 'johndoe@example.com',
        coverImage: '/path/to/cover.jpg',
        avatar: '/path/to/avatar.jpg',
        issubcribed: true
    }
]

*/


/*
output for user
[
  {
    "_id": "user123",
    "watchHistory": [
      {
        "_id": "64f5a3c41234567890abcdef",
        "title": "Learning MongoDB",
        "description": "A guide to MongoDB basics",
        "thumbnail": "mongo-thumbnail.jpg",
        "owner": {
          "fullName": "John Doe",
          "username": "johndoe",
          "avatar": "avatar-john.jpg"
        }
      },
      {
        "_id": "64f5a3c51234567890abcdef",
        "title": "React Tutorial",
        "description": "Learn React step by step",
        "thumbnail": "react-thumbnail.jpg",
        "owner": {
          "fullName": "Jane Smith",
          "username": "janesmith",
          "avatar": "avatar-jane.jpg"
        }
      }
    ]
  }
]



output for user[0].watchhistory

{
  "status": 200,
  "data": [
    {
      "_id": "64f5a3c41234567890abcdef",
      "title": "Learning MongoDB",
      "description": "A guide to MongoDB basics",
      "thumbnail": "mongo-thumbnail.jpg",
      "owner": {
        "fullName": "John Doe",
        "username": "johndoe",
        "avatar": "avatar-john.jpg"
      }
    },
    {
      "_id": "64f5a3c51234567890abcdef",
      "title": "React Tutorial",
      "description": "Learn React step by step",
      "thumbnail": "react-thumbnail.jpg",
      "owner": {
        "fullName": "Jane Smith",
        "username": "janesmith",
        "avatar": "avatar-jane.jpg"
      }
    }
  ],
  "message": "Watch history fetched successfully"
}


*/


/*
Solution
In the fix, we used .lean() on User.findById:

.lean(): This method tells Mongoose to return a plain JavaScript object instead of a Mongoose document, removing the extra internal properties that caused circular references. By converting the document to a plain object, Express can safely serialize it to JSON for the response without running into circular references.
So, in essence, the problem was that res.json() couldn't handle the Mongoose document's complex internal structure, and the solution was to convert it to a simple object using .lean().
})                        lean() method
 */