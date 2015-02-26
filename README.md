
# Nightscout Aggregator

This is a node js webapp serving as a lens to view multiple Nightscout installs
at the same time.


## Installing

```bash
git clone git://github.com/bewest/nightscout-aggregator.git
cd nightscout-aggregator
npm install
```

This should fetch a copy of the source code, andd install all the dependencies,
including bower resources.

## Running

Start server on port `3000`.
```bash
PORT=3000 node server.js
```
This allows it to be used in heroku/azure easily.
Start server on port `3000`.

By default, the server starts by monitoring no Nightscouts.  You can
specify a list to use by default by using the `NIGHTSCOUTS`
environment variable to give the location of a text file, which should
have a list of Nightscouts urls to monitor, one per line.

Use a text file, `sources.txt` specified by the `NIGHTSCOUTS`
environment variable, which has a list of one Nightscout url per line:
```bash
NIGHTSCOUTS=sources.txt PORT=3000 node server.js
```

### Viewing additional Nightscouten

By default, the UI has a `settings` button with a form for users to
subscribe new Nightscout addressess to the monitoring service.

![By default settings button in upper left][settings-button]

Clicking the button should reveal a form for the user to subscribe a
Nightscout to your monitoring service.  Proposals for creating a
better work flow here to "release the data" properly are welcome.

![Enter a Nightscout address to monitor][subscribe-form]

![Use the sync button to enroll.][subscribe-form-filled]


## Usage

Originally conceieved as a tool to help with demos at presentations,
this has become a useful way to quickly get an idea of what is
happening with a population of Nightscout users, without really
revealing whose data belongs to whom.  In the short term, this tool
has been a useful way to build empathy in terms of understanding
therapy for type 1 diabetes.

![Screenshot][screenshot-overview]


## How it works

Each Nightscout is kept in a list in the webserver.  The webserver
itself enrolls in the Nightscout's websocket.  The websocket's address
is paired internally with a unique random color six hex-digit hash.
Currently no data is stored, the lens merely allows viewing all the
data passing through the server in an ephemeral fashion.  No matter
how many people visit your aggregator, the server itself is
multiplexing the connections, there is only one connection to the
monitored Nightscout URLs, no matter how many clients connect to this
server.  No matter how many people visit your aggregator, the server
itself is multiplexing the connections, there is only one connection
to the monitored Nightscout URLs, no matter how many clients connect
to this server.  No matter how many people visit your aggregator, the
server itself is multiplexing the connections, there is only one
connection to the monitored Nightscout URLs, no matter how many
clients connect to this server.  No matter how many people visit your
aggregator, the server itself is multiplexing the connections, there
is only one connection to the monitored Nightscout URLs, no matter how
many clients connect to this server.

The UI avoids showing any details other than the color hash, the time,
and the glucose values.

[settings-button]: http://i.imgur.com/G4E3OhF.png?1
[subscribe-form]: http://i.imgur.com/sinmnrp.png
[subscribe-form-filled]: http://i.imgur.com/KSJwzkB.png
[screenshot-overview]: http://i.imgur.com/wk6QhHr.png


<iframe class="imgur-album" width="100%" height="550" frameborder="0"
src="//imgur.com/a/avUf6/embed"></iframe>

