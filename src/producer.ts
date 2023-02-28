import { ITransactionService, ITransactionProcessor } from 'inlada-transaction-processor';
import amqplib from 'amqplib';
import { connectionProvider, IAmqpBroker, IQueueParam } from './connect';

export interface ITelegramMessage {
  messageType: string, /// add type
  telegramUserId?: number,
  message: string
}

const WAIT_DRAIN_EVENT = 200;
const delay = (ms: number) => new Promise(res => { setTimeout(res, ms); });

export interface IAMQPProducerData {
  queueName: string
  broker: IAmqpBroker
}

export interface IAMQPProducer extends IAMQPProducerData{
  send: (uid: string, o: ITelegramMessage) => void;
}

let amqpProducerData: IAMQPProducerData;

const bufferToSend: Record<string, Record<string, ITelegramMessage[]>> = {};

const notify = async (objectToSend: ITelegramMessage, queue: string) => {
  let sent = amqpProducerData.broker.channel?.sendToQueue(queue, Buffer.from(JSON.stringify(objectToSend)));
  while (!sent) {
    await delay(WAIT_DRAIN_EVENT);
    sent = amqpProducerData.broker.channel?.sendToQueue(queue, Buffer.from(JSON.stringify(objectToSend)));
  }
};

const sendAll = async (toSend: ITelegramMessage[], queue: string) => {
  const messagesToSend = toSend || [];

  if (messagesToSend.length) {
    await messagesToSend.reduce(async (acc, message) => {
      await acc;
      return notify(message, queue);
    }, Promise.resolve());

    // eslint-disable-next-line no-param-reassign
    toSend.length = 0;
  }
};

const cleanupAll = async (toSend: Record<string, ITelegramMessage[]>, uid: string) => {
  if (toSend[uid]?.length) {
    // eslint-disable-next-line no-param-reassign
    toSend[uid].length = 0;
  }
};

export const getProducer = async (
  connectOptions: amqplib.Options.Connect,
  queue: IQueueParam,
  cleanOnFail = true,
  transactionProcessor: ITransactionProcessor,
): Promise<IAMQPProducer> => {
  if (!amqpProducerData) {
    amqpProducerData = {
      broker: await connectionProvider(connectOptions, [queue]),
      queueName: queue.name,
    };

    if (!amqpProducerData.queueName) {
      throw new Error('No queue inside amqp getProducer');
    }

    if (!bufferToSend[amqpProducerData.queueName]) {
      bufferToSend[amqpProducerData.queueName] = {};

      transactionProcessor.registerTransactionService({
        onSuccess: uid => sendAll(bufferToSend[amqpProducerData.queueName][uid], amqpProducerData.queueName),
        onFail: cleanOnFail
          ? uid => cleanupAll(bufferToSend[amqpProducerData.queueName], uid)
          : uid => sendAll(bufferToSend[amqpProducerData.queueName][uid], amqpProducerData.queueName),
      } as ITransactionService);
    }
  }

  return {
    ...amqpProducerData,
    send: (uid, message) => {
      if (!bufferToSend[amqpProducerData.queueName][uid]) {
        bufferToSend[amqpProducerData.queueName][uid] = [];
      }
      bufferToSend[amqpProducerData.queueName][uid].push(message);
    },
  };
};
