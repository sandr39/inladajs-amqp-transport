import amqplib from 'amqplib';
import { connectionProvider, IAmqpBroker, IQueueParam } from './connect';

const WAIT_DRAIN_EVENT = 200;
const delay = (ms: number) => new Promise(res => { setTimeout(res, ms); });

const notify = async (broker: IAmqpBroker, objectToSend: any, queue: string) => {
  let sent = broker.channel?.sendToQueue(queue, Buffer.from(JSON.stringify(objectToSend)));
  while (!sent) {
    await delay(WAIT_DRAIN_EVENT);
    sent = broker.channel?.sendToQueue(queue, Buffer.from(JSON.stringify(objectToSend)));
  }
};

export const getTransport = async (connectOptions: amqplib.Options.Connect | null, queues: IQueueParam[]) => {
  const broker = await connectionProvider(connectOptions, queues);
  return {
    send: async (queue: string, objectToSend: any) => notify(broker, objectToSend, queue),
  };
};
