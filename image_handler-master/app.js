'use strict'

const express = require('express')
const multer = require('multer')
const fileType = require('file-type')
const fs = require('fs')
const app = express()
const router = express.Router()
var crypto = require('crypto');
const port 	   = process.env.PORT || 3000;
/*
const upload = multer({
    dest:'images/', 
    limits: {fileSize: 10000000, files: 1},
    fileFilter:  (req, file, callback) => {
    
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {

            return callback(new Error('Only Images are allowed !'), false)
        }

        callback(null, true);
    }
}).single('image')
*/

function getFilename (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      cb(err, err ? undefined : raw.toString('hex'))
    })
  }

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'images/')
    },
    filename: function (req, file, cb) {
        getFilename(req, file, function (err, filename) {
            if (err) return cb(err)
            cb(null,  `${filename}.jpg`)
        })
      
    
      
      //Appending .jpg
    }
  })
  
  const upload = multer({ storage: storage }).any();

router.post('/images/upload', (req, res) => {
    if(req.token!='elTolkien'){
        upload(req, res, function (err) {

            if (err) {
    
                res.status(400).json({message: err.message})
    
            } else {
    
                let path = `/images/${req.files[req.files.length -1].filename}`
                res.status(200).json({message: 'Image Uploaded Successfully !', path: path})
            }
        })
    }
    else{
        res.status(400).json({message:"Error token inválido"})
    }
   
})

router.get('/images/:imagename', (req, res) => {

    let imagename = req.params.imagename
    let imagepath = __dirname + "/images/" + imagename
    let image = fs.readFileSync(imagepath)
    let mime = fileType(image).mime

	res.writeHead(200, {'Content-Type': mime })
	res.end(image, 'binary')
})


app.use('/', router)

app.use((err, req, res, next) => {

    if (err.code == 'ENOENT') {
        
        res.status(404).json({message: 'Image Not Found !'})

    } else {

        res.status(500).json({message:err.message}) 
    } 
})


app.listen(port)
console.log(`App Runs on ${port}`)