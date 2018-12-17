import os
import re
import sys
import getopt
import warnings
import scipy.misc
import zerorpc
import face_recognition
import numpy as np
import time
from itertools import compress
class FaceRPC(object):
    def __init__(self, known_names, known_face_encodings):
        self.known_names = known_names
        self.known_face_encodings = known_face_encodings

    def find(self, path):
        print("looking for...")  
        begin = time.time()
        print(begin)
        unknown_image = face_recognition.load_image_file(path)
        unknown_face_encoding = face_recognition.face_encodings(unknown_image)
       ## unknown_face_encoding2 = face_recognition.face_encodings(unknown_image)[1]
        results=[]
        for face in unknown_face_encoding:
            results.append(face_recognition.compare_faces(self.known_face_encodings, face,tolerance=0.45))
        
       ## results2 = face_recognition.compare_faces(self.known_face_encodings, unknown_face_encoding)
        
       
        
        if results.count:
            newresult = np.asarray(results[0])
          
            for result in results:
                newresult =  newresult | np.asarray(result)
    
        if True in newresult:
            persons = list(compress(self.known_names , list(np.ndarray.tolist(newresult))))
            persons_result = list(set(list(map(lambda i:i[:-2],persons))))
            ##return[name for is_match, name in zip(newresult, self.known_names) if is_match]
            print(time.time() - begin)
            return(persons_result)
        else:
            print(time.time() - begin)
            return []
    def training(self):
        argv = ['-h', '0.0.0.0', '-p', '80', '-d', './examples/images']
        host = ''
        port = ''
        dir = ''
     
        self.known_names = []
        self.known_face_encodings = []
        try:
            opts, args = getopt.getopt(argv, 'h:p:d:',["host=","port=","dir="])
        except getopt.GetoptError:
            print('usage: server.py -h <host> -p <port> -d <dir>')
            sys.exit(2)    

        for opt, arg in opts:
           if opt in ("-h", "--host"):
              host = arg
           elif opt in ("-p", "--port"):
              port = arg
           elif opt in ("-d", "--dir"):
              dir = arg  
        print("Training...")
        begin = time.time()
        print(begin)
        for file in image_files_in_folder(dir):
          basename = os.path.splitext(os.path.basename(file))[0]
          img = face_recognition.load_image_file(file)
          encodings = face_recognition.face_encodings(img)
        
          self.known_names.append(basename)
          self.known_face_encodings.append(encodings[0])   
        print(time.time() - begin)  
        return( [{'msg':"Training complete", 'status':True}])

def image_files_in_folder(folder):
    return [os.path.join(folder, f) for f in os.listdir(folder) if re.match(r'.*\.(jpg|jpeg|png)', f, flags=re.I)]


def main(argv):
   print(argv)
   host = ''
   port = ''
   dir = ''

   known_names = []
   known_face_encodings = []

   try:
      opts, args = getopt.getopt(argv, 'h:p:d:',["host=","port=","dir="])
   except getopt.GetoptError:
      print('usage: server.py -h <host> -p <port> -d <dir>')
      sys.exit(2)

   for opt, arg in opts:
      if opt in ("-h", "--host"):
         host = arg
      elif opt in ("-p", "--port"):
         port = arg
      elif opt in ("-d", "--dir"):
         dir = arg

   if (not host or not port or not dir):
       print('usage: server.py -h <host> -p <port> -d <dir>')
       sys.exit(2)

   if (not os.path.isdir(dir)):
       print('Directory is not exists')
       sys.exit(2)

   print('Begin training images in {}'.format(dir))
   begin = time.time()
   print(begin)
   for file in image_files_in_folder(dir):
       basename = os.path.splitext(os.path.basename(file))[0]
       img = face_recognition.load_image_file(file)
       encodings = face_recognition.face_encodings(img)

       known_names.append(basename)
       known_face_encodings.append(encodings[0])
   print(time.time() - begin)  
   print('Server running at tcp://{}:{}'.format(host, port))

   server = zerorpc.Server(FaceRPC(known_names, known_face_encodings))
   server.bind("tcp://" + host + ":" + port)
   server.run()

if __name__ == "__main__":
   main(sys.argv[1:])