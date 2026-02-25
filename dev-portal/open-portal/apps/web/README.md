<!--
TODO: Ensure the following:
- All projects are compiling and running correctly.
- The app generates migrations at build time and applies them at startup
- This app starts up, registers the following plugins, and these plugins perform their stated tasks
  - `@op-plugin/nitro-server-plugin` - registration of "request", "startup", and "shutdown" plugin hooks
  - `@op/platform/auth`
    - provides the authentication & authorization api for the app
  - `@op-plugin/authentication-better-auth` - provides the authentication services implementing `@op/platform-auth`
  - `@op-plugin/solid-ui`
    - displays the navbar with links to:
    - home, login, and register pages - when anon
    - home, settings, and logout pages - when authenticated
    - provides the pages for IAM management (through `@op-plugin/authorization-duck-iam` and `@op-plugin/authentication-better-auth`)
      -  User management page
      -  Role management page
      -  Policy management page
  - **IF** operating in development mode, an openapi spec is generated when configuration schemas are registered/updated, and the
  application's config yaml is given the schema yaml directive for intellisense support of the configuration
-->
