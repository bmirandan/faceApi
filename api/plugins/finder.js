'use strict';

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Promise = require('bluebird');
const zerorpc = require('zerorpc');
const _ = require('lodash');

const validUrl = require('valid-url');
const readChunk = require('read-chunk');
const imageType = require('image-type');
const imageDownloader = require('image-downloader');

class FinderPlugin {
  /**
   * Constructor
   *
   * @param server
   * @param options
   */
  constructor (server, options) {
    this.server = server;
    this.validExtensions = ['jpg', 'png', 'jpeg'];

    this.errors = {
      url_missing: 'Required parameter missing: url',
      url_invalid: 'Url is invalid',
      url_image_invalid: 'Only jpg, jpeg, png files are allowed'
    };

    this.options = options;
  }

  /**
   * Generate random string
   *
   * @returns {string}
   */
  generateRandomString() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Get url extension
   *
   * @param imageUrl
   * @returns {string}
   */
  getUrlExtension(imageUrl) {
    return path.extname(url.parse(imageUrl).pathname).substring(1).toLocaleLowerCase();
  }

  /**
   * Validate request
   *
   * @param request
   * @returns Error|true
   */
  validateRequest(request) {
    let imageUrl = request.query.url;

    imageUrl = imageUrl ? imageUrl.trim() : '';

    // Require url
    if (!imageUrl) {
      return new Error(this.errors.url_missing);
    }

    // Check valid url
    if (!validUrl.isHttpUri(imageUrl) && !validUrl.isHttpsUri(imageUrl)) {
      return new Error(this.errors.url_invalid);
    }

    // Get extension
    let extension = this.getUrlExtension(imageUrl);

    if (this.validExtensions.indexOf(extension) === -1) {
      return new Error(this.errors.url_image_invalid);
    }

    return true;
  }

  /**
   * Validate image
   *
   * @param path
   * @returns Error|true
   */
  validateImage(path) {
    let buffer = readChunk.sync(path, 0, 12);
    let type = imageType(buffer);

    return new Promise((resolve, reject) => {
      if (this.validExtensions.indexOf(type.ext) === -1) {
        return reject(new Error(this.errors.url_image_invalid));
      }

      resolve(type.ext);
    });
  }

  /**
   * Download image from url
   *
   * @param url
   * @param desPath
   * @returns Promise
   */
  downloadImage(url, desPath) {
    return new Promise((resolve, reject) => {
      console.log("Download!")
      imageDownloader({
        url: url,
        dest: desPath,
        done: function (error) {
          if (error) {
            console.log("Algo pasó")
            return reject(error);
          }

          resolve(desPath);
        }
      });
    });
  }

  /**
   * Remove file
   *
   * @param path
   * @returns {*}
   */
  removeFile(path) {
    return new Promise((resolve, reject) => {
      fs.unlink(path, (error) => {
        resolve(path);
      });
    });
  }

  /**
   * Find highest occurrence item in array
   *
   * @param data
   * @returns {*}
   */
  mode(data) {
    return data.sort((a,b) =>
      data.filter(v => v===a).length
      - data.filter(v => v===b).length
    ).pop();
  }

  /**
   * Call RPC
   *
   * @param imagePath
   * @returns {*}
   */
  callRpc(imagePath) {
    return new Promise((resolve, reject) => {
      let serviceProvider = this.server.plugins['ServiceProvider'];
      let logger = serviceProvider.get('logger');
      let client = new zerorpc.Client();

      client.connect('tcp://recognition.boldware.cl:80'); + //this.options.rpc_host + ':' + this.options.rpc_port);

      client.invoke('find', imagePath, (error, result) => {
        console.log("here!")
        console.log(result)
        resolve(result);
        /*
        if (!result || (!result instanceof Array) || !result.length) {
          return resolve('Unknown');
        }

        logger.debug('Result %s', result);

        result = _.flatMap(result, function(item) {
          return [item.substring(0, item.lastIndexOf('-'))];
        });

        let name = this.mode(result);

        client.close();

        resolve(name);*/
      });
    });
  }

  /**
   * Call TRAINER
   *
   * @param imagePath
   * @returns {*}
   */
  callTrainer(imagePath) {
    return new Promise((resolve, reject) => {
      let serviceProvider = this.server.plugins['ServiceProvider'];
      let logger = serviceProvider.get('logger');
      let client = new zerorpc.Client();

      client.connect('tcp://recognition.boldware.cl'); + //this.options.rpc_host + ':' + this.options.rpc_port);
        
      client.invoke('training', (error, result) => {
        console.log("hereTrain!")
        console.log(result)
        resolve(result);
        /*
        if (!result || (!result instanceof Array) || !result.length) {
          return resolve('Unknown');
        }

        logger.debug('Result %s', result);

        result = _.flatMap(result, function(item) {
          return [item.substring(0, item.lastIndexOf('-'))];
        });

        let name = this.mode(result);

        client.close();

        resolve(name);*/
      });
    });
  }

  /**
   * Recognize name from image url
   *
   * @param request
   * @param reply
   */
  recognize(request, reply) {
    let result = this.validateRequest(request);
    let serviceProvider = this.server.plugins['ServiceProvider'];
    let logger = serviceProvider.get('logger');

    if (result instanceof Error) {
      return reply({
        error: {
          status: '422',
          detail: result.message
        }
      }).code(422);
    }

    let imageUrl = request.query.url.trim();
    let extension = this.getUrlExtension(imageUrl);

    let imagePath = './examples/downloads' + '/' + this.generateRandomString() + '.' + extension;

    logger.debug('Received URL %s', imageUrl);

    return this
      .downloadImage(imageUrl, imagePath)
      .then(() => {
        return this.validateImage(imagePath);
      })
      .then(() => {
        logger.debug('Image path %s', imagePath);
        return this.callRpc(imagePath);
      })
      .then((name) => {
        return this
          .removeFile(imagePath)
          .then(() => {
            logger.debug('Removed image %s', imagePath);
            return name;
          });
      })
      .then((name) => {
        return reply({
          data: {
            name: name
          }
        })
      })
      .catch(function (error) {
        logger.debug(error.message);
        logger.error(error.message);

        return reply({
          error: {
            status: '422',
            detail: error.message
          }
        }).code(422);
      });
  }

    /**
   * Recognize name from image url
   *
   * @param request
   * @param reply
   */
  registerNewFace(request, reply){

    let result = this.validateRequest(request);
    let serviceProvider = this.server.plugins['ServiceProvider'];
    let logger = serviceProvider.get('logger');
    console.log("here")

    console.log(request.query.id)
    let imageUrl1 = request.query.image1.trim();
    let imageUrl2 = request.query.image2.trim();

    let extension1 = this.getUrlExtension(imageUrl1);
    let extension2 = this.getUrlExtension(imageUrl2);

    let pathString1 = request.query.id + '-1'
    let pathString2 = request.query.id + '-2'

    let imagePath1 = './examples/images' + '/' + pathString1 + '.' + extension1;
    let imagePath2 = './examples/images'+ '/' + pathString2 + '.' + extension2;

    logger.debug('Received URL %s', imageUrl1);
    logger.debug('Received URL %s', imageUrl2);
    
    let downloads = [
                    this.downloadImage(imageUrl1, imagePath1),
                    this.downloadImage(imageUrl2, imagePath2)]
    return Promise.all(downloads)
    .then(() => {
      let valid = [this.validateImage(imagePath1),this.validateImage(imagePath2)]
      return Promise.all(valid)
    })
    .then(() => {
      //call training

      logger.debug('Image path %s', imagePath1);
      logger.debug('Image path %s', imagePath2);
      return this.callTrainer("Plis")    
    .then( resp => {
      return reply({
        
          msg: "Trained Succesfully",
          status: true
        
      })
    })
  })
    .catch(function (error) {
      logger.debug(error.message);
      logger.error(error.message);

      return reply({
        status:false,
        error: {
          status: '422',
          detail: error.message
        }
      }).code(422);
    });
  }
}

exports.register = function (server, options, next) {
  let finderPlugin = new FinderPlugin(server, options);

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, reply) => {
      console.log("get")
      reply({
        data: {
          name: 'Face recognition API',
          version: '1.0.0'
        }
      });
    }
  });
  
  server.route({
    method: 'GET',
    path: '/find',
    handler: finderPlugin.recognize.bind(finderPlugin)
  });

  server.route({
    method: 'POST',
    path: '/register',
    handler: finderPlugin.registerNewFace.bind(finderPlugin)
  });

  next();
};

exports.register.attributes = {
  name: 'FinderPlugin',
  version: '1.0.0',
  multiple: false
};