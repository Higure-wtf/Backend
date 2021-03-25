import {Request, Response, Router} from 'express';
import AdminMiddleware from '../../middlewares/AdminMiddleware';
import AuthMiddleware from '../../middlewares/AuthMiddleware';
import UserModel from '../../models/UserModel';
import MeRouter from './MeRouter';
import InviteModel from '../../models/InviteModel';
import AdminAuthMiddleware from '../../middlewares/AdminAuthMiddleware';

const router = Router();

router.use('/@me', MeRouter);

router.get('/', AdminAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    const total = await UserModel.countDocuments();
    const blacklisted = await UserModel.countDocuments({
      'blacklisted.status': true,
    });
    const unusedInvites = await InviteModel.countDocuments({redeemed: false});
    const premium = await UserModel.countDocuments({premium: true});

    res.status(200).json({
      success: true,
      total,
      blacklisted,
      unusedInvites,
      premium,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.get('/:id', AdminMiddleware, async (req: Request, res: Response) => {
  const {id} = req.params;

  const user = await UserModel.findById(id).select('-__v -password');

  if (!user)
    return res.status(404).json({
      success: false,
      error: 'invalid user',
    });

  res.status(200).json({
    success: true,
    user,
  });
});

router.get(
  '/profile/:id',
  AuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await UserModel.findOne({uid: id});

      if (!user)
        return res.status(404).json({
          success: false,
          error: 'invalid user',
        });

      res.status(200).json({
        success: true,
        user: {
          uuid: user._id,
          uid: user.uid,
          username: user.username,
          registrationDate: user.registrationDate,
          role: user.blacklisted.status
            ? 'Blacklisted'
            : user.admin
            ? 'Admin'
            : user.premium
            ? 'Premium'
            : 'Whitelisted',
          uploads: user.uploads,
          invitedBy: user.invitedBy,
          avatar: user.discord.avatar,
        },
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
