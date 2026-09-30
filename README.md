<h1>
  <img src="app/assets/olvid_name_logo.png" alt="Alerting Bot logo" width="200" align="bottom" />
  Alerting
</h1>

---

# About
## Overview
**Olvid Alerting** is a self-hosted web app that watches external data sources and 
routes the resulting notifications to a channel of your choice, including Olvid
messaging app and email. You author each alert in a web interface, and the app
takes care of scheduling, formatting and dispatching the messages. 

Olvid Alerting is made to work in Olvid with Olvid Bots gRPC API. Your alerts 
are transmitted to a configurable Olvid identity and supports groups discussions
and Olvid Keycloak plugin. This app comes with a built-in secure authentication 
method using Olvid DMs to make password usage optional.



Olvid Alerting covers three differents kinds of alerts among the most common on the web :
- **Webhook alerts** : The app exposes an inbound URL and reacts to whatever
  a third-party (GitHub, Grafana, Sentry, your own scripts…) POSTs to it.
- **Data Polling alerts** : Periodically fetch a URL, parse the JSON / XML /
  HTML response, evaluated the selected watched field(s) and fire when they satisfy the
  specified trigger condition (crosses a threshold, change from previous value, matches a value).   
- **Monitoring alerts** : Periodically probe an HTTP endpoint and fire on the
  HTTP status classes you care about (5xx, non-2xx, specific codes, …). 

For more information on how to configure alerts see [Creating your first alert](#creating-your-first-alert).

A **format editor** lets you point-and-click at fields from a live sample
payload to build the outgoing message. The same editor lets you write full templates
against the parsed tree, with an inline Olvid-chat / email-card preview so
you always see what your recipients will see. You'll be able to style the message
using Olvid's native Markdown format, or standard HTML tags for emails. 

The email channel is still there as a fallback (for recipients who aren't on
Olvid), but Olvid is the recommended default : fewer moving parts, better
security posture, richer routing (groups) and secure authentication.

## Architecture

This app uses Docker Compose to create two containers :
- **daemon** : Olvid Client daemon, which manages bot identity and communicates with Olvid contacts.
- **app** : Nuxt web app to use in browser. Communicates with Olvid daemon to fetch
  notifications and send messages. It uses an SQLite database with Prisma to store app data.

A **cli** container can be ran to interact with daemon via the CLI tool.

Olvid Alerting can be deployed on an internal network, but if you want to use Webhooks,
you may want to setup a reverse proxy that point on the Nuxt app like nginx or Caddy to redirect https requests.
By default, Docker publishes the app on port `:3000`.

---

# Usage


## Installation

### Requirements

Before starting, make sure you have:

- **Docker Desktop**, or Docker Engine + Compose v2
- **[Olvid](<https://olvid.io/>)** app installed (on phone or desktop) required to pair the bot (optional)
- SMTP server credentials if you want email delivery (optional)

### Get the code

Clone the repository :
```bash
git clone https://github.com/olvid/alerting-bot.git
cd alerting-bot
```

## ⚙️ Configuration

### Prepare the environment file

From the project root, copy the template:

```bash
cp .env.example .env
```

You'll fill `.env` progressively over the next four steps. Every code block
below points at one or more variables to set in that file.

### 🤖 Pair the Olvid daemon
The daemon is the bridge between Alerting Bot and the Olvid network.
Once paired, the daemon becomes the identity used to send all Olvid notifications.

**a) Start the daemon** in background with the following command:

```bash
docker compose up -d daemon
```

To confirm it started cleanly, follow its logs for a moment:

```bash
docker compose logs -f daemon
```

Once the log lines stop scrolling, press **Ctrl + C** to detach : the daemon keeps running in the background.

**b) Launch and follow the CLI through pairing.** The CLI walks you through the whole
flow. Annotated transcript below. The strings after `>` are what you type :

For further information on Olvid bots and CLI tool, you can read documentation [there](https://doc.bot.olvid.io/en/stable/index.html).

```bash
docker compose run --rm cli
```

```text
# Create a new identity. Replace FirstName, LastName, ... with your bot's
# persona. LastName, Position and Company are optional and editable later.
0 > identity new FirstName LastName

# A client key to connect to daemon is automatically created.
# Save it — you'll paste it into .env in the next step.
identity creation > Here is your client key to connect to daemon with this identity:
AAAAAAAA-BBBB-AAAA-AAAA-AAAAAAAAAAAA

# Enter "yes" so the bot appears in your personal Olvid contacts —
# required to start a 1-to-1 discussion with it later.
identity creation > Do you want to add this identity to your contacts ? (y/N)
> yes

# The CLI prints an Olvid invitation link. Open it in your web browser to
# show a QR you can scan with the Olvid mobile app, OR paste it into your
# Olvid desktop client.
identity creation > Send an invitation to this invitation link: https://invitation.olvid.io/#........

# The CLI now waits for the invitation to arrive from your phone.
# Once you accept on the phone, the two devices exchange short SAS codes.
identity creation > Please enter sas code displayed on the other device

# Type the 4-digit SAS code shown on your Olvid mobile app:
> 0000

# The CLI shows a 4-digit code — enter THIS code on your phone:
identity creation > Please enter this sas code on the other device: 1111

# Pairing is now complete.
Now using identity: 1
You can now send messages to <YOUR NAME> in discussion 1

# Quick sanity check — DM yourself:
1 > message send 1 Hello World !

# Exit the CLI when you're done (or press Ctrl + D).
1 > exit
```

**c) Copy the client key into `.env`.** Paste the value the CLI printed
(right after `Here is your client key…`) here:

```
OLVID_CLIENT_KEY=<the client key value the CLI printed>
```

In case you cleared the terminal or lost the key, you can retrieve it by running:
```bash
docker compose run --rm cli
0 > key get
```

The daemon is now paired with your Olvid identity, and the alerting bot is connected to the daemon on its turn.

### 🔐 Generate the auth secrets

Three random strings that only you know about :
- Login cookie signing
- First-admin setup key (for proof of initiating setup procedure)
- Olvid daemon admin secret

```bash
# Each key can be generated with
openssl rand -base64 32
```

Paste each into the matching line of `.env`:

```
NUXT_SESSION_PASSWORD=…first key…
ADMIN_KEY=…second key…
OLVID_ADMIN_CLIENT_KEY=…third key…
```

### ✉️ Configure email (optional)

Skip this step if you're happy with Olvid-only delivery. Set it up if you
want any of: email as a bundle output, invite-by-email, or password-reset by
email.


```
SMTP_HOST=<mail-server-hostname>
SMTP_PORT=<mail-server-port>
SMTP_USER=<mail-server-username>
SMTP_PASSWORD=<mail-server-password>
SMTP_FROM=Alerting Bot <noreply-alert@yourdomain.com>
```

`SMTP_FROM` must be a verified sender on your provider or delivery is
silently rejected.

## 🔨 Build & deployment

```bash
docker compose build app
```

Once logs hace stopped scrolling it means your docker container has been successfully built. 
You can now run the alerting-bot app. Make sure your daemon is also up so the connexion
can be correctly established.

```bash
docker compose up -d app
```

That's it : the alerting-bot app is live at <http://localhost:3000>, or change localhost by your deviceIP to allow LAN access.

If the Olvid daemon is off during startup or become unavailable during app execution, 
connection will be periodically attempted to be established 
(delay configurable with `UPDATER_TRY_AGAIN_DELAY` env variable, defaults at 2000ms).

### 👤Create the first admin account

Alerting Bot ships with zero users. 

1. Open the app — you'll land on `/setup` automatically.
2. Paste the `ADMIN_KEY` value from `.env` into the *Admin key* field. This
   proves you're the operator, not a random visitor who reached the URL
   first.
3. Choose a channel (Mail / Olvid / Link), enter a login (an email address if SMTP is on, otherwise any plain
   username) and optionally a display name.
4. Submit.
5. Click on the link received on the chosen delivery channel to choose authentication
methods, similarly to account creation.

From this point on every subsequent user is added by an admin from the `/users` page (see
[Managing users and authentication](#managing-users-and-authentication)).

---

# 📋Guideline

## Creating your first alert

Click **+ New Alert** in the sidebar. The wizard walks you through four
steps:

1. **General.** Give the alert a title + description. Pick a **Source** :
   *Data Polling*, *Monitoring*, or *Webhook*. 
2. **Trigger.** Configure the source :
   - **Polling** → URL to fetch, response format (JSON / XML / HTML), cron
     schedule.
   - **Monitoring** → URL to probe, cron schedule.
   - **Webhook** → Nothing to configure; the app generates an inbound URL
     and shows a copy button once the alert is saved.

   The wizard fetches a sample payload live so you can see the shape you'll
   be writing rules against.

3. **Condition.** Describe *when the alert should fire*. Webhook alerts
   skip this step : every incoming POST is treated as the fire event, so
   there is no condition to author.

   - **Polling alerts** : Click any value in the payload tree to insert
     its path (e.g. `root.data.item.price`) into a rule. A rule is one
     path + one comparison operator (`>`, `<`, `==`, `contains`,
     `changed`, …). You can add several rules and combine them:
     - **All of** (AND) : every rule must fire.
     - **Any of** (OR) : a single firing rule is enough.
     - **Sum / Average / Min / Max** — aggregate the numeric values
       across all matched paths into a single number, then compare it
       to the threshold (fires when e.g. *sum* > 100).

     **Wildcards.** Paths that contain a **double dot (`..`)** match
     zero or more segments, so one rule can cover a whole shape :
     - `root.items..price` → every `price` anywhere under `items`, no
       matter the depth or index.
     - `..error` → every `error` field wherever it appears in the
       response.
     - `sensors..[0].value` → the first `value` inside every sensor.

     A wildcard rule expands to one verdict per concrete match at eval
     time.

   - **Monitoring alerts** : status-match rule: specific codes
     (`404, 500`), a range (`2xx` / `3xx` / `4xx` / `5xx`), or the
     shortcut *any non-2xx*.

   - **Trigger mode** decides how the alert re-fires when the condition
     stays true :
     - **Every time** → fire on every poll while the condition is met.
     - **Once** → fire only when the condition transitions false → true.
     - **On recovery** → fire once when true, and again when it goes
       back to false (recovery message is prefixed `✓ RECOVERED:`).

4. **Bundles.** A **bundle** represents a group of discussions and the formatn
template that will be applied to the alert's message. An alert can carry many bundles : useful when different
   teams want the same alert phrased differently. For each bundle:
   - Pick a **channel** (Olvid or email), and add recipients.
     - Olvid → contacts *and groups* from the daemon's discussion list.
       Discussions the daemon already knows about show up in the selector
       automatically; adding a new one is one click.
     - Email → any address you type.
   - Pick a **format** : a plain summary, the raw payload, or a custom script
     template. Custom formats open a **full-screen editor** with a script (upper-left), 
     payload tree (lower-left, click to insert paths), and a
     live preview (right). 

## Testing an alert before going live

Monitoring and Polling alerts, once saved, have a **Run test** button in the view pane. It runs the
full pipeline (fetch → parse → evaluate → render bundles) *without
dispatching*, and opens a result modal showing what fired, why, and what
each bundle would have looked like. Ideal for tuning your condition or your
Handlebars template without spamming your Olvid contacts.

## Reading the dispatch log

Once the alert is active, a log panel will update on every scheduled run or inbound trigger.
Rows are colour-coded :

| Label       | Meaning                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| **Sent**    | Every channel of every bundle delivered.                                    |
| **Partial** | Some channels delivered, some failed. Expand for the per-channel breakdown. |
| **Failed**  | Everything failed, or the run bailed before dispatch (fetch/parse error).   |

## 👥 Managing users and authentication

### Roles

Everyone with an account can do the day-to-day work : Read, create, edit,
test, and delete alerts and their bundles. The role only gates the
**user-management** surface :

- **User** — full access to alerts: browse the list, create new ones, edit
  triggers / conditions / bundles, run tests, view dispatch logs, and delete
  alerts they no longer need. Cannot access `/users`.
- **Admin** — everything a user does, plus the `/users` page: invite new
  people through any channel, list existing users, and delete accounts.

Admins can neither delete themselves nor delete the last remaining admin :
those buttons refuse with a tooltip.

### Inviting users

From `/users`, click **Invite user**. Pick a delivery channel :

- **Email** : sends an invitation email with a one-click link. Requires
  SMTP configured and an email address for the invitee.
- **Olvid** : DMs the same link over Olvid. Requires the bot to already
  have a contact discussion with the invitee (the invitee has added the
  bot on their phone). Group discussions are filtered out here, user
  invitations always go to **contacts only** (bundle deliveries have no
  such restriction).
- **Shareable link** : no delivery. The modal reveals the URL for you to
  hand over out-of-band.

Then, enter their login, display name (optional) and Olvid contact (if Olvid delivery).

You can invite either a *user* or an *admin* by toggling the
role pill in the invite modal.

### Accepting an invitation
When clicking on an invitation link, the new user must choose at least one of 
the following authentication methods :
- **Olvid authentication** : This method only needs a login and an associated Olvid
discussion. When requesting login, a message is sent on your Olvid conversation.
You can authorize authentication by adding a reaction to the message without needing
any password. This method is only available if the link has been sent via Olvid.
- **Password** : Choose a password (at least 8-digit) to log in.

Both methods can be enabled simultaneously. You can choose either each time
you want to log in.


### Deleting a user

From the user row, click **Delete** and confirm. If the user was still
*pending* (never accepted their invite) and the invite went out over Olvid,
the bot revokes the invite DM from the invitee's chat before removing the
row. This way, it avoids dangling links and invitations sent by mistake.

---

# 🧐 FAQ

**Do I need both Olvid and SMTP?**
No. Olvid alone works. SMTP alone works. Both together works. Configure
whichever channels you want to use.

**Can one alert deliver to Olvid AND email?**
Yes. One *bundle* is one channel, but an alert can carry many bundles.
Add one Olvid bundle for the on-call group and one email bundle for the
mailing list, both fed by the same trigger.

**What happens if the daemon is down when an alert fires?**
The dispatch is marked `Failed` in the log with the daemon error surfaced
per channel. The alert itself keeps its schedule; the next tick tries
again.

**Can the app works if the daemon is disconnected ?** Yes, but all Olvid-related
features will be unavailable. An indicator in the top bar display the current
state of the daemon. The app can reconnect automatically to the daemon if it was
disconnected or shut down.

**Where is my data stored ?**
SQLite, in the `alerting_db` Docker volume (`docker compose down -v` wipes
it). Olvid daemon state is in the bind-mounted `./data` folder next to the
repo.

**How do I reset everything?**
`docker compose down -v` (drops the DB volume and the running parts) + `rm -rf ./data/*` (drops
the daemon state). Restart, redo the setup. 


---
# Development

For local Vue / server-side work outside Docker:

```bash
# Keep the daemon running in Docker; only the app is hot-reloaded.
docker compose up -d daemon

# In .env, point the local dev server at the host-exposed daemon port
# and use a separate SQLite file from the compose one:
#   OLVID_DAEMON_URL=http://localhost:50051
#   DATABASE_URL=file:./dev.db

npm install
npx prisma generate
npm run dev             # http://localhost:3000
```

## File Structure

```
alerting-bot/
├── app/            # Nuxt client — Vue SFCs, composables, utils, i18n bundles
├── server/         # Nitro server — api, services, repositories, tasks, clients
├── shared/         # Types + pure logic imported by both client and server
├── prisma/         # schema.prisma (SQLite)
├── i18n/locales/   # en, fr translation files
├── public/         # favicon for tabs
├── data/           # runtime SQLite + Olvid daemon state
├── Dockerfile
├── docker-compose.yaml
└── .env.example
```

---

# Credit / Acknowledgment

**Alerting Bot** designed and developed by **Sofia Maeso Shakh** and **Barnabé Roussel**.

Built on top of the [Olvid Bot Daemon](https://doc.bot.olvid.io/)
Stack :
- **Olvid bot daemon docs** — <https://doc.bot.olvid.io/en/stable/>
- **Handlebars** — <https://handlebarsjs.com/>
- **Nuxt 4** — <https://nuxt.com/>
- **Prisma** — <https://www.prisma.io/>
- **nuxt-auth-utils** — <https://github.com/atinux/nuxt-auth-utils>

# License
```
Olvid Alerting
Copyright © 2026 Olvid SAS

Olvid Alerting is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License, version 3,
as published by the Free Software Foundation.

Olvid Alerting is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with Olvid Alerting. If not, see <https://www.gnu.org/licenses/>.
```