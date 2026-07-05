# solid-turnstile

A simple SolidJS library for [Cloudflare Turnstile](https://challenges.cloudflare.com).

## Installation

```bash
pnpm add @chacka-lab/solid-turnstile
```

## Usage

```tsx
import Turnstile from "@chacka-lab/solid-turnstile";

function TurnstileWidget() {
  const turnstile = useTurnstile();
  return (
    <Turnstile
      sitekey="1x00000000000000000000AA"
      onVerify={(token) => {
        fetch("/login", {
          method: "POST",
          body: JSON.stringify({ token }),
        }).then((response) => {
          if (!response.ok) turnstile()?.reset();
        });
      }}
    />
  );
}
```

Turnstile tokens expire after 5 minutes. To automatically reset the challenge on expiry, set `refreshExpired="auto"` or handle it yourself with the `onExpire` callback.

### Reducing Layout Shift

The Turnstile iframe initially loads invisible before expanding to its final size, causing layout shift.

Set `fixedSize={true}` to pre-reserve the exact dimensions of the widget and eliminate the shift.

### Bound Turnstile Object

Every callback receives a `BoundTurnstileObject` as its last argument, giving you direct access to widget controls without needing to track `widgetId` yourself.

```tsx
<Turnstile
  execution="execute"
  onLoad={(widgetId, bound) => {
    // before:
    window.turnstile.execute(widgetId);
    // now:
    bound.execute();
  }}
/>
```

## Props

| name              | type    | description                                                   |
| ----------------- | ------- | ------------------------------------------------------------- |
| sitekey           | string  | sitekey of your website (REQUIRED)                            |
| action            | string  | —                                                             |
| cData             | string  | —                                                             |
| theme             | string  | one of `"light"`, `"dark"`, `"auto"`                          |
| language          | string  | override the language used by Turnstile                       |
| tabIndex          | number  | —                                                             |
| responseField     | boolean | controls generation of `<input>` element                      |
| responseFieldName | string  | changes the name of the `<input>` element                     |
| size              | string  | one of `"normal"`, `"compact"`, `"flexible"`, `"invisible"`   |
| fixedSize         | boolean | fix the size of the `<div>` to reduce layout shift            |
| retry             | string  | one of `"auto"`, `"never"`                                    |
| retryInterval     | number  | interval between retries in ms                                |
| refreshExpired    | string  | one of `"auto"`, `"manual"`, `"never"`                        |
| appearance        | string  | one of `"always"`, `"execute"`, `"interaction-only"`          |
| execution         | string  | one of `"render"`, `"execute"`                                |
| id                | string  | `id` of the container `<div>`                                 |
| ref               | fn      | callback ref receiving the container `<div>` after mount      |
| class             | string  | passed to the container `<div>`                               |
| style             | object  | passed to the container `<div>`                               |

## Callbacks

All callbacks receive a `BoundTurnstileObject` as their last argument.

| name                | arguments                          | description                                    |
| ------------------- | ---------------------------------- | ---------------------------------------------- |
| onVerify            | token, bound                       | called when the challenge is passed            |
| onSuccess           | token, preClearanceObtained, bound | called when the challenge is passed            |
| onLoad              | widgetId, bound                    | called when the widget is loaded               |
| onError             | error, bound                       | called when an error occurs                    |
| onExpire            | token, bound                       | called when the token expires                  |
| onTimeout           | bound                              | called when the challenge times out            |
| onAfterInteractive  | bound                              | called after the visitor interacts             |
| onBeforeInteractive | bound                              | called before the visitor is asked to interact |
| onUnsupported       | bound                              | called when the browser is unsupported         |

For details on each option see the [Cloudflare Turnstile documentation](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/).

## Server-side Validation

```ts
import { validateTurnstile } from "@chacka-lab/solid-turnstile/validate";

const result = await validateTurnstile(SECRET_KEY, token);
if (result.success) {
  // proceed
} else {
  console.error(result["error-codes"]);
}
```

## Acknowledgements

This project is a SolidJS port of [react-turnstile](https://github.com/marsidev/react-turnstile). The component API and script-loading logic are based on that implementation.
