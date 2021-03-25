import {Request, Response, Router} from 'express';
import {sign, verify} from 'jsonwebtoken';
import OAuthMiddleware from '../../middlewares/OAuthMiddleware';
import PasswordResetModel from '../../models/PasswordResetModel';
import RefreshTokenModel from '../../models/RefreshTokenModel';
import UserModel from '../../models/UserModel';

const router = Router();

router.get('/login', (req: Request, res: Response) => {
  const cookie = req.cookies['x-refresh-token'];

  cookie
    ? res.redirect(`${process.env.FRONTEND_URL}/dashboard`)
    : res.redirect(process.env.DISCORD_LOGIN_URL);
});

router.get(
  '/login/callback',
  OAuthMiddleware(),
  async (req: Request, res: Response) => {
    const {id, avatar, discriminator} = req.discord.user;

    try {
      const user = await UserModel.findOne({'discord.id': id});

      if (
        !user ||
        user.blacklisted.status ||
        !user.emailVerified ||
        user.disabled
      ) {
        return res.status(401).redirect(process.env.FRONTEND_URL);
      }
      const passwordReset = await PasswordResetModel.findOne({user: user._id});
      if (passwordReset) await passwordReset.remove();
      let avatarurl;
      if (avatar && avatar.startsWith('a_')) {
        avatarurl = `https://cdn.discordapp.com/${
          avatar
            ? `avatars/${id}/${avatar}`
            : `embed/avatars/${discriminator % 5}`
        }.gif`;
      } else {
        avatarurl = `https://cdn.discordapp.com/${
          avatar
            ? `avatars/${id}/${avatar}`
            : `embed/avatars/${discriminator % 5}`
        }.png`;
      }
      const update = {
        lastLogin: new Date(),
        'discord.avatar': avatarurl,
      };

      await UserModel.findByIdAndUpdate(user._id, update);
      const refreshToken = sign(
        {_id: user._id},
        process.env.REFRESH_TOKEN_SECRET
      );

      await RefreshTokenModel.create({
        token: refreshToken,
        user: user._id,
        expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      });

      res.cookie('x-refresh-token', refreshToken, {
        httpOnly: true,
        secure: false,
      });
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.get('/link', (req: Request, res: Response) => {
  const cookie = req.cookies['x-refresh-token'];

  cookie
    ? res.redirect(process.env.DISCORD_LINK_URL)
    : res.status(401).json({
        success: false,
        error: 'unauthorized',
      });
});

router.get(
  '/link/callback',
  OAuthMiddleware('link'),
  async (req: Request, res: Response) => {
    const cookie = req.cookies['x-refresh-token'];

    if (!cookie)
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
      });

    try {
      const refreshToken = await RefreshTokenModel.findOne({token: cookie});

      if (
        !refreshToken ||
        Date.now() >= new Date(refreshToken.expires).getTime()
      ) {
        if (refreshToken) await refreshToken.remove();

        res.status(401).json({
          success: false,
          error: 'invalid refresh token',
        });

        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token: any = verify(
        refreshToken.token,
        process.env.REFRESH_TOKEN_SECRET
      );

      const user = await UserModel.findOne({_id: token._id}).select(
        '-__v -password'
      );

      if (!user)
        return res.status(401).json({
          success: false,
          error: 'invalid session',
        });

      if (!user.emailVerified)
        return res.status(401).json({
          success: false,
          error: 'your email is not verified',
        });

      const {id, avatar, discriminator} = req.discord.user;

      await req.discord.addGuildMember(user);
      let avatarurl;
      if (avatar && avatar.startsWith('a_')) {
        avatarurl = `https://cdn.discordapp.com/${
          avatar
            ? `avatars/${id}/${avatar}`
            : `embed/avatars/${discriminator % 5}`
        }.gif`;
      } else {
        avatarurl = `https://cdn.discordapp.com/${
          avatar
            ? `avatars/${id}/${avatar}`
            : `embed/avatars/${discriminator % 5}`
        }.png`;
      }
      await UserModel.findByIdAndUpdate(user._id, {
        discord: {
          id,
          avatar: avatarurl,
        },
      });

      res.status(200).redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'error: ' + err.stack + err,
      });
    }
  }
);

export default router;
