import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        // console.log(token);
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})


/*"JWT is used to generate an access token.
The private/secret key is stored securely on the server and is used to sign the access token.
When the server receives the access token, it verifies it using the stored key to ensure its validity.
If the token is valid, the user is granted access to the data. When the access token expires, 
the client uses the refresh token (stored securely on the client side) to request a new access token without requiring the user to log in again."

Cookies are a common and secure way to store both access tokens and refresh tokens, 
provided the proper security flags (HttpOnly, Secure, SameSite) are used.*/