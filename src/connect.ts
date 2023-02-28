import amqplib, { Channel, Connection } from 'amqplib';
import { logger } from 'inlada-logger';
import { Options } from 'amqplib/properties';

const defaultOptions: amqplib.Options.Connect = {
  protocol: 'amqp',
  hostname: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
  locale: 'en_US',
  frameMax: 0,
  heartbeat: 0,
  vhost: '/',
};

export interface IQueueParam {
  name: string,
  options: Options.AssertQueue
}

export interface IAmqpBroker {
  connection?: Connection
  channel?: Channel
  queues: IQueueParam[]
}

type IInitCBType = (messageBroker: IAmqpBroker) => Promise<void>;

let savedOptions: Options.Connect = {};

// let resultPromise: Promise<IAmqpBroker>;
const messageBroker: IAmqpBroker = { queues: [] };

const myName = '123'; // serviceName + uid();

const initConnection = async (cbOnRestart?: IInitCBType) => {
  try {
    const effectiveOptions: amqplib.Options.Connect = { ...defaultOptions, ...savedOptions };
    console.log('init connection');
    messageBroker.connection = await amqplib.connect(effectiveOptions, { clientProperties: { connection_name: myName } });
    messageBroker.channel = await messageBroker.connection.createChannel();

    await messageBroker.channel.prefetch(1);

    messageBroker.connection.on('error', async err => {
      logger.error(null, 'message broker client error, connection', err);
      await initConnection(cbOnRestart);
    });

    messageBroker.channel.on('error', async err => {
    // check reconnect on any error (ECONNRESET too)
      logger.error(null, 'message broker client error, channel', err);
      await initConnection(cbOnRestart);
    });

    // let promiseResolve: (v: IAmqpBroker) => void;
    // resultPromise = new Promise(resolve => {
    //   promiseResolve = resolve;
    // });

    // messageBroker.connection.on('connect', async () => {
    //   await cbOnRestart?.(messageBroker);
    //
    //   promiseResolve(messageBroker);
    //   logger.debug(null, 'message broker client connected');
    // });
    messageBroker.queues?.forEach(q => messageBroker.channel?.assertQueue(q.name, q.options));

    await cbOnRestart?.(messageBroker); // after assertQueue
  } catch (e) {
    console.log(null, 'Error on init ', e);
    await initConnection(cbOnRestart);
  }

  return messageBroker;
};

// todo redo, quite ugly
export const connectionProvider = async (
  connectionOptions: amqplib.Options.Connect | null,
  queues: IQueueParam[],
  cbOnRestart?: IInitCBType,
): Promise<any> => {
  if (!messageBroker.connection) {
    if (connectionOptions) {
      savedOptions = connectionOptions;
    }

    messageBroker.queues.push(...queues);

    return initConnection(cbOnRestart);
  }

  return messageBroker;
};
