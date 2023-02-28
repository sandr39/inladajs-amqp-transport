import { getProducer, IAMQPProducer } from './producer';
import { IQueueParam } from './connect';
import { connectAsConsumer } from './comsumer';
import { getTransport } from './transport';

export {
  getProducer, IQueueParam, connectAsConsumer, IAMQPProducer, getTransport,
};
