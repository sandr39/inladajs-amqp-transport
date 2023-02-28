# inladajs-amqp-transport


# Usage:
## As producer:

```typescript
// init
const producer = await getProducer({ // connection options
  username: MESSAGE_BUS_LOGIN as string,
  password: MESSAGE_BUS_PASS as string,
  hostname: MESSAGE_BUS_URL as string,
}, { // queue - name and options
  name: MESSAGE_BUS_QUEUE_ERRORS as string,
  options: {
    durable: true,
    autoDelete: false,
  },
}, 
  true, // clean on fail - will not send any on rollback 
  transactionProcessor, // abstraction, that provide begin/commit/rollback functionality
);

// usage inside inladajs project
producer.send(uid, { // really only add to inner buffer
  messageType: TELEGRAM_MESSAGE_TYPE_NAMES.telegramBackError,
  message: 'test error message',
});

// or full example with transactionProcessor
const send = async () => {

  const uid = '123123';
  await transactionProcessor.begin(uid);

  producer.send(uid, { // really only add to inner buffer
    messageType: TELEGRAM_MESSAGE_TYPE_NAMES.telegramBackError,
    message: 'test error message',
  });

  await transactionProcessor.commit(uid); // send all that added
// or
//   await transactionProcessor.rollback(uid); // send all that added OR just purge the buffer, in case of cleanOnFail = true
}
```

## As consumer

```typescript
// simple usage
connectAsConsumer({ // connection options
  username: MESSAGE_BUS_LOGIN as string,
  password: MESSAGE_BUS_PASS as string,
  hostname: MESSAGE_BUS_URL as string,
}, [{ // queue - name and options
  name: MESSAGE_BUS_QUEUE_ERRORS as string,
  options: { durable: true, autoDelete: false },
}],
handler // type IHandler = (message: string) => void
)
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
