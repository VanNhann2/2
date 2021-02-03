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

const grpcConfig = {
  protoFolder: process.env.PROTO_FOLDER,
  protoFile: process.env.PROTO_FILE,
  grpcAddress: process.env.GRPC_ADDRESS,
  grpcServiceName: process.env.GRPC_SERVICE_NAME,
}

const violationConfig = {
  pathVideo: process.env.PATH_VIDEO_VIOLATION,
  pathImage: process.env.IMAGE_FOLDER,
  replacePathImage: process.env.IMAGE_FILE_PREFIX,
  limitPerPage: process.env.LIMIT_PER_PAGE,
  limitStatistical: process.env.LIMIT_STATISTICAL,
  linkImageMobile: process.env.LINK_IMAGE_MOBILE
}

export const config = {
  env: process.env.NODE_ENV,
  ...hostConfig,
  ...databaseConfig,
  ...violationConfig,
  ...grpcConfig,
}
