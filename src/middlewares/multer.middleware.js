import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      //console.log("File destination:", "./public/temp");
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      //console.log("Uploaded file:", file.originalname);
      cb(null, file.originalname);
    }
  })
  
export const upload = multer({ 
    storage, 
})



//why multer?
//to get file access req.files and localpath in cb(_)