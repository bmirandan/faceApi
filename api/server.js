'use strict';

// Root path
global.ROOT_PATH = require('app-root-path');

// Load env
require('dotenv').config();

const Hapi = require('hapi');

// Create a server with a host and port
const server = new Hapi.Server();

server.connection({
  host: '0.0.0.0',
  port: process.env.API_PORT || 80
});

server.register([
  {
    register: require(ROOT_PATH + '/plugins/service-provider'),
    options: {
      services: [
        {
          name: 'logger',
          path: 'services/logger',
          options: {
            log_file: process.env.LOG_FILE,
            log_level: process.env.LOG_LEVEL
          }
        }
      ]
    }
  },
  {
    register: require('./plugins/finder'),
    options: {
      rpc_host: process.env.RPC_HOST,
      rpc_port: process.env.RPC_PORT,
      download_path: process.env.DOWNLOAD_PATH,
      register_path: process.env.REGISTER_PATH
    }
  }
], function (error) {
  if (error) {
    logger.error('Failed to load a plugin:', error);
  } else {
    // Start the server
    server.start((err) => {
      if (err) {
        throw err;
      }

      console.log('Server running at:', server.info.uri);
    });
  }
});

