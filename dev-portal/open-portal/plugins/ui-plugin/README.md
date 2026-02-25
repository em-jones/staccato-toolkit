# Server plugin configuration

<!--
TODO: Define a lifecycle that can be used to hook into
NOTE: 'async': true handlers should be executed in the workflows context
NOTE: we're using nitro web server, so the implementation of configuring these hooks should depend on the use of nitro's extensibility model
-->

Features:

- Register Event Producers
- Register Event Hanlders
- Register Livecycle hooks
  - 'startup'
  - 'request:recieved'
  - 'response:preparing'
  - 'shutdown'
- Register Server IoC services
- Register Client IoC services
