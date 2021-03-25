import {Request, Response, Router} from 'express';
import {s3} from '../../utils/S3Util';
import AuthMiddleware from '../../middlewares/AuthMiddleware';
import ValidationMiddleware from '../../middlewares/ValidationMiddleware';
import UserModel from '../../models/UserModel';
import SettingsRouter from './SettingsRouter';
import {formatFilesize} from '../../utils/FormatUtil';
import {generateString} from '../../utils/GenerateUtil';
import InviteModel from '../../models/InviteModel';
import RefreshTokenModel from '../../models/RefreshTokenModel';
import ChangeUsernameSchema from '../../schemas/ChangeUsernameSchema';
import {hash, verify} from 'argon2';
import ChangePasswordSchema from '../../schemas/ChangePasswordSchema';
import {getMOTD} from '../../app';

const router = Router();

router.use(AuthMiddleware);
router.use('/settings', SettingsRouter);

router.get('/', async (req: Request, res: Response) => {
  const {user} = req;

  res.status(200).json(user);
});

router.get('/images', async (req: Request, res: Response) => {
  const {user} = req;
  try {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Prefix: `${user._id}/`,
    };
    const objects = await s3.listObjectsV2(params).promise();
    objects.Contents.sort(
      (a, b) => b.LastModified.getTime() - a.LastModified.getTime()
    );
    const images = [];
    for (const object of objects.Contents) {
      images.push({
        link: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${
          user._id
        }/${object.Key.split('/')[1]}`,
        dateUploaded: object.LastModified,
        filename: object.Key.split('/')[1],
        size: formatFilesize(object.Size),
      });
    }
    res.status(200).json({
      success: true,
      images,
      motd: getMOTD(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post('/disable', async (req: Request, res: Response) => {
  const {user} = req;

  try {
    await UserModel.findByIdAndUpdate(user._id, {
      disabled: true,
    });

    await RefreshTokenModel.deleteMany({user: user._id});

    res.clearCookie('x-refresh-token');

    res.status(200).json({
      success: true,
      message: 'disabled account successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post('/regen_key', async (req: Request, res: Response) => {
  const {user} = req;

  try {
    const now = Date.now();
    const difference = user.lastKeyRegen && now - user.lastKeyRegen.getTime();
    const duration = 43200000 - difference;

    if (user.lastKeyRegen && duration > 0) {
      const hours = Math.floor(duration / 1000 / 60 / 60);
      const minutes = Math.floor((duration / 1000 / 60 / 60 - hours) * 60);
      const timeLeft = `${hours} hours and ${minutes} minutes`;

      res.status(400).json({
        success: false,
        error: `you cannot regen your key for another ${timeLeft}`,
      });

      return;
    }

    const key = `${user.username}_${generateString(30)}`;

    await UserModel.findByIdAndUpdate(user._id, {
      lastKeyRegen: new Date(),
      key,
    });

    res.status(200).json({
      success: true,
      key,
      message: 'regenerated key successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.get('/created_invites', async (req: Request, res: Response) => {
  const {user} = req;

  try {
    // eslint-disable-next-line quote-props
    const invites = await InviteModel.find({
      'createdBy.uuid': user._id,
      useable: true,
    }).select('-__v -createdBy');

    res.status(200).json({
      success: true,
      invites,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.put(
  '/change_username',
  ValidationMiddleware(ChangeUsernameSchema),
  async (req: Request, res: Response) => {
    let {user} = req;
    const {username, password} = req.body;

    try {
      user = await UserModel.findById(user._id);
      const correctPassword = await verify(user.password, password);

      if (!correctPassword)
        return res.status(401).json({
          success: false,
          error: 'invalid password',
        });

      const now = Date.now();
      const difference =
        user.lastUsernameChange && now - user.lastUsernameChange.getTime();
      const duration = 1209600000 - difference;

      if (user.lastUsernameChange && duration > 0) {
        const hours = Math.floor(duration / 1000 / 60 / 60);
        const minutes = Math.floor((duration / 1000 / 60 / 60 - hours) * 60);
        const days = Math.floor(hours / 24);
        const timeLeft = `${days} days, ${hours} hours and ${minutes} minutes`;

        res.status(400).json({
          success: false,
          error: `you cannot change your username for another ${timeLeft}`,
        });

        return;
      }

      if (username.toLowerCase() === user.username.toLowerCase())
        return res.status(400).json({
          success: false,
          error: 'provide a new username',
        });

      const usernameTaken = await UserModel.findOne({
        username: {$regex: new RegExp(username, 'i')},
      });

      if (usernameTaken)
        return res.status(400).json({
          success: false,
          error: 'the provided username is already taken',
        });

      await UserModel.findByIdAndUpdate(user._id, {
        username,
        lastUsernameChange: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'changed username successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.put(
  '/change_password',
  ValidationMiddleware(ChangePasswordSchema),
  async (req: Request, res: Response) => {
    let {user} = req;
    const {newPassword, password} = req.body;

    try {
      user = await UserModel.findById(user._id);
      const correctPassword = await verify(user.password, password);

      if (!correctPassword)
        return res.status(401).json({
          success: false,
          error: 'invalid password',
        });

      if (await verify(user.password, newPassword))
        return res.status(400).json({
          succes: false,
          error: 'choose a new password',
        });

      const hashed = await hash(newPassword);

      await UserModel.findByIdAndUpdate(user._id, {
        password: hashed,
      });

      await RefreshTokenModel.deleteMany({user: user._id});

      res.status(200).json({
        success: true,
        message: 'changed password successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

export default router;
