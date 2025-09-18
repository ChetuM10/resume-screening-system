module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '6.0.0',
      skipMD5: true,
    },
    instance: {
      dbName: 'resume_screening_test',
    },
    autoStart: false,
  },
  mongoURLEnvName: 'MONGO_URI'
};
