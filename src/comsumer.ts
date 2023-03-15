import amqplib, { ConsumeMessage } from 'amqplib';
import { connectionProvider, IAmqpBroker, IQueueParam } from './connect';

type IHandler = (message: string) => void

const reInitOnRestart = (queues: IQueueParam[], handler: IHandler) => async (broker: IAmqpBroker) => {
  const wrappedHandler = async (message: ConsumeMessage | null) => {
    if (message) {
      try {
        await handler(message.content.toString());
        broker.channel?.ack(message);
      } catch (err) {
        // logger warning
        console.log('message broker client error on message processing', err);
      }
    }
  };

  const activateResult = await Promise.all(queues.map(({ name }) => broker.channel?.consume(name, wrappedHandler)
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
  await connectionProvider(connectOptions, queues, cbObRestart);
};
