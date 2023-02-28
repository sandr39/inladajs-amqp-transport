import amqplib, { ConsumeMessage } from 'amqplib';
import { connectionProvider, IAmqpBroker, IQueueParam } from './connect';

type IHandler = (message: string) => void

const reInitOnRestart = (queues: IQueueParam[], handler: IHandler) => async (broker: IAmqpBroker) => {
  const wrappedHandler = (message: ConsumeMessage | null) => {
    // console.log(message);
    // console.log(JSON.stringify(message));
    // console.log('received message: ' + message.getContent());

    try {
      if (message) {
        handler(message.content.toString());
      }
    } catch (err) {
      console.log('message broker client error on message processing', err);
    }
  };

  const activateResult = await Promise.all(queues.map(({ name }) => broker.channel?.consume(name, wrappedHandler, { noAck: true })
    .then(() => {
      console.log(null, `Listen ${name} queue`);
    })));
};

export const connectAsConsumer = async (
  connectOptions: amqplib.Options.Connect,
  queues: IQueueParam[],
  handler: IHandler,
) => {
  const cbObRestart = reInitOnRestart(queues, handler);

  const broker = await connectionProvider(connectOptions, queues, cbObRestart);

  // first init is manual
  await cbObRestart(broker);
};
