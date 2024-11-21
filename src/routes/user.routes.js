import {Router} from "express"
import {loginUser, logoutUser, registerUser,refreshAcessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router=Router()

router.route("/register").post(upload.fields([       //middleware upload  and route
    {
        name:"avatar",
        maxCount:1
    },
    {
        name:"coverImage",
        maxCount:1
    }
]),
registerUser)
/*
router.route("/register")
  .post((req, res, next) => {
    console.log("Request Body:", req.body);  // Check if fields are received
    console.log("Request Files:", req.files);  // Check if files are in the request
    console.log("Request Headers:", req.headers);  // Check if the content type is set correctly
    next();
  },
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  (req, res, next) => {
    console.log("After Multer middleware");  // Log after Multer middleware
    next();
  },
  registerUser);  // Controller function
*/


router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAcessToken)
router.route("/change-password").post(verifyJWT,
changeCurrentPassword)
router.route("/current-user").get(verifyJWT,
getCurrentUser)
router.route("/update-account").patch(verifyJWT,
updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),
updateUserAvatar)
router.route("/cover-Image").patch(verifyJWT,upload.single("coverImage"),
updateUserCoverImage)

router.route("/channel/:username").get(verifyJWT,
getUserChannelProfile)

export default router