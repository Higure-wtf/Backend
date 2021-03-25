import {Request, Response, Router} from 'express';
import {generateInvite} from '../utils/GenerateUtil';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import InviteModel from '../models/InviteModel';
import ValidationMiddleware from '../middlewares/ValidationMiddleware';
import BlacklistSchema from '../schemas/BlacklistSchema';
import UserModel from '../models/UserModel';
import InviteAddSchema from '../schemas/InviteAddSchema';
import InviteWaveSchema from '../schemas/InviteWaveSchema';
import FileModel from '../models/FileModel';
import {s3, wipeFiles} from '../utils/S3Util';
import GenInvSchema from '../schemas/GenInvSchema';
import InvisibleUrlModel from '../models/InvisibleUrlModel';
import RefreshTokenModel from '../models/RefreshTokenModel';
import PremiumSchema from '../schemas/PremiumSchema';
import SetUIDSchema from '../schemas/SetUIDSchema';
import {addPremium} from '../utils/OAuthUtil';
import {setMOTD} from '../app';

const router = Router();

router.use(AdminMiddleware);

router.post(
  '/invites',
  ValidationMiddleware(GenInvSchema),
  async (req: Request, res: Response) => {
    const {executerId} = req.body;
    const invite = generateInvite();
    const dateCreated = new Date();
    const executer = await UserModel.findOne({
      $or: [
        {_id: executerId},
        {username: executerId},
        {email: executerId},
        {invite: executerId},
        {key: executerId},
        {'discord.id': executerId.replace('<@!', '').replace('>', '')},
      ],
    });
    if (!executer)
      return res.status(404).json({
        success: false,
        error: 'invalid user',
      });

    try {
      await InviteModel.create({
        _id: invite,
        createdBy: {
          username: executer ? executer.username : 'Admin',
          uuid: executer ? executer._id : 'N/A',
        },
        dateCreated,
        dateRedeemed: null,
        usedBy: null,
        redeemed: false,
        useable: true,
      });

      res.status(200).json({
        success: true,
        link: `https://higure.wtf/?code=${invite}`,
        code: invite,
        dateCreated,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.post(
  '/blacklist',
  ValidationMiddleware(BlacklistSchema),
  async (req: Request, res: Response) => {
    const {id, reason, executerId} = req.body;

    try {
      // this next line is lol, just lol.
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });

      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });

      if (user.blacklisted.status)
        return res.status(400).json({
          success: false,
          error: 'this user is already blacklisted',
        });
      const executer = await UserModel.findOne({
        $or: [
          {_id: executerId},
          {username: executerId},
          {email: executerId},
          {invite: executerId},
          {key: executerId},
          {'discord.id': executerId.replace('<@!', '').replace('>', '')},
        ],
      });
      if (!executer)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });

      await UserModel.findByIdAndUpdate(user._id, {
        blacklisted: {
          status: true,
          reason: `${reason ? reason : 'No reason provided'} - ${
            executer.username
          }`,
        },
      });

      res.status(200).json({
        success: true,
        message: 'blacklisted user successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.post(
  '/unblacklist',
  ValidationMiddleware(BlacklistSchema),
  async (req: Request, res: Response) => {
    const {id, reason, executerId} = req.body;

    try {
      // this next line is lol, just lol.
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });
      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });

      const executer = await UserModel.findOne({
        $or: [
          {_id: executerId},
          {username: executerId},
          {email: executerId},
          {invite: executerId},
          {key: executerId},
          {'discord.id': executerId.replace('<@!', '').replace('>', '')},
        ],
      });
      if (!executer)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });

      if (!user.blacklisted.status)
        return res.status(400).json({
          success: false,
          error: 'this user is not  blacklisted',
        });

      await UserModel.findByIdAndUpdate(user._id, {
        blacklisted: {
          status: false,
          reason: `Unblacklisted by ${executer.username} for: ${
            reason ? reason : 'No reason provided'
          }`,
        },
      });

      res.status(200).json({
        success: true,
        message: 'unblacklisted user successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);
router.delete('/files/:id', async (req: Request, res: Response) => {
  const {id} = req.params;
  const file = await FileModel.findOne({filename: id});
  if (!file)
    return res.status(404).json({
      success: false,
      error: 'invalid file',
    });
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: file.key,
  };
  const user = await UserModel.findOne({_id: file.uploader.uuid});
  try {
    await s3.deleteObject(params).promise();

    if (user.uploads > 0)
      await UserModel.findByIdAndUpdate(user._id, {
        $inc: {
          uploads: -1,
        },
      });

    await file.remove();

    res.status(200).json({
      success: true,
      message: 'deleted file successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
router.post(
  '/inviteadd',
  ValidationMiddleware(InviteAddSchema),
  async (req: Request, res: Response) => {
    const {id, amount} = req.body;

    try {
      // this next line is lol, just lol.
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });
      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });
      await UserModel.findByIdAndUpdate(user._id, {
        invites: user.invites + amount,
      });

      res.status(200).json({
        success: true,
        message: 'added invite successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);
router.post(
  '/premium',
  ValidationMiddleware(PremiumSchema),
  async (req: Request, res: Response) => {
    const {id} = req.body;

    try {
      // this next line is lol, just lol.
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });
      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });
      await UserModel.findByIdAndUpdate(user._id, {
        premium: true,
      });
      await addPremium(user).catch(e => console.log(e));

      res.status(200).json({
        success: true,
        message: 'set user as premium correctly',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);
router.post(
  '/verifyemail',
  ValidationMiddleware(PremiumSchema),
  async (req: Request, res: Response) => {
    const {id} = req.body;

    try {
      // this next line is lol, just lol.
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });
      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });
      await UserModel.findByIdAndUpdate(user._id, {
        emailVerified: true,
      });
      res.status(200).json({
        success: true,
        message: 'verified users mail',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);
router.post(
  '/setuid',
  ValidationMiddleware(SetUIDSchema),
  async (req: Request, res: Response) => {
    const {id, newuid} = req.body;

    try {
      // this next line is lol, just lol.
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });
      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });
      const uuid = await UserModel.findOne({
        uid: newuid,
      });
      if (uuid)
        return res.status(404).json({
          success: false,
          error: 'uid already in use',
        });

      await UserModel.findByIdAndUpdate(user._id, {
        uid: newuid,
      });
      res.status(200).json({
        success: true,
        message: 'set users id',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);
router.post(
  '/invitewave',
  ValidationMiddleware(InviteWaveSchema),
  async (req: Request, res: Response) => {
    const {amount} = req.body;
    try {
      await UserModel.updateMany(
        {username: {$ne: null}},
        {$inc: {invites: +amount}}
      );
      return res.status(200).json({
        success: true,
        message: 'Invite wave sent out successfully.',
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: e.message,
      });
    }
  }
);
router.post('/setmotd', async (req: Request, res: Response) => {
  const {motd} = req.body;
  try {
    setMOTD(motd);
    return res.status(200).json({
      success: true,
      message: 'Set MOTD successfully.',
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});
router.post(
  '/wipeuser',
  AdminMiddleware,
  async (req: Request, res: Response) => {
    const {id} = req.body;

    try {
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });
      const count = await wipeFiles(user);

      await FileModel.deleteMany({
        'uploader.uuid': user._id,
      });
      await InvisibleUrlModel.deleteMany({
        uploader: user._id,
      });
      await InviteModel.deleteMany({
        'createdBy.uuid': user._id,
      });
      await RefreshTokenModel.deleteMany({user: user._id});
      await UserModel.deleteOne({_id: user._id});
      res.status(200).json({
        success: true,
        message: `wiped ${id} successfully`,
        count,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);
router.post(
  '/wipefiles',
  AdminMiddleware,
  async (req: Request, res: Response) => {
    const {id} = req.body;

    try {
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });
      const count = await wipeFiles(user);

      await FileModel.deleteMany({
        'uploader.uuid': user._id,
      });
      await InvisibleUrlModel.deleteMany({
        uploader: user._id,
      });
      await InviteModel.deleteMany({
        'createdBy.uuid': user._id,
      });
      await RefreshTokenModel.deleteMany({user: user._id});
      res.status(200).json({
        success: true,
        message: `wiped ${id} successfully`,
        count,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.get('/users/:id', async (req: Request, res: Response) => {
  const {id} = req.params;

  try {
    const user = await UserModel.find({
      $or: [
        {_id: id},
        {username: id},
        {invite: id},
        {key: id},
        {'discord.id': id.replace('<@!', '').replace('>', '')},
        {uid: parseInt(id) || null},
      ],
    });

    if (!user)
      return res.status(404).json({
        success: false,
        error: 'invalid user',
      });
    res.status(200).json({
      success: true,
      users: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post(
  '/enable_user',
  AdminMiddleware,
  async (req: Request, res: Response) => {
    const {id} = req.params;

    try {
      const user = await UserModel.findOne({
        $or: [
          {_id: id},
          {username: id},
          {email: id},
          {invite: id},
          {key: id},
          {'discord.id': id.replace('<@!', '').replace('>', '')},
        ],
      });

      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });

      await UserModel.findOneAndUpdate(
        {_id: user._id},
        {
          disabled: false,
        }
      );

      return res.status(200).json({
        success: true,
        message: 're-enabled user successfully',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

export default router;
