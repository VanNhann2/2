import mongoose from 'mongoose'

export const schemaOptions = {
  versionKey: false,
}

export const violationsSchema = {
  actions: { type: Number, required: true },
  // object loai phuong tien
  // action luon 3: loai vi pham
  // status la trang thai
  object: { type: Number, required: true },
  status: { type: Number, enum: [0, 1, 2], required: true },
  plate: { type: String, required: true },
  camera: { type: mongoose.SchemaTypes.ObjectId, required: true },
  time: { type: Date },
  images: [{ type: String }],
  object_images: [{ type: String }],
  plate_images: [{ type: String }],
  vio_time: { type: Date, required: true },
  vio_adress: { type: String, required: true },
  ownew: { type: String, required: true },
  phone: { type: Number },
  email: { type: String },
  deleted: { type: Boolean },
}