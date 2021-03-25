import 'dotenv/config';
import {
  AdminRouter,
  AuthRouter,
  BaseRouter,
  DomainsRouter,
  FilesRouter,
  InvitesRouter,
  ShortenerRouter,
  UsersRouter,
} from './routes';
import {connect} from 'mongoose';
import {intervals} from './utils/Intervals';
import {updateStorage, wipeFiles} from './utils/S3Util';
import express, {json} from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import SessionMiddleware from './middlewares/SessionMiddleware';
import UserModel from './models/UserModel';
import ms from 'ms';
import CounterModel from './models/CounterModel';
import FileModel from './models/FileModel';
import InvisibleUrlModel from './models/InvisibleUrlModel';

const app = express();
const PORT = process.env.PORT || 3000;
let MOTD = 'Message of the day';

try {
  const errors = [];
  const requiredEnvs = [
    'MONGO_URI',
    'API_KEY',
    'BACKEND_URL',
    'FRONTEND_URL',
    'S3_SECRET_KEY',
    'S3_ACCESS_KEY_ID',
    'S3_ENDPOINT',
    'S3_BUCKET',
    'CLOUDFLARE_API_KEY',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_EMAIL',
    'WEBHOOK_URL',
    'CUSTOM_DOMAIN_WEBHOOK',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_LOGIN_URL',
    'DISCORD_LINK_URL',
    'DISCORD_LOGIN_REDIRECT_URI',
    'DISCORD_LINK_REDIRECT_URI',
    'DISCORD_ROLES',
    'DISCORD_SERVER_ID',
    'DISCORD_BOT_TOKEN',
  ];

  for (const env of requiredEnvs) {
    // eslint-disable-next-line no-prototype-builtins
    if (!process.env.hasOwnProperty(env)) {
      errors.push(env);
    }
  }

  if (errors.length > 0)
    throw new Error(
      `${errors.join(', ')} ${errors.length > 1 ? 'are' : 'is'} required`
    );

  app.use(
    cors({
      credentials: true,
      origin: [
        'https://www.higure.wtf',
        'https://higure.wtf',
        'http://localhost:3000',
        'http://localhost:3000',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  );
  app.set('trust proxy', 1);
  app.use(helmet.originAgentCluster());
  app.use(helmet.dnsPrefetchControl());
  app.use(helmet.permittedCrossDomainPolicies());
  app.use(helmet.hidePoweredBy());
  app.use(json());
  app.use(cookieParser());
  app.use(SessionMiddleware);
  app.use('/', BaseRouter);
  app.use('/files', FilesRouter);
  app.use('/invites', InvitesRouter);
  app.use('/domains', DomainsRouter);
  app.use('/auth', AuthRouter);
  app.use('/users', UsersRouter);
  app.use('/shortener', ShortenerRouter);
  app.use('/admin', AdminRouter);
  app.use((_req, res) => {
    res.redirect(process.env.FRONTEND_URL);
  });
  app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`);
  });

  connect(
    process.env.MONGO_URI,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    },
    () => {
      console.log('Connected to MongoDB cluster');
    }
  );

  (async () => {
    const findCounter = await CounterModel.findById('counter');
    if (!findCounter)
      throw new Error(
        'Create a counter document with the value 1 as the count'
      );
    for (const user of await UserModel.find({
      'settings.autoWipe.enabled': true,
    })) {
      const {interval} = user.settings.autoWipe;
      const validIntervals = [
        ms('1h'),
        ms('2h'),
        ms('12h'),
        ms('24h'),
        ms('1w'),
        ms('2w'),
        2147483647,
      ];

      if (validIntervals.includes(interval)) {
        const findInterval = intervals.find(i => i.uuid === user._id);
        if (findInterval) clearInterval(findInterval.id);

        const id = setInterval(async () => {
          try {
            await wipeFiles(user);

            await FileModel.deleteMany({
              'uploader.uuid': user._id,
            });

            await InvisibleUrlModel.deleteMany({
              uploader: user._id,
            });

            await UserModel.findByIdAndUpdate(user._id, {
              uploads: 0,
            });
            // eslint-disable-next-line no-empty
          } catch (err) {}
        }, interval);

        intervals.push({
          id,
          uuid: user._id,
        });
      }
    }
    await updateStorage();
    console.log('Started autowipe thread');
  })();
} catch (err) {
  throw new Error(err);
}
function getMOTD() {
  return MOTD;
}
function setMOTD(motd: string) {
  MOTD = motd;
}
export {getMOTD, setMOTD};
