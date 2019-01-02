# faceApi
This is an early version of a custom Face Recognition api so may have a lot to improve.
Can:
Register peoplefaces.
Recognize them in other photo and has multi-face recognition.


# Seed proyect 
    https://github.com/lehoangduc/face-recognition-api
# Requirements
    nodejs  8 or superior
    npm or similar
    python 3
    pip or similar
    docker -> deploy
# Getting started devmode
    Change port 80 for 3000 inside server.js
    on ./api  
    run npm install then 
    node server.js or npm run start
    
    elsewhere console
    
    on ./api 
    pip install -r requirement.txt  then
    python server.py -h 0.0.0.0 -p 8001 -d ./examples/images
# Deploy
    ... under construction
# How to use?
    Recognition http://localhost:PORT/find?url=url_image.jpg 
    Register http://localhost:PORT/register/url="url"&image1=url_image1.jpg&image2=url_image2.jpg&id=person_name
   
