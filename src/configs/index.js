import dotenv from 'dotenv'

const envFound = dotenv.config()

if (envFound.error) {
  throw new Error('Could not find .env file')
}

const hostConfig = {
  apiPrefix: process.env.API_PREFIX,
  apiPort: parseInt(process.env.HTTP_PORT, 10),
  proxyPort: parseInt(process.env.NGINX_PORT, 10),
  publicIp: process.env.PUBLIC_IP,
}

const databaseConfig = {
  databaseHost: process.env.MONGODB_HOST,
  databaseUsername: process.env.MONGODB_USERNAME,
  databasePassword: process.env.MONGODB_PASSWORD,
  databaseName: process.env.DATABASE_NAME,
}

// const snapshotConfig = {
//   snapshotPrefix: process.env.SNAPSHOT_FILE_PREFIX,
//   tempFolder: process.env.TEMP_FOLDER,
//   snapshotTempPrefix: process.env.SNAPSHOT_TEMP_FILE_PREFIX,
//   thumnailPrefix: process.env.THUMNAIL_NAME_PREFIX,
//   imageFormat: process.env.IMAGE_NAME_FORMAT,
// }

// const storageConfig = {
//   publicFolder: process.env.PUBLIC_FOLDER,
//   staticFolder: process.env.STATIC_FOLDER,
//   objectsFolder: process.env.OBJECTS_FOLDER,
//   videosFolder: process.env.VIDEOS_FOLDER,
// }

// const streamConfig = {
//   streamPrefix: process.env.STREAM_FILE_PREFIX,
//   playlistName: process.env.PLAYLIST_NAME,
//   mainStreamPostfix: process.env.MAIN_STREAM_POSTFIX,
//   subStreamPostfix: process.env.SUB_STREAM_POSTFIX,
// }

const grpcConfig = {
  protoFolder: process.env.PROTO_FOLDER,
  protoFile: process.env.PROTO_FILE,
  grpcAddress: process.env.GRPC_ADDRESS,
  grpcServiceName: process.env.GRPC_SERVICE_NAME,
}

export const config = {
  env: process.env.NODE_ENV,
  ...hostConfig,
  ...databaseConfig,
  //   ...storageConfig,
  //   ...snapshotConfig,
  //   ...streamConfig,
  ...grpcConfig,
}
