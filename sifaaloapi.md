
## page 1
---
updatedAt: 2026-08-24T06:11:56.000Z
agentTools:
  projectIndex: https://developer.sifalopay.com/llms.txt
---

# Welcome to Sifalo Pay

Accept Waafi, eDahab, Premier Wallet, and cards with hosted checkout or the e-Wallet API.

Sifalo Pay accepts Waafi, eDahab, Premier Wallet, and cards. Pick one integration and stick with it.

Start on **staging**. Sign up at <https://pay.sifalo.net/auth/signup>, turn on 2FA, and create a key under **Merchant → API** ([steps](/docs/create-api-keys)). Keep `SIFALO_API_USER` and `SIFALO_API_KEY` on the server. Not in the browser, not in the app.

## Quick start

1. Sign up on staging and enable 2FA
2. [Create API keys](/docs/create-api-keys) under **Merchant → API**
3. Pick [hosted checkout](/docs/hosted-checkout) (default) or [e-Wallet API](/docs/e-wallet-api)
4. Copy the curl from that guide — use **`.net` hosts from [Sandbox](/docs/sandbox)** while testing
5. Confirm `601` in the charge response or after [verify](/docs/hosted-checkout)
6. [Go live](/docs/sandbox#go-live): sign up on `.com`, create live keys, swap hosts

## 1. Pick one integration

<Cards>
  <Card title="Hosted checkout" href="/docs/hosted-checkout" icon="fa-duotone fa-store">
    Customer pays on Sifalo’s page. You don’t collect wallets or cards. Start here unless you already have the phone number.
  </Card>
  <Card title="e-Wallet API" href="/docs/e-wallet-api" icon="fa-duotone fa-code">
    Your server already has the wallet number and charges it with JSON.
  </Card>
</Cards>

## 2. Test, then go live

|             | Portal                                            | Gateway                                | Checkout                           |
| ----------- | ------------------------------------------------- | -------------------------------------- | ---------------------------------- |
| **Staging** | [pay.sifalo.net](https://pay.sifalo.net/business) | `https://spay-api.sifalo.net/gateway/` | `https://pay.sifalo.net/checkout/` |
| **Live**    | [pay.sifalo.com](https://pay.sifalo.com/business) | `https://api.sifalopay.com/gateway/`   | `https://pay.sifalo.com/checkout/` |

Staging keys only work on `.net`. Live keys only work on `.com`. Test numbers and cards: [Sandbox](/docs/sandbox).

## Methods

| Method                           | `gateway`                                       |
| -------------------------------- | ----------------------------------------------- |
| Waafi (EVC, ZAAD, and SAHAL too) | `waafi`                                         |
| eDahab                           | `edahab`                                        |
| Premier Wallet (USD only)        | `pbwallet`                                      |
| Cards                            | prefer [hosted checkout](/docs/hosted-checkout) |

Currency is `USD` or `SLSH` (not `SOS`). [Hosted checkout](/docs/hosted-checkout) is USD only; [e-Wallet API](/docs/e-wallet-api) supports both. Premier Wallet is USD only.

A payment is paid when `code` is `601`. Everything else: [Decline codes](/docs/decline-and-timeout).

## Next

<Cards>
  <Card title="Create API keys" href="/docs/create-api-keys" icon="fa-duotone fa-key">
    Sign up, turn on 2FA, create username + API key
  </Card>
  <Card title="Sandbox" href="/docs/sandbox" icon="fa-duotone fa-flask">
    Test wallets and cards on pay.sifalo.net
  </Card>
  <Card title="Authentication" href="/docs/authentication" icon="fa-duotone fa-lock">
    HTTP Basic on /gateway/ charges. Verify does not use it
  </Card>
  <Card title="Go live" href="/docs/sandbox#go-live" icon="fa-duotone fa-rocket">
    Switch hosts and use live keys
  </Card>
</Cards>

<support@sifalo.com>


## page 2


---
updatedAt: 2026-08-24T06:11:56.000Z
agentTools:
  projectIndex: https://developer.sifalopay.com/llms.txt
---

# Create API keys

Sign up, turn on 2FA, and create a username + API key.

Every server call needs a **username** and **API key**. The same pair works for hosted checkout and the e-Wallet API.

## 1. Sign up

Start on **staging**, then create live keys when you go live.

**Staging:** <https://pay.sifalo.net/auth/signup> → [Business](https://pay.sifalo.net/business)

**Live:** <https://pay.sifalo.com/auth/signup> → [Business](https://pay.sifalo.com/business)

Staging keys only work on `.net`. Live keys only work on `.com`. See [Sandbox](/docs/sandbox).

<Callout icon="⚠️" theme="warning">
  Turn on **2FA** in the portal. If someone steals your password, they still cannot regenerate your API keys.
</Callout>

## 2. Create a key

1. Go to **Merchant → API**
2. Click **Create API key** (optional label: `live-backend` or `staging-backend`)
3. Copy **Username** and **API key**
4. Store them on the server:

```bash
SIFALO_API_USER=your_username
SIFALO_API_KEY=your_api_key
```

Don’t put these in frontend JavaScript, a mobile app, or git.

If the API page is locked, email <support@sifalo.com>.

## 3. How they are sent

| Portal   | HTTP Basic |
| -------- | ---------- |
| Username | username   |
| API key  | password   |

```
Authorization: Basic base64(username:api_key)
```

See [Authentication](/docs/authentication). If you hit the key limit, **Regenerate** — the old secret stops working immediately.

## Next

* [Sandbox](/docs/sandbox) — test wallets, cards, and staging hosts
* [Hosted checkout](/docs/hosted-checkout)
* [e-Wallet API](/docs/e-wallet-api)



## page 3


---
updatedAt: 2026-09-08T12:36:36.000Z
agentTools:
  projectIndex: https://developer.sifalopay.com/llms.txt
---

# Sandbox and staging

Test on pay.sifalo.net and spay-api.sifalo.net before you go live.

Use staging to test. Live charges real wallets and cards.

## Hosts

|             | Portal                                            | Gateway                                | Checkout                           |
| ----------- | ------------------------------------------------- | -------------------------------------- | ---------------------------------- |
| **Staging** | [pay.sifalo.net](https://pay.sifalo.net/business) | `https://spay-api.sifalo.net/gateway/` | `https://pay.sifalo.net/checkout/` |
| **Live**    | [pay.sifalo.com](https://pay.sifalo.com/business) | `https://api.sifalopay.com/gateway/`   | `https://pay.sifalo.com/checkout/` |

1. Sign up at <https://pay.sifalo.net/auth/signup>
2. Create [API keys](/docs/create-api-keys)
3. Call `https://spay-api.sifalo.net/gateway/` with the same JSON you will use in live

For hosted checkout, get `key` + `token` from the staging gateway, then open:

```
https://pay.sifalo.net/checkout/?key=YOUR_KEY&token=YOUR_TOKEN
```

<Callout icon="⚠️" theme="warning">
  Staging keys and live keys are not interchangeable. Staging only works on `.net`. Live only works on `.com`.
</Callout>

## Test wallets

| Scenario     | `code` | eDahab                        | Premier Wallet   | Waafi                         |
| ------------ | ------ | ----------------------------- | ---------------- | ----------------------------- |
| Success      | `601`  | `252621111111` or `621111111` | `00252621111111` | `252631111111` or `631111111` |
| Failed       | `600`  | `252622222222`                | `00252622222222` | `252632222222` or `632222222` |
| Pending      | `603`  | `252651111111`                | `00252651111111` | `252633333333` or `633333333` |
| Insufficient | `604`  | `252652222222`                | `00252652222222` | `252634444444` or `634444444` |

eDahab accepts `62…` or `25262…`. Waafi accepts `61…` or `63…` (or `25261…` / `25263…`) — same scenario endings work for both prefixes (e.g. success `252611111111` or `611111111`). Premier sandbox ids start with `00`. Any other eDahab, Premier, or Waafi number fails (`600`). EVC, ZAAD, and SAHAL use `"gateway": "waafi"`. Premier Wallet is USD only.

Staging Waafi uses Sifalo’s **local mock** (not an external Waafi sandbox). Verify returns `status`: `success`, `pending`, or **`failed`** (never `failure`).

```bash
curl -X POST "https://spay-api.sifalo.net/gateway/" \
  -u "$SIFALO_API_USER:$SIFALO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "252621111111",
    "gateway": "edahab",
    "amount": "1",
    "currency": "USD",
    "order_id": "SBX-1"
  }'
```

You should get `code` `601`. Save `sid`.

## Test cards

Use these on [hosted checkout](/docs/hosted-checkout) at `pay.sifalo.net` only. Not on live, and not a real card.

|            | Number             | Expiry  | CVV   |
| ---------- | ------------------ | ------- | ----- |
| Mastercard | `5123450000000008` | `01/39` | `100` |
| Visa       | `4508750015741019` | `01/39` | `100` |

## Go live

1. Sign up on [pay.sifalo.com](https://pay.sifalo.com/auth/signup) and create live keys
2. Point your server at `https://api.sifalopay.com/gateway/`
3. Redirect checkout to `https://pay.sifalo.com/checkout/?key=&token=`
4. Use real customer wallets and cards



## page 4


---
updatedAt: 2026-08-24T06:11:56.000Z
agentTools:
  projectIndex: https://developer.sifalopay.com/llms.txt
---

# Authentication

HTTP Basic on /gateway/ charges. verify.php does not use it.

Every `/gateway/` charge uses HTTP Basic auth and a JSON body. `POST /gateway/verify.php` does **not** — send JSON only (`sid` or `order_id`).

```
POST /gateway/
Authorization: Basic base64(username:api_key)
Content-Type: application/json
```

Create credentials under [Create API keys](/docs/create-api-keys).

**Testing on staging?** Use the `.net` hosts from [Sandbox](/docs/sandbox). Example below uses live hosts.

```bash
curl -X POST "https://api.sifalopay.com/gateway/" \
  -u "$SIFALO_API_USER:$SIFALO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

`-u user:key` is the same as the `Authorization` header.

Wrong username or key → `code` `0`. Missing fields → `code` `"404"`.

Only your server sends Basic auth. The customer does not authenticate on hosted checkout.

Mark paid only if verify `status` is `success` and `code` is `601`.

PHP and Node: [e-Wallet (PHP / Node)](/docs/charge-mobile-money) and [Hosted checkout (PHP / Node)](/docs/start-hosted-checkout).

Next: [Hosted checkout](/docs/hosted-checkout) or [e-Wallet API](/docs/e-wallet-api).




## page 5


---
updatedAt: 2026-10-06T09:02:23.000Z
agentTools:
  projectIndex: https://developer.sifalopay.com/llms.txt
---

# Hosted checkout

Get key and token, send the customer to Sifalo’s page, verify sid when they come back.

The customer pays on Sifalo’s page. They choose Waafi, eDahab, Premier Wallet, or card. You never take those details yourself.

**Testing on staging?** Use the `.net` hosts from [Sandbox](/docs/sandbox). Examples below use live hosts.

Already have their wallet number? Use the [e-Wallet API](/docs/e-wallet-api) instead.

```mermaid
sequenceDiagram
  participant App as Your server
  participant GW as Sifalo gateway
  participant Cust as Customer
  participant CO as Checkout page
  App->>GW: POST /gateway/ gateway=checkout
  GW-->>App: key + token
  App->>Cust: Redirect to /checkout/?key=&token=
  Cust->>CO: Pay
  CO->>Cust: Return URL + sid
  Cust->>App: Browser hits return_url?sid=
  App->>GW: POST /gateway/verify.php sid
  GW-->>App: status + code
```

You need [API keys](/docs/create-api-keys) and [Basic auth](/docs/authentication).

|          | URL                                  |
| -------- | ------------------------------------ |
| Gateway  | `https://api.sifalopay.com/gateway/` |
| Checkout | `https://pay.sifalo.com/checkout/`   |

## 1. Get key + token

Call this from your server:

```bash
curl -X POST "https://api.sifalopay.com/gateway/" \
  -u "$SIFALO_API_USER:$SIFALO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "22",
    "gateway": "checkout",
    "currency": "USD",
    "return_url": "https://example.com/pay/return?order_id=123",
    "webhook_url": "https://example.com/hooks/sifalopay"
  }'
```

| Field         | Required                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- |
| `amount`      | Yes                                                                                         |
| `gateway`     | Yes, `"checkout"`                                                                           |
| `currency`    | Yes, `USD`                                                                                  |
| `return_url`  | Yes. Put `order_id` on the query string.                                                    |
| `webhook_url` | Optional. Public HTTPS URL we POST after the customer pays. See [Webhooks](/docs/webhooks). |

Response:

```json
{ "key": "YWVm=.........", "token": "uVKqEYi......." }
```

<Callout icon="📘" theme="info">
  Put `order_id` on `return_url`. Without `return_url` you won’t get `sid` back.
</Callout>

## 2. Redirect

```
https://pay.sifalo.com/checkout/?key=YWVm=.........&token=uVKqEYi.......
```

When they’re done they land on something like:

```
https://example.com/pay/return?order_id=123&sid=ABC123
```

Read `sid` from the query string.

If the checkout page returns **403**, the payment link is inactive or not allowed — start a new session. **410** means the token expired — call `POST /gateway/` again for a fresh `key` and `token`.

## 3. Verify

On the server, when `return_url` is hit. Verify does **not** use Basic auth. If you passed `webhook_url` on start, you also get a push when payment finishes — still verify as a backup.

```bash
curl -X POST "https://api.sifalopay.com/gateway/verify.php" \
  -H "Content-Type: application/json" \
  -d '{"sid":"ABC123"}'
```

Mark the order paid only if `status` is `success` and `code` is `601`.

```json
{
  "sid": "ABC123",
  "account": "25262XXXXXXX",
  "payment_type": "EDAHAB",
  "amount": "1",
  "currency": "USD",
  "response": "Your Transaction has been Processed!",
  "status": "success",
  "code": 601
}
```

Use `sid` when you have it. `order_id` works as a fallback but only the most recent payment for that id is returned.

`payment_type` is `EDAHAB`, `ZAAD` (Waafi — not `"WAAFI"`), `PREMIER WALLET`, or `CARD`.

Set gateway timeouts to **120 seconds**. Staging: [Sandbox](/docs/sandbox). PHP and Node: [Hosted checkout (PHP / Node)](/docs/start-hosted-checkout).

You can also send a product, invoice, or payment link from the Business portal. No `key`/`token` call for that.

## Next

<Cards>
  <Card title="Hosted checkout (PHP / Node)" href="/docs/start-hosted-checkout" icon="fa-duotone fa-code">
    Curl, PHP, and Node
  </Card>
  <Card title="e-Wallet API" href="/docs/e-wallet-api" icon="fa-duotone fa-wallet">
    Charge a wallet you already have
  </Card>
</Cards>

<support@sifalo.com>



## page 6



---
updatedAt: 2026-10-06T09:02:23.000Z
agentTools:
  projectIndex: https://developer.sifalopay.com/llms.txt
---

# Hosted checkout

Get key and token, send the customer to Sifalo’s page, verify sid when they come back.

The customer pays on Sifalo’s page. They choose Waafi, eDahab, Premier Wallet, or card. You never take those details yourself.

**Testing on staging?** Use the `.net` hosts from [Sandbox](/docs/sandbox). Examples below use live hosts.

Already have their wallet number? Use the [e-Wallet API](/docs/e-wallet-api) instead.

```mermaid
sequenceDiagram
  participant App as Your server
  participant GW as Sifalo gateway
  participant Cust as Customer
  participant CO as Checkout page
  App->>GW: POST /gateway/ gateway=checkout
  GW-->>App: key + token
  App->>Cust: Redirect to /checkout/?key=&token=
  Cust->>CO: Pay
  CO->>Cust: Return URL + sid
  Cust->>App: Browser hits return_url?sid=
  App->>GW: POST /gateway/verify.php sid
  GW-->>App: status + code
```

You need [API keys](/docs/create-api-keys) and [Basic auth](/docs/authentication).

|          | URL                                  |
| -------- | ------------------------------------ |
| Gateway  | `https://api.sifalopay.com/gateway/` |
| Checkout | `https://pay.sifalo.com/checkout/`   |

## 1. Get key + token

Call this from your server:

```bash
curl -X POST "https://api.sifalopay.com/gateway/" \
  -u "$SIFALO_API_USER:$SIFALO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "22",
    "gateway": "checkout",
    "currency": "USD",
    "return_url": "https://example.com/pay/return?order_id=123",
    "webhook_url": "https://example.com/hooks/sifalopay"
  }'
```

| Field         | Required                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- |
| `amount`      | Yes                                                                                         |
| `gateway`     | Yes, `"checkout"`                                                                           |
| `currency`    | Yes, `USD`                                                                                  |
| `return_url`  | Yes. Put `order_id` on the query string.                                                    |
| `webhook_url` | Optional. Public HTTPS URL we POST after the customer pays. See [Webhooks](/docs/webhooks). |

Response:

```json
{ "key": "YWVm=.........", "token": "uVKqEYi......." }
```

<Callout icon="📘" theme="info">
  Put `order_id` on `return_url`. Without `return_url` you won’t get `sid` back.
</Callout>

## 2. Redirect

```
https://pay.sifalo.com/checkout/?key=YWVm=.........&token=uVKqEYi.......
```

When they’re done they land on something like:

```
https://example.com/pay/return?order_id=123&sid=ABC123
```

Read `sid` from the query string.

If the checkout page returns **403**, the payment link is inactive or not allowed — start a new session. **410** means the token expired — call `POST /gateway/` again for a fresh `key` and `token`.

## 3. Verify

On the server, when `return_url` is hit. Verify does **not** use Basic auth. If you passed `webhook_url` on start, you also get a push when payment finishes — still verify as a backup.

```bash
curl -X POST "https://api.sifalopay.com/gateway/verify.php" \
  -H "Content-Type: application/json" \
  -d '{"sid":"ABC123"}'
```

Mark the order paid only if `status` is `success` and `code` is `601`.

```json
{
  "sid": "ABC123",
  "account": "25262XXXXXXX",
  "payment_type": "EDAHAB",
  "amount": "1",
  "currency": "USD",
  "response": "Your Transaction has been Processed!",
  "status": "success",
  "code": 601
}
```

Use `sid` when you have it. `order_id` works as a fallback but only the most recent payment for that id is returned.

`payment_type` is `EDAHAB`, `ZAAD` (Waafi — not `"WAAFI"`), `PREMIER WALLET`, or `CARD`.

Set gateway timeouts to **120 seconds**. Staging: [Sandbox](/docs/sandbox). PHP and Node: [Hosted checkout (PHP / Node)](/docs/start-hosted-checkout).

You can also send a product, invoice, or payment link from the Business portal. No `key`/`token` call for that.

## Next

<Cards>
  <Card title="Hosted checkout (PHP / Node)" href="/docs/start-hosted-checkout" icon="fa-duotone fa-code">
    Curl, PHP, and Node
  </Card>
  <Card title="e-Wallet API" href="/docs/e-wallet-api" icon="fa-duotone fa-wallet">
    Charge a wallet you already have
  </Card>
</Cards>

<support@sifalo.com>




## page 7



---
updatedAt: 2026-10-06T06:40:48.000Z
agentTools:
  projectIndex: https://developer.sifalopay.com/llms.txt
---

# e-Wallet API

Charge a wallet from your server. Charge, read the code, verify if you need to.

Your backend already has the customer’s wallet number. You post JSON and get a result back.

<Callout icon="📘" theme="info">
  **Testing on staging?** Use the `.net` hosts from [Sandbox](/docs/sandbox). Examples below use live hosts.
</Callout>

If you’d rather not collect the phone, use [hosted checkout](/docs/hosted-checkout).

Keep API keys on the server.

`POST https://api.sifalopay.com/gateway/` with [HTTP Basic](/docs/authentication). Timeout **120 seconds** — eDahab is often slow. Optional: pass `webhook_url` to get status pushed to your server ([Webhooks](/docs/webhooks)). You can still look up status with verify.

## 1. Charge

```bash
curl -X POST "https://api.sifalopay.com/gateway/" \
  -u "$SIFALO_API_USER:$SIFALO_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 120 \
  -d '{
    "account": "25262XXXXXXX",
    "gateway": "edahab",
    "amount": "100",
    "currency": "USD",
    "order_id": "ABC123"
  }'
```

Placeholders, not sandbox numbers. Test wallets: [Sandbox](/docs/sandbox).

| Field         | Required                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `account`     | Yes. eDahab: `62…` or `25262…`. Waafi: `61…` / `63…` or `25261…` / `25263…`. Premier sandbox: `00…`. |
| `gateway`     | Yes: `waafi`, `edahab`, or `pbwallet`                                                                |
| `amount`      | Yes                                                                                                  |
| `currency`    | Yes: `USD` or `SLSH` (not `SOS`). Premier Wallet is USD only.                                        |
| `order_id`    | Recommended                                                                                          |
| `webhook_url` | Optional. Public HTTPS URL we POST after the charge finishes. See [Webhooks](/docs/webhooks).        |

| `gateway`  | Method                           |
| ---------- | -------------------------------- |
| `waafi`    | Waafi, and also EVC, ZAAD, SAHAL |
| `edahab`   | eDahab                           |
| `pbwallet` | Premier Wallet                   |

Cards go through [hosted checkout](/docs/hosted-checkout). Refunds: [Refunds](/docs/refunds). PHP / Node: [e-Wallet (PHP / Node)](/docs/charge-mobile-money).

## 2. Read the code

HTTP is usually `200`. Look at `code`.

| `code` | Meaning              | What to do                                                                               |
| ------ | -------------------- | ---------------------------------------------------------------------------------------- |
| `601`  | Paid                 | Save `sid`, mark the order paid                                                          |
| `603`  | Waiting on the phone | Ask them to approve, then poll verify. Don’t charge again. Stop on `601` or `600`/`604`. |
| `604`  | Not enough balance   | Ask them to top up                                                                       |
| `600`  | Failed               | Show `response`                                                                          |

Auth and validation errors (`0`, `"404"`): [Decline codes](/docs/decline-and-timeout).

```json
{
  "code": "601",
  "sid": "ABCDEF",
  "response": "Your Transaction has been Processed!"
}
```

Save `sid` every time. You need it to verify and to refund. Full list: [Decline codes](/docs/decline-and-timeout).

## 3. Verify (when you need it)

After `603`, after a timeout, or whenever you want the latest status. Verify does **not** use Basic auth.

```bash
curl -X POST "https://api.sifalopay.com/gateway/verify.php" \
  -H "Content-Type: application/json" \
  -d '{"sid":"ABCDEF"}'
```

Mark paid only if `status` is `success` and `code` is `601`. `amount` is what the customer paid.

```json
{
  "sid": "ABCDEF",
  "account": "25262XXXXXXX",
  "payment_type": "EDAHAB",
  "amount": "100",
  "currency": "USD",
  "response": "Your Transaction has been Processed!",
  "status": "success",
  "code": 601
}
```

`payment_type` is `EDAHAB`, `ZAAD` (Waafi — not `"WAAFI"`), `PREMIER WALLET`, or `CARD`.

Prefer `sid`. With only `order_id`, you get the most recent payment for that id.

If the charge call times out, verify before you charge again. For push updates on e-Wallet charges, see [Webhooks](/docs/webhooks).

## Next

<Cards>
  <Card title="Webhooks" href="/docs/webhooks" icon="fa-duotone fa-bolt">
    Optional push after a charge
  </Card>
  <Card title="Waafi" href="/docs/waafi" icon="fa-duotone fa-mobile">
    Including EVC, ZAAD, and SAHAL
  </Card>
  <Card title="eDahab" href="/docs/edahab" icon="fa-duotone fa-mobile">
    120 second timeout
  </Card>
  <Card title="Premier Wallet" href="/docs/premier-wallet" icon="fa-duotone fa-wallet">
    USD only
  </Card>
  <Card title="Refunds" href="/docs/refunds" icon="fa-duotone fa-rotate-left">
    Refund with the original sid
  </Card>
  <Card title="e-Wallet (PHP / Node)" href="/docs/charge-mobile-money" icon="fa-duotone fa-code">
    Curl, PHP, and Node
  </Card>
</Cards>










# Sifalo Pay --- Integration Guide (PERN / Node.js)

> **Purpose:** A practical, original-language implementation reference
> for integrating Sifalo Pay with a React + Node.js + Express +
> PostgreSQL application.
>
> **Source documentation:**
> https://developer.sifalopay.com/docs/getting-started\
> **Important:** This file is a structured implementation guide and
> summary with links to the official pages, not a verbatim mirror of the
> entire third-party documentation site. Check the official docs for the
> latest field requirements, endpoint behavior, and any pages not
> summarized here.

## Contents

1.  [Overview](#1-overview)
2.  [Choose the integration](#2-choose-the-integration)
3.  [Environments and URLs](#3-environments-and-urls)
4.  [Create API credentials](#4-create-api-credentials)
5.  [Hosted Checkout flow](#5-hosted-checkout-flow)
6.  [e-Wallet API flow](#6-e-wallet-api-flow)
7.  [Payment codes and verification](#7-payment-codes-and-verification)
8.  [Webhooks](#8-webhooks)
9.  [PERN project setup](#9-pern-project-setup)
10. [Express implementation example](#10-express-implementation-example)
11. [PostgreSQL schema example](#11-postgresql-schema-example)
12. [Subscription billing design](#12-subscription-billing-design)
13. [Security and reliability
    checklist](#13-security-and-reliability-checklist)
14. [Testing and going live](#14-testing-and-going-live)
15. [Official docs index](#15-official-docs-index)
16. [Images and diagrams](#16-images-and-diagrams)

------------------------------------------------------------------------

## 1. Overview

Sifalo Pay supports payment methods including Waafi (including EVC, ZAAD
and SAHAL), eDahab, Premier Wallet, and card payments through hosted
checkout.

Key rules:

-   Keep the API username and API key on the **server only**.
-   Start with staging/sandbox and switch to live credentials only after
    testing.
-   Treat a payment as paid only after server-side verification confirms
    `status === "success"` and `code === 601`.
-   Save the provider transaction/session identifier (`sid`) and your
    own order identifier.
-   Do not grant a subscription based only on a browser redirect or a
    frontend success message.

Official start page:
https://developer.sifalopay.com/docs/getting-started

## 2. Choose the integration

### Option A --- Hosted Checkout (usually best for subscriptions)

Your server creates a checkout session, then redirects the customer to
Sifalo's hosted payment page. The customer chooses a supported payment
method there. Your app does not collect wallet or card details directly.

Use this when: - You want customers to choose their payment method on
Sifalo's page. - You prefer not to collect wallet/card information in
your UI. - You need card payments alongside supported wallets.

Official guide: https://developer.sifalopay.com/docs/hosted-checkout

### Option B --- e-Wallet API

Your backend sends a wallet/account number and payment details to the
gateway. This is appropriate only when your product flow already
collects the customer's wallet number and you have a valid reason to
charge that wallet directly.

Official guide: https://developer.sifalopay.com/docs/e-wallet-api

### Quick comparison

  -----------------------------------------------------------------------
  Feature                 Hosted Checkout         e-Wallet API
  ----------------------- ----------------------- -----------------------
  Customer chooses        Yes                     No; your server
  payment method on                               specifies a wallet
  Sifalo page                                     gateway

  Your app handles wallet Usually no              Yes
  number                                          

  Cards                   Supported through       Use hosted checkout
                          checkout                

  Currency                USD only, according to  USD or SLSH; Premier
                          the getting-started     Wallet is USD only
                          guide                   

  Recommended starting    Most web subscriptions  When you already have
  point                                           the wallet number
  -----------------------------------------------------------------------

## 3. Environments and URLs

Use the correct environment consistently. Staging credentials and live
credentials are not interchangeable.

  ------------------------------------------------------------------------------------------------------------------------
  Environment       Merchant portal          Gateway                                  Hosted checkout
  ----------------- ------------------------ ---------------------------------------- ------------------------------------
  Staging           https://pay.sifalo.net   `https://spay-api.sifalo.net/gateway/`   `https://pay.sifalo.net/checkout/`

  Live              https://pay.sifalo.com   `https://api.sifalopay.com/gateway/`     `https://pay.sifalo.com/checkout/`
  ------------------------------------------------------------------------------------------------------------------------

Currencies listed by the official guide are `USD` and `SLSH` --- **not**
`SOS`. Hosted checkout is USD-only; Premier Wallet is USD-only.

## 4. Create API credentials

1.  Register in the staging portal: https://pay.sifalo.net/auth/signup
2.  Enable two-factor authentication (2FA).
3.  Open **Merchant → API**.
4.  Create an API key and copy the username and key.
5.  Put them in server environment variables, not in React source code,
    mobile apps, Git, or public config.
6.  Create a separate live key when you are ready to launch.

Example `.env`:

``` dotenv
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SIFALO_ENV=staging
SIFALO_API_USER=your_staging_username
SIFALO_API_KEY=your_staging_api_key
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

Do not commit `.env`. Add it to `.gitignore`. Do not reuse real
credentials in screenshots, logs, issue trackers, or AI prompts.

Official guide: https://developer.sifalopay.com/docs/create-api-keys

### Authentication

Gateway charge/session creation requests use HTTP Basic authentication:

``` text
Authorization: Basic base64(username:api_key)
```

The verify endpoint is documented as **not** requiring Basic
authentication. Never expose the username or key to the browser.

Official guide: https://developer.sifalopay.com/docs/authentication

## 5. Hosted Checkout flow

### Flow

``` mermaid
sequenceDiagram
    participant U as Customer
    participant R as React app
    participant E as Express API
    participant S as Sifalo gateway
    participant C as Sifalo checkout
    participant D as PostgreSQL

    U->>R: Click Subscribe / Pay
    R->>E: POST /api/payments/checkout
    E->>D: Create pending order
    E->>S: POST /gateway/ with Basic auth
    S-->>E: key + token
    E-->>R: checkout URL
    R->>C: Redirect customer
    U->>C: Complete payment
    C-->>R: Return URL with sid
    R->>E: Send sid/order reference for status check
    E->>S: POST /gateway/verify.php
    S-->>E: status + code
    E->>D: Mark paid only if verified
    E-->>R: Verified payment result
```

### Step 1: Create a checkout session on the server

Send a server-side `POST` request to the environment's gateway URL. For
hosted checkout, the documented request includes `amount`,
`gateway: "checkout"`, `currency: "USD"`, and a `return_url`. A public
HTTPS `webhook_url` is optional.

Illustrative cURL request (live host shown; use the staging host while
testing):

``` bash
curl -X POST "https://api.sifalopay.com/gateway/" \
  -u "$SIFALO_API_USER:$SIFALO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "22",
    "gateway": "checkout",
    "currency": "USD",
    "return_url": "https://example.com/pay/return?order_id=ORDER-123",
    "webhook_url": "https://example.com/api/payments/sifalo-webhook"
  }'
```

The response contains `key` and `token`. Your server uses them to build
the checkout URL:

``` text
https://pay.sifalo.com/checkout/?key=CHECKOUT_KEY&token=CHECKOUT_TOKEN
```

For staging, use `https://pay.sifalo.net/checkout/`.

**Important:** Include your own `order_id` in `return_url`; without a
return URL you will not receive the expected `sid` return flow. Never
trust the amount or order ID coming back from the browser without
checking your database.

### Step 2: Redirect the customer

Your backend should return the checkout URL to React. React can then use
`window.location.assign(checkoutUrl)` after validating that the response
came from your own backend.

Do not construct a checkout session in frontend JavaScript because the
API credentials must remain private.

### Step 3: Verify the payment on the server

The customer may return to a URL such as:

``` text
/pay/return?order_id=ORDER-123&sid=PROVIDER_SESSION_ID
```

Read `sid` and verify it from Express by calling:

``` bash
curl -X POST "https://api.sifalopay.com/gateway/verify.php" \
  -H "Content-Type: application/json" \
  -d '{"sid":"PROVIDER_SESSION_ID"}'
```

Mark the order paid only when the verification result has both
`status: "success"` and `code: 601`. Prefer `sid` for lookup. The
official guide warns that looking up only by `order_id` returns the most
recent payment for that ID.

The docs mention: - `403` from checkout: the payment link is inactive or
not allowed; create a new session. - `410` from checkout: the token
expired; request a new `key` and `token`. - Set request timeouts to 120
seconds where appropriate.

Official guide: https://developer.sifalopay.com/docs/hosted-checkout

## 6. e-Wallet API flow

Use this flow only if your backend already has the customer's wallet
number and you intend to charge that wallet.

### Example request

``` bash
curl -X POST "https://api.sifalopay.com/gateway/" \
  -u "$SIFALO_API_USER:$SIFALO_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 120 \
  -d '{
    "account": "25262XXXXXXX",
    "gateway": "edahab",
    "amount": "100",
    "currency": "USD",
    "order_id": "ORDER-123"
  }'
```

Replace placeholders with valid values. Use the staging gateway and test
wallets while testing.

  -----------------------------------------------------------------------
  Field                               Meaning
  ----------------------------------- -----------------------------------
  `account`                           Customer wallet/account identifier

  `gateway`                           `waafi`, `edahab`, or `pbwallet`

  `amount`                            Amount to charge; validate and
                                      calculate it on your server

  `currency`                          `USD` or `SLSH`; Premier Wallet is
                                      USD-only

  `order_id`                          Your internal order reference;
                                      recommended

  `webhook_url`                       Optional public HTTPS endpoint for
                                      the result
  -----------------------------------------------------------------------

Gateway mapping: - `waafi`: Waafi, including EVC, ZAAD, and SAHAL -
`edahab`: eDahab - `pbwallet`: Premier Wallet - Cards: use hosted
checkout

### Interpreting the charge response

-   `601`: payment succeeded; save `sid` and mark paid after applying
    your verification policy.
-   `603`: pending/customer approval needed; verify/poll later and do
    not create a duplicate charge.
-   `604`: insufficient balance; ask the customer to top up.
-   `600`: failed; show a safe, customer-friendly version of the
    response.
-   Authentication/validation errors: inspect the official decline-code
    page.

If a charge request times out, verify the transaction before retrying. A
timeout does not prove that the payment failed.

Official guide: https://developer.sifalopay.com/docs/e-wallet-api

## 7. Payment codes and verification

The main success condition documented by Sifalo is:

``` js
status === "success" && Number(code) === 601
```

Do not mark an invoice or subscription paid because: - the customer
landed on a success page; - React received a success-looking query
string; - the HTTP status was `200`; - a charge request timed out; - the
user claims the wallet prompt was approved.

The gateway may return HTTP 200 even when the transaction failed or is
pending. Interpret the JSON response fields.

  -----------------------------------------------------------------------
  Code                    Meaning                 Suggested app behavior
  ----------------------- ----------------------- -----------------------
  `601`                   Paid/success            Verify, save `sid`,
                                                  activate the purchased
                                                  entitlement

  `603`                   Pending                 Display pending state
                                                  and check verification;
                                                  do not charge again

  `604`                   Insufficient balance    Tell the customer to
                                                  add funds and retry
                                                  only after resolving
                                                  the existing attempt

  `600`                   Failed                  Show a safe error and
                                                  let the user try again
                                                  when appropriate

  Other/error codes       May indicate validation Log safely and consult
                          or authentication       the official reference
                          errors                  
  -----------------------------------------------------------------------

Official decline/timeouts guide:
https://developer.sifalopay.com/docs/decline-and-timeout

## 8. Webhooks

A webhook is an optional public HTTPS endpoint to which Sifalo sends a
POST when a charge completes. It is supported for e-Wallet charges and
hosted checkout. For hosted checkout, send `webhook_url` when creating
the checkout session.

Recommended webhook handling: 1. Accept `POST` JSON on a public HTTPS
URL. 2. Parse and validate the payload. 3. Find the local order using
your internal order reference and/or `sid`. 4. Check the amount and
currency against the expected local order. 5. Apply the success
condition (`status === "success"` and `code === 601`). 6. Make updates
idempotent so repeated callbacks cannot grant the same subscription
twice. 7. Return HTTP 200 quickly after processing or safely recording
the event. 8. Keep the verify endpoint as a backup/reconciliation
mechanism.

**Important documented limitation:** The webhook fires once for the
completion result of that charge request (for example, `601`, `603`,
`600`, or `604`). If a pending payment later changes to paid outside
that request, a second webhook is not guaranteed; use verification to
retrieve the latest state.

Do not use a checkout `return_url` as the webhook URL. They serve
different purposes: the return URL is a browser redirect; the webhook is
a server-to-server notification.

Official guide: https://developer.sifalopay.com/docs/webhooks

## 9. PERN project setup

Suggested structure:

``` text
server/
  src/
    app.js
    routes/
      payment.routes.js
      webhook.routes.js
    controllers/
      payment.controller.js
    services/
      sifalo.service.js
      subscription.service.js
    db/
      pool.js
  .env
  package.json

client/
  src/
    pages/
      Pricing.jsx
      PaymentReturn.jsx
    services/
      api.js
```

Install typical backend packages:

``` bash
npm install express pg dotenv
```

If your app already has Express, `pg`, and `dotenv`, do not install
duplicates. Use your existing database pool and
validation/error-handling conventions.

## 10. Express implementation example

This is an illustrative starter pattern, not a complete provider SDK.
Test against staging and adapt it to the current official docs.

### `sifalo.service.js`

``` js
const gatewayUrl =
  process.env.SIFALO_ENV === "live"
    ? "https://api.sifalopay.com/gateway/"
    : "https://spay-api.sifalo.net/gateway/";

const checkoutBase =
  process.env.SIFALO_ENV === "live"
    ? "https://pay.sifalo.com/checkout/"
    : "https://pay.sifalo.net/checkout/";

function basicAuthHeader() {
  const user = process.env.SIFALO_API_USER;
  const key = process.env.SIFALO_API_KEY;

  if (!user || !key) {
    throw new Error("Sifalo API credentials are not configured");
  }

  return `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`;
}

export async function createCheckoutSession({ amount, orderId, serverUrl }) {
  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(amount),
      gateway: "checkout",
      currency: "USD",
      return_url: `${serverUrl}/api/payments/return?order_id=${encodeURIComponent(orderId)}`,
      webhook_url: `${serverUrl}/api/payments/sifalo-webhook`,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const data = await response.json();

  if (!response.ok || !data.key || !data.token) {
    throw new Error("Could not create Sifalo checkout session");
  }

  const url = new URL(checkoutBase);
  url.searchParams.set("key", data.key);
  url.searchParams.set("token", data.token);

  return { checkoutUrl: url.toString() };
}

export async function verifyPayment({ sid }) {
  const response = await fetch(
    process.env.SIFALO_ENV === "live"
      ? "https://api.sifalopay.com/gateway/verify.php"
      : "https://spay-api.sifalo.net/gateway/verify.php",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid }),
      signal: AbortSignal.timeout(120_000),
    }
  );

  if (!response.ok) {
    throw new Error("Sifalo verification request failed");
  }

  return response.json();
}
```

### Example route/controller responsibilities

``` js
// Pseudocode: integrate with your existing authentication, validation,
// database transactions, and error middleware.

POST /api/payments/checkout
  - require authenticated user
  - validate selected plan against server-side plan table
  - calculate price on server (never trust amount sent by React)
  - create a local pending order/payment attempt in PostgreSQL
  - call createCheckoutSession(...)
  - save safe session/order metadata
  - return { checkoutUrl }

GET /api/payments/return
  - read order_id and sid
  - do not trust the browser redirect as proof of payment
  - call verifyPayment({ sid })
  - compare verified amount/currency/order with local pending order
  - update payment + subscription atomically if successful
  - redirect to a frontend result page

POST /api/payments/sifalo-webhook
  - parse payload
  - locate the matching local payment
  - verify/reconcile when necessary
  - perform an idempotent database update
  - return HTTP 200 promptly
```

Avoid blindly copying this example into production. Add schema
validation, request logging with secrets removed, rate limiting where
suitable, database transactions, and idempotency controls. Verify the
current provider endpoint details before deployment.

## 11. PostgreSQL schema example

A minimal illustrative schema for subscription checkout:

``` sql
CREATE TABLE payment_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  plan_code TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'SLSH')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired')),
  provider TEXT NOT NULL DEFAULT 'sifalopay',
  provider_sid TEXT UNIQUE,
  provider_order_id TEXT UNIQUE NOT NULL,
  provider_code TEXT,
  provider_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  billing_interval TEXT NOT NULL
    CHECK (billing_interval IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  payment_order_id BIGINT REFERENCES payment_orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payment_orders_user_created_idx
  ON payment_orders(user_id, created_at DESC);
```

Adapt `user_id` types and foreign keys to your actual schema. Consider
separate `payment_attempts` and webhook-event tables if you need
multiple retries and a durable event audit trail. Do not store API keys
in these tables.

## 12. Subscription billing design

Sifalo Pay checkout handles the payment transaction; your own
application must manage plan rules, renewals, and subscription
entitlements.

Recommended flow for monthly/yearly plans:

1.  React shows plans and prices retrieved from your backend.
2.  Customer selects a plan.
3.  Backend looks up the authoritative price in PostgreSQL.
4.  Backend creates a pending payment order with a unique internal order
    ID.
5.  Backend creates a hosted checkout session and returns the checkout
    URL.
6.  Customer pays on Sifalo's page.
7.  Return URL and/or webhook reaches your server.
8.  Server verifies the payment and matches amount/currency/order.
9.  In a database transaction, mark the order paid and activate/extend
    the subscription exactly once.
10. A scheduled job checks subscription expiry and sends reminders if
    needed.

### Important recurring-payment distinction

Do not assume that a hosted checkout integration automatically charges
customers every month or year. The pages summarized here describe
initiating and verifying a payment. Unless the current Sifalo
documentation explicitly provides recurring billing/mandates and you
have implemented them, treat monthly/yearly as **subscription periods
that customers pay for manually**. Confirm recurring-charge support with
Sifalo before promising automatic renewals.

## 13. Security and reliability checklist

-   [ ] API username/key are server-only and excluded from Git.
-   [ ] 2FA is enabled on the merchant portal.
-   [ ] Staging and live credentials/hosts are kept separate.
-   [ ] Plan, amount, currency, and order ownership are checked on the
    backend.
-   [ ] Payment is activated only after server-side verification.
-   [ ] `sid` and your internal order ID are stored.
-   [ ] A timeout is reconciled by verification before retrying a
    charge.
-   [ ] `603` pending payments are not immediately treated as failed or
    paid.
-   [ ] Webhook handling is idempotent.
-   [ ] Payment state updates and subscription activation use a database
    transaction.
-   [ ] Logs do not contain API keys, Basic-auth headers, full payment
    tokens, or unnecessary personal data.
-   [ ] HTTPS is used for public return/webhook endpoints in production.
-   [ ] A reconciliation job checks old pending payments.
-   [ ] The live environment is tested carefully with a low-value real
    transaction before broad release.

## 14. Testing and going live

### Staging hosts

-   Gateway: `https://spay-api.sifalo.net/gateway/`
-   Checkout: `https://pay.sifalo.net/checkout/`
-   Portal: https://pay.sifalo.net

The official sandbox page lists test wallets for success, failure,
pending, and insufficient balance. It also lists test card numbers for
hosted checkout. Use those values **only** in staging, never for live
payments.

Official sandbox guide: https://developer.sifalopay.com/docs/sandbox

### Before going live

1.  Register on the live portal: https://pay.sifalo.com
2.  Create live API credentials.
3.  Switch the gateway to `https://api.sifalopay.com/gateway/`.
4.  Switch hosted checkout to `https://pay.sifalo.com/checkout/`.
5.  Set production environment variables securely.
6.  Verify success, failure, pending, insufficient balance, timeout,
    duplicate callback, and customer-closes-checkout scenarios.
7.  Confirm subscriptions cannot be activated twice by return URL plus
    webhook.
8.  Monitor payment failures and reconcile pending orders.

## 15. Official docs index

The developer portal says each documentation page can be requested in
Markdown by appending `.md` to its page URL. It also provides an
AI-oriented index at `https://developer.sifalopay.com/llms.txt`. Use
these official pages for the complete and current source material:

  ----------------------------------------------------------------------------------------------
  Topic                               Official page
  ----------------------------------- ----------------------------------------------------------
  Getting started / overview          https://developer.sifalopay.com/docs/getting-started

  API key creation                    https://developer.sifalopay.com/docs/create-api-keys

  Authentication                      https://developer.sifalopay.com/docs/authentication

  Sandbox and staging                 https://developer.sifalopay.com/docs/sandbox

  Hosted Checkout                     https://developer.sifalopay.com/docs/hosted-checkout

  e-Wallet API                        https://developer.sifalopay.com/docs/e-wallet-api

  Webhooks                            https://developer.sifalopay.com/docs/webhooks

  Decline codes and timeouts          https://developer.sifalopay.com/docs/decline-and-timeout

  e-Wallet code examples (PHP / Node) https://developer.sifalopay.com/docs/charge-mobile-money
  ----------------------------------------------------------------------------------------------

Other related pages are linked from the official docs navigation,
including provider-specific notes for Waafi, eDahab, Premier Wallet,
refunds, and hosted-checkout code examples. Follow the portal's current
navigation/index for any new pages added after this guide was prepared.

## 16. Images and diagrams

The pages inspected for this guide primarily present text, code samples,
tables, and an integration sequence diagram rather than a collection of
downloadable image assets. The sequence diagram in Section 5 is embedded
as Mermaid source, so Markdown viewers that support Mermaid can render
it. If the official site adds or changes image assets, use the original
page links in Section 15 to view those assets in context.

------------------------------------------------------------------------

## Source and update note

Prepared from the publicly accessible Sifalo Pay developer documentation
pages linked above, inspected on **12 October 2026**. This is a
practical integration reference, not a replacement for the provider's
live documentation or support. Recheck the official docs before
production deployment.