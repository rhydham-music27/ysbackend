// This file augments Express types to include custom properties added by middleware.
// The `user` type will be refined once the User model is introduced in a later phase.

import 'express';
import { IUser } from '../models/User';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  }
}


