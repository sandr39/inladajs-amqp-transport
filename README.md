# inladajs-amqp-transport


# Usage:
## As producer (transaction-like behavior):

```typescript
// init
const producer = await getProducer({ // connection options
  username: MESSAGE_BUS_LOGIN as string,
  password: MESSAGE_BUS_PASS as string,
  hostname: MESSAGE_BUS_URL as string,
}, { // queue - name and options
  name: MESSAGE_BUS_QUEUE_ERRORS as string,
  options: {durable: true, autoDelete: false },
}, 
  true, // clean on fail - will not send any on rollback 
  transactionProcessor, // abstraction, that provide begin/commit/rollback functionality
);

// usage inside inladajs project
producer.send(uid, 'message');



// or full example with transactionProcessor
const send = async () => {
  const uid = '123123';
  await transactionProcessor.begin(uid);

  producer.send(uid, 'message');

  await transactionProcessor.commit(uid); // send all that added
// or
//   await transactionProcessor.rollback(uid); // send all that added OR just purge the buffer, in case of cleanOnFail = true
}
```

## As consumer

```typescript
// simple usage

connectAsConsumer(connectionOptions, [{
  name: 'queue1',
  options: { durable: true, autoDelete: false },
}, {
  name: 'queue2',
  options: { durable: true, autoDelete: false },
}, {
  name: 'queue3',
  options: { durable: true, autoDelete: false },
}], message => { console.log(`Received: ${message}`); })
  .then(() => {
    logger.log(null, 'connected');
  })
  .catch(err => {
    logger.log(null, err);
  });


// usage inside inladajs project

someHandlerFactory({
  allowedActions,
  allowedOptions,
  actionRedirect,
  contracts,
  errors,
  plugins,
  EventConstructor: EventType,
  relations,
  fullObjectsInfo,
  ... bunch_of_params,
})
  .then(async ({ handler }) => {
    const amqpHandler: (m: string) => Promise<void> = (s) => log(s); 
    // string => messageOfYouType => handler(eventSource, objectName, actionName, actionNameType) => result => string => messageOfYouType => sendOrSave => void
    
    await connectAsConsumer(amqpHandler, [queueName]);
  })
```

## As simple transport - just send, no transactions:

```typescript

const {
  MESSAGE_BUS_URL,
  MESSAGE_BUS_LOGIN,
  MESSAGE_BUS_PASS,
} = process.env;

const connectionOptions = {
  username: MESSAGE_BUS_LOGIN as string,
  password: MESSAGE_BUS_PASS,
  hostname: MESSAGE_BUS_URL as string,
};

let i = 0;

const y = (queueName: string) => () => (async () => {
  await (await getTransport(
    connectionOptions, [{ name: queueName, options: { durable: true } }],
  ))
    .send(queueName, `test message ${queueName}, ${i}`);
  i++;
  return queueName;
})().then(qn => {
  console.log(`done, ${qn}`);
});

setInterval(y('queue1'), 5000);
setInterval(y('queue2'), 4000);

```